"""In-process cache, standing in for Redis.

Correct for a single-instance deployment (which is what running this
without Docker/orchestration means). Only used to avoid re-generating an
identical MCQ set twice in a row — losing this cache on restart just means
the next matching request regenerates the questions, nothing breaks.
"""
import hashlib
from cachetools import TTLCache

_cache: TTLCache = TTLCache(maxsize=500, ttl=1800)  # 30 min, matches prior Redis TTL


def make_key(*parts: str) -> str:
    raw = "|".join(parts)
    return "nr:" + hashlib.sha256(raw.encode()).hexdigest()[:24]


async def cache_get(key: str):
    return _cache.get(key)


async def cache_set(key: str, value, ttl_seconds: int = 1800):
    # ttl_seconds is accepted for API compatibility with callers but this
    # cache uses one global TTL (set above); fine for our single use case.
    _cache[key] = value
