"""Tests for CIF Cache."""

import os
import pytest
import tempfile
import shutil
from backend.reference.cif_cache import CIFCache


class TestCIFCache:
    """Test persistent CIF caching."""

    def setup_method(self):
        self.test_dir = tempfile.mkdtemp()
        self.cache = CIFCache(cache_dir=self.test_dir)

    def teardown_method(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_store_and_retrieve_cif(self):
        """Test storing and retrieving CIF content."""
        cif_content = """
data_test
_cell_length_a  5.4301
"""
        assert self.cache.store_cif("12345", cif_content)
        assert self.cache.has_cif("12345")

        retrieved = self.cache.get_cif_content("12345")
        assert retrieved == cif_content

    def test_store_with_parsed_data(self):
        """Test storing CIF with parsed crystallographic data."""
        cif_content = "data_test\n_cell_length_a  5.4301"
        parsed = {"formula": "Si", "unit_cell": {"a": 5.4301}}

        assert self.cache.store_cif("12345", cif_content, parsed)

        retrieved_parsed = self.cache.get_parsed_data("12345")
        assert retrieved_parsed is not None
        assert retrieved_parsed["formula"] == "Si"
        assert retrieved_parsed["unit_cell"]["a"] == 5.4301

    def test_missing_cif(self):
        """Test retrieving non-existent CIF."""
        assert not self.cache.has_cif("99999")
        assert self.cache.get_cif_content("99999") is None
        assert self.cache.get_parsed_data("99999") is None

    def test_cache_index_persistence(self):
        """Test that cache index survives reload."""
        cif_content = "data_test\n_cell_length_a  5.4301"
        self.cache.store_cif("12345", cif_content)

        # Create new cache instance pointing to same directory
        cache2 = CIFCache(cache_dir=self.test_dir)
        assert cache2.has_cif("12345")
        assert cache2.get_cif_content("12345") == cif_content

    def test_cache_info(self):
        """Test cache metadata."""
        cif_content = "data_test\n_cell_length_a  5.4301"
        self.cache.store_cif("12345", cif_content)

        info = self.cache.get_cache_info("12345")
        assert info is not None
        assert "cached_at" in info
        assert "size_bytes" in info
        assert "content_hash" in info

    def test_list_cached_ids(self):
        """Test listing all cached IDs."""
        self.cache.store_cif("11111", "data_1")
        self.cache.store_cif("22222", "data_2")

        ids = self.cache.list_cached_ids()
        assert "11111" in ids
        assert "22222" in ids
        assert self.cache.cache_size() == 2

    def test_clear_cache(self):
        """Test clearing entire cache."""
        self.cache.store_cif("11111", "data_1")
        self.cache.store_cif("22222", "data_2")

        self.cache.clear()
        assert self.cache.cache_size() == 0
        assert not self.cache.has_cif("11111")

    def test_store_multiple_cifs(self):
        """Test storing multiple CIF files."""
        for i in range(5):
            self.cache.store_cif(f"ID{i:05d}", f"data_{i}")

        assert self.cache.cache_size() == 5
        for i in range(5):
            assert self.cache.has_cif(f"ID{i:05d}")
