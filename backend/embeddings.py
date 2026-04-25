import asyncio
import httpx
from config import settings

# In-process cache: same message text → same embedding (deduplicate repeat lines)
_cache: dict[str, list[float]] = {}


async def _embed_one(text: str, client: httpx.AsyncClient) -> list[float]:
    if text in _cache:
        return _cache[text]
    response = await client.post(
        f"{settings.ollama_url}/api/embeddings",
        json={"model": settings.ollama_embed_model, "prompt": text},
    )
    response.raise_for_status()
    emb = response.json()["embedding"]
    _cache[text] = emb
    return emb


async def get_embedding(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        return await _embed_one(text, client)


async def get_embeddings_batch(texts: list[str], concurrency: int = 5) -> list[list[float]]:
    """Embed a list of texts with bounded concurrency and deduplication cache."""
    sem = asyncio.Semaphore(concurrency)

    async def bounded(text: str) -> list[float]:
        async with sem:
            return await _embed_one(text, client)

    async with httpx.AsyncClient(timeout=60.0) as client:
        return list(await asyncio.gather(*[bounded(t) for t in texts]))
