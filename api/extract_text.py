import json
import base64
import tempfile
import os
from tika import parser

def handler(request):
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False,
                'error': 'Method not allowed'
            })
        }
    
    try:
        # Parse request body
        if hasattr(request, 'body'):
            body = request.body
        else:
            body = request.get_data()
            
        if isinstance(body, bytes):
            body = body.decode('utf-8')
            
        data = json.loads(body)
        
        # Get file data and filename
        file_data = base64.b64decode(data['fileData'])
        filename = data['filename']
        
        # Write file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
            temp_file.write(file_data)
            temp_file_path = temp_file.name
        
        try:
            # Use Tika to extract text
            parsed = parser.from_file(temp_file_path)
            extracted_text = parsed["content"] if parsed and "content" in parsed else None
            
            if not extracted_text:
                extracted_text = f"Nepodařilo se extrahovat text ze souboru {filename}"
            
            # Clean up extracted text
            extracted_text = extracted_text.strip() if extracted_text else ""
            
            # Return success response
            response = {
                "success": True,
                "extractedText": extracted_text,
                "filename": filename,
                "metadata": parsed.get("metadata", {}) if parsed else {}
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response)
        }
        
    except Exception as e:
        # Send error response
        error_response = {
            "success": False,
            "error": f"Chyba při zpracování souboru: {str(e)}"
        }
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(error_response)
        }