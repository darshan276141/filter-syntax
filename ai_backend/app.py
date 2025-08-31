# app.py
from typing import List, Annotated
import pandas as pd
import numpy as np
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from joblib import load
from pathlib import Path

# ----------------- Load versioned artifacts -----------------
MODEL_VERSION = "v1.3"
ARTIFACT_PATH = Path(f"models/filter_syn_{MODEL_VERSION}.joblib")

MODEL_BUNDLE = load(ARTIFACT_PATH)
MODEL = MODEL_BUNDLE["pipeline"]
META = MODEL_BUNDLE["metadata"]
LABELS = META["labels"]

# ----------------- FastAPI Setup -----------------
app = FastAPI(title="Filter-Syn AI", version=MODEL_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "vscode-webview://*", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Schemas -----------------
class Features(BaseModel):
    keyword_count: int = Field(ge=0)
    line_count: int = Field(ge=1)
    comment_ratio: float = Field(ge=0.0, le=1.0)
    unused_imports: int = Field(ge=0)
    file_type: Annotated[str, Field()] = "py"

class PredictRequest(BaseModel):
    instance: Features
    min_confidence: float = Field(0.55, ge=0.0, le=1.0)

class BatchPredictRequest(BaseModel):
    instances: List[Features]
    min_confidence: float = Field(0.55, ge=0.0, le=1.0)

class Prediction(BaseModel):
    removeNumbers: bool
    removePunctuation: bool
    toLowercase: bool
    confidences: dict
    model_version: str

# ----------------- Helper Functions -----------------
def _instances_to_df(instances: List[Features]) -> pd.DataFrame:
    """Convert list of Features to a DataFrame compatible with the trained pipeline."""
    df = pd.DataFrame([f.dict() for f in instances])
    for col in ["keyword_count", "line_count", "comment_ratio", "unused_imports", "file_type"]:
        if col not in df:
            df[col] = 0 if col != "file_type" else "py"
    df = df[["file_type", "keyword_count", "line_count", "comment_ratio", "unused_imports"]]
    return df

def _predict_proba(instances: List[Features]) -> np.ndarray:
    """Return probability of class 1 for each label per instance."""
    X = _instances_to_df(instances)
    probs = MODEL.predict_proba(X)  # pipeline handles preprocessing
    # For multi-output classifier, extract probability of class 1 for each label
    probs_matrix = np.column_stack([p[:, 1] for p in probs])
    return probs_matrix

# ----------------- Routes -----------------
@app.get("/v1/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION}

@app.post("/v1/predict", response_model=Prediction)
def predict(req: PredictRequest):
    try:
        probs = _predict_proba([req.instance])[0]
        decision = {lbl: bool(probs[i] >= req.min_confidence) for i, lbl in enumerate(LABELS)}
        conf = {lbl: float(round(probs[i], 4)) for i, lbl in enumerate(LABELS)}
        return {**decision, "confidences": conf, "model_version": MODEL_VERSION}
    except Exception as e:
        return {
            "removeNumbers": False,
            "removePunctuation": False,
            "toLowercase": False,
            "confidences": {},
            "model_version": MODEL_VERSION,
            "error": str(e)
        }

@app.post("/v1/predict:batch")
def predict_batch(req: BatchPredictRequest):
    try:
        probs = _predict_proba(req.instances)
        out = []
        for row in probs:
            decision = {lbl: bool(row[i] >= req.min_confidence) for i, lbl in enumerate(LABELS)}
            conf = {lbl: float(round(row[i], 4)) for i, lbl in enumerate(LABELS)}
            out.append({**decision, "confidences": conf, "model_version": MODEL_VERSION})
        return {"predictions": out}
    except Exception as e:
        return {"error": str(e), "predictions": []}

# ----------------- Run -----------------
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=5001, reload=True)
