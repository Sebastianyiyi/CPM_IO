from __future__ import annotations

import math
from collections import Counter

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ActivityInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    predecessors: list[str] = Field(default_factory=list)
    duration: float = Field(ge=0)

    @field_validator("name", mode="before")
    @classmethod
    def _validate_name(cls, value: object) -> object:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("El nombre de la actividad no puede estar vacío.")
        return value

    @field_validator("predecessors", mode="before")
    @classmethod
    def _validate_predecessors(cls, values: object) -> object:
        if values is None:
            return []
        if not isinstance(values, list):
            return values

        cleaned: list[str] = []
        for value in values:
            if not isinstance(value, str):
                raise ValueError("Cada predecesor debe ser una cadena de texto.")
            name = value.strip()
            if not name:
                raise ValueError("Los nombres de los predecesores no pueden estar vacíos.")
            cleaned.append(name)
        return cleaned

    @field_validator("duration")
    @classmethod
    def _validate_duration(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("La duración debe ser un número finito.")
        return value


class CPMRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    activities: list[ActivityInput] = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def _validate_activity_network(self) -> CPMRequest:
        names = [activity.name for activity in self.activities]
        duplicates = sorted(
            name for name, count in Counter(names).items() if count > 1
        )
        if duplicates:
            raise ValueError(
                f"Nombres de actividad duplicados: {', '.join(duplicates)}."
            )

        known_names = set(names)
        for activity in self.activities:
            if activity.name in activity.predecessors:
                raise ValueError(
                    f"La actividad '{activity.name}' no puede ser predecesora de sí misma."
                )

            seen: set[str] = set()
            for predecessor in activity.predecessors:
                if predecessor in seen:
                    raise ValueError(
                        f"El predecesor '{predecessor}' está repetido en la actividad "
                        f"'{activity.name}'."
                    )
                seen.add(predecessor)
                if predecessor not in known_names:
                    raise ValueError(
                        f"El predecesor '{predecessor}' de la actividad "
                        f"'{activity.name}' no existe."
                    )

        return self


class ActivityResult(BaseModel):
    activity: str
    Ei: float
    Lj: float
    Dij: float
    H: float
    critical: bool
    dummy: bool = False


class GraphNode(BaseModel):
    id: str
    label: str
    Ei: float
    Lj: float
    critical: bool
    level: int


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    activity: str | None
    duration: float
    dummy: bool
    critical: bool
    Ei: float
    Lj: float
    Dij: float
    H: float


class CPMResponse(BaseModel):
    project_duration: float
    critical_activities: list[str]
    critical_path: list[str]
    results: list[ActivityResult]
    nodes: list[GraphNode]
    edges: list[GraphEdge]
