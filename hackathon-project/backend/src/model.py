"""
model.py — Define or load your ML model here.
"""

def load_model(model_path: str = None):
    """
    Load and return your model.
    Example: return joblib.load(model_path)
    """
    # TODO: replace with your model loading logic
    model = None
    return model

# Singleton — load once at startup
model = load_model()
