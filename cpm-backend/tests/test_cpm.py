from __future__ import annotations

import pytest

from app.cpm import CycleError, solve_cpm
from app.models import CPMRequest, CPMResponse


def solve(activities: list[dict[str, object]]) -> CPMResponse:
    request = CPMRequest.model_validate({"activities": activities})
    return solve_cpm(request.activities)


def results_by_name(response: CPMResponse):
    return {result.activity: result for result in response.results}


def test_simple_chain():
    response = solve(
        [
            {"name": "A", "predecessors": [], "duration": 4},
            {"name": "B", "predecessors": ["A"], "duration": 5},
            {"name": "C", "predecessors": ["B"], "duration": 3},
        ]
    )

    assert response.project_duration == 12
    assert response.critical_activities == ["A", "B", "C"]
    assert response.critical_path == ["A", "B", "C"]

    results = results_by_name(response)
    assert results["A"].Ei == 0
    assert results["A"].Lj == 4
    assert results["A"].Dij == 4
    assert results["A"].H == 0
    assert results["B"].Ei == 4
    assert results["B"].Lj == 9
    assert results["B"].H == 0
    assert results["C"].Ei == 9
    assert results["C"].Lj == 12
    assert results["C"].H == 0

    assert [node.label for node in response.nodes] == ["1", "2", "3", "4"]
    assert all(node.critical for node in response.nodes)
    assert [edge.label for edge in response.edges] == ["A (4)", "B (5)", "C (3)"]
    assert all(not edge.dummy for edge in response.edges)


def test_parallel_activities_create_dummies():
    response = solve(
        [
            {"name": "A", "predecessors": [], "duration": 2},
            {"name": "B", "predecessors": [], "duration": 3},
            {"name": "C", "predecessors": ["A", "B"], "duration": 4},
        ]
    )

    assert response.project_duration == 7
    assert response.critical_activities == ["B", "C"]
    assert response.critical_path == ["B", "C"]

    results = results_by_name(response)
    assert results["A"].H == 1
    assert results["B"].H == 0
    assert results["C"].H == 0
    assert results["C"].Ei == 3
    assert results["C"].Lj == 7

    dummies = [edge for edge in response.edges if edge.dummy]
    assert [edge.label for edge in dummies] == ["f1 (0)", "f2 (0)"]
    assert all(edge.duration == 0 for edge in dummies)
    assert len(response.nodes) == 5

    assert results["f1"].dummy
    assert results["f1"].Ei == 2
    assert results["f1"].Lj == 3
    assert results["f1"].Dij == 0
    assert results["f1"].H == 1
    assert not results["f1"].critical

    assert results["f2"].dummy
    assert results["f2"].Ei == 3
    assert results["f2"].Lj == 3
    assert results["f2"].Dij == 0
    assert results["f2"].H == 0
    assert results["f2"].critical


def test_multiple_terminals_create_sink_dummies():
    response = solve(
        [
            {"name": "A", "predecessors": [], "duration": 2},
            {"name": "B", "predecessors": [], "duration": 3},
        ]
    )

    assert response.project_duration == 3
    assert response.critical_activities == ["B"]
    assert response.critical_path == ["B"]

    dummies = [edge for edge in response.edges if edge.dummy]
    assert [edge.label for edge in dummies] == ["f1 (0)", "f2 (0)"]
    assert len(response.nodes) == 4

    results = results_by_name(response)
    assert results["f1"].dummy
    assert results["f1"].Ei == 2
    assert results["f1"].Lj == 3
    assert results["f1"].H == 1
    assert not results["f1"].critical

    assert results["f2"].dummy
    assert results["f2"].Ei == 3
    assert results["f2"].Lj == 3
    assert results["f2"].H == 0
    assert results["f2"].critical


def test_complex_dependencies_and_slack():
    response = solve(
        [
            {"name": "A", "predecessors": [], "duration": 2},
            {"name": "B", "predecessors": [], "duration": 3},
            {"name": "C", "predecessors": ["A"], "duration": 4},
            {"name": "D", "predecessors": ["B"], "duration": 2},
            {"name": "E", "predecessors": ["C", "D"], "duration": 3},
        ]
    )

    assert response.project_duration == 9
    assert response.critical_activities == ["A", "C", "E"]
    assert response.critical_path == ["A", "C", "E"]

    results = results_by_name(response)
    assert results["A"].H == 0
    assert results["B"].H == 1
    assert results["C"].H == 0
    assert results["D"].H == 1
    assert results["E"].H == 0
    assert results["E"].Ei == 6
    assert results["E"].Lj == 9

    dummies = [edge for edge in response.edges if edge.dummy]
    assert [edge.label for edge in dummies] == ["f1 (0)", "f2 (0)"]

    assert results["f1"].dummy
    assert results["f1"].Ei == 6
    assert results["f1"].Lj == 6
    assert results["f1"].H == 0
    assert results["f1"].critical

    assert results["f2"].dummy
    assert results["f2"].Ei == 5
    assert results["f2"].Lj == 6
    assert results["f2"].H == 1
    assert not results["f2"].critical


def test_multiple_critical_paths():
    response = solve(
        [
            {"name": "A", "predecessors": [], "duration": 2},
            {"name": "B", "predecessors": [], "duration": 2},
            {"name": "C", "predecessors": ["A", "B"], "duration": 1},
        ]
    )

    assert response.project_duration == 3
    assert set(response.critical_activities) == {"A", "B", "C"}
    assert response.critical_path in (["A", "C"], ["B", "C"])
    assert all(edge.critical for edge in response.edges)


def test_shared_predecessor_set_reuses_merge_node():
    response = solve(
        [
            {"name": "A", "predecessors": [], "duration": 2},
            {"name": "B", "predecessors": [], "duration": 2},
            {"name": "C", "predecessors": ["A", "B"], "duration": 3},
            {"name": "D", "predecessors": ["A", "B"], "duration": 1},
        ]
    )

    assert response.project_duration == 5
    assert response.critical_activities == ["A", "B", "C"]

    dummies = [edge for edge in response.edges if edge.dummy]
    assert [edge.label for edge in dummies] == [
        "f1 (0)",
        "f2 (0)",
        "f3 (0)",
        "f4 (0)",
    ]
    assert len(response.nodes) == 7

    pairs = [(edge.source, edge.target) for edge in response.edges]
    assert len(pairs) == len(set(pairs))
    assert len({edge.id for edge in response.edges}) == len(response.edges)


def test_single_activity():
    response = solve([{"name": "A", "predecessors": [], "duration": 4}])

    assert response.project_duration == 4
    assert response.critical_activities == ["A"]
    assert response.critical_path == ["A"]
    assert len(response.nodes) == 2
    assert len(response.edges) == 1
    assert response.edges[0].label == "A (4)"


def test_decimal_durations_are_formatted_cleanly():
    response = solve(
        [
            {"name": "A", "predecessors": [], "duration": 4.5},
            {"name": "B", "predecessors": ["A"], "duration": 2.25},
        ]
    )

    assert response.project_duration == 6.75
    assert [edge.label for edge in response.edges] == ["A (4.5)", "B (2.25)"]


def test_zero_duration_activity_is_allowed():
    response = solve([{"name": "A", "predecessors": [], "duration": 0}])

    assert response.project_duration == 0
    assert response.critical_activities == ["A"]


def test_cycle_is_rejected():
    with pytest.raises(CycleError):
        solve(
            [
                {"name": "A", "predecessors": ["B"], "duration": 1},
                {"name": "B", "predecessors": ["A"], "duration": 1},
            ]
        )
