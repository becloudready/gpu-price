import os
from flask import Flask, jsonify
import json
from flask_cors import CORS  # <--- add this

app = Flask(__name__)
CORS(app)  # <--- allow cross-origin requests from frontend

# Path to merged_prices.json
JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "merged_prices.json")

@app.route("/prices")
def get_prices():
    if not os.path.exists(JSON_PATH):
        return jsonify({"error": "merged_prices.json not found"}), 404
    with open(JSON_PATH) as f:
        data = json.load(f)
    return jsonify(data)

if __name__ == "__main__":
    app.run(debug=True)
