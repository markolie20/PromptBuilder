# PromptBuilder/app/routes.py
from flask import Blueprint, render_template, request, jsonify
import tiktoken

routes_bp = Blueprint("routes_bp", __name__)

@routes_bp.route("/")
def index():
    return render_template("index.html")

@routes_bp.route("/generate_prompt", methods=["POST"])
def generate_prompt_legacy():
    # Legacy endpoint block, we don't use this in the new JS 
    # but kept to prevent 404 if cached JS hits it.
    return jsonify({"error": "Please refresh page for client-side mode"})

@routes_bp.route("/count_tokens", methods=["POST"])
def count_tokens():
    """
    Receives a JSON body with 'text'. Returns token count.
    Used optionally by the client.
    """
    data = request.get_json()
    text = data.get("text", "")
    
    try:
        enc = tiktoken.encoding_for_model("gpt-4")
    except:
        enc = tiktoken.get_encoding("cl100k_base")
        
    token_count = len(enc.encode(text))
    
    return jsonify({
        "token_count": token_count
    })