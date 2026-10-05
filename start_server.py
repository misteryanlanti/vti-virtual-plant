#!/usr/bin/env python3
"""一键启动本地 HTTP 服务器，供三维工厂 Web 版使用。
用法：python start_server.py
然后浏览器打开 http://localhost:8765
所有资源均在本地，无外部 CDN 依赖，开箱即用。
"""
import http.server
import socketserver
import os
import sys
import webbrowser
import threading

PORT = 8765

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 本地资源，CORS 头保留以备扩展
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()
    def log_message(self, fmt, *args):
        print("[HTTP] " + (args[0] if args else ""))

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    handler = lambda *a, **kw: Handler(*a, directory=os.getcwd(), **kw)
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        url = "http://localhost:" + str(PORT)
        print("三维工厂服务器已启动: " + url)
        print("工作目录: " + os.getcwd())
        print("按 Ctrl+C 停止服务器")
        try:
            threading.Timer(0.5, lambda: webbrowser.open(url)).start()
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务器已停止")

if __name__ == "__main__":
    main()
