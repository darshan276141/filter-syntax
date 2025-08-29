from flask import Flask, request, jsonify
from joblib import load
import pandas as pd

app = Flask(__name__)
model = load('filter_model.joblib')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    df = pd.DataFrame([data])

    # AI predicts whether to apply filter
    pred = model.predict(df[['keyword_count']])

    # Map prediction to filters
    if int(pred[0]) == 1:
        # Example heuristic: apply filters based on file type
        file_type = data.get('file_type', 'py')
        result = {
            "removeNumbers": 1 if file_type in ['py', 'js'] else 0,
            "removePunctuation": 1 if file_type in ['js', 'html'] else 0,
            "toLowercase": 0
        }
    else:
        result = {"removeNumbers": 0, "removePunctuation": 0, "toLowercase": 0}

    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5001)
