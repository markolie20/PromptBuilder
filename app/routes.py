# PromptBuilder/app/routes.py
from flask import Blueprint, render_template, request, jsonify
import json
from .services.prompt_generator import combine_files
import tiktoken

routes_bp = Blueprint("routes_bp", __name__)

@routes_bp.route("/")
def index():
    return render_template("index.html")

@routes_bp.route("/generate_prompt", methods=["POST"])
def generate_prompt():
    # 1) All selected files
    files = request.files.getlist("files")

    # 2) The full tree sent from the client
    all_paths = json.loads(request.form.get("all_paths", "[]"))

    # 3) Read contents
    file_infos = []
    for f in files:
        content = f.read().decode("utf-8", errors="ignore")
        file_infos.append({"full_path": f.filename, "content": content})

    # 4) Combine folder‐structure + selected contents
    combined = combine_files(file_infos, all_paths)

    # 5) Word count
    word_count = len(combined.split())

    # 6) Token count via tiktoken
    enc = tiktoken.encoding_for_model("gpt-4")
    token_count = len(enc.encode(combined))

    return jsonify({
        "prompt": combined,
        "word_count": word_count,
        "token_count": token_count
    })
