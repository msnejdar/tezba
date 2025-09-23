import json
import base64
import os
import pathlib
import requests
import tempfile
import subprocess
from pathlib import Path


def _cors_origin(request):
    allow_origin = os.environ.get('CORS_ALLOW_ORIGIN', '*')
    # If configured, reflect only when Origin matches allowlist entry '*' bypasses check
    origin = request.headers.get('Origin') or ''
    if allow_origin == '*' or not allow_origin:
        return '*'
    # Multiple origins can be comma separated
    allowed = [o.strip() for o in allow_origin.split(',') if o.strip()]
    return origin if origin in allowed else allowed[0]


def _json_response(request, body: dict, status: int = 200):
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': _cors_origin(request)
    }
    return {
        'statusCode': status,
        'headers': headers,
        'body': json.dumps(body)
    }


def _require_api_key(request):
    required_key = os.environ.get('BACKEND_API_KEY')
    if not required_key:
        return None  # Not enforced
    provided = request.headers.get('x-api-key') or request.headers.get('X-API-Key')
    if provided != required_key:
        return _json_response(request, { 'success': False, 'error': 'Unauthorized' }, 401)
    return None


# Main handler function for Vercel
def handler(request):
    # Handle CORS preflight request
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

    # Only allow POST requests
    if request.method != 'POST':
        return _json_response(request, {
            'success': False,
            'error': 'Method not allowed'
        }, 405)

    try:
        # Optional API key check
        unauthorized = _require_api_key(request)
        if unauthorized is not None:
            return unauthorized

        # Parse request body
        body = request.get_json(silent=True)
        if not body:
            body = json.loads(request.get_data(as_text=True))

        # Get file data and filename
        file_data = base64.b64decode(body['fileData'])
        filename = body.get('filename', 'unknown')

        # Enforce maximum file size (in MB), default 20MB
        max_mb = float(os.environ.get('MAX_FILE_SIZE_MB', '20'))
        if len(file_data) > max_mb * 1024 * 1024:
            return _json_response(request, {
                "success": False,
                "error": f"Soubor je příliš velký (> {int(max_mb)} MB)"
            }, 413)

        # Fast path for plain text files
        if filename.lower().endswith('.txt'):
            try:
                extracted_text = file_data.decode('utf-8')
            except UnicodeDecodeError:
                extracted_text = file_data.decode('utf-8', errors='ignore')

            return _json_response(request, {
                "success": True,
                "extractedText": extracted_text,
                "filename": filename,
                "metadata": {"format": "text/plain"}
            })

        # Try serverless Tika first for better performance
        try:
            # Handle both local and Vercel imports
            try:
                from .tika_serverless import extract_text_serverless
            except ImportError:
                from tika_serverless import extract_text_serverless
            
            extracted_text, metadata = extract_text_serverless(file_data, filename)
            
            return _json_response(request, {
                "success": True,
                "extractedText": extracted_text,
                "filename": filename,
                "metadata": metadata
            })
            
        except Exception as serverless_error:
            # Check if it's a format not supported error
            error_msg = str(serverless_error)
            if "not supported" in error_msg.lower() or "unsupported" in error_msg.lower():
                return _json_response(request, {
                    "success": False,
                    "error": error_msg,
                    "supportedFormats": [".pdf", ".docx", ".txt", ".md", ".html", ".htm", ".rtf", ".py", ".js", ".css", ".json", ".xml", ".csv"]
                }, 400)
            # Fallback to remote Tika server if serverless fails
            tika_url = os.environ.get('TIKA_SERVER_URL')
            if not tika_url:
                # Try local config file fallback
                try:
                    config_path = pathlib.Path(__file__).parent / 'tika_config.json'
                    if config_path.exists():
                        with open(config_path, 'r', encoding='utf-8') as f:
                            cfg = json.load(f)
                            tika_url = cfg.get('serverUrl')
                except Exception:
                    tika_url = None
            
            if not tika_url:
                return _json_response(request, {
                    "success": False,
                    "error": f"Serverless extraction failed: {str(serverless_error)}. No Tika server configured."
                }, 500)

        if tika_url.endswith('/'):
            tika_url = tika_url[:-1]

        # Request both text and metadata from Tika in one call
        endpoint = f"{tika_url}/rmeta/text"
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/octet-stream'
        }
        # Optional auth for upstream Tika
        basic_auth = os.environ.get('TIKA_BASIC_AUTH')  # format user:pass
        if basic_auth:
            try:
                enc = base64.b64encode(basic_auth.encode('utf-8')).decode('ascii')
                headers['Authorization'] = f'Basic {enc}'
            except Exception:
                pass
        # Extra headers via JSON env
        extra_json = os.environ.get('TIKA_EXTRA_HEADERS')
        if extra_json:
            try:
                extra = json.loads(extra_json)
                if isinstance(extra, dict):
                    headers.update({str(k): str(v) for k, v in extra.items()})
            except Exception:
                pass

        try:
            resp = requests.put(endpoint, data=file_data, headers=headers, timeout=10)
        except requests.Timeout:
            return _json_response(request, {
                "success": False,
                "error": "Vypršel časový limit při komunikaci s Apache Tika serverem"
            }, 504)

        if resp.status_code >= 400:
            return _json_response(request, {
                "success": False,
                "error": f"Apache Tika server vrátil chybu: {resp.status_code} {resp.text[:300]}"
            }, 502)

        try:
            rmeta = resp.json()
        except Exception:
            # Fallback – if server returned text only
            rmeta = []

        primary = rmeta[0] if isinstance(rmeta, list) and len(rmeta) > 0 else {}
        extracted_text = primary.get('X-TIKA:content') or ''
        metadata = {k: v for k, v in primary.items() if k != 'X-TIKA:content'}

        # If no text in rmeta, try plain text endpoint as fallback
        if not extracted_text:
            text_headers = {'Accept': 'text/plain', 'Content-Type': 'application/octet-stream'}
            text_resp = requests.put(f"{tika_url}/tika", data=file_data, headers=text_headers, timeout=10)
            if text_resp.status_code < 400:
                extracted_text = text_resp.text or ''

        return _json_response(request, {
            "success": True,
            "extractedText": extracted_text,
            "filename": filename,
            "metadata": metadata
        })

    except KeyError as e:
        return _json_response(request, {
            "success": False,
            "error": f"Chybí povinný parametr: {str(e)}"
        }, 400)
    except json.JSONDecodeError:
        return _json_response(request, {
            "success": False,
            "error": "Neplatný JSON formát požadavku"
        }, 400)
    except Exception as e:
        # Log error for debugging
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in extract_text handler: {error_details}")
        
        return _json_response(request, {
            "success": False,
            "error": f"Neočekávaná chyba: {str(e)}",
            "debug": error_details if os.environ.get('DEBUG') else None
        }, 500)

# Alternative entry points for Vercel
def main(request):
    return handler(request)

# Flask-style entry point 
from flask import Flask, request as flask_request, jsonify

app = Flask(__name__)

@app.route('/api/extract_text', methods=['POST', 'OPTIONS'])
def extract_text_flask():
    return handler(flask_request)

if __name__ == '__main__':
    app.run(debug=True)