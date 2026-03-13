from flask import Flask, request, jsonify
from flask_cors import CORS
from tools.scan_mnemonic import scan_mnemonic

app = Flask(__name__)
CORS(app)


@app.route("/api/result", methods=["POST"])
def result():
    data = request.get_json()
    words = data.get("words", [])
    print("recv:", words)

    res = scan_mnemonic(words)

    response = {
        "message": "receive words.",
        "count": len(words),
        "words": words,
        "res": res,
    }
    return jsonify(response)


if __name__ == "__main__":
    app.run(debug=True)
