
import os

# Tests run against the in-memory container regardless of any local .env.
# Must be set before backend modules are imported so load_dotenv() (which does
# not override existing variables) leaves it empty.
os.environ["DATABASE_URL"] = ""

import pytest
from fastapi.testclient import TestClient

from backend.main import create_app


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def client(app):
    return TestClient(app)
