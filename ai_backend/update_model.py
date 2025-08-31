import json
import pandas as pd
from pathlib import Path
from train_model import build_dataset, FILE_TYPES, Sample, MultiOutputClassifier, RandomForestClassifier, ColumnTransformer, OneHotEncoder, Pipeline
from joblib import dump

# Paths
FEEDBACK_FILE = Path("feedback/feedback_log.jsonl")
MODEL_PATH = Path("models/filter_syn_v1.3.joblib")

def load_feedback() -> pd.DataFrame:
    if not FEEDBACK_FILE.exists():
        print("No feedback found, skipping update.")
        return pd.DataFrame()
    
    rows = []
    with open(FEEDBACK_FILE) as f:
        for line in f:
            entry = json.loads(line)
            features = entry["features"]
            ai = entry["ai_suggestion"]
            user_override = entry.get("user_override", False)

            # Flip labels if user overrode AI
            label = {
                "removeNumbers": ai["removeNumbers"] ^ user_override,
                "removePunctuation": ai["removePunctuation"] ^ user_override,
                "toLowercase": ai["toLowercase"] ^ user_override,
            }

            rows.append({**features, **label})
    
    return pd.DataFrame(rows)

def main():
    feedback_df = load_feedback()
    if feedback_df.empty:
        print("No feedback data to update model.")
        return

    numeric_features = ["keyword_count", "line_count", "comment_ratio", "unused_imports"]
    X = feedback_df[["file_type"] + numeric_features]
    y = feedback_df[["removeNumbers", "removePunctuation", "toLowercase"]]

    encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    encoder.fit(X[["file_type"]])

    pre = ColumnTransformer(
        transformers=[("ft", encoder, ["file_type"])],
        remainder="passthrough",
        verbose_feature_names_out=True,
    )

    rf = RandomForestClassifier(n_estimators=250, max_depth=None, min_samples_split=4, n_jobs=-1, random_state=42)
    clf = Pipeline(steps=[("pre", pre), ("model", MultiOutputClassifier(rf, n_jobs=-1))])

    clf.fit(X, y)

    metadata = {"labels": list(y.columns), "features": list(X.columns), "file_types": FILE_TYPES}
    dump({"pipeline": clf, "metadata": metadata}, MODEL_PATH)
    print(f"Updated model saved → {MODEL_PATH}")

if __name__ == "__main__":
    main()
