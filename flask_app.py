from flask import Flask, request, jsonify, render_template
import json
import os
from datetime import datetime

# Creates the Flask application object
app = Flask(__name__)

# BASE_DIR = current folder
# DATA_FILE = path to reflections.json, the file where reflections are stored
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "backend", "reflections.json")

# Function to read reflections from reflections.json
# If the file does not exist, return an empty list
def load_reflections():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return []

# Function to save reflections back into reflections.json
# indent=4 makes it human-readable
def save_reflections(reflections):
    # Ensure backend directory exists
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(reflections, f, indent=4)

# Routes
@app.route("/")
def journal():
    """Journal page route"""
    return render_template("journal.html")

@app.route("/projects")
def projects():
    """Projects page route"""
    return render_template("projects.html")

@app.route("/about")
def about():
    """About page route"""
    return render_template("about.html")

@app.route("/index")
def index():
    """Homepage route - serves the main form"""
    return render_template("index.html")

# PWA Routes
@app.route('/manifest.json')
def manifest():
    """Serve manifest.json from static folder"""
    return app.send_static_file('manifest.json')

@app.route('/sw.js')
def service_worker():
    """Serve service worker with correct headers"""
    response = app.send_static_file('js/sw.js')
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Service-Worker-Allowed'] = '/'
    return response

# API Routes
@app.route("/api/reflections", methods=["GET"])
def get_reflections():
    """GET /reflections: Returns reflections.json as JSON"""
    reflections = load_reflections()
    return jsonify(reflections)

@app.route("/api/reflections", methods=["POST"])
def add_reflection():
    """POST /add_reflection: Accepts JSON from frontend and appends it to reflections.json"""
    data = request.get_json()
    
    if not data or 'name' not in data or 'reflection' not in data:
        return jsonify({"error": "Name and reflection are required"}), 400
    
    new_reflection = {
        "id": datetime.now().strftime("%Y%m%d%H%M%S"),
        "name": data["name"],
        "date": datetime.now().strftime("%a %b %d %Y"),
        "reflection": data["reflection"],
        "timestamp": datetime.now().isoformat()
    }
    
    reflections = load_reflections()
    reflections.append(new_reflection)
    save_reflections(reflections)
    return jsonify(new_reflection), 201

@app.route("/api/reflections/<reflection_id>", methods=["DELETE"])
def delete_reflection(reflection_id):
    """DELETE /reflections/<id>: Deletes a specific reflection"""
    reflections = load_reflections()
    original_count = len(reflections)
    
    # Filter out the reflection with matching id
    reflections = [r for r in reflections if r.get('id') != reflection_id]
    
    if len(reflections) == original_count:
        return jsonify({"error": "Reflection not found"}), 404
    
    save_reflections(reflections)
    return jsonify({"message": "Reflection deleted successfully"}), 200



if __name__ == "__main__":
    app.run(debug=True)