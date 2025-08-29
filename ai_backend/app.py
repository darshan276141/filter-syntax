# app.py
from typing import List, Optional

import numpy as np
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, constr
from joblib import load

ARTIFACT = "models/filter_syn_v1.1.joblib"

bundle = load(ARTIFACT)
PIPELINE = bundle["pipeline"]
META = bundle["metadata"]

app = FastAPI(title="Filter-Syn AI", version=META["model_version"])

# CORS for local dev (adjust for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "vscode-webview://*", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Features(BaseModel):
    keyword_count: int = Field(ge=0)
    line_count: int = Field(ge=1)
    comment_ratio: float = Field(ge=0.0, le=1.0)
    unused_imports: int = Field(ge=0)
    file_type: constr(strip_whitespace=True) = "py"

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

@app.get("/v1/health")
def health():
    return {"status": "ok", "model_version": META["model_version"]}

def _predict_proba(instances: List[Features]):
    X = [{
        "file_type": f.file_type,
        "keyword_count": f.keyword_count,
        "line_count": f.line_count,
        "comment_ratio": f.comment_ratio,
        "unused_imports": f.unused_imports,
    } for f in instances]

    # MultiOutputClassifier predict_proba returns a list of arrays (one per target)
    probas_per_target = PIPELINE.named_steps["model"].estimators_
    # Transform X via preprocessor
    Xt = PIPELINE.named_steps["pre"].transform(pd.DataFrame(X))  # type: ignore

    # Compute probability for class 1 per target
    probs = []
    for est in probas_per_target:
        # est.predict_proba expects preprocessed features for RF inside MultiOutput
        p = est.predict_proba(Xt)  # shape (n, 2) for binary
        probs.append(p[:, 1])
    # shape (n_instances, n_targets)
    return np.vstack(probs).T

# Import pandas late to keep import time minimal if only health is probed
import pandas as pd

@app.post("/v1/predict", response_model=Prediction)
def predict(req: PredictRequest):
    probs = _predict_proba([req.instance])[0]
    labels = META["labels"]
    decision = {lbl: bool(probs[i] >= req.min_confidence) for i, lbl in enumerate(labels)}
    conf = {lbl: float(round(probs[i], 4)) for i, lbl in enumerate(labels)}
    return {
        **decision,
        "confidences": conf,
        "model_version": META["model_version"],
    }

@app.post("/v1/predict:batch")
def predict_batch(req: BatchPredictRequest):
    probs = _predict_proba(req.instances)
    labels = META["labels"]
    out = []
    for row in probs:
        decision = {lbl: bool(row[i] >= req.min_confidence) for i, lbl in enumerate(labels)}
        conf = {lbl: float(round(row[i], 4)) for i, lbl in enumerate(labels)}
        out.append({**decision, "confidences": conf, "model_version": META["model_version"]})
    return {"predictions": out}

if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=5001, reload=True)
