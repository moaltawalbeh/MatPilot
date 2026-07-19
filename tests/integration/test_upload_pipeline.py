
"""
Integration tests for the full upload pipeline.

Tests the complete flow: Upload → Parse → Create Experiment → Pipeline → Results.
Uses real instrument-like files for all supported formats.
"""

import pytest
from io import BytesIO
from fastapi.testclient import TestClient


@pytest.fixture
def project_id(client):
    response = client.post(
        "/projects",
        json={"name": "Integration Test Project", "material": "Si"}
    )
    return response.json()["id"]


class TestUploadPipelineIntegration:
    """End-to-end upload pipeline tests for each format."""

    def _upload_and_verify(self, client, project_id, filename, data, content_type, expected_format):
        """Upload a file and verify the full response."""
        response = client.post(
            "/upload",
            files={"file": (filename, BytesIO(data), content_type)},
            data={"project_id": project_id}
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        result = response.json()

        assert result["is_valid"] is True
        assert result["detected_format"] == expected_format
        assert result["file_id"]
        assert result["experiment_id"]
        assert result["job_id"]
        assert result["analysis_started"] is True
        assert result["data_points"] > 0, f"No data points parsed from {filename}"
        assert result["two_theta_range"] is not None
        assert len(result["two_theta"]) > 0, f"No two_theta array returned for {filename}"
        assert len(result["intensity"]) > 0, f"No intensity array returned for {filename}"
        assert len(result["two_theta"]) == len(result["intensity"]), "Array length mismatch"

        return result

    def test_xy_upload_pipeline(self, client, project_id):
        """Full pipeline with XY format (space-separated)."""
        lines = []
        for i in range(100):
            angle = 10.0 + i * 0.1
            intensity = 100 + 500 * (1 if 28 < angle < 29 else 0) + 200 * (1 if 47 < angle < 48 else 0)
            lines.append(f"{angle:.2f} {intensity:.1f}")
        data = "\n".join(lines).encode("utf-8")

        result = self._upload_and_verify(client, project_id, "silicon.xy", data, "text/plain", "XY")
        assert result["data_points"] == 100
        assert result["two_theta_range"][0] == pytest.approx(10.0, abs=0.01)
        assert result["two_theta_range"][1] == pytest.approx(19.9, abs=0.01)

    def test_csv_upload_pipeline(self, client, project_id):
        """Full pipeline with CSV format (comma-separated)."""
        lines = []
        for i in range(50):
            angle = 20.0 + i * 0.5
            intensity = 50 + 300 * (1 if 30 < angle < 32 else 0)
            lines.append(f"{angle:.3f},{intensity:.2f}")
        data = "\n".join(lines).encode("utf-8")

        result = self._upload_and_verify(client, project_id, "pattern.csv", data, "text/csv", "XY")
        assert result["data_points"] == 50

    def test_txt_upload_pipeline(self, client, project_id):
        """Full pipeline with TXT format (tab-separated)."""
        lines = []
        for i in range(80):
            angle = 5.0 + i * 0.2
            intensity = 200 + 800 * (1 if 15 < angle < 16 else 0) + 150 * (1 if 40 < angle < 41 else 0)
            lines.append(f"{angle:.2f}\t{intensity:.1f}")
        data = "\n".join(lines).encode("utf-8")

        result = self._upload_and_verify(client, project_id, "sample.txt", data, "text/plain", "XY")
        assert result["data_points"] == 80

    def test_xrdml_upload_pipeline(self, client, project_id):
        """Full pipeline with XRDML format (PANalytical XML)."""
        angles = [10.0 + i * 0.02 for i in range(500)]
        intensities = []
        for a in angles:
            val = 100
            if 25 < a < 30:
                val = 2000 * (1 - abs(a - 27.5) / 2.5)
            elif 45 < a < 50:
                val = 1500 * (1 - abs(a - 47.5) / 2.5)
            elif 55 < a < 58:
                val = 800 * (1 - abs(a - 56.5) / 1.5)
            intensities.append(max(0, val + 10))

        intensity_str = " ".join(f"{v:.1f}" for v in intensities)

        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<xrdMeasurements xmlns="http://www.panalytical.com/2007/xrdml"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <generator>MatPilot Test</generator>
    <status>Ok</status>
    <title>Silicon powder XRD</title>
    <sample>
        <name>Si powder</name>
    </sample>
    <instrument>
        <name>Empyrean</name>
    </instrument>
    <wavelength>1.54060</wavelength>
    <scan scanAxis="2Theta">
        <startPosition>10.0000</startPosition>
        <endPosition>19.9800</endPosition>
        <stepSize>0.0200</stepSize>
        <intensities>{intensity_str}</intensities>
    </scan>
</xrdMeasurements>
""".encode("utf-8")

        result = self._upload_and_verify(
            client, project_id, "Si_001.xrdml", xml, "application/xml", "XRDML"
        )
        assert result["data_points"] == 500
        assert result["wavelength_angstrom"] is not None
        assert abs(result["wavelength_angstrom"] - 1.5406) < 0.001

    def test_xrdml_prefixed_namespace_pipeline(self, client, project_id):
        """XRDML with prefixed namespaces (the original bug scenario)."""
        xml = b"""<?xml version="1.0" encoding="UTF-8"?>
<xns:xrdMeasurements xmlns:xns="http://www.panalytical.com/2007/xrdml">
    <xns:sample><xns:name>LaB6</xns:name></xns:sample>
    <xns:wavelength>1.54060</xns:wavelength>
    <xns:scan scanAxis="2Theta">
        <xns:startPosition>10.0</xns:startPosition>
        <xns:stepSize>0.05</xns:stepSize>
        <xns:intensities>100 200 500 800 1200 1000 600 300 150 100</xns:intensities>
    </xns:scan>
</xns:xrdMeasurements>
"""
        result = self._upload_and_verify(
            client, project_id, "LaB6.xrdml", xml, "application/xml", "XRDML"
        )
        assert result["data_points"] == 10
        assert result["two_theta_range"][0] == pytest.approx(10.0, abs=0.01)

    def test_raw_upload_pipeline(self, client, project_id):
        """RAW format (binary) - verifies metadata extraction."""
        import struct
        header = struct.pack("<HH", 1, 0)
        n_points = 50
        header += struct.pack("<I", n_points)
        start = 10.0
        end = 20.0
        step = (end - start) / (n_points - 1)
        header += struct.pack("<ff", start, end)
        header += struct.pack("<f", step)
        header += struct.pack("<f", 1.5406)
        header += b"\x00" * (256 - len(header))

        intensities = []
        for i in range(n_points):
            val = 100 + 500 * (1 if 12 < start + i * step < 14 else 0)
            intensities.append(float(val))

        data_bytes = b"".join(struct.pack("<f", v) for v in intensities)
        raw_data = header + data_bytes

        result = self._upload_and_verify(
            client, project_id, "sample.raw", raw_data, "application/octet-stream", "RAW"
        )

    def test_upload_creates_experiment_in_project(self, client, project_id):
        """Verify that upload creates an experiment linked to the project."""
        data = b"10.0 100.0\n20.0 200.0\n30.0 300.0\n40.0 400.0\n50.0 500.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.xy", BytesIO(data), "text/plain")},
            data={"project_id": project_id}
        )
        assert response.status_code == 200
        result = response.json()

        exp_response = client.get(f"/projects/{project_id}/experiments")
        assert exp_response.status_code == 200
        experiments = exp_response.json()
        assert len(experiments) >= 1

        exp = experiments[0]
        assert exp["has_pattern_data"] is True
        assert exp["data_points"] == 5
        assert result["file_id"] in exp["file_ids"]

    def test_upload_adds_file_to_project(self, client, project_id):
        """Verify that the uploaded file is associated with the project."""
        data = b"10.0 100.0\n20.0 200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.xy", BytesIO(data), "text/plain")},
            data={"project_id": project_id}
        )
        file_id = response.json()["file_id"]

        files_response = client.get(f"/projects/{project_id}/files")
        assert files_response.status_code == 200
        files = files_response.json()
        assert any(f["file_id"] == file_id for f in files)

    def test_project_files_reused_across_sections(self, client, project_id):
        """Verify uploaded file appears in project files listing (not requiring re-upload)."""
        data = b"10.0 100.0\n20.0 200.0\n30.0 300.0\n"
        client.post(
            "/upload",
            files={"file": ("reuse_test.xy", BytesIO(data), "text/plain")},
            data={"project_id": project_id}
        )

        files_response = client.get(f"/projects/{project_id}/files")
        assert files_response.status_code == 200
        assert len(files_response.json()) >= 1

        experiments_response = client.get(f"/projects/{project_id}/experiments")
        assert experiments_response.status_code == 200
        assert len(experiments_response.json()) >= 1

        jobs_response = client.get(f"/projects/{project_id}/jobs")
        assert jobs_response.status_code == 200

    def test_upload_requires_project_id(self, client):
        data = b"10.0 100.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.xy", BytesIO(data), "text/plain")}
        )
        assert response.status_code == 400

    def test_upload_rejects_invalid_extension(self, client, project_id):
        data = b"some data"
        response = client.post(
            "/upload",
            files={"file": ("test.exe", BytesIO(data), "application/octet-stream")},
            data={"project_id": project_id}
        )
        assert response.status_code in (400, 422)

    def test_multiple_uploads_same_project(self, client, project_id):
        """Multiple files uploaded to the same project are all tracked."""
        for i in range(3):
            data = f"{10.0 + i} {100.0 + i}\n{20.0 + i} {200.0 + i}\n".encode()
            response = client.post(
                "/upload",
                files={"file": (f"file_{i}.xy", BytesIO(data), "text/plain")},
                data={"project_id": project_id}
            )
            assert response.status_code == 200

        files_response = client.get(f"/projects/{project_id}/files")
        assert len(files_response.json()) == 3

        experiments_response = client.get(f"/projects/{project_id}/experiments")
        assert len(experiments_response.json()) == 3
