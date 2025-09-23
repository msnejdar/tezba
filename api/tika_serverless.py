#!/usr/bin/env python3
"""
Serverless Apache Tika Integration
Embedded Tika functionality for Vercel without external server dependency
"""

import json
import base64
import os
import tempfile
import subprocess
from pathlib import Path
import requests
from flask import Flask, request, jsonify
import PyPDF2
from io import BytesIO
import zipfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _cors_origin(request):
    """Handle CORS origin"""
    allow_origin = os.environ.get('CORS_ALLOW_ORIGIN', '*')
    origin = request.headers.get('Origin') or ''
    if allow_origin == '*' or not allow_origin:
        return '*'
    allowed = [o.strip() for o in allow_origin.split(',') if o.strip()]
    return origin if origin in allowed else allowed[0]

def _json_response(request, body: dict, status: int = 200):
    """Create JSON response with CORS headers"""
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': _cors_origin(request)
    }
    return {
        'statusCode': status,
        'headers': headers,
        'body': json.dumps(body)
    }

def extract_text_pdf(file_data: bytes) -> tuple[str, dict]:
    """Extract text from PDF using PyPDF2"""
    try:
        pdf_reader = PyPDF2.PdfReader(BytesIO(file_data))
        text_parts = []
        
        for page_num, page in enumerate(pdf_reader.pages):
            try:
                text = page.extract_text()
                if text.strip():
                    text_parts.append(f"\n--- Page {page_num + 1} ---\n{text}")
            except Exception as e:
                logger.warning(f"Failed to extract text from page {page_num + 1}: {e}")
                text_parts.append(f"\n--- Page {page_num + 1} ---\n[Text extraction failed]")
        
        extracted_text = '\n'.join(text_parts)
        
        metadata = {
            "format": "application/pdf",
            "pages": len(pdf_reader.pages),
            "title": pdf_reader.metadata.get('/Title', '') if pdf_reader.metadata else '',
            "author": pdf_reader.metadata.get('/Author', '') if pdf_reader.metadata else '',
            "subject": pdf_reader.metadata.get('/Subject', '') if pdf_reader.metadata else '',
            "creator": pdf_reader.metadata.get('/Creator', '') if pdf_reader.metadata else ''
        }
        
        return extracted_text, metadata
        
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

def extract_text_docx(file_data: bytes) -> tuple[str, dict]:
    """Extract text from DOCX files"""
    try:
        # DOCX files are ZIP archives
        with zipfile.ZipFile(BytesIO(file_data), 'r') as docx_zip:
            # Read document.xml which contains the main text
            try:
                document_xml = docx_zip.read('word/document.xml').decode('utf-8')
            except KeyError:
                raise Exception("Invalid DOCX file: missing document.xml")
            
            # Simple XML parsing to extract text
            import re
            # Remove XML tags and extract text content
            text_pattern = r'<w:t[^>]*>(.*?)</w:t>'
            matches = re.findall(text_pattern, document_xml, re.DOTALL)
            text_parts = [match for match in matches if match.strip()]
            
            extracted_text = ' '.join(text_parts)
            
            # Try to extract metadata from core.xml
            metadata = {"format": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
            try:
                core_xml = docx_zip.read('docProps/core.xml').decode('utf-8')
                title_match = re.search(r'<dc:title[^>]*>(.*?)</dc:title>', core_xml)
                if title_match:
                    metadata["title"] = title_match.group(1)
                
                creator_match = re.search(r'<dc:creator[^>]*>(.*?)</dc:creator>', core_xml)
                if creator_match:
                    metadata["author"] = creator_match.group(1)
            except:
                pass
            
            return extracted_text, metadata
            
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        raise Exception(f"Failed to extract text from DOCX: {str(e)}")

def extract_text_txt(file_data: bytes) -> tuple[str, dict]:
    """Extract text from plain text files"""
    try:
        # Try UTF-8 first
        try:
            extracted_text = file_data.decode('utf-8')
        except UnicodeDecodeError:
            # Fallback to other encodings
            encodings = ['latin-1', 'cp1252', 'iso-8859-1']
            extracted_text = None
            for encoding in encodings:
                try:
                    extracted_text = file_data.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if extracted_text is None:
                extracted_text = file_data.decode('utf-8', errors='ignore')
        
        metadata = {
            "format": "text/plain",
            "size": len(file_data),
            "lines": len(extracted_text.splitlines())
        }
        
        return extracted_text, metadata
        
    except Exception as e:
        logger.error(f"Text extraction failed: {e}")
        raise Exception(f"Failed to extract text: {str(e)}")

def extract_text_html(file_data: bytes) -> tuple[str, dict]:
    """Extract text from HTML files"""
    try:
        # Decode HTML content
        try:
            html_content = file_data.decode('utf-8')
        except UnicodeDecodeError:
            html_content = file_data.decode('utf-8', errors='ignore')
        
        # Simple HTML tag removal
        import re
        # Remove script and style elements
        html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<style[^>]*>.*?</style>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove HTML tags
        text_pattern = r'<[^>]+>'
        extracted_text = re.sub(text_pattern, ' ', html_content)
        
        # Clean up whitespace
        extracted_text = re.sub(r'\s+', ' ', extracted_text).strip()
        
        # Extract title if present
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html_content, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else ''
        
        metadata = {
            "format": "text/html",
            "title": title,
            "size": len(file_data)
        }
        
        return extracted_text, metadata
        
    except Exception as e:
        logger.error(f"HTML extraction failed: {e}")
        raise Exception(f"Failed to extract text from HTML: {str(e)}")

def extract_text_rtf(file_data: bytes) -> tuple[str, dict]:
    """Basic RTF text extraction"""
    try:
        # Decode RTF content
        try:
            rtf_content = file_data.decode('utf-8')
        except UnicodeDecodeError:
            rtf_content = file_data.decode('utf-8', errors='ignore')
        
        # Very basic RTF parsing - remove control sequences
        import re
        # Remove RTF control words and groups
        text = re.sub(r'\\[a-z]+\d*\s?', '', rtf_content)
        text = re.sub(r'[{}]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        metadata = {
            "format": "application/rtf",
            "size": len(file_data)
        }
        
        return text, metadata
        
    except Exception as e:
        logger.error(f"RTF extraction failed: {e}")
        raise Exception(f"Failed to extract text from RTF: {str(e)}")

def extract_text_serverless(file_data: bytes, filename: str) -> tuple[str, dict]:
    """
    Extract text from various file formats without external Tika server
    """
    file_ext = Path(filename).suffix.lower()
    
    # Determine extraction method based on file extension
    if file_ext == '.pdf':
        return extract_text_pdf(file_data)
    elif file_ext == '.docx':
        return extract_text_docx(file_data)
    elif file_ext in ['.txt', '.md', '.py', '.js', '.css', '.json', '.xml', '.csv']:
        return extract_text_txt(file_data)
    elif file_ext in ['.html', '.htm']:
        return extract_text_html(file_data)
    elif file_ext == '.rtf':
        return extract_text_rtf(file_data)
    else:
        # For unknown formats, try text extraction as fallback
        try:
            return extract_text_txt(file_data)
        except:
            raise Exception(f"Unsupported file format: {file_ext}")

def handler(request):
    """Main handler for serverless text extraction"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': _cors_origin(request),
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
        }
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    # Only accept POST requests
    if request.method != 'POST':
        return _json_response(request, {
            "success": False,
            "error": "Method not allowed"
        }, 405)
    
    try:
        # Parse request data
        if hasattr(request, 'get_json'):
            data = request.get_json()
        else:
            data = json.loads(request.data)
        
        if not data:
            return _json_response(request, {
                "success": False,
                "error": "No JSON data provided"
            }, 400)
        
        # Get file data and filename
        file_content = data.get('fileContent')
        filename = data.get('filename', 'unknown')
        
        if not file_content:
            return _json_response(request, {
                "success": False,
                "error": "No file content provided"
            }, 400)
        
        # Decode base64 file data
        try:
            file_data = base64.b64decode(file_content)
        except Exception as e:
            return _json_response(request, {
                "success": False,
                "error": f"Invalid base64 data: {str(e)}"
            }, 400)
        
        # Check file size
        max_mb = float(os.environ.get('MAX_FILE_SIZE_MB', '20'))
        if len(file_data) > max_mb * 1024 * 1024:
            return _json_response(request, {
                "success": False,
                "error": f"File too large (> {int(max_mb)} MB)"
            }, 413)
        
        # Extract text using serverless method
        try:
            extracted_text, metadata = extract_text_serverless(file_data, filename)
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            return _json_response(request, {
                "success": False,
                "error": f"Text extraction failed: {str(e)}"
            }, 500)
        
        # Return success response
        return _json_response(request, {
            "success": True,
            "extractedText": extracted_text,
            "filename": filename,
            "metadata": metadata
        })
        
    except Exception as e:
        logger.error(f"Handler error: {e}")
        return _json_response(request, {
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }, 500)

# Flask app for testing
app = Flask(__name__)

@app.route('/api/extract', methods=['POST', 'OPTIONS'])
def extract():
    """Flask route for text extraction"""
    return handler(request)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "tika-serverless"})

if __name__ == '__main__':
    app.run(debug=True, port=5002)