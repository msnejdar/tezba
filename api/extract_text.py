import json
import base64

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
    
    # Only allow POST requests
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
        body = request.get_json()
        if not body:
            body = json.loads(request.get_data(as_text=True))
        
        # Get file data and filename
        file_data = base64.b64decode(body['fileData'])
        filename = body['filename']
        
        # For testing purposes, only handle .txt files for now
        if filename.lower().endswith('.txt'):
            try:
                extracted_text = file_data.decode('utf-8')
            except UnicodeDecodeError:
                extracted_text = file_data.decode('utf-8', errors='ignore')
                
            response = {
                "success": True,
                "extractedText": extracted_text,
                "filename": filename,
                "metadata": {"format": "text/plain"}
            }
        else:
            # For non-text files, return a helpful message for now
            response = {
                "success": False,
                "error": f"Prozatím je podporován pouze formát .txt. Soubor {filename} bude podporován po dokončení integrace Apache Tika."
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response)
        }
        
    except KeyError as e:
        error_response = {
            "success": False,
            "error": f"Chybí povinný parametr: {str(e)}"
        }
        
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(error_response)
        }
        
    except json.JSONDecodeError:
        error_response = {
            "success": False,
            "error": "Neplatný JSON formát požadavku"
        }
        
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(error_response)
        }
        
    except Exception as e:
        error_response = {
            "success": False,
            "error": f"Neočekávaná chyba: {str(e)}"
        }
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(error_response)
        }