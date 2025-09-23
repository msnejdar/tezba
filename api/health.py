import json
import os
import pathlib
import requests


def _cors_origin(request):
    allow_origin = os.environ.get('CORS_ALLOW_ORIGIN', '*')
    origin = request.headers.get('Origin') or ''
    if allow_origin == '*' or not allow_origin:
        return '*'
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


def handler(request):
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': _cors_origin(request),
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
        }
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }

    if request.method != 'GET':
        return _json_response(request, { 'ok': False, 'error': 'Method not allowed' }, 405)

    # Resolve Tika URL from env or config file
    tika_url = os.environ.get('TIKA_SERVER_URL')
    if not tika_url:
        try:
            config_path = pathlib.Path(__file__).parent / 'tika_config.json'
            if config_path.exists():
                with open(config_path, 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
                    tika_url = cfg.get('serverUrl')
        except Exception:
            tika_url = None

    status = {
        'ok': True,
        'tikaConfigured': bool(tika_url),
        'tikaUrl': tika_url or None,
        'tikaReachable': False,
        'version': None
    }

    if tika_url:
        try:
            base = tika_url[:-1] if tika_url.endswith('/') else tika_url
            resp = requests.get(f"{base}/version", timeout=3)
            if resp.status_code < 400:
                status['tikaReachable'] = True
                status['version'] = (resp.text or '').strip()
        except Exception:
            status['tikaReachable'] = False

    return _json_response(request, status)


