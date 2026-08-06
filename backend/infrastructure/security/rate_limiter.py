"""In-process sliding-window rate limiting.

A small, dependency-free limiter used to protect auth endpoints from abuse
(credential stuffing, verification-code guessing, email bombing). Limits are
per ``(scope, client key)`` using a sliding window of monotonically-increasing
timestamps, so bursts are bounded within any rolling window rather than per
wall-clock bucket.

The limiter is in-memory: suitable for a single app process. Production
deployments that run multiple replicas should swap this for a shared store
(e.g. Redis) behind the same ``allow()/retry_after()`` interface.
"""

import os
import time
import threading
from collections import defaultdict, deque
from typing import Optional, Tuple

from fastapi import HTTPException, Request

# Global switches, tunable via environment.
RATE_LIMIT_ENABLED = os.environ.get("MATPILOT_RATE_LIMIT_ENABLED", "true").lower() == "true"
# Default sliding window for auth limits (15 minutes).
RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("MATPILOT_RATE_LIMIT_WINDOW_SECONDS", "900"))


class RateLimitExceeded(Exception):
    """Raised when a key exceeds its configured request budget."""

    def __init__(self, retry_after: int):
        self.retry_after = int(retry_after)
        super().__init__(f"Rate limit exceeded; retry after {self.retry_after}s")


class SlidingWindowRateLimiter:
    """Sliding-window limiter keyed by an arbitrary string.

    Thread-safe: FastAPI may dispatch handlers across threads/workers, and the
    limiter is shared process-wide.
    """

    def __init__(self, max_requests: int, window_seconds: int):
        if max_requests <= 0 or window_seconds <= 0:
            raise ValueError("max_requests and window_seconds must be positive")
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        """Record a hit for ``key`` and report whether it stays within budget."""
        if not RATE_LIMIT_ENABLED:
            return True
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= self.max_requests:
                self._sweep(cutoff)
                return False
            hits.append(now)
            self._sweep(cutoff)
            return True

    def retry_after(self, key: str) -> int:
        """Seconds until the oldest recorded hit for ``key`` leaves the window."""
        if not RATE_LIMIT_ENABLED:
            return 0
        with self._lock:
            hits = self._hits.get(key)
            if not hits:
                return 0
            oldest = hits[0]
            return max(1, int(self.window_seconds - (time.monotonic() - oldest)) + 1)

    def _sweep(self, cutoff: float) -> None:
        """Drop empty entries to avoid unbounded growth of the key map."""
        if len(self._hits) <= 10_000:
            return
        for k in [k for k, d in self._hits.items() if not d]:
            del self._hits[k]

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


# Registry of limiter instances keyed by their configuration.
_limiters: dict[Tuple[str, int, int], SlidingWindowRateLimiter] = {}
_limiters_lock = threading.Lock()


def get_limiter(
    scope: str,
    max_requests: int,
    window_seconds: int = RATE_LIMIT_WINDOW_SECONDS,
) -> SlidingWindowRateLimiter:
    """Return the shared limiter for a (scope, budget) configuration."""
    key = (scope, int(max_requests), int(window_seconds))
    with _limiters_lock:
        limiter = _limiters.get(key)
        if limiter is None:
            limiter = SlidingWindowRateLimiter(
                max_requests=int(max_requests),
                window_seconds=int(window_seconds),
            )
            _limiters[key] = limiter
        return limiter


def client_ip(request: Request) -> str:
    """Best-effort client IP, honoring the first ``X-Forwarded-For`` hop."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    client = request.client
    return client.host if client else "unknown"


def rate_limit_dependency(
    scope: str,
    max_requests: int,
    window_seconds: int = RATE_LIMIT_WINDOW_SECONDS,
):
    """Build a FastAPI dependency enforcing a per-client-IP request budget.

    Usage: ``@router.post("/x", dependencies=[Depends(rate_limit_dependency("auth:x", 10))])``
    """

    async def dependency(request: Request) -> None:
        if not RATE_LIMIT_ENABLED:
            return
        limiter = get_limiter(scope, max_requests, window_seconds)
        key = f"{scope}:{client_ip(request)}"
        if not limiter.allow(key):
            retry_after = limiter.retry_after(key)
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency


def check_rate_limit(
    scope: str,
    key: str,
    max_requests: int,
    window_seconds: int = RATE_LIMIT_WINDOW_SECONDS,
) -> None:
    """Non-request variant for handler-level checks (e.g. per-email limits)."""
    if not RATE_LIMIT_ENABLED:
        return
    limiter = get_limiter(scope, max_requests, window_seconds)
    if not limiter.allow(f"{scope}:{key}"):
        retry_after = limiter.retry_after(f"{scope}:{key}")
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )
