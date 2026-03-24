#!/usr/bin/env python3
"""
Cosy World 3D — Local Development Server
Run this to serve the game locally so assets can load.

Usage:
    python server.py

Then open: http://localhost:8080
"""
import http.server
import socketserver
import os
import webbrowser
import threading

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Only show non-asset requests to keep terminal clean
        if not any(x in args[0] for x in ['.png', '.jpg', '.glb', '.mp3']):
            print(f"  {args[0][:60]}")

    def end_headers(self):
        # Allow all origins (needed for some asset hosts)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

def open_browser():
    import time
    time.sleep(0.5)
    webbrowser.open(f'http://localhost:{PORT}')

if __name__ == '__main__':
    print(f"""
╔══════════════════════════════════════════╗
║   🌿 Cosy World 3D — Local Server       ║
╠══════════════════════════════════════════╣
║   Serving:  {DIRECTORY[:40]}
║   URL:      http://localhost:{PORT}
║   Press:    Ctrl+C to stop
╚══════════════════════════════════════════╝
    """)
    threading.Thread(target=open_browser, daemon=True).start()
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.allow_reuse_address = True
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n  Server stopped. Goodbye! 🌿\n")
