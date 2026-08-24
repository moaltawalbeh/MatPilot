"""Tests for the in-process sliding-window rate limiter."""

import time

import pytest
from fastapi import HTTPException, Request

from backend.infrastructure.security import rate_limiter
from backend.infrastructure.security.rate_limiter import (
    SlidingWindowRateLimiter,
    check_rate_limit,
    get_limiter,
    rate_limit_dependency,
)


def test_allow_within_budget():
    limiter = SlidingWindowRateLimiter(max_requests=3, window_seconds=60)
    assert limiter.allow("k") is True
    assert limiter.allow("k") is True
    assert limiter.allow("k") is True
    assert limiter.allow("k") is False


def test_allow_is_per_key():
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=60)
    assert limiter.allow("a") is True
    assert limiter.allow("a") is True
    assert limiter.allow("a") is False
    assert limiter.allow("b") is True


def test_window_slides_after_expiry():
    limiter = SlidingWindowRateLimiter(max_requests=2, window_seconds=1)
    assert limiter.allow("k") is True
    assert limiter.allow("k") is True
    assert limiter.allow("k") is False
    time.sleep(1.1)
    assert limiter.allow("k") is True


def test_retry_after_is_positive_when_blocked():
    limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
    assert limiter.allow("k") is True
    assert limiter.allow("k") is False
    assert limiter.retry_after("k") > 0
    assert limiter.retry_after("unknown") == 0


def test_reset_clears_state():
    limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
    assert limiter.allow("k") is True
    assert limiter.allow("k") is False
    limiter.reset()
    assert limiter.allow("k") is True


def test_invalid_configuration_raises():
    with pytest.raises(ValueError):
        SlidingWindowRateLimiter(max_requests=0, window_seconds=60)
    with pytest.raises(ValueError):
        SlidingWindowRateLimiter(max_requests=5, window_seconds=-1)


def test_disabled_limiter_always_allows(monkeypatch):
    monkeypatch.setattr(rate_limiter, "RATE_LIMIT_ENABLED", False)
    limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
    assert limiter.allow("k") is True
    assert limiter.allow("k") is True


def test_get_limiter_caches_instances():
    first = get_limiter("cache-test", 5, 900)
    second = get_limiter("cache-test", 5, 900)
    assert first is second
    different = get_limiter("cache-test", 6, 900)
    assert different is not first


def test_check_rate_limit_raises_http_429():
    scope = "test:check"
    for _ in range(2):
        check_rate_limit(scope, "user", 2, 900)
    with pytest.raises(HTTPException) as excinfo:
        check_rate_limit(scope, "user", 2, 900)
    assert excinfo.value.status_code == 429
    assert "Retry-After" in excinfo.value.headers
    assert int(excinfo.value.headers["Retry-After"]) > 0


def test_check_rate_limit_ignores_when_disabled(monkeypatch):
    monkeypatch.setattr(rate_limiter, "RATE_LIMIT_ENABLED", False)
    scope = "test:check-disabled"
    for _ in range(5):
        check_rate_limit(scope, "user", 1, 900)


def _make_request(host="1.2.3.4"):
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/auth/login",
        "query_string": b"",
        "headers": [],
        "client": (host, 1234),
    }
    return Request(scope)


async def test_rate_limit_dependency_returns_none_within_budget():
    dep = rate_limit_dependency("test:dep", 3, 900)
    request = _make_request()
    for _ in range(3):
        assert await dep(request) is None


async def test_rate_limit_dependency_raises_429_when_exceeded():
    dep = rate_limit_dependency("test:dep-429", 2, 900)
    request = _make_request()
    await dep(request)
    await dep(request)
    with pytest.raises(HTTPException) as excinfo:
        await dep(request)
    assert excinfo.value.status_code == 429
    assert "Retry-After" in excinfo.value.headers


async def test_rate_limit_dependency_is_per_ip():
    dep = rate_limit_dependency("test:dep-ip", 2, 900)
    await dep(_make_request("10.0.0.1"))
    await dep(_make_request("10.0.0.1"))
    with pytest.raises(HTTPException):
        await dep(_make_request("10.0.0.1"))
    assert await dep(_make_request("10.0.0.2")) is None


async def test_client_ip_honors_forwarded_for():
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/auth/login",
        "query_string": b"",
        "headers": [(b"x-forwarded-for", b"203.0.113.5, 10.0.0.1")],
        "client": ("10.0.0.1", 1234),
    }
    assert rate_limiter.client_ip(Request(scope)) == "203.0.113.5"
