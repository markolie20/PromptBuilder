from flask import Blueprint, render_template, request, jsonify
from .services.prompt_generator import combine_files

routes_bp = Blueprint("routes_bp", __name__)

@routes_bp.route("/")
def index():
    return render_template("index.html")

@routes_bp.route("/generate_prompt", methods=["POST"])
def generate_prompt():
    files = request.files.getlist("files")
    
    file_infos = []
    for file in files:
        # file.filename will contain the entire path if appended as webkitRelativePath
        path = file.filename
        # Read the file content (assuming UTF-8)
        content = file.read().decode("utf-8")
        file_infos.append({
            "full_path": path,
            "content": content
        })
    
    combined_text = combine_files(file_infos)
    return jsonify({"prompt": combined_text})
