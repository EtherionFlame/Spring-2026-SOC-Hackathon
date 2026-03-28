"""
ollama_client.py — HTTP client for the local Ollama API (Mistral model).
"""

import json
import httpx

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "mistral"


def ask_ollama(prompt: str) -> str:
    """
    Send a prompt to the local Ollama Mistral model and return the response text.
    Raises ConnectionError if Ollama is not running.
    Raises ValueError if the response cannot be parsed.
    """
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
    }

    try:
        response = httpx.post(OLLAMA_URL, json=payload, timeout=120.0)
        response.raise_for_status()
    except httpx.ConnectError:
        raise ConnectionError(
            "Cannot connect to Ollama. Make sure it is running: `ollama serve`"
        )
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Ollama returned HTTP {e.response.status_code}: {e.response.text}")

    data = response.json()
    return data.get("response", "").strip()


def extract_json(text: str) -> dict:
    """
    Pull the first JSON object out of a (possibly noisy) Ollama response.
    """
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError(f"No JSON object found in Ollama response: {text!r}")
    return json.loads(text[start:end])
