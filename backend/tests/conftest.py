"""Shared test configuration for backend/tests.

Ensures the repository root is importable so ``from backend...`` imports
resolve when pytest is invoked from the ``backend`` working directory.
"""

import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_REPO_ROOT = os.path.dirname(_BACKEND_DIR)

if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)
