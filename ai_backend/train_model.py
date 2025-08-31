# train_model.py
import math
import random
from dataclasses import dataclass
from typing import List

import numpy as np
import pandas as pd
from joblib import dump
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.multioutput import MultiOutputClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
import os

# ----------------- Constants -----------------
MODEL_VERSION = "v1.3"  # Incremented version
ARTIFACT_PATH = f"models/filter_syn_{MODEL_VERSION}.joblib"
ENCODER_PATH = f"models/encoder_{MODEL_VERSION}.joblib"
NUMERIC_FEATURES_PATH = f"models/numeric_features_{MODEL_VERSION}.joblib"

random.seed(42)
np.random.seed(42)

FILE_TYPES = ["py", "js", "ts", "html", "css", "json", "md"]

# ----------------- Data Class -----------------
@dataclass
class Sample:
    file_type: str
    keyword_count: int
    line_count: int
    comment_ratio: float
    unused_imports: int
    removeNumbers: int
    removePunctuation: int
    toLowercase: int

# ----------------- Data Generation -----------------
def _gen_one(ft: str) -> Sample:
    avg_lines = {"py": 60, "js": 75, "ts": 80, "html": 120, "css": 90, "json": 40, "md": 70}[ft]
    line_count = max(3, int(np.random.normal(avg_lines, avg_lines * 0.35)))
    keyword_count = max(2, int(line_count * np.random.uniform(0.8, 2.2)))

    base_comment = {"py": 0.18, "js": 0.14, "ts": 0.14, "html": 0.06, "css": 0.07, "json": 0.0, "md": 0.0}[ft]
    comment_ratio = max(0.0, min(0.6, np.random.normal(base_comment, 0.06)))

    unused_imports = 0
    if ft in {"py", "js", "ts"}:
        unused_imports = np.random.binomial(1, 0.35)
        if line_count > 150:
            unused_imports = max(unused_imports, np.random.binomial(1, 0.2))

    remove_numbers = int(ft in {"py", "js", "ts"} and keyword_count > 80 and comment_ratio < 0.25)
    remove_punct = int(ft in {"js", "html", "md"} and comment_ratio < 0.15)
    to_lower = int(ft in {"md", "json"} or (ft in {"py", "js"} and line_count > 120))

    # Add some randomness
    def flip(bit, p=0.08):
        return int(bit ^ np.random.binomial(1, p))

    return Sample(
        file_type=ft,
        keyword_count=keyword_count,
        line_count=line_count,
        comment_ratio=round(comment_ratio, 3),
        unused_imports=int(unused_imports),
        removeNumbers=flip(remove_numbers),
        removePunctuation=flip(remove_punct),
        toLowercase=flip(to_lower),
    )

def build_dataset(n: int = 1500) -> pd.DataFrame:
    rows: List[Sample] = [_gen_one(random.choice(FILE_TYPES)) for _ in range(n)]
    df = pd.DataFrame([s.__dict__ for s in rows])
    return df

# ----------------- Main Training -----------------
def main():
    df = build_dataset(1500)
    numeric_features = ["keyword_count", "line_count", "comment_ratio", "unused_imports"]

    X = df[["file_type"] + numeric_features]
    y = df[["removeNumbers", "removePunctuation", "toLowercase"]]

    # Encode file_type
    encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    encoder.fit(X[["file_type"]])

    pre = ColumnTransformer(
        transformers=[("ft", encoder, ["file_type"])],
        remainder="passthrough",
        verbose_feature_names_out=True,
    )

    rf = RandomForestClassifier(
        n_estimators=250,
        max_depth=None,
        min_samples_split=4,
        n_jobs=-1,
        random_state=42,
    )

    clf = Pipeline(
        steps=[
            ("pre", pre),
            ("model", MultiOutputClassifier(rf, n_jobs=-1)),
        ]
    )

    # Train the model
    clf.fit(X, y)

    # Evaluate on training set
    preds = clf.predict(X)
    print(classification_report(y, preds, target_names=y.columns))

    # Save artifacts
    os.makedirs("models", exist_ok=True)
    dump({"pipeline": clf, "metadata": {"model_version": MODEL_VERSION, "labels": list(y.columns), "features": list(X.columns), "file_types": FILE_TYPES}}, ARTIFACT_PATH)
    dump(encoder, ENCODER_PATH)
    dump(numeric_features, NUMERIC_FEATURES_PATH)

    print(f"Saved pipeline → {ARTIFACT_PATH}")
    print(f"Saved encoder → {ENCODER_PATH}")
    print(f"Saved numeric features → {NUMERIC_FEATURES_PATH}")

if __name__ == "__main__":
    main()
