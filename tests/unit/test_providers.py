
import pytest


def test_providers_endpoint_returns_200(client):
    response = client.get("/providers")
    assert response.status_code == 200


def test_providers_endpoint_returns_list(client):
    response = client.get("/providers")
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_providers_endpoint_returns_cod(client):
    response = client.get("/providers")
    data = response.json()
    provider_names = [p["name"] for p in data]
    assert "COD" in provider_names


def test_providers_endpoint_returns_all_expected_providers(client):
    response = client.get("/providers")
    data = response.json()
    provider_names = [p["name"] for p in data]
    expected = ["COD", "MaterialsProject", "OQMD", "AFLOW", "NOMAD", "MaterialsCloud"]
    for name in expected:
        assert name in provider_names, f"Provider {name} not found"


def test_providers_endpoint_returns_provider_structure(client):
    response = client.get("/providers")
    data = response.json()
    for provider in data:
        assert "name" in provider
        assert "display_name" in provider
        assert "description" in provider
        assert "is_available" in provider
        assert "supported_features" in provider
