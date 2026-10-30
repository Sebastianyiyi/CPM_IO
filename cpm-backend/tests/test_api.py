from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_solve_endpoint_returns_expected_contract():
    response = client.post(
        "/api/cpm/solve",
        json={
            "activities": [
                {"name": "A", "predecessors": [], "duration": 2},
                {"name": "B", "predecessors": [], "duration": 3},
                {"name": "C", "predecessors": ["A"], "duration": 4},
                {"name": "D", "predecessors": ["B"], "duration": 2},
                {"name": "E", "predecessors": ["C", "D"], "duration": 3},
            ]
        },
    )

    assert response.status_code == 200
    payload = response.json()

    assert payload["project_duration"] == 9
    assert payload["critical_activities"] == ["A", "C", "E"]
    assert payload["critical_path"] == ["A", "C", "E"]
    assert payload["results"][0] == {
        "activity": "A",
        "Ei": 0.0,
        "Lj": 2.0,
        "Dij": 2.0,
        "H": 0.0,
        "critical": True,
    }
    assert set(payload["nodes"][0]) == {
        "id",
        "label",
        "Ei",
        "Lj",
        "critical",
        "level",
    }
    assert set(payload["edges"][0]) == {
        "id",
        "source",
        "target",
        "label",
        "activity",
        "duration",
        "dummy",
        "critical",
        "Ei",
        "Lj",
        "Dij",
        "H",
    }
    assert any(edge["dummy"] for edge in payload["edges"])


def test_cycle_returns_422():
    response = client.post(
        "/api/cpm/solve",
        json={
            "activities": [
                {"name": "A", "predecessors": ["B"], "duration": 1},
                {"name": "B", "predecessors": ["A"], "duration": 1},
            ]
        },
    )

    assert response.status_code == 422
    assert "ciclo" in response.json()["detail"].lower()


def test_unknown_predecessor_returns_422():
    response = client.post(
        "/api/cpm/solve",
        json={
            "activities": [
                {"name": "A", "predecessors": ["Z"], "duration": 1},
            ]
        },
    )

    assert response.status_code == 422
    assert "Z" in str(response.json()["detail"])


def test_duplicate_names_return_422():
    response = client.post(
        "/api/cpm/solve",
        json={
            "activities": [
                {"name": "A", "predecessors": [], "duration": 1},
                {"name": "A", "predecessors": [], "duration": 2},
            ]
        },
    )

    assert response.status_code == 422
    assert "duplicad" in str(response.json()["detail"]).lower()


def test_negative_duration_returns_422():
    response = client.post(
        "/api/cpm/solve",
        json={
            "activities": [
                {"name": "A", "predecessors": [], "duration": -1},
            ]
        },
    )

    assert response.status_code == 422


def test_empty_activities_returns_422():
    response = client.post("/api/cpm/solve", json={"activities": []})

    assert response.status_code == 422


def test_raw_array_is_not_accepted():
    response = client.post(
        "/api/cpm/solve",
        json=[{"name": "A", "predecessors": [], "duration": 1}],
    )

    assert response.status_code == 422
