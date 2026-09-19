from fastapi import FastAPI
from pydantic import BaseModel

from ml.predictor import predict

app = FastAPI(title="Helpdesk AI Service")


class PredictRequest(BaseModel):
    subject: str
    description: str


class PredictResponse(BaseModel):
    category: str
    confidence: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict_category(payload: PredictRequest):
    return predict(payload.subject, payload.description)
