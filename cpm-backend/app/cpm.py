from __future__ import annotations

import math
from collections.abc import Sequence

import networkx as nx

from .models import ActivityInput, ActivityResult, CPMResponse, GraphEdge, GraphNode


class AOAError(Exception):
    """Error relacionado con la construcción de la red AOA."""


class CycleError(AOAError):
    """La red de actividades contiene un ciclo."""


def _format_number(value: float) -> str:
    rounded = round(float(value), 10)
    if math.isclose(rounded, round(rounded), abs_tol=1e-9):
        return str(int(round(rounded)))
    return f"{rounded:g}"


def _clean(value: float) -> float:
    rounded = round(float(value), 10)
    if abs(rounded) < 1e-12:
        return 0.0
    return rounded


def _is_zero(value: float) -> bool:
    return math.isclose(value, 0.0, abs_tol=1e-9, rel_tol=1e-9)


def _build_aoa(activities: Sequence[ActivityInput]) -> tuple[nx.DiGraph, int, int]:
    graph = nx.DiGraph()

    next_node = 0
    source = next_node
    next_node += 1
    graph.add_node(source)

    end_nodes: dict[str, int] = {}
    for activity in activities:
        end_nodes[activity.name] = next_node
        graph.add_node(next_node)
        next_node += 1

    edge_counter = 0
    dummy_counter = 0
    merge_nodes: dict[frozenset[str], int] = {}

    def new_node() -> int:
        nonlocal next_node
        node = next_node
        next_node += 1
        graph.add_node(node)
        return node

    def add_edge(
        tail: int,
        head: int,
        *,
        duration: float,
        activity: str | None,
        dummy: bool,
        dummy_name: str | None = None,
    ) -> None:
        nonlocal edge_counter
        if graph.has_edge(tail, head):
            raise AOAError("La construcción AOA generó un arco paralelo.")

        edge_counter += 1
        if dummy:
            label = f"{dummy_name} (0)"
        else:
            label = f"{activity} ({_format_number(duration)})"

        graph.add_edge(
            tail,
            head,
            duration=float(duration),
            activity=activity,
            dummy=dummy,
            dummy_name=dummy_name,
            label=label,
            order=edge_counter,
        )

    def add_dummy(tail: int, head: int) -> None:
        nonlocal dummy_counter
        dummy_counter += 1
        add_edge(
            tail,
            head,
            duration=0.0,
            activity=None,
            dummy=True,
            dummy_name=f"f{dummy_counter}",
        )

    activities_with_successors = {
        predecessor
        for activity in activities
        for predecessor in activity.predecessors
    }

    for activity in activities:
        if not activity.predecessors:
            start = source
        elif len(activity.predecessors) == 1:
            start = end_nodes[activity.predecessors[0]]
        else:
            key = frozenset(activity.predecessors)
            if key not in merge_nodes:
                merge = new_node()
                merge_nodes[key] = merge
                for predecessor in sorted(key):
                    add_dummy(end_nodes[predecessor], merge)
            start = merge_nodes[key]

        add_edge(
            start,
            end_nodes[activity.name],
            duration=activity.duration,
            activity=activity.name,
            dummy=False,
        )

    terminals = [
        activity.name
        for activity in activities
        if activity.name not in activities_with_successors
    ]

    if not terminals:
        sink = new_node()
    elif len(terminals) == 1:
        sink = end_nodes[terminals[0]]
    else:
        sink = new_node()
        for terminal in terminals:
            add_dummy(end_nodes[terminal], sink)

    try:
        topological_order = list(nx.topological_sort(graph))
    except nx.NetworkXUnfeasible as exc:
        raise CycleError(
            "La red de actividades contiene un ciclo de dependencias."
        ) from exc

    mapping = {node: index + 1 for index, node in enumerate(topological_order)}
    graph = nx.relabel_nodes(graph, mapping, copy=True)
    return graph, mapping[source], mapping[sink]


def solve_cpm(activities: Sequence[ActivityInput]) -> CPMResponse:
    graph, source, sink = _build_aoa(activities)
    topological_order = list(nx.topological_sort(graph))

    early: dict[int, float] = {node: 0.0 for node in graph.nodes}
    for node in topological_order:
        for successor in graph.successors(node):
            candidate = early[node] + graph[node][successor]["duration"]
            if candidate > early[successor]:
                early[successor] = candidate

    project_duration = early[sink]

    late: dict[int, float] = {node: project_duration for node in graph.nodes}
    for node in reversed(topological_order):
        successors = list(graph.successors(node))
        if not successors:
            late[node] = project_duration
            continue
        late[node] = min(
            late[successor] - graph[node][successor]["duration"]
            for successor in successors
        )

    level: dict[int, int] = {node: 0 for node in graph.nodes}
    for node in topological_order:
        for successor in graph.successors(node):
            candidate = level[node] + 1
            if candidate > level[successor]:
                level[successor] = candidate

    edge_records: list[tuple[int, int, dict, float, bool]] = []
    critical_edge_keys: list[tuple[int, int]] = []
    for tail, head, data in sorted(
        graph.edges(data=True), key=lambda item: item[2]["order"]
    ):
        duration = float(data["duration"])
        slack = late[head] - early[tail] - duration
        critical = _is_zero(slack)
        if critical:
            critical_edge_keys.append((tail, head))
        edge_records.append((tail, head, data, slack, critical))

    real_edges = {
        data["activity"]: (tail, head, data)
        for tail, head, data in graph.edges(data=True)
        if not data["dummy"]
    }

    results: list[ActivityResult] = []
    critical_activities: list[str] = []
    for activity in activities:
        tail, head, data = real_edges[activity.name]
        duration = float(data["duration"])
        early_start = early[tail]
        late_finish = late[head]
        slack = late_finish - early_start - duration
        critical = _is_zero(slack)
        if critical:
            critical_activities.append(activity.name)

        results.append(
            ActivityResult(
                activity=activity.name,
                Ei=_clean(early_start),
                Lj=_clean(late_finish),
                Dij=_clean(duration),
                H=_clean(slack),
                critical=critical,
            )
        )

    critical_graph = nx.DiGraph()
    critical_graph.add_nodes_from(graph.nodes)
    critical_graph.add_edges_from(critical_edge_keys)
    try:
        critical_nodes = nx.shortest_path(
            critical_graph, source=source, target=sink
        )
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        critical_nodes = [source]

    critical_path = [
        graph[tail][head]["activity"]
        for tail, head in zip(critical_nodes, critical_nodes[1:])
        if not graph[tail][head]["dummy"]
    ]

    nodes = [
        GraphNode(
            id=str(node),
            label=str(node),
            Ei=_clean(early[node]),
            Lj=_clean(late[node]),
            critical=_is_zero(late[node] - early[node]),
            level=level[node],
        )
        for node in topological_order
    ]

    edges = [
        GraphEdge(
            id=f"e{data['order']}",
            source=str(tail),
            target=str(head),
            label=data["label"],
            activity=data["activity"],
            duration=_clean(data["duration"]),
            dummy=bool(data["dummy"]),
            critical=critical,
            Ei=_clean(early[tail]),
            Lj=_clean(late[head]),
            Dij=_clean(data["duration"]),
            H=_clean(slack),
        )
        for tail, head, data, slack, critical in edge_records
    ]

    return CPMResponse(
        project_duration=_clean(project_duration),
        critical_activities=critical_activities,
        critical_path=critical_path,
        results=results,
        nodes=nodes,
        edges=edges,
    )
