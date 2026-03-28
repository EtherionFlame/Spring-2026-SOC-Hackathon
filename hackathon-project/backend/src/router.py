from fastapi import APIRouter
from src.predict import predict

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "healthy"}

@router.post("/predict")
def run_prediction(payload: dict):
    """
    Main prediction endpoint.
    Replace with your actual input schema and logic.
    """
    result = predict(payload)
    return {"result": result}
