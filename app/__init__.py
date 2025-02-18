from flask import Flask
from .routes import routes_bp
import os

def create_app():
    app = Flask(__name__)
    app.secret_key = "your_secret_key"
    
    # Register the blueprint
    app.register_blueprint(routes_bp)
    
    return app
