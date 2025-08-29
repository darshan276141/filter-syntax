from flask import Flask, request, jsonify
from joblib import load
import pandas as pd
import numpy as np

app = Flask(__name__)

# Load trained model and encoder
model = load('filter_model.joblib')
encoder = load('encoder.joblib')

# Default features in case some are missing
DEFAULT_FEATURES = {
    "keyword_count": 0,
    "line_count": 1,
    "comment_ratio": 0.0,
    "unused_imports": 0,
    "file_type": "py"
}

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json or {}
    
    # Validate and fill defaults
    features = {k: data.get(k, v) for k, v in DEFAULT_FEATURES.items()}
    
    # One-hot encode file_type
    try:
        file_type_encoded = encoder.transform([[features['file_type']]])
    except ValueError:
        # Unknown file_type → default all zeros
        file_type_encoded = np.zeros((1, len(encoder.get_feature_names_out())))
    
    file_type_cols = encoder.get_feature_names_out()
    df_encoded = pd.DataFrame(file_type_encoded, columns=file_type_cols)

    # Combine all features
    X = pd.DataFrame([[
        features['keyword_count'],
        features['line_count'],
        features['comment_ratio'],
        features['unused_imports']
    ]], columns=['keyword_count', 'line_count', 'comment_ratio', 'unused_imports'])
    
    X = pd.concat([X, df_encoded], axis=1)

    # Predict
    pred = model.predict(X)
    
    # Map prediction to filters (example heuristic)
    if int(pred[0]) == 1:
        result = {
            "removeNumbers": 1 if features['file_type'] in ['py', 'js'] else 0,
            "removePunctuation": 1 if features['file_type'] in ['js', 'html'] else 0,
            "toLowercase": 0
        }
    else:
        result = {"removeNumbers": 0, "removePunctuation": 0, "toLowercase": 0}

    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5001)
