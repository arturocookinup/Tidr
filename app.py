from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import mimetypes
from send2trash import send2trash
import random

import sys

app = Flask(__name__)
CORS(app)

def get_resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.abspath("."), relative_path)

@app.route('/')
def serve_index():
    return send_file(get_resource_path('index.html'))

@app.route('/<path:filename>')
def serve_static(filename):
    path = get_resource_path(filename)
    if os.path.exists(path) and os.path.isfile(path):
        return send_file(path)
    return "Not found", 404

def get_folder_summary(path):
    count = 0
    size = 0
    preview_files = []
    try:
        # Shallow summary to prevent hanging on massive dirs
        for entry in os.scandir(path):
            count += 1
            if count <= 6 and entry.is_file(follow_symlinks=False):
                preview_files.append(entry.name)
            if count > 1000: # clamp at 1000 for speed
                break
            if entry.is_file(follow_symlinks=False):
                size += entry.stat(follow_symlinks=False).st_size
    except Exception:
        pass
    
    size_str = f"{size / (1024*1024):.1f} MB" if size > 1024*1024 else f"{size / 1024:.1f} KB"
    return {
        "text": f"{count}{'+' if count >= 1000 else ''} items, ~{size_str}",
        "preview_files": preview_files
    }

@app.route('/api/scan', methods=['POST'])
def scan():
    data = request.json
    directory = data.get('path')
    filters = data.get('filters', {})
    
    want_images = filters.get('images', True)
    want_videos = filters.get('videos', True)
    want_audio = filters.get('audio', True)
    want_documents = filters.get('documents', True)
    want_folders = filters.get('folders', True)
    want_others = filters.get('others', True)

    if not directory or not os.path.exists(directory):
        return jsonify({"error": "Invalid path"}), 400
    
    files_data = []
    
    try:
        # Use os.scandir for immediate children only
        with os.scandir(directory) as entries:
            for entry in entries:
                file_path = entry.path
                name = entry.name
                
                # Exclude hidden files or system files usually (simple dot check)
                if name.startswith('.'):
                    continue
                
                if entry.is_dir(follow_symlinks=False):
                    if not want_folders: continue
                    summary_data = get_folder_summary(file_path)
                    files_data.append({
                        "path": file_path,
                        "name": name,
                        "size": 0, # folders have undefined immediate size
                        "type": "folder",
                        "mime": "inode/directory",
                        "summary": summary_data["text"],
                        "preview_files": summary_data["preview_files"]
                    })
                elif entry.is_file(follow_symlinks=False):
                    try:
                        size = entry.stat(follow_symlinks=False).st_size
                        mime_type, _ = mimetypes.guess_type(file_path)
                        
                        type_group = "unknown"
                        if mime_type:
                            if mime_type.startswith('image'): type_group = "image"
                            elif mime_type.startswith('video'): type_group = "video"
                            elif mime_type.startswith('audio'): type_group = "audio"
                            elif mime_type.startswith('text'): type_group = "document"
                            elif 'pdf' in mime_type: type_group = "document"
                        elif name.lower().endswith(('.txt', '.md', '.json', '.csv', '.log', '.js', '.py', '.html', '.css', '.xml', '.yaml', '.yml', '.ini', '.doc', '.docx')):
                            type_group = "document"
                            
                        # Filter check
                        if type_group == "image" and not want_images: continue
                        if type_group == "video" and not want_videos: continue
                        if type_group == "audio" and not want_audio: continue
                        if type_group == "document" and not want_documents: continue
                        if type_group == "unknown" and not want_others: continue
                            
                        files_data.append({
                            "path": file_path,
                            "name": name,
                            "size": size,
                            "type": type_group,
                            "mime": mime_type,
                            "summary": "",
                            "preview_files": []
                        })
                    except Exception as e:
                        continue
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Shuffle for the tinder-like experience
    random.shuffle(files_data)
    return jsonify({"files": files_data})

@app.route('/api/media')
def get_media():
    path = request.args.get('path')
    if not path or not os.path.exists(path):
        return "Not found", 404
    return send_file(path, conditional=True)

@app.route('/api/text')
def get_text():
    path = request.args.get('path')
    if not path or not os.path.exists(path):
        return jsonify({"error": "Not found"}), 404
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(2000)
            return jsonify({"content": content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/cleanup', methods=['POST'])
def cleanup():
    data = request.json
    paths = data.get('paths', [])
    success_count = 0
    errors = []
    
    # send2trash inherently moves things to the recycle bin instead of permanently deleting
    for p in paths:
        try:
            if os.path.exists(p):
                send2trash(os.path.normpath(p))
                success_count += 1
        except Exception as e:
            errors.append({"path": p, "error": str(e)})
            
    return jsonify({"success": success_count, "errors": errors})

if __name__ == '__main__':
    app.run(port=3001, debug=True)
