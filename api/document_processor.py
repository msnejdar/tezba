#!/usr/bin/env python3
"""
Document Processor with Hive Mind Integration
Combines document text extraction with Hive Mind agents for intelligent processing
"""

import json
import base64
import os
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any
from flask import Flask, request, jsonify
import logging

# Import our modules
from .tika_serverless import extract_text_serverless
from .claude_flow_hive import ClaudeFlowHiveMind, HiveMindConfig

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

class DocumentProcessor:
    """Enhanced document processor with Hive Mind intelligence"""
    
    def __init__(self):
        self.hive_minds = {}
    
    async def process_document_with_hive(self, file_data: bytes, filename: str, analysis_tasks: List[str] = None) -> Dict[str, Any]:
        """Process document with Hive Mind agents for intelligent analysis"""
        
        # Step 1: Extract text using serverless Tika
        try:
            extracted_text, metadata = extract_text_serverless(file_data, filename)
        except Exception as e:
            raise Exception(f"Text extraction failed: {str(e)}")
        
        # Step 2: Create Hive Mind for document analysis if analysis tasks provided
        if analysis_tasks:
            try:
                config = HiveMindConfig(
                    objective=f"Analyze and process document: {filename}",
                    name=f"doc-processor-{Path(filename).stem}",
                    queen_type="analytical",
                    max_workers=6,
                    consensus_algorithm="majority"
                )
                
                hive_mind = ClaudeFlowHiveMind(config)
                result = await hive_mind.initialize()
                swarm_id = result["swarm_id"]
                
                # Store hive mind for future use
                self.hive_minds[swarm_id] = hive_mind
                
                # Create analysis tasks
                created_tasks = []
                for task_description in analysis_tasks:
                    task = await hive_mind.create_task(
                        description=f"{task_description}: {filename}",
                        priority=5,
                        metadata={"document": filename, "text_length": len(extracted_text)}
                    )
                    created_tasks.append(task)
                
                # Wait for initial task processing
                await asyncio.sleep(2)
                
                # Get current status
                status = hive_mind.get_status()
                
                return {
                    "success": True,
                    "extractedText": extracted_text,
                    "filename": filename,
                    "metadata": metadata,
                    "hive_mind": {
                        "swarm_id": swarm_id,
                        "status": status,
                        "tasks": created_tasks,
                        "analysis_enabled": True
                    }
                }
                
            except Exception as e:
                logger.warning(f"Hive Mind analysis failed, returning basic extraction: {e}")
                # Return basic extraction if Hive Mind fails
                return {
                    "success": True,
                    "extractedText": extracted_text,
                    "filename": filename,
                    "metadata": metadata,
                    "hive_mind": {
                        "analysis_enabled": False,
                        "error": str(e)
                    }
                }
        
        # Return basic extraction
        return {
            "success": True,
            "extractedText": extracted_text,
            "filename": filename,
            "metadata": metadata,
            "hive_mind": {"analysis_enabled": False}
        }
    
    def get_default_analysis_tasks(self, filename: str, text_preview: str) -> List[str]:
        """Generate default analysis tasks based on document type"""
        file_ext = Path(filename).suffix.lower()
        
        tasks = [
            "Extract and summarize key information from the document",
            "Identify main topics and themes discussed",
            "Find important dates, names, and numerical data"
        ]
        
        # Add format-specific tasks
        if file_ext == '.pdf':
            tasks.extend([
                "Analyze document structure and organization",
                "Check for tables, figures, and their relevance"
            ])
        elif file_ext in ['.docx', '.doc']:
            tasks.extend([
                "Review document formatting and style consistency",
                "Identify action items and conclusions"
            ])
        elif file_ext in ['.txt', '.md']:
            tasks.extend([
                "Analyze writing style and tone",
                "Identify key concepts and definitions"
            ])
        
        return tasks

# Global processor instance
processor = DocumentProcessor()

def handler(request):
    """Main handler for document processing with optional Hive Mind analysis"""
    
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
        
        # Get file data and options
        file_content = data.get('fileContent')
        filename = data.get('filename', 'unknown')
        enable_hive_analysis = data.get('enableHiveAnalysis', False)
        custom_analysis_tasks = data.get('analysisTasks', [])
        
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
        
        # Determine analysis tasks
        analysis_tasks = None
        if enable_hive_analysis:
            if custom_analysis_tasks:
                analysis_tasks = custom_analysis_tasks
            else:
                # Get preview of text for default task generation
                try:
                    preview_text, _ = extract_text_serverless(file_data[:10000], filename)  # First 10KB for preview
                    analysis_tasks = processor.get_default_analysis_tasks(filename, preview_text[:500])
                except:
                    analysis_tasks = [
                        "Analyze and summarize the document content",
                        "Extract key information and insights",
                        "Identify important topics and themes"
                    ]
        
        # Process document
        try:
            result = asyncio.run(processor.process_document_with_hive(file_data, filename, analysis_tasks))
            return _json_response(request, result)
        except Exception as e:
            logger.error(f"Document processing failed: {e}")
            return _json_response(request, {
                "success": False,
                "error": f"Document processing failed: {str(e)}"
            }, 500)
        
    except Exception as e:
        logger.error(f"Handler error: {e}")
        return _json_response(request, {
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }, 500)

# Flask app for testing
app = Flask(__name__)

@app.route('/api/process-document', methods=['POST', 'OPTIONS'])
def process_document():
    """Flask route for document processing"""
    return handler(request)

@app.route('/api/hive-status/<swarm_id>', methods=['GET'])
def get_hive_status(swarm_id):
    """Get status of a Hive Mind instance"""
    try:
        hive_mind = processor.hive_minds.get(swarm_id)
        if not hive_mind:
            return jsonify({"error": "Hive Mind not found"}), 404
        
        status = hive_mind.get_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "document-processor"})

if __name__ == '__main__':
    app.run(debug=True, port=5003)