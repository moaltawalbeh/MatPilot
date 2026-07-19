"""PDF Report Generator for MatPilot XRD Analysis.

Generates publication-quality scientific PDF reports using reportlab and matplotlib.
"""

import io
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ACCENT_COLOR = colors.HexColor("#f97316")
ACCENT_LIGHT = colors.HexColor("#fff7ed")
HEADER_BG = colors.HexColor("#1a1a1a")
TEXT_COLOR = colors.HexColor("#1f2937")
MUTED_COLOR = colors.HexColor("#6b7280")
TABLE_HEADER_BG = colors.HexColor("#f97316")
TABLE_ALT_ROW = colors.HexColor("#fff7ed")
TABLE_HEADER_TEXT = colors.white
BORDER_COLOR = colors.HexColor("#e5e7eb")

FIGURE_WIDTH_CM = 16
FIGURE_HEIGHT_CM = 9

PIPELINE_STAGE_LABELS = {
    "background_correction": "Background Correction",
    "ka2_stripping": "Kα₂ Stripping",
    "noise_reduction": "Noise Reduction",
    "intensity_normalization": "Intensity Normalization",
    "peak_detection": "Peak Detection",
    "phase_identification": "Phase Identification",
    "candidate_selection": "Candidate Selection",
    "rietveld_refinement": "Rietveld Refinement",
}


def _safe_float(value: Any, default: Any = "N/A") -> Any:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _fmt(value: Any, fmt_spec: str = ".4f", default: str = "N/A") -> str:
    v = _safe_float(value, None)
    if v is None:
        return default
    try:
        return f"{float(v):{fmt_spec}}"
    except (TypeError, ValueError):
        return default


def _fmt_pct(value: Any, default: str = "N/A") -> str:
    v = _safe_float(value, None)
    if v is None:
        return default
    try:
        return f"{float(v):.1f}%"
    except (TypeError, ValueError):
        return default


class _NumberedCanvas:
    """Helper to add page numbers to the canvas."""

    def __init__(self, doc: BaseDocTemplate, title: str):
        self._doc = doc
        self._title = title
        self._saved_page_states: List[Dict[str, Any]] = []

    def __call__(self, canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED_COLOR)
        canvas.drawString(
            doc.leftMargin,
            1.2 * cm,
            f"{self._title}",
        )
        canvas.drawRightString(
            A4[0] - doc.rightMargin,
            1.2 * cm,
            f"Page {doc.page}",
        )
        canvas.setStrokeColor(BORDER_COLOR)
        canvas.setLineWidth(0.5)
        canvas.line(
            doc.leftMargin,
            1.6 * cm,
            A4[0] - doc.rightMargin,
            1.6 * cm,
        )
        canvas.restoreState()


class ReportGenerator:
    """Generates publication-quality PDF reports for XRD analysis."""

    def __init__(self):
        self._styles = getSampleStyleSheet()
        self._register_custom_styles()
        self._story: List[Any] = []
        self._toc_entries: List[Dict[str, Any]] = []
        self._figures: List[Dict[str, Any]] = []
        self._figure_counter = 0
        self._section_counter = 0
        self._page_width = A4[0]
        self._page_height = A4[1]
        self._margin_left = 2.2 * cm
        self._margin_right = 2.2 * cm
        self._margin_top = 2.5 * cm
        self._margin_bottom = 2.5 * cm

    def _register_custom_styles(self):
        self._styles.add(ParagraphStyle(
            "CoverTitle",
            parent=self._styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=34,
            textColor=colors.white,
            alignment=TA_CENTER,
            spaceAfter=12,
        ))
        self._styles.add(ParagraphStyle(
            "CoverSubtitle",
            parent=self._styles["Normal"],
            fontName="Helvetica",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#f97316"),
            alignment=TA_CENTER,
            spaceAfter=6,
        ))
        self._styles.add(ParagraphStyle(
            "CoverInfo",
            parent=self._styles["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#d1d5db"),
            alignment=TA_CENTER,
        ))
        self._styles.add(ParagraphStyle(
            "SectionHeading",
            parent=self._styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#f97316"),
            spaceBefore=18,
            spaceAfter=10,
            borderWidth=0,
            borderColor=ACCENT_COLOR,
            borderPadding=0,
        ))
        self._styles.add(ParagraphStyle(
            "SubHeading",
            parent=self._styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=TEXT_COLOR,
            spaceBefore=10,
            spaceAfter=6,
        ))
        self._styles.add(ParagraphStyle(
            "BodyText2",
            parent=self._styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=TEXT_COLOR,
            spaceAfter=6,
        ))
        self._styles.add(ParagraphStyle(
            "TableCaption",
            parent=self._styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=9,
            leading=12,
            textColor=MUTED_COLOR,
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=10,
        ))
        self._styles.add(ParagraphStyle(
            "FigureCaption",
            parent=self._styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=TEXT_COLOR,
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=12,
        ))
        self._styles.add(ParagraphStyle(
            "TocEntry1",
            parent=self._styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=18,
            textColor=TEXT_COLOR,
            leftIndent=0,
        ))
        self._styles.add(ParagraphStyle(
            "TocEntry2",
            parent=self._styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=16,
            textColor=MUTED_COLOR,
            leftIndent=20,
        ))
        self._styles.add(ParagraphStyle(
            "ConclusionText",
            parent=self._styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=TEXT_COLOR,
            spaceAfter=8,
            leftIndent=10,
        ))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_report(
        self,
        project_data: Dict[str, Any],
        experiment_data: Dict[str, Any],
        output_path: str,
    ) -> str:
        """Generate PDF report and save to disk. Returns the output path."""
        pdf_bytes = self.generate_report_bytes(project_data, experiment_data)
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "wb") as fh:
            fh.write(pdf_bytes)
        return output_path

    def generate_report_bytes(
        self,
        project_data: Dict[str, Any],
        experiment_data: Dict[str, Any],
    ) -> bytes:
        """Generate PDF report and return as bytes."""
        self._story = []
        self._toc_entries = []
        self._figures = []
        self._figure_counter = 0
        self._section_counter = 0

        title = project_data.get("name", "MatPilot Scientific Analysis Report")

        self._add_cover_page(project_data, experiment_data)
        self._add_toc_placeholder()
        self._add_project_info(project_data)
        self._add_sample_info(experiment_data)
        self._add_experimental_conditions(experiment_data)
        self._add_data_summary(experiment_data)
        self._add_processing_workflow(experiment_data)
        self._add_phase_identification(experiment_data)
        self._add_rietveld_summary(experiment_data)
        self._add_refinement_statistics(experiment_data)
        self._add_conclusions(project_data, experiment_data)
        self._add_figures_section(experiment_data)

        self._fill_toc()
        return self._build_pdf(title)

    # ------------------------------------------------------------------
    # Cover page
    # ------------------------------------------------------------------

    def _add_cover_page(
        self,
        project_data: Dict[str, Any],
        experiment_data: Dict[str, Any],
    ):
        cover_elements: List[Any] = []
        cover_elements.append(Spacer(1, 4 * cm))
        cover_elements.append(Paragraph(
            "MatPilot Scientific<br/>Analysis Report",
            self._styles["CoverTitle"],
        ))
        cover_elements.append(Spacer(1, 0.8 * cm))

        project_name = project_data.get("name", "Untitled Project")
        cover_elements.append(Paragraph(project_name, self._styles["CoverSubtitle"]))
        cover_elements.append(Spacer(1, 0.5 * cm))

        material = project_data.get("material", "")
        if material:
            cover_elements.append(Paragraph(
                f"Material: {material}",
                self._styles["CoverInfo"],
            ))
            cover_elements.append(Spacer(1, 0.3 * cm))

        date_str = project_data.get("created_at", "")
        if date_str:
            cover_elements.append(Paragraph(
                f"Created: {date_str}",
                self._styles["CoverInfo"],
            ))
        else:
            cover_elements.append(Paragraph(
                f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
                self._styles["CoverInfo"],
            ))

        cover_elements.append(Spacer(1, 0.3 * cm))
        status = project_data.get("status", "")
        if status:
            cover_elements.append(Paragraph(
                f"Status: {status}",
                self._styles["CoverInfo"],
            ))

        cover_elements.append(Spacer(1, 2 * cm))
        cover_elements.append(Paragraph(
            "Automated XRD Analysis Report",
            self._styles["CoverInfo"],
        ))
        cover_elements.append(Paragraph(
            "Generated by MatPilot",
            self._styles["CoverInfo"],
        ))

        self._story.extend(cover_elements)
        self._story.append(NextPageTemplate("content"))
        self._story.append(PageBreak())

    # ------------------------------------------------------------------
    # Table of Contents
    # ------------------------------------------------------------------

    def _add_toc_placeholder(self):
        self._toc_heading_index = len(self._story)
        self._story.append(Paragraph(
            "Table of Contents",
            self._styles["SectionHeading"],
        ))
        self._story.append(Spacer(1, 0.5 * cm))
        self._toc_placeholder_index = len(self._story)
        self._story.append(Spacer(1, 0.1 * cm))
        self._story.append(PageBreak())

    def _fill_toc(self):
        toc_items: List[Any] = []
        for entry in self._toc_entries:
            style_name = "TocEntry1" if entry["level"] == 1 else "TocEntry2"
            page_label = str(entry.get("page", ""))
            dots = " " + "." * max(2, 60 - len(entry["text"]) - len(page_label))
            text = f"{entry['text']}{dots}{page_label}"
            toc_items.append(Paragraph(text, self._styles[style_name]))
        if not toc_items:
            toc_items.append(Paragraph("—", self._styles["BodyText2"]))
        self._story[self._toc_placeholder_index:self._toc_placeholder_index + 1] = toc_items

    def _record_toc(self, text: str, level: int = 1):
        self._toc_entries.append({
            "text": text,
            "level": level,
            "page": "—",
        })

    # ------------------------------------------------------------------
    # Section helpers
    # ------------------------------------------------------------------

    def _next_section_number(self) -> str:
        self._section_counter += 1
        return str(self._section_counter)

    def _add_section_heading(self, text: str, level: int = 1) -> str:
        section_num = self._next_section_number()
        heading_text = f"{section_num}. {text}"
        self._story.append(Spacer(1, 0.3 * cm))
        self._story.append(Paragraph(heading_text, self._styles["SectionHeading"]))
        self._record_toc(heading_text, level=level)
        self._story.append(Spacer(1, 0.2 * cm))
        return section_num

    def _add_subsection_heading(self, section_num: str, text: str):
        sub_text = f"{section_num}.{text}"
        self._story.append(Paragraph(sub_text, self._styles["SubHeading"]))
        self._record_toc(sub_text, level=2)

    def _add_body(self, text: str):
        self._story.append(Paragraph(text, self._styles["BodyText2"]))

    def _add_paragraph(self, text: str, style: str = "BodyText2"):
        self._story.append(Paragraph(text, self._styles[style]))

    # ------------------------------------------------------------------
    # Styled tables
    # ------------------------------------------------------------------

    def _build_table(
        self,
        headers: List[str],
        rows: List[List[str]],
        col_widths: Optional[List[float]] = None,
        caption: Optional[str] = None,
    ):
        data = [headers] + rows
        table = Table(data, colWidths=col_widths, repeatRows=1)

        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), TABLE_HEADER_TEXT),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("LEADING", (0, 0), (-1, -1), 13),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("LINEBELOW", (0, 0), (-1, 0), 1.5, ACCENT_COLOR),
        ]

        for row_idx in range(1, len(data)):
            if row_idx % 2 == 0:
                style_cmds.append(
                    ("BACKGROUND", (0, row_idx), (-1, row_idx), TABLE_ALT_ROW)
                )

        table.setStyle(TableStyle(style_cmds))
        self._story.append(table)

        if caption:
            self._story.append(Paragraph(caption, self._styles["TableCaption"]))

    # ------------------------------------------------------------------
    # Figures
    # ------------------------------------------------------------------

    def _create_figure(
        self,
        x_data: List[float],
        y_data: List[float],
        title: str,
        xlabel: str = r"2$\theta$ (degrees)",
        ylabel: str = "Intensity (a.u.)",
        extra_traces: Optional[List[Dict[str, Any]]] = None,
        caption: Optional[str] = None,
    ) -> bytes:
        fig, ax = plt.subplots(figsize=(FIGURE_WIDTH_CM / 2.54, FIGURE_HEIGHT_CM / 2.54), dpi=150)

        ax.plot(
            x_data, y_data,
            color="#f97316",
            linewidth=0.8,
            label="Experimental",
        )

        if extra_traces:
            trace_colors = ["#3b82f6", "#10b981", "#ef4444", "#8b5cf6"]
            for idx, trace in enumerate(extra_traces):
                color = trace_colors[idx % len(trace_colors)]
                ax.plot(
                    trace.get("x", []),
                    trace.get("y", []),
                    color=color,
                    linewidth=0.8,
                    label=trace.get("label", ""),
                )

        ax.set_xlabel(xlabel, fontsize=10, fontweight="bold")
        ax.set_ylabel(ylabel, fontsize=10, fontweight="bold")
        ax.set_title(title, fontsize=11, fontweight="bold", pad=8)
        ax.legend(fontsize=8, loc="upper right", framealpha=0.9)
        ax.grid(True, alpha=0.3, linestyle="--")
        ax.tick_params(labelsize=9)
        ax.xaxis.set_major_locator(ticker.MaxNLocator(8))
        ax.yaxis.set_major_locator(ticker.MaxNLocator(6))

        for spine in ax.spines.values():
            spine.set_linewidth(0.8)

        fig.tight_layout()

        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight", facecolor="white")
        plt.close(fig)
        buf.seek(0)

        self._figure_counter += 1
        self._figures.append({
            "number": self._figure_counter,
            "data": buf.read(),
            "caption": caption or title,
        })
        return b""

    def _embed_figures(self):
        for fig_info in self._figures:
            buf = io.BytesIO(fig_info["data"])
            img = Image(buf, width=FIGURE_WIDTH_CM * cm, height=FIGURE_HEIGHT_CM * cm)
            self._story.append(Spacer(1, 0.3 * cm))
            self._story.append(img)
            caption_text = f"Figure {fig_info['number']}: {fig_info['caption']}"
            self._story.append(Paragraph(caption_text, self._styles["FigureCaption"]))
            self._story.append(Spacer(1, 0.3 * cm))

    # ------------------------------------------------------------------
    # Section 1: Project Information
    # ------------------------------------------------------------------

    def _add_project_info(self, project_data: Dict[str, Any]):
        section_num = self._add_section_heading("Project Information")

        rows = [
            ["Project Name", str(project_data.get("name", "N/A"))],
            ["Material", str(project_data.get("material", "N/A"))],
            ["Creation Date", str(project_data.get("created_at", "N/A"))],
            ["Status", str(project_data.get("status", "N/A"))],
        ]

        usable_width = self._page_width - self._margin_left - self._margin_right
        col_widths = [usable_width * 0.35, usable_width * 0.65]
        self._build_table(
            headers=["Property", "Value"],
            rows=rows,
            col_widths=col_widths,
            caption="Table 1: Project information summary",
        )

    # ------------------------------------------------------------------
    # Section 2: Sample Information
    # ------------------------------------------------------------------

    def _add_sample_info(self, experiment_data: Dict[str, Any]):
        section_num = self._add_section_heading("Sample Information")

        wavelength = experiment_data.get("wavelength", 1.5406)
        two_theta = experiment_data.get("two_theta", [])

        two_theta_range = "N/A"
        if two_theta and len(two_theta) >= 2:
            two_theta_range = f"{min(two_theta):.2f} – {max(two_theta):.2f}"

        radiation_source = "Cu Kα" if _safe_float(wavelength, None) and abs(float(wavelength) - 1.5406) < 0.01 else "Custom"

        rows = [
            ["Material Formula", str(experiment_data.get("name") or "Unknown Material")],
            ["Radiation Source", radiation_source],
            ["Wavelength (Å)", _fmt(wavelength, ".4f")],
            ["2θ Range (°)", two_theta_range],
            ["Number of Data Points", str(len(two_theta)) if two_theta else "N/A"],
        ]

        usable_width = self._page_width - self._margin_left - self._margin_right
        col_widths = [usable_width * 0.35, usable_width * 0.65]
        self._build_table(
            headers=["Property", "Value"],
            rows=rows,
            col_widths=col_widths,
            caption="Table 2: Sample and radiation information",
        )

    # ------------------------------------------------------------------
    # Section 3: Experimental Conditions
    # ------------------------------------------------------------------

    def _add_experimental_conditions(self, experiment_data: Dict[str, Any]):
        section_num = self._add_section_heading("Experimental Conditions")

        two_theta = experiment_data.get("two_theta", [])
        data_points = len(two_theta) if two_theta else "N/A"

        step_size = "N/A"
        if two_theta and len(two_theta) >= 2:
            diffs = np.diff(two_theta)
            step_size = f"{np.mean(diffs):.4f}"

        rows = [
            ["File Format", "XRD binary/text (processed)"],
            ["Data Points", str(data_points)],
            ["Step Size (°)", step_size],
            ["Instrument", "N/A"],
            ["Temperature", "N/A (assumed ambient)"],
        ]

        usable_width = self._page_width - self._margin_left - self._margin_right
        col_widths = [usable_width * 0.35, usable_width * 0.65]
        self._build_table(
            headers=["Parameter", "Value"],
            rows=rows,
            col_widths=col_widths,
            caption="Table 3: Experimental conditions",
        )

    # ------------------------------------------------------------------
    # Section 4: Data Summary
    # ------------------------------------------------------------------

    def _add_data_summary(self, experiment_data: Dict[str, Any]):
        section_num = self._add_section_heading("Data Summary")

        intensity = experiment_data.get("intensity", [])
        detected_peaks = experiment_data.get("detected_peaks", [])

        num_peaks = len(detected_peaks) if detected_peaks else 0

        snr = "N/A"
        bg_mean = "N/A"
        bg_std = "N/A"
        if intensity and len(intensity) > 0:
            arr = np.array(intensity, dtype=float)
            bg_est = np.percentile(arr, 10)
            signal_est = np.percentile(arr, 95)
            noise_est = np.std(arr[:max(1, len(arr) // 20)])
            if noise_est > 0:
                snr = f"{signal_est / noise_est:.1f}"
            bg_mean = f"{bg_est:.2f}"
            bg_std = f"{noise_est:.2f}"

        rows = [
            ["Number of Peaks Detected", str(num_peaks)],
            ["Signal-to-Noise Ratio", snr],
            ["Background Mean (counts)", bg_mean],
            ["Background Std Dev", bg_std],
            ["Total Data Points", str(len(intensity)) if intensity else "N/A"],
        ]

        usable_width = self._page_width - self._margin_left - self._margin_right
        col_widths = [usable_width * 0.45, usable_width * 0.55]
        self._build_table(
            headers=["Metric", "Value"],
            rows=rows,
            col_widths=col_widths,
            caption="Table 4: Data summary statistics",
        )

        if detected_peaks and len(detected_peaks) > 0:
            self._add_body("")
            self._add_subsection_heading(section_num, "Detected Peaks")

            peak_headers = ["#", "2θ (°)", "Intensity", "d-spacing (Å)", "FWHM (°)"]
            peak_rows = []
            for idx, peak in enumerate(detected_peaks[:20], 1):
                peak_rows.append([
                    str(idx),
                    _fmt(peak.get("two_theta"), ".3f"),
                    _fmt(peak.get("intensity"), ".1f"),
                    _fmt(peak.get("d_spacing"), ".4f"),
                    _fmt(peak.get("fwhm"), ".4f"),
                ])

            usable_width = self._page_width - self._margin_left - self._margin_right
            peak_col_widths = [
                usable_width * 0.08,
                usable_width * 0.22,
                usable_width * 0.22,
                usable_width * 0.24,
                usable_width * 0.24,
            ]
            self._build_table(
                headers=peak_headers,
                rows=peak_rows,
                col_widths=peak_col_widths,
                caption=f"Table 5: Top {min(20, len(detected_peaks))} detected peaks",
            )

    # ------------------------------------------------------------------
    # Section 5: Processing Workflow
    # ------------------------------------------------------------------

    def _add_processing_workflow(self, experiment_data: Dict[str, Any]):
        section_num = self._add_section_heading("Processing Workflow")

        pipeline_stages = experiment_data.get("pipeline_stages", [])

        if not pipeline_stages:
            self._add_body("No pipeline processing stages have been recorded for this experiment.")
            return

        stage_headers = ["#", "Stage", "Status", "Duration (s)"]
        stage_rows = []
        for idx, stage in enumerate(pipeline_stages, 1):
            stage_name = stage.get("name", "Unknown")
            display_name = PIPELINE_STAGE_LABELS.get(stage_name, stage_name)
            status = stage.get("status", "pending")
            duration = stage.get("duration_seconds")
            duration_str = _fmt(duration, ".2f") if duration is not None else "N/A"
            status_display = status.capitalize() if isinstance(status, str) else str(status)
            stage_rows.append([str(idx), display_name, status_display, duration_str])

        total_duration = sum(
            s.get("duration_seconds", 0)
            for s in pipeline_stages
            if s.get("duration_seconds") is not None
        )

        usable_width = self._page_width - self._margin_left - self._margin_right
        stage_col_widths = [
            usable_width * 0.08,
            usable_width * 0.42,
            usable_width * 0.25,
            usable_width * 0.25,
        ]
        self._build_table(
            headers=stage_headers,
            rows=stage_rows,
            col_widths=stage_col_widths,
            caption=f"Table 6: Pipeline processing stages (total: {_fmt(total_duration, '.2f')} s)",
        )

    # ------------------------------------------------------------------
    # Section 6: Phase Identification Results
    # ------------------------------------------------------------------

    def _add_phase_identification(self, experiment_data: Dict[str, Any]):
        section_num = self._add_section_heading("Phase Identification Results")

        candidate_phases = experiment_data.get("candidate_phases", [])

        if not candidate_phases:
            self._add_body("No phase identification results available.")
            return

        phase_headers = ["Rank", "Material Name", "Formula", "Match Score", "Confidence"]
        phase_rows = []
        for phase in candidate_phases[:15]:
            rank = phase.get("rank", "—")
            name = phase.get("material_name", "Unknown")
            formula = phase.get("material_formula", "—")
            match_score = _fmt_pct(phase.get("match_score"))
            confidence = _fmt_pct(phase.get("confidence"))
            phase_rows.append([str(rank), str(name), str(formula), match_score, confidence])

        usable_width = self._page_width - self._margin_left - self._margin_right
        phase_col_widths = [
            usable_width * 0.08,
            usable_width * 0.30,
            usable_width * 0.28,
            usable_width * 0.17,
            usable_width * 0.17,
        ]
        self._build_table(
            headers=phase_headers,
            rows=phase_rows,
            col_widths=phase_col_widths,
            caption=f"Table 7: Top {min(15, len(candidate_phases))} candidate phases",
        )

    # ------------------------------------------------------------------
    # Section 7: Rietveld Refinement Summary
    # ------------------------------------------------------------------

    def _add_rietveld_summary(self, experiment_data: Dict[str, Any]):
        section_num = self._add_section_heading("Rietveld Refinement Summary")

        rietveld = experiment_data.get("rietveld_results")

        if not rietveld:
            self._add_body("Rietveld refinement has not been performed for this experiment.")
            return

        rows = [
            ["R_wp (%)", _fmt(rietveld.get("r_wp"), ".4f")],
            ["R_p (%)", _fmt(rietveld.get("r_p"), ".4f")],
            ["R_exp (%)", _fmt(rietveld.get("r_exp"), ".4f")],
            ["Chi-squared (χ²)", _fmt(rietveld.get("chi_squared"), ".4f")],
            ["Goodness of Fit (GoF)", _fmt(rietveld.get("gof"), ".4f")],
            ["Iterations", str(rietveld.get("iterations", "N/A"))],
            ["Phases Used", str(rietveld.get("phases_used", "N/A"))],
        ]

        usable_width = self._page_width - self._margin_left - self._margin_right
        col_widths = [usable_width * 0.40, usable_width * 0.60]
        self._build_table(
            headers=["Refinement Metric", "Value"],
            rows=rows,
            col_widths=col_widths,
            caption="Table 8: Rietveld refinement quality indicators",
        )

    # ------------------------------------------------------------------
    # Section 8: Refinement Statistics
    # ------------------------------------------------------------------

    def _add_refinement_statistics(self, experiment_data: Dict[str, Any]):
        section_num = self._add_section_heading("Refinement Statistics")

        rietveld = experiment_data.get("rietveld_results")

        if not rietveld:
            self._add_body("No refinement statistics available.")
            return

        phases = rietveld.get("phases", [])
        if phases:
            self._add_subsection_heading(section_num, "Phase Fractions")
            pf_headers = ["Phase", "Formula", "Fraction (%)"]
            pf_rows = []
            for phase in phases:
                name = phase.get("name", "Unknown")
                formula = phase.get("formula", "—")
                fraction = _fmt_pct(phase.get("fraction"))
                pf_rows.append([str(name), str(formula), fraction])

            usable_width = self._page_width - self._margin_left - self._margin_right
            pf_col_widths = [
                usable_width * 0.35,
                usable_width * 0.35,
                usable_width * 0.30,
            ]
            self._build_table(
                headers=pf_headers,
                rows=pf_rows,
                col_widths=pf_col_widths,
                caption="Table 9: Phase fractions from Rietveld refinement",
            )

        refined_params = rietveld.get("refined_parameters", [])
        if refined_params:
            self._add_subsection_heading(section_num, "Refined Parameters")
            rp_headers = ["Parameter", "Initial", "Refined", "Uncertainty"]
            rp_rows = []
            for param in refined_params:
                rp_rows.append([
                    str(param.get("name", "—")),
                    _fmt(param.get("initial"), ".6f"),
                    _fmt(param.get("refined"), ".6f"),
                    _fmt(param.get("uncertainty"), ".6f"),
                ])

            usable_width = self._page_width - self._margin_left - self._margin_right
            rp_col_widths = [usable_width * 0.30] * 4
            self._build_table(
                headers=rp_headers,
                rows=rp_rows,
                col_widths=rp_col_widths,
                caption="Table 10: Refined structural parameters",
            )

        if not phases and not refined_params:
            self._add_body("Detailed refinement statistics are not available.")

    # ------------------------------------------------------------------
    # Section 9: Conclusions
    # ------------------------------------------------------------------

    def _add_conclusions(
        self,
        project_data: Dict[str, Any],
        experiment_data: Dict[str, Any],
    ):
        section_num = self._add_section_heading("Scientific Conclusions")

        conclusions = self._generate_conclusions(project_data, experiment_data)
        for conclusion in conclusions:
            self._add_paragraph(conclusion, "ConclusionText")

    def _generate_conclusions(
        self,
        project_data: Dict[str, Any],
        experiment_data: Dict[str, Any],
    ) -> List[str]:
        conclusions: List[str] = []
        material = project_data.get("material", "the sample")

        two_theta = experiment_data.get("two_theta", [])
        intensity = experiment_data.get("intensity", [])
        detected_peaks = experiment_data.get("detected_peaks", [])
        candidate_phases = experiment_data.get("candidate_phases", [])
        rietveld = experiment_data.get("rietveld_results")

        if two_theta and intensity:
            conclusions.append(
                f"The diffraction data for <b>{material}</b> consists of "
                f"<b>{len(two_theta)}</b> data points spanning the 2θ range of "
                f"<b>{min(two_theta):.2f}° – {max(two_theta):.2f}°</b>."
            )

        if detected_peaks:
            conclusions.append(
                f"A total of <b>{len(detected_peaks)}</b> diffraction peaks were "
                f"identified in the experimental pattern."
            )

        if candidate_phases:
            top = candidate_phases[0] if candidate_phases else None
            if top:
                name = top.get("material_name", "Unknown")
                score = top.get("match_score")
                score_str = f"{float(score):.1%}" if score is not None else "N/A"
                conclusions.append(
                    f"The best-matching phase from the database search is "
                    f"<b>{name}</b> with a match score of <b>{score_str}</b>."
                )
                if len(candidate_phases) > 1:
                    runner_up = candidate_phases[1]
                    runner_name = runner_up.get("material_name", "Unknown")
                    conclusions.append(
                        f"Additional candidate phases include <b>{runner_name}</b> "
                        f"and {len(candidate_phases) - 1} other matches."
                    )

        if rietveld:
            gof = rietveld.get("gof")
            chi2 = rietveld.get("chi_squared")
            rwp = rietveld.get("r_wp")
            if gof is not None:
                gof_val = float(gof)
                if gof_val < 1.5:
                    quality = "good"
                elif gof_val < 2.5:
                    quality = "acceptable"
                else:
                    quality = "poor"
                conclusions.append(
                    f"The Rietveld refinement yielded a goodness-of-fit (GoF) of "
                    f"<b>{gof_val:.4f}</b>, indicating a <b>{quality}</b> fit quality."
                )
            if rwp is not None:
                conclusions.append(
                    f"The weighted profile R-factor (R_wp) is "
                    f"<b>{float(rwp):.4f}%</b>."
                )

            phases_used = rietveld.get("phases_used", 0)
            phases = rietveld.get("phases", [])
            if phases:
                phase_names = [p.get("name", "Unknown") for p in phases[:3]]
                conclusions.append(
                    f"The refinement utilized <b>{phases_used}</b> phase(s): "
                    f"<b>{', '.join(phase_names)}</b>."
                )

        if not conclusions:
            conclusions.append(
                "Insufficient data is available to draw scientific conclusions. "
                "Please complete the analysis pipeline and Rietveld refinement."
            )

        conclusions.append(
            "This report was automatically generated by the MatPilot scientific "
            "analysis platform. All results should be reviewed and validated by "
            "the researcher before publication."
        )

        return conclusions

    # ------------------------------------------------------------------
    # Section 10: Figures (appended at end as appendix)
    # ------------------------------------------------------------------

    def _add_figures_section(self, experiment_data: Dict[str, Any]):
        two_theta = experiment_data.get("two_theta", [])
        intensity = experiment_data.get("intensity", [])

        if two_theta and intensity:
            self._create_figure(
                two_theta,
                intensity,
                "Experimental Diffraction Pattern",
                caption="Experimental XRD diffraction pattern",
            )

        processed_2t = experiment_data.get("processed_two_theta")
        processed_int = experiment_data.get("processed_intensity")
        if processed_2t and processed_int:
            self._create_figure(
                processed_2t,
                processed_int,
                "Background-Corrected Pattern",
                caption="Background-corrected diffraction pattern",
            )

        rietveld = experiment_data.get("rietveld_results")
        if rietveld and rietveld.get("patterns"):
            patterns = rietveld["patterns"]
            calc_2t = patterns.get("calculated_two_theta", [])
            calc_int = patterns.get("calculated_intensity", [])
            diff_int = patterns.get("difference_intensity", [])

            if calc_2t and calc_int and two_theta:
                x_ref = two_theta if len(two_theta) == len(calc_2t) else two_theta[:len(calc_2t)]
                y_exp = intensity[:len(x_ref)] if len(intensity) >= len(x_ref) else intensity

                extra = []
                if len(calc_int) >= len(x_ref):
                    extra.append({
                        "x": x_ref,
                        "y": calc_int[:len(x_ref)],
                        "label": "Calculated",
                    })
                if diff_int and len(diff_int) >= len(x_ref):
                    extra.append({
                        "x": x_ref,
                        "y": diff_int[:len(x_ref)],
                        "label": "Difference",
                    })

                self._create_figure(
                    x_ref,
                    y_exp[:len(x_ref)],
                    "Rietveld Refinement: Experimental vs Calculated",
                    extra_traces=extra,
                    caption="Overlay of experimental, calculated, and difference patterns from Rietveld refinement",
                )

        if self._figures:
            self._story.append(PageBreak())
            appendix_num = self._next_section_number()
            heading_text = f"{appendix_num}. Figures"
            self._story.append(Paragraph(heading_text, self._styles["SectionHeading"]))
            self._record_toc(heading_text, level=1)
            self._story.append(Spacer(1, 0.2 * cm))
            self._embed_figures()

    # ------------------------------------------------------------------
    # PDF assembly
    # ------------------------------------------------------------------

    def _build_pdf(self, title: str) -> bytes:
        buf = io.BytesIO()

        doc = BaseDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=self._margin_left,
            rightMargin=self._margin_right,
            topMargin=self._margin_top,
            bottomMargin=self._margin_bottom,
            title=f"MatPilot Report – {title}",
            author="MatPilot",
        )

        frame_cover = Frame(
            self._margin_left,
            self._margin_bottom,
            self._page_width - self._margin_left - self._margin_right,
            self._page_height - self._margin_top - self._margin_bottom,
            id="cover",
        )
        frame_content = Frame(
            self._margin_left,
            self._margin_bottom + 0.5 * cm,
            self._page_width - self._margin_left - self._margin_right,
            self._page_height - self._margin_top - self._margin_bottom - 0.5 * cm,
            id="content",
        )

        def _cover_bg(canvas, doc):
            canvas.saveState()
            canvas.setFillColor(HEADER_BG)
            canvas.rect(0, 0, self._page_width, self._page_height, fill=True, stroke=False)

            canvas.setFillColor(colors.HexColor("#f97316"))
            canvas.rect(
                0,
                self._page_height - 0.4 * cm,
                self._page_width,
                0.4 * cm,
                fill=True,
                stroke=False,
            )
            canvas.rect(
                0,
                0,
                self._page_width,
                0.4 * cm,
                fill=True,
                stroke=False,
            )
            canvas.restoreState()

        doc.addPageTemplates([
            PageTemplate(id="cover", frames=[frame_cover], onPage=_cover_bg),
            PageTemplate(
                id="content",
                frames=[frame_content],
                onPage=_NumberedCanvas(doc, title),
            ),
        ])

        doc.build(self._story)
        buf.seek(0)
        return buf.read()
