from http.server import BaseHTTPRequestHandler
import json
import base64
import tempfile
import os
from tika import parser

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Get content length
            content_length = int(self.headers['Content-Length'])
            
            # Read the request body
            post_data = self.rfile.read(content_length)
            
            # Parse JSON data
            data = json.loads(post_data.decode('utf-8'))
            
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
                extracted_text = parsed["content"]
                
                if not extracted_text:
                    extracted_text = f"Nepodařilo se extrahovat text ze souboru {filename}"
                
                # Clean up extracted text
                extracted_text = extracted_text.strip() if extracted_text else ""
                
                # Return success response
                response = {
                    "success": True,
                    "extractedText": extracted_text,
                    "filename": filename,
                    "metadata": parsed.get("metadata", {})
                }
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
            
            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            # Send error response
            error_response = {
                "success": False,
                "error": f"Chyba při zpracování souboru: {str(e)}"
            }
            
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def do_OPTIONS(self):
        # Handle CORS preflight request
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()