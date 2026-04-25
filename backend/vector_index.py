import asyncio
from typing import Optional

import faiss
import numpy as np


class VectorIndex:
    """In-memory FAISS index with cosine similarity. Persisted data lives in MongoDB."""

    def __init__(self):
        self.index: Optional[faiss.Index] = None
        self.id_map: list[str] = []  # faiss position → MongoDB _id string
        self.dimension: int = 768
        self._lock = asyncio.Lock()

    def _init(self, dimension: int):
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)  # inner product on L2-normalized = cosine

    @staticmethod
    def _normalize(vectors: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        return vectors / norms

    async def build_from_db(self, db) -> None:
        """Rebuild index from embeddings stored in MongoDB (called at startup)."""
        async with self._lock:
            entries = await db.log_entries.find(
                {"embedding": {"$exists": True}},
                {"_id": 1, "embedding": 1},
            ).sort("faiss_id", 1).to_list(length=None)

            if not entries:
                self._init(self.dimension)
                return

            dim = len(entries[0]["embedding"])
            self._init(dim)
            self.id_map = []

            vectors = np.array([e["embedding"] for e in entries], dtype=np.float32)
            vectors = self._normalize(vectors)
            self.index.add(vectors)
            self.id_map = [str(e["_id"]) for e in entries]

    async def add(self, mongo_ids: list[str], embeddings: list[list[float]]) -> list[int]:
        """Add new vectors; returns the FAISS IDs assigned."""
        async with self._lock:
            if not embeddings:
                return []
            vectors = np.array(embeddings, dtype=np.float32)
            if self.index is None:
                self._init(vectors.shape[1])
            vectors = self._normalize(vectors)
            start = len(self.id_map)
            self.index.add(vectors)
            self.id_map.extend(mongo_ids)
            return list(range(start, start + len(mongo_ids)))

    async def search(self, embedding: list[float], top_k: int = 20) -> list[tuple[str, float]]:
        """Return [(mongo_id, score)] sorted by descending similarity."""
        async with self._lock:
            if self.index is None or self.index.ntotal == 0:
                return []
            vec = np.array([embedding], dtype=np.float32)
            vec = self._normalize(vec)
            k = min(top_k, self.index.ntotal)
            scores, indices = self.index.search(vec, k)
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if 0 <= idx < len(self.id_map):
                    results.append((self.id_map[idx], float(score)))
            return results


vector_index = VectorIndex()
