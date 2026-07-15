
import pytest
from io import BytesIO


class TestUploadEndpoint:
    def test_upload_csv_returns_200(self, client):
        data = b"10.0,100.0\n20.0,200.0\n30.0,150.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")}
        )
        assert response.status_code == 200

    def test_upload_csv_returns_file_id(self, client):
        data = b"10.0,100.0\n20.0,200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")}
        )
        result = response.json()
        assert "file_id" in result
        assert len(result["file_id"]) > 0

    def test_upload_csv_detects_xy_format(self, client):
        data = b"10.0,100.0\n20.0,200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")}
        )
        result = response.json()
        assert result["detected_format"] == "XY"

    def test_upload_csv_data_points(self, client):
        data = b"10.0,100.0\n20.0,200.0\n30.0,150.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")}
        )
        result = response.json()
        assert result["data_points"] == 3

    def test_upload_csv_two_theta_range(self, client):
        data = b"10.0,100.0\n20.0,200.0\n30.0,150.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")}
        )
        result = response.json()
        assert result["two_theta_range"] == [10.0, 30.0]

    def test_upload_csv_is_valid(self, client):
        data = b"10.0,100.0\n20.0,200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")}
        )
        result = response.json()
        assert result["is_valid"] is True

    def test_upload_cif_returns_200(self, client):
        data = b"data_silicon\n_cell_length_a 5.4301\n_chemical_formula_sum Si\n"
        response = client.post(
            "/upload",
            files={"file": ("test.cif", BytesIO(data), "chemical/x-cif")}
        )
        assert response.status_code == 200

    def test_upload_cif_detects_cif_format(self, client):
        data = b"data_test\n_cell_length_a 5.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.cif", BytesIO(data), "chemical/x-cif")}
        )
        result = response.json()
        assert result["detected_format"] == "CIF"

    def test_upload_xrdml_returns_200(self, client):
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
            files={"file": ("test.xrdml", BytesIO(xml), "application/xml")}
        )
        assert response.status_code == 200

    def test_upload_xrdml_detects_xrdml_format(self, client):
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
            files={"file": ("test.xrdml", BytesIO(xml), "application/xml")}
        )
        result = response.json()
        assert result["detected_format"] == "XRDML"

    def test_upload_raw_returns_200(self, client):
        data = b"\x00\x01\x02\x03" * 100
        response = client.post(
            "/upload",
            files={"file": ("test.raw", BytesIO(data), "application/octet-stream")}
        )
        assert response.status_code == 200

    def test_upload_raw_detects_raw_format(self, client):
        data = b"\x00\x01\x02\x03" * 100
        response = client.post(
            "/upload",
            files={"file": ("test.raw", BytesIO(data), "application/octet-stream")}
        )
        result = response.json()
        assert result["detected_format"] == "RAW"

    def test_upload_txt_returns_200(self, client):
        data = b"10.0 100.0\n20.0 200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.txt", BytesIO(data), "text/plain")}
        )
        assert response.status_code == 200

    def test_upload_dat_returns_200(self, client):
        data = b"10.0\t100.0\n20.0\t200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.dat", BytesIO(data), "text/plain")}
        )
        assert response.status_code == 200

    def test_upload_xy_returns_200(self, client):
        data = b"10.0,100.0\n20.0,200.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.xy", BytesIO(data), "text/plain")}
        )
        assert response.status_code == 200

    def test_upload_with_wavelength_form(self, client):
        data = b"10.0,100.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")},
            data={"wavelength": "1.5406"}
        )
        result = response.json()
        assert result["wavelength_angstrom"] == 1.5406

    def test_upload_invalid_extension_returns_400(self, client):
        data = b"some data"
        response = client.post(
            "/upload",
            files={"file": ("test.unknown", BytesIO(data), "application/octet-stream")}
        )
        assert response.status_code in (400, 422)

    def test_get_upload_by_id(self, client):
        data = b"10.0,100.0\n"
        response = client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")}
        )
        file_id = response.json()["file_id"]

        get_response = client.get(f"/upload/{file_id}")
        assert get_response.status_code == 200
        assert get_response.json()["file_id"] == file_id

    def test_list_uploads(self, client):
        data = b"10.0,100.0\n"
        client.post(
            "/upload",
            files={"file": ("test.csv", BytesIO(data), "text/csv")}
        )
        response = client.get("/upload")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1
