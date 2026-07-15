
import pytest
from io import BytesIO


@pytest.fixture
def project_id(client):
    """Create a test project and return its ID."""
    response = client.post(
        "/projects",
        json={"name": "Test Project", "material": "Si"}
    )
    return response.json()["id"]


class TestUploadEndpoint:
    def test_upload_csv_returns_200(self, client, project_id):
        data = b"10.0,100.0\n20.0,200.0\n30.0,150.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"project_id": project_id}
        )
        assert response.status_code == 200

    def test_upload_csv_returns_file_id(self, client, project_id):
        data = b"10.0,100.0\n20.0,200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"project_id": project_id}
        )
        result = response.json()
        assert "file_id" in result
        assert len(result["file_id"]) > 0

    def test_upload_csv_detects_xy_format(self, client, project_id):
        data = b"10.0,100.0\n20.0,200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"project_id": project_id}
        )
        result = response.json()
        assert result["detected_format"] == "XY"

    def test_upload_csv_data_points(self, client, project_id):
        data = b"10.0,100.0\n20.0,200.0\n30.0,150.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"project_id": project_id}
        )
        result = response.json()
        assert result["data_points"] == 3

    def test_upload_csv_two_theta_range(self, client, project_id):
        data = b"10.0,100.0\n20.0,200.0\n30.0,150.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"project_id": project_id}
        )
        result = response.json()
        assert result["two_theta_range"] == [10.0, 30.0]

    def test_upload_csv_is_valid(self, client, project_id):
        data = b"10.0,100.0\n20.0,200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"project_id": project_id}
        )
        result = response.json()
        assert result["is_valid"] is True

    def test_upload_cif_returns_200(self, client, project_id):
        data = b"data_silicon\n_cell_length_a 5.4301\n_chemical_formula_sum Si\n"
        response = client.post(
            "/upload",
            files={"file": ("test.cif", BytesIO(data), "chemical/x-cif")},
            data={"project_id": project_id}
        )
        assert response.status_code == 200

    def test_upload_cif_detects_cif_format(self, client, project_id):
        data = b"data_test\n_cell_length_a 5.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.cif", BytesIO(data), "chemical/x-cif")},
            data={"project_id": project_id}
        )
        result = response.json()
        assert result["detected_format"] == "CIF"

    def test_upload_xrdml_returns_200(self, client, project_id):
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <scan>
        <startPosition>10.0</startPosition>
        <stepSize>0.02</stepSize>
        <intensities>100 200 150</intensities>
    </scan>
</xrdMeasurements>
"""
        response = client.post(
            "/upload",
            files={"file": ("test.xrdml", BytesIO(xml), "application/xml")},
            data={"project_id": project_id}
        )
        assert response.status_code == 200

    def test_upload_xrdml_detects_xrdml_format(self, client, project_id):
        xml = b"""<?xml version="1.0"?>
<xrdMeasurements>
    <scan>
        <startPosition>0</startPosition>
        <stepSize>1</stepSize>
        <intensities>1</intensities>
    </scan>
</xrdMeasurements>
"""
        response = client.post(
            "/upload",
            files={"file": ("test.xrdml", BytesIO(xml), "application/xml")},
            data={"project_id": project_id}
        )
        result = response.json()
        assert result["detected_format"] == "XRDML"

    def test_upload_raw_returns_200(self, client, project_id):
        data = b"\x00\x01\x02\x03" * 100
        response = client.post(
            "/upload",
            files={"file": ("test.raw", BytesIO(data), "application/octet-stream")},
            data={"project_id": project_id}
        )
        assert response.status_code == 200

    def test_upload_raw_detects_raw_format(self, client, project_id):
        data = b"\x00\x01\x02\x03" * 100
        response = client.post(
            "/upload",
            files={"file": ("test.raw", BytesIO(data), "application/octet-stream")},
            data={"project_id": project_id}
        )
        result = response.json()
        assert result["detected_format"] == "RAW"

    def test_upload_txt_returns_200(self, client, project_id):
        data = b"10.0 100.0\n20.0 200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.txt", BytesIO(data), "text/plain")},
            data={"project_id": project_id}
        )
        assert response.status_code == 200

    def test_upload_dat_returns_200(self, client, project_id):
        data = b"10.0\t100.0\n20.0\t200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.dat", BytesIO(data), "text/plain")},
            data={"project_id": project_id}
        )
        assert response.status_code == 200

    def test_upload_xy_returns_200(self, client, project_id):
        data = b"10.0,100.0\n20.0,200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.xy", BytesIO(data), "text/plain")},
            data={"project_id": project_id}
        )
        assert response.status_code == 200

    def test_upload_with_wavelength_form(self, client, project_id):
        data = b"10.0,100.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"wavelength": "1.5406", "project_id": project_id}
        )
        result = response.json()
        assert result["wavelength_angstrom"] == 1.5406

    def test_upload_invalid_extension_returns_400(self, client, project_id):
        data = b"some data"
        response = client.post(
            "/upload",
            files={"file": ("test.unknown", BytesIO(data), "application/octet-stream")},
            data={"project_id": project_id}
        )
        assert response.status_code in (400, 422)

    def test_get_upload_by_id(self, client, project_id):
        data = b"10.0,100.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"project_id": project_id}
        )
        file_id = response.json()["file_id"]

        get_response = client.get(f"/upload/{file_id}")
        assert get_response.status_code == 200
        assert get_response.json()["file_id"] == file_id

    def test_list_uploads(self, client, project_id):
        data = b"10.0,100.0\n"
        client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"project_id": project_id}
        )
        response = client.get("/upload")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1

    def test_upload_returns_experiment_id(self, client, project_id):
        data = b"10.0,100.0\n20.0,200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"project_id": project_id}
        )
        result = response.json()
        assert "experiment_id" in result
        assert result["experiment_id"] is not None

    def test_upload_requires_project_id(self, client):
        data = b"10.0,100.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")}
        )
        assert response.status_code == 400
