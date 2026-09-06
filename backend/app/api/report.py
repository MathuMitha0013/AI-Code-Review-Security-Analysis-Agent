"""
Code Review Report Generation Module API Route (Milestone 4).

Generates exportable, professionally formatted executive PDF reports covering:
- Executive findings summary & code health gauge
- Severity distribution breakdown & SLA resolution targets
- OWASP Top 10 & CWE category mapping
- Detailed findings inventory with vulnerable snippets & remediation fixes
- Code quality & cyclomatic complexity assessment
- Actionable 4-phase remediation roadmap
- Support for single-file and multi-file project archives
"""

from io import BytesIO
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)

from app.orchestrator.schemas import UnifiedReviewReport, MultiFileReviewReport

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["report"])


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that dynamically calculates the total page count
    and renders professional running headers and footers with 'Page X of Y'.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 756, "Secoria AI — Executive Security & Code Audit Report")
            self.drawRightString(576, 756, "CONFIDENTIAL & PROPRIETARY")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 748, 576, 748)

        # Running Footer (all pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 42, 576, 42)

        self.drawString(36, 30, "Secoria Smart Code Inspection Platform v1.0.0 | Grounded in OWASP Top 10")
        self.drawRightString(576, 30, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def _get_report_styles():
    styles = getSampleStyleSheet()

    PRIMARY_COLOR = colors.HexColor("#0F172A")  # Slate 900
    ACCENT_INDIGO = colors.HexColor("#4F46E5")  # Indigo 600
    TEXT_DARK = colors.HexColor("#1E293B")      # Slate 800
    TEXT_MUTED = colors.HexColor("#64748B")     # Slate 500

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=PRIMARY_COLOR,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=TEXT_MUTED,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=PRIMARY_COLOR,
        spaceBefore=10,
        spaceAfter=5,
    )

    sub_section_heading = ParagraphStyle(
        "SubSectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=ACCENT_INDIGO,
        spaceBefore=5,
        spaceAfter=2,
    )

    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11.5,
        textColor=TEXT_DARK,
    )

    bold_body = ParagraphStyle(
        "BoldBody",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    code_style = ParagraphStyle(
        "CodeBoxText",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=7,
        leading=9.5,
        textColor=colors.HexColor("#991B1B"),
    )

    # Dedicated Table Header & Cell styles ensuring automatic word-wrapping
    th_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=colors.white,
    )

    th_center = ParagraphStyle(
        "TableHeaderCenter",
        parent=th_style,
        alignment=1,
    )

    td_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10.5,
        textColor=TEXT_DARK,
    )

    td_bold = ParagraphStyle(
        "TableCellBold",
        parent=td_style,
        fontName="Helvetica-Bold",
    )

    td_center = ParagraphStyle(
        "TableCellCenter",
        parent=td_style,
        alignment=1,
    )

    return {
        "title": title_style,
        "subtitle": subtitle_style,
        "section": section_heading,
        "sub_section": sub_section_heading,
        "body": body_style,
        "bold": bold_body,
        "code": code_style,
        "th": th_style,
        "th_center": th_center,
        "td": td_style,
        "td_bold": td_bold,
        "td_center": td_center,
    }


def _build_pdf_report(report: UnifiedReviewReport) -> BytesIO:
    """Generates an executive ReportLab PDF document stream from a UnifiedReviewReport."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=46,
        bottomMargin=48,
    )

    styles = _get_report_styles()

    # Color definitions
    PRIMARY_COLOR = colors.HexColor("#0F172A")
    ACCENT_INDIGO = colors.HexColor("#4F46E5")
    BG_LIGHT = colors.HexColor("#F8FAFC")

    COLOR_CRITICAL = colors.HexColor("#DC2626")  # Red 600
    COLOR_HIGH = colors.HexColor("#EA580C")      # Orange 600
    COLOR_MEDIUM = colors.HexColor("#D97706")    # Amber 600
    COLOR_LOW = colors.HexColor("#2563EB")       # Blue 600
    COLOR_PASSED = colors.HexColor("#059669")    # Emerald 600

    story = []

    # 1. Executive Header
    today_str = datetime.now().strftime("%B %d, %Y - %H:%M UTC")
    report_id = f"SEC-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    story.append(Paragraph("Secoria AI — Executive Security & Code Audit Report", styles["title"]))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        f"<b>Audit Report ID:</b> {report_id} &nbsp;|&nbsp; <b>Scan Date:</b> {today_str} &nbsp;|&nbsp; <b>Language:</b> {report.language.capitalize()}",
        styles["subtitle"]
    ))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_INDIGO, spaceBefore=2, spaceAfter=8))

    # 2. Executive Posture & Score Overview
    health = report.health_score
    health_color = COLOR_PASSED if health >= 85 else COLOR_MEDIUM if health >= 65 else COLOR_CRITICAL
    gate_decision = "PASSED" if report.summary.critical == 0 and report.summary.high == 0 else "BLOCKED"
    gate_color = COLOR_PASSED if gate_decision == "PASSED" else COLOR_CRITICAL

    card_label_style = ParagraphStyle("CardLabel", parent=styles["td_center"], fontName="Helvetica-Bold", textColor=colors.HexColor("#475569"))
    
    metrics_data = [
        [
            Paragraph("Overall Code Health", card_label_style),
            Paragraph("Merge Gate Decision", card_label_style),
            Paragraph("Overall Risk Status", card_label_style),
            Paragraph("Total Issues Flagged", card_label_style),
        ],
        [
            Paragraph(f"<font size=14 color='{health_color.hexval()}'><b>{health} / 100</b></font>", styles["td_center"]),
            Paragraph(f"<font size=12 color='{gate_color.hexval()}'><b>{gate_decision}</b></font>", styles["td_center"]),
            Paragraph(f"<font size=12 color='{COLOR_CRITICAL.hexval() if report.overall_severity == 'critical' else COLOR_HIGH.hexval() if report.overall_severity == 'high' else COLOR_MEDIUM.hexval() if report.overall_severity == 'medium' else COLOR_LOW.hexval()}'><b>{report.overall_severity.upper()}</b></font>", styles["td_center"]),
            Paragraph(f"<font size=14 color='{PRIMARY_COLOR.hexval()}'><b>{report.summary.total_findings}</b></font>", styles["td_center"]),
        ],
    ]

    metrics_table = Table(metrics_data, colWidths=[135, 135, 135, 135])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 8))

    # 3. Risk Breakdown Matrix with SLA Target Windows (Wrapped in Paragraph to prevent text overlap)
    story.append(Paragraph("Vulnerability Breakdown & SLA Resolution Matrix", styles["section"]))
    
    breakdown_data = [
        [
            Paragraph("Severity Level", styles["th"]),
            Paragraph("Issues", styles["th_center"]),
            Paragraph("OWASP Category Focus", styles["th"]),
            Paragraph("Action Required", styles["th"]),
            Paragraph("Resolution SLA", styles["th_center"]),
        ],
        [
            Paragraph(f"<font color='{COLOR_CRITICAL.hexval()}'><b>Critical</b></font>", styles["td"]),
            Paragraph(str(report.summary.critical), styles["td_center"]),
            Paragraph("Injection, Deserialization, Hardcoded Secrets", styles["td"]),
            Paragraph("Block PR Merge / Immediate Hotfix", styles["td"]),
            Paragraph("<b>&lt; 24 Hours</b>", styles["td_center"]),
        ],
        [
            Paragraph(f"<font color='{COLOR_HIGH.hexval()}'><b>High</b></font>", styles["td"]),
            Paragraph(str(report.summary.high), styles["td_center"]),
            Paragraph("Broken Access Control, Cryptographic Flaws", styles["td"]),
            Paragraph("Remediate before production release", styles["td"]),
            Paragraph("<b>&le; 7 Days</b>", styles["td_center"]),
        ],
        [
            Paragraph(f"<font color='{COLOR_MEDIUM.hexval()}'><b>Medium</b></font>", styles["td"]),
            Paragraph(str(report.summary.medium), styles["td_center"]),
            Paragraph("High Complexity, Resource Leaks, Error Handling", styles["td"]),
            Paragraph("Refactor & modularize in current sprint", styles["td"]),
            Paragraph("<b>&le; 14 Days</b>", styles["td_center"]),
        ],
        [
            Paragraph(f"<font color='{COLOR_LOW.hexval()}'><b>Low / Info</b></font>", styles["td"]),
            Paragraph(str(report.summary.low), styles["td_center"]),
            Paragraph("Code Style, Bare Excepts, Dead Code", styles["td"]),
            Paragraph("Continuous improvement & cleanup", styles["td"]),
            Paragraph("Next Sprint", styles["td_center"]),
        ],
    ]

    # Total width = 75 + 50 + 175 + 150 + 90 = 540 pt
    breakdown_table = Table(breakdown_data, colWidths=[75, 50, 175, 150, 90])
    breakdown_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94A3B8")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(breakdown_table)
    story.append(Spacer(1, 8))

    # 4. In-Depth Detailed Findings Inventory
    story.append(Paragraph(f"Detailed Findings Inventory ({len(report.findings)} Issues)", styles["section"]))

    if not report.findings:
        story.append(Paragraph("<b>✅ Clean Scan: No code smells or security vulnerabilities detected. Code passes all security gates.</b>", styles["body"]))
    else:
        for idx, finding in enumerate(report.findings, start=1):
            sev = finding.severity.lower()
            badge_color = COLOR_LOW
            if sev == "critical":
                badge_color = COLOR_CRITICAL
            elif sev == "high":
                badge_color = COLOR_HIGH
            elif sev == "medium":
                badge_color = COLOR_MEDIUM

            line_info = f"Line {finding.line}" if finding.line is not None else "Global Scope"
            source_label = "Security Vulnerability Agent" if finding.source_agent == "security" else "Code Quality Analysis Agent"
            owasp_label = f" | <b>OWASP:</b> {finding.category}" if finding.category else ""
            rule_id = getattr(finding, "rule_id", "") or f"SEC-{sev.upper()[:3]}-{idx:02d}"

            finding_rows = [
                [
                    Paragraph(f"<b>#{idx}. {finding.title}</b> <font color='#64748B'>({rule_id})</font>", styles["bold"]),
                    Paragraph(f"<font color='{badge_color.hexval()}'><b>[{finding.severity.upper()}]</b></font>", ParagraphStyle("RightBadge", parent=styles["bold"], alignment=2)),
                ],
                [
                    Paragraph(f"<b>Source:</b> {source_label} &nbsp;|&nbsp; <b>Location:</b> {line_info}{owasp_label}", styles["subtitle"]),
                    "",
                ],
                [
                    Paragraph(f"<b>Impact & Description:</b> {finding.description}", styles["body"]),
                    "",
                ],
            ]

            # If code snippet exists
            if getattr(finding, "code_snippet", None):
                snippet_text = finding.code_snippet.strip().replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                finding_rows.append([
                    Paragraph(f"<b>Vulnerable Code Snippet:</b><br/><font face='Courier' size=7 color='#991B1B'>{snippet_text}</font>", styles["body"]),
                    "",
                ])

            finding_table = Table(finding_rows, colWidths=[420, 120])
            finding_table.setStyle(TableStyle([
                ('SPAN', (0, 1), (1, 1)),
                ('SPAN', (0, 2), (1, 2)),
                *([('SPAN', (0, 3), (1, 3))] if len(finding_rows) > 3 else []),
                ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('LINELEFT', (0, 0), (0, -1), 3.5, badge_color),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ]))

            story.append(KeepTogether([finding_table, Spacer(1, 5)]))

    # 5. Actionable 4-Phase Remediation Roadmap
    story.append(Spacer(1, 6))
    story.append(Paragraph("Actionable 4-Phase Remediation Roadmap", styles["section"]))

    roadmap_data = [
        [
            Paragraph("Phase", styles["th"]),
            Paragraph("Focus Area", styles["th"]),
            Paragraph("Remediation Guidance & Best Practices", styles["th"]),
        ],
        [
            Paragraph("<b>Phase 1: Hotfix</b>", styles["td"]),
            Paragraph("<font color='#DC2626'><b>Critical Security</b></font>", styles["td"]),
            Paragraph("Eliminate all SQL Injections with parameterized queries, eliminate raw OS commands (os.system / Runtime.exec), and revoke hardcoded secrets.", styles["td"]),
        ],
        [
            Paragraph("<b>Phase 2: Hardening</b>", styles["td"]),
            Paragraph("<font color='#EA580C'><b>High & Medium Risks</b></font>", styles["td"]),
            Paragraph("Enforce strict input validation with allowlists, replace weak hashing algorithms with bcrypt/SHA-256, and secure object deserialization.", styles["td"]),
        ],
        [
            Paragraph("<b>Phase 3: Refactoring</b>", styles["td"]),
            Paragraph("<font color='#4F46E5'><b>Maintainability</b></font>", styles["td"]),
            Paragraph("Decompose high-complexity functions exceeding cyclomatic threshold (score > 10) into single-responsibility modular helper methods.", styles["td"]),
        ],
        [
            Paragraph("<b>Phase 4: DevSecOps</b>", styles["td"]),
            Paragraph("<font color='#059669'><b>CI/CD Governance</b></font>", styles["td"]),
            Paragraph("Integrate Secoria GitHub PR Webhook bot into your pull request pipeline to enforce automated merge gates on every commit.", styles["td"]),
        ],
    ]

    # Total width = 95 + 115 + 330 = 540 pt
    roadmap_table = Table(roadmap_data, colWidths=[95, 115, 330])
    roadmap_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94A3B8")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(roadmap_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer


def _build_zip_pdf_report(report: MultiFileReviewReport) -> BytesIO:
    """Generates an executive ReportLab PDF report for an entire multi-file project repository."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=46,
        bottomMargin=48,
    )

    styles = _get_report_styles()

    PRIMARY_COLOR = colors.HexColor("#0F172A")
    ACCENT_INDIGO = colors.HexColor("#4F46E5")
    BG_LIGHT = colors.HexColor("#F8FAFC")

    COLOR_CRITICAL = colors.HexColor("#DC2626")
    COLOR_HIGH = colors.HexColor("#EA580C")
    COLOR_MEDIUM = colors.HexColor("#D97706")
    COLOR_LOW = colors.HexColor("#2563EB")
    COLOR_PASSED = colors.HexColor("#059669")

    story = []

    # 1. Header Banner
    today_str = datetime.now().strftime("%B %d, %Y - %H:%M UTC")
    report_id = f"PROJ-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    story.append(Paragraph("Secoria AI — Multi-File Repository Security Audit", styles["title"]))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        f"<b>Project Archive:</b> {report.archive_name} &nbsp;|&nbsp; <b>Report ID:</b> {report_id} &nbsp;|&nbsp; <b>Generated:</b> {today_str}",
        styles["subtitle"]
    ))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_INDIGO, spaceBefore=2, spaceAfter=8))

    # 2. Executive Project Metrics Grid
    health = report.overall_health_score
    health_color = COLOR_PASSED if health >= 85 else COLOR_MEDIUM if health >= 65 else COLOR_CRITICAL
    gate_decision = "PASSED" if report.summary.critical == 0 and report.summary.high == 0 else "BLOCKED"
    gate_color = COLOR_PASSED if gate_decision == "PASSED" else COLOR_CRITICAL

    card_label_style = ParagraphStyle("CardLabelProj", parent=styles["td_center"], fontName="Helvetica-Bold", textColor=colors.HexColor("#475569"))

    metrics_data = [
        [
            Paragraph("Project Health Score", card_label_style),
            Paragraph("Merge Gate Decision", card_label_style),
            Paragraph("Files Scanned / Clean", card_label_style),
            Paragraph("Total Issues Flagged", card_label_style),
        ],
        [
            Paragraph(f"<font size=14 color='{health_color.hexval()}'><b>{health} / 100</b></font>", styles["td_center"]),
            Paragraph(f"<font size=12 color='{gate_color.hexval()}'><b>{gate_decision}</b></font>", styles["td_center"]),
            Paragraph(f"<font size=12 color='{PRIMARY_COLOR.hexval()}'><b>{report.summary.total_files_scanned}</b> ({report.summary.clean_files_count} clean)</font>", styles["td_center"]),
            Paragraph(f"<font size=14 color='{PRIMARY_COLOR.hexval()}'><b>{report.summary.total_findings}</b></font>", styles["td_center"]),
        ],
    ]

    metrics_table = Table(metrics_data, colWidths=[135, 135, 135, 135])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 8))

    # 3. File Inventory Summary Table (All cells wrapped in Paragraphs)
    story.append(Paragraph(f"Repository File Inventory & Health ({len(report.files)} Files)", styles["section"]))

    file_table_data = [
        [
            Paragraph("File Path", styles["th"]),
            Paragraph("Lang", styles["th_center"]),
            Paragraph("LOC", styles["th_center"]),
            Paragraph("Health", styles["th_center"]),
            Paragraph("Status", styles["th_center"]),
            Paragraph("Crit", styles["th_center"]),
            Paragraph("High", styles["th_center"]),
            Paragraph("Med", styles["th_center"]),
            Paragraph("Low", styles["th_center"]),
        ]
    ]

    for f in report.files:
        status_text = "PASSED" if f.overall_severity == "low" and f.health_score >= 90 else f.overall_severity.upper()
        status_color = COLOR_PASSED if status_text == "PASSED" else COLOR_CRITICAL if status_text == "CRITICAL" else COLOR_MEDIUM
        file_table_data.append([
            Paragraph(f"<font size=7><b>{f.file_path}</b></font>", styles["td"]),
            Paragraph(f.language.upper(), styles["td_center"]),
            Paragraph(str(f.lines_of_code), styles["td_center"]),
            Paragraph(f"{f.health_score}%", styles["td_center"]),
            Paragraph(f"<font color='{status_color.hexval()}'><b>{status_text}</b></font>", styles["td_center"]),
            Paragraph(str(f.summary.critical), styles["td_center"]),
            Paragraph(str(f.summary.high), styles["td_center"]),
            Paragraph(str(f.summary.medium), styles["td_center"]),
            Paragraph(str(f.summary.low), styles["td_center"]),
        ])

    # Col widths sum = 180 + 40 + 40 + 50 + 60 + 35 + 45 + 45 + 45 = 540 pt
    file_table = Table(file_table_data, colWidths=[180, 40, 40, 50, 60, 35, 45, 45, 45])
    file_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94A3B8")),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(file_table)
    story.append(Spacer(1, 8))

    # 4. Detailed Finding Highlights across files
    total_findings_list = []
    for f in report.files:
        for finding in f.findings:
            total_findings_list.append((f.file_path, finding))

    story.append(Paragraph(f"Detailed Vulnerability Highlights ({len(total_findings_list)} Total Findings)", styles["section"]))

    if not total_findings_list:
        story.append(Paragraph("<b>✅ Clean Repository: All files passed security and quality gates without findings.</b>", styles["body"]))
    else:
        for idx, (fpath, finding) in enumerate(total_findings_list, start=1):
            sev = finding.severity.lower()
            badge_color = COLOR_CRITICAL if sev == "critical" else COLOR_HIGH if sev == "high" else COLOR_MEDIUM if sev == "medium" else COLOR_LOW
            line_info = f"Line {finding.line}" if finding.line is not None else "Global Scope"

            finding_rows = [
                [
                    Paragraph(f"<b>#{idx}. {finding.title}</b> &nbsp;|&nbsp; <font color='#4F46E5'>{fpath}</font>", styles["bold"]),
                    Paragraph(f"<font color='{badge_color.hexval()}'><b>[{finding.severity.upper()}]</b></font>", ParagraphStyle("RightBadge", parent=styles["bold"], alignment=2)),
                ],
                [
                    Paragraph(f"<b>Location:</b> {line_info} &nbsp;|&nbsp; <b>Category:</b> {finding.category}", styles["subtitle"]),
                    "",
                ],
                [
                    Paragraph(f"<b>Description:</b> {finding.description}", styles["body"]),
                    "",
                ],
            ]

            finding_table = Table(finding_rows, colWidths=[420, 120])
            finding_table.setStyle(TableStyle([
                ('SPAN', (0, 1), (1, 1)),
                ('SPAN', (0, 2), (1, 2)),
                ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 3.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('LINELEFT', (0, 0), (0, -1), 3.5, badge_color),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ]))
            story.append(KeepTogether([finding_table, Spacer(1, 5)]))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer


@router.post("/report/pdf")
async def generate_pdf_report(report: UnifiedReviewReport):
    """
    Generates and downloads an executive PDF audit report for a single-file review scan.
    """
    try:
        pdf_stream = _build_pdf_report(report)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"secoria_security_audit_report_{timestamp}.pdf"

        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        logger.exception("Failed to generate PDF report")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.post("/report/zip-pdf")
async def generate_zip_pdf_report(report: MultiFileReviewReport):
    """
    Generates and downloads an executive PDF audit report for a multi-file project ZIP scan.
    """
    try:
        pdf_stream = _build_zip_pdf_report(report)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        clean_archive_name = report.archive_name.replace(".zip", "")
        filename = f"secoria_project_audit_{clean_archive_name}_{timestamp}.pdf"

        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        logger.exception("Failed to generate ZIP project PDF report")
        raise HTTPException(status_code=500, detail=f"Project PDF generation failed: {str(e)}")
