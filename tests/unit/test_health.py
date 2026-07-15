
import pytest


def test_health_endpoint_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_health_endpoint_returns_correct_structure(client):
    response = client.get("/health")
    data = response.json()
    assert "status" in data
    assert "version" in data


def test_health_endpoint_returns_healthy_status(client):
    response = client.get("/health")
    data = response.json()
    assert data["status"] == "healthy"


def test_health_endpoint_returns_version_02(client):
    response = client.get("/health")
    data = response.json()
    assert data["version"] == "0.2"
