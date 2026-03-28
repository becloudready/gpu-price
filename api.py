import requests
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

BASE_URL = "https://freellm.org/latest/all.json"

@app.route("/prices")
def get_prices():
    try:
        for i in range(5):  # try last 5 days
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            url = f"{BASE_URL}/{date}/all.json"

            response = requests.get(url)

            # ✅ check status BEFORE json()
            if response.status_code == 200:
                try:
                    data = response.json()
                    return jsonify(data)
                except Exception:
                    return jsonify({"error": "Invalid JSON format"}), 500

        return jsonify({"error": "No recent data found"}), 404

    except Exception as e:
        print("ERROR:", e)  # 👈 will show in terminal
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)