"""Unified workspace report service.

Aggregates every instrument experiment in a project — XRD, FTIR, Raman and
UV-Vis — into a single structured report payload, plus a plain-text rendition
for download. Each technique becomes a section; every analyzed experiment
contributes its technique-specific summary and key findings.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from backend.services.workspace_summary import experiment_findings, experiment_summary

TECHNIQUES: Dict[str, str] = {
    "xrd": "X-Ray Diffraction",
    "ftir": "FTIR",
    "raman": "Raman",
    "uvvis": "UV-Vis",
}


class WorkspaceReportService:
    """Builds a per-project, all-technique workspace report."""

    def __init__(self, unit_of_work):
        self._uow = unit_of_work

    async def generate(self, project_id: str) -> Optional[Dict[str, Any]]:
        try:
            project_uuid = UUID(project_id)
        except (ValueError, TypeError):
            return None

        project = await self._uow.projects.get_by_id(project_uuid)
        if not project:
            return None

        experiments = await self._uow.experiments.get_by_project_id(project_uuid)
        return self._build(project, experiments)

    def _build(self, project, experiments: List) -> Dict[str, Any]:
        sections: List[Dict[str, Any]] = []
        total = len(experiments)
        analyzed = 0

        for technique in TECHNIQUES:
            subset = [
                e for e in experiments
                if (getattr(e, "technique", "") or "").lower() == technique
            ]
            if not subset:
                continue
            analyzed += sum(1 for e in subset if getattr(e, "has_results", False))
            sections.append(self._technique_section(technique, subset))

        created_at = getattr(project, "created_at", None)
        return {
            "project": {
                "id": str(getattr(project, "id", "")),
                "name": getattr(project, "name", ""),
                "material": getattr(project, "material", ""),
                "status": getattr(project, "status", ""),
                "created_at": created_at.isoformat() if created_at else None,
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "experiment_count": total,
                "analyzed_count": analyzed,
                "technique_count": len(sections),
            },
            "techniques": sections,
        }

    def _technique_section(self, technique: str, experiments: List) -> Dict[str, Any]:
        entries = []
        for exp in sorted(experiments, key=lambda e: getattr(e, "created_at", None) or datetime.min):
            entries.append({
                "id": str(exp.id),
                "name": getattr(exp, "name", "") or "Untitled Experiment",
                "material": getattr(exp, "material", ""),
                "status": getattr(exp, "status", ""),
                "data_points": getattr(exp, "data_points", 0),
                "has_results": bool(getattr(exp, "has_results", False)),
                "summary": experiment_summary(exp),
                "findings": experiment_findings(exp),
            })
        return {
            "technique": technique,
            "display_name": TECHNIQUES[technique],
            "experiment_count": len(entries),
            "analyzed_count": sum(1 for e in entries if e["has_results"]),
            "experiments": entries,
        }


def render_text(report: Dict[str, Any]) -> str:
    """Render the structured workspace report payload as plain text."""
    project = report.get("project", {})
    summary = report.get("summary", {})
    lines: List[str] = []
    lines.append("=" * 74)
    lines.append("MatPilot Workspace Report")
    lines.append("=" * 74)
    lines.append(f"Project: {project.get('name', 'Untitled Project')}")
    if project.get("material"):
        lines.append(f"Material: {project.get('material')}")
    lines.append(f"Status:   {project.get('status', '')}")
    lines.append(f"Experiments: {summary.get('experiment_count', 0)} "
                 f"({summary.get('analyzed_count', 0)} analyzed) across "
                 f"{summary.get('technique_count', 0)} instruments")
    lines.append(f"Generated: {report.get('generated_at', '')}")

    for section in report.get("techniques", []):
        lines.append("")
        lines.append("-" * 74)
        lines.append(f"{section['display_name']} "
                     f"({section['experiment_count']} experiments, "
                     f"{section['analyzed_count']} analyzed)")
        lines.append("-" * 74)
        for exp in section["experiments"]:
            lines.append("")
            title = f"{exp['name']}"
            if exp["material"]:
                title += f" — {exp['material']}"
            lines.append(f"  {title}")
            lines.append(f"    status: {exp['status']}  |  points: {exp['data_points']}")
            for finding in exp["findings"]:
                lines.append(f"    - {finding}")

    lines.append("")
    lines.append("=" * 74)
    return "\n".join(lines) + "\n"
