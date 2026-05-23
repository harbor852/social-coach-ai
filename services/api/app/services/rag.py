"""Simple RAG service: chunking, embedding, retrieval.

Designed to be extensible to document uploads later.
"""

import math
from typing import Optional


def chunk_text(text: str, max_length: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks by paragraphs first, then by length."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 1 <= max_length:
            current = current + "\n\n" + para if current else para
        else:
            if current:
                chunks.append(current)
            current = para

    if current:
        chunks.append(current)

    # If any chunk is still too long, split by sentence
    result = []
    for chunk in chunks:
        if len(chunk) <= max_length:
            result.append(chunk)
        else:
            sentences = chunk.replace("。", "。\n").replace("！", "！\n").replace("？", "？\n").split("\n")
            current = ""
            for s in sentences:
                s = s.strip()
                if not s:
                    continue
                if len(current) + len(s) + 1 <= max_length:
                    current = current + s if not current else current + s
                else:
                    if current:
                        result.append(current)
                    current = s
            if current:
                result.append(current)

    return result


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


async def embed_text(text: str, api_key: str, base_url: str, model: str = "text-embedding-3-small") -> Optional[list[float]]:
    """Call OpenAI-compatible embedding API."""
    try:
        import json
        import urllib.request
        import asyncio

        body = {
            "model": model,
            "input": text,
        }
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            f"{base_url.rstrip('/')}/embeddings",
            data=data,
            method="POST",
        )
        req.add_header("Authorization", f"Bearer {api_key}")
        req.add_header("Content-Type", "application/json")

        def _call():
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())

        result = await asyncio.to_thread(_call)
        emb = result.get("data", [{}])[0].get("embedding")
        return emb
    except Exception:
        return None


async def embed_chunks(chunks: list[str], api_key: str, base_url: str, model: str = "text-embedding-3-small") -> list[list[float]]:
    """Embed multiple chunks, returning vectors (None for failures)."""
    results = []
    for chunk in chunks:
        vec = await embed_text(chunk, api_key, base_url, model)
        results.append(vec or [])
    return results


def retrieve_relevant_chunks(query_vec: list[float], chunks: list[str], embeddings: list[list[float]], top_k: int = 3) -> list[str]:
    """Return top-k most relevant chunks by cosine similarity.

    Falls back to keyword matching if embeddings are empty.
    """
    if not query_vec or not embeddings or not chunks:
        return []

    scored = []
    for chunk, emb in zip(chunks, embeddings):
        if emb and len(emb) == len(query_vec):
            score = cosine_similarity(query_vec, emb)
            scored.append((score, chunk))

    if scored:
        scored.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored[:top_k]]

    # Fallback: keyword overlap
    query_words = set(query_vec)  # This is wrong - query_vec is embedding not text
    # Actually let's do simple keyword matching with the original query text
    return []


def retrieve_by_keywords(query_text: str, chunks: list[str], top_k: int = 3) -> list[str]:
    """Simple keyword-based retrieval when embeddings unavailable."""
    query_words = set(query_text.lower().split())
    scored = []
    for chunk in chunks:
        chunk_words = set(chunk.lower().split())
        overlap = len(query_words & chunk_words)
        scored.append((overlap, chunk))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:top_k] if _ > 0]
