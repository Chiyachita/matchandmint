
import json
import base64
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import os

class PinataHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/upload':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                pinata_jwt = os.environ.get('PINATA_JWT')
                if not pinata_jwt:
                    self.send_error_response('PINATA_JWT not configured')
                    return
                
                image = data.get('image')
                if not image:
                    self.send_error_response('Missing image data')
                    return
                
                # Convert base64 to bytes
                base64_data = image.split(',')[1]
                image_bytes = base64.b64decode(base64_data)
                
                # Upload image to Pinata
                files = {'file': ('puzzle.png', image_bytes, 'image/png')}
                headers = {'Authorization': f'Bearer {pinata_jwt}'}
                
                image_response = requests.post(
                    'https://api.pinata.cloud/pinning/pinFileToIPFS',
                    files=files,
                    headers=headers
                )
                
                if not image_response.ok:
                    self.send_error_response(f'Image upload failed: {image_response.text}')
                    return
                
                image_result = image_response.json()
                image_cid = image_result['IpfsHash']
                
                # Create and upload metadata
                metadata = {
                    "name": "Match and Mint Puzzle NFT",
                    "description": "A unique puzzle arrangement created in the Match and Mint game",
                    "image": f"ipfs://{image_cid}",
                    "attributes": [
                        {"trait_type": "Game", "value": "Match and Mint"},
                        {"trait_type": "Creation Date", "value": "2024"}
                    ]
                }
                
                meta_headers = {
                    'Authorization': f'Bearer {pinata_jwt}',
                    'Content-Type': 'application/json'
                }
                
                meta_response = requests.post(
                    'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                    json=metadata,
                    headers=meta_headers
                )
                
                if not meta_response.ok:
                    self.send_error_response(f'Metadata upload failed: {meta_response.text}')
                    return
                
                meta_result = meta_response.json()
                metadata_cid = meta_result['IpfsHash']
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'uri': f'ipfs://{metadata_cid}'}).encode())
                
            except Exception as e:
                self.send_error_response(f'Server error: {str(e)}')
        else:
            self.send_response(404)
            self.end_headers()

    def send_error_response(self, error_message):
        self.send_response(500)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': error_message}).encode())

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    server = HTTPServer(('0.0.0.0', port), PinataHandler)
    print(f'Server running on port {port}')
    server.serve_forever()
