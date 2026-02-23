import webview
import threading
from app import app
import subprocess
import sys
import os

class Api:
    def __init__(self):
        self._window = None

    def set_window(self, window):
        self._window = window

    def select_folder(self):
        if not self._window: return ""
        result = self._window.create_file_dialog(webview.FOLDER_DIALOG)
        if result and len(result) > 0:
            return result[0]
        return ""

    def open_file_location(self, path):
        try:
            # On Windows, selecting the file in explorer is very slick
            if os.path.isfile(path):
                subprocess.run(['explorer', '/select,', os.path.normpath(path)])
            elif os.path.isdir(path):
                subprocess.run(['explorer', os.path.normpath(path)])
        except Exception as e:
            print("Failed to open location:", e)

api = Api()

def start_server():
    app.run(port=3001, debug=False, use_reloader=False)

if __name__ == '__main__':
    t = threading.Thread(target=start_server, daemon=True)
    t.start()
    
    window = webview.create_window('Tidr - Clean your drive', 'http://127.0.0.1:3001/', width=1280, height=800, resizable=False, frameless=False, js_api=api)
    api.set_window(window)
    webview.start()
    sys.exit()
