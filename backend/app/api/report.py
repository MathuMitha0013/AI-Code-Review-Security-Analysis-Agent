"""
Code Review Report Generation Module API Route (Milestone 4).

Generates an exportable, professionally formatted PDF report covering:
- Executive findings summary
- Severity distribution breakdown
- OWASP category mapping & code quality smells
- Line-by-line detailed findings inventory
- Actionable remediation roadmap
"""

from io import BytesIO
import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)

from app.orchestrator.schemas import UnifiedReviewReport

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["report"])


def _build_pdf_report(report: UnifiedReviewReport) -> BytesIO:
    """Generates a ReportLab PDF document stream from a UnifiedReviewReport."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY_COLOR = colors.HexColor("#1E293B")  # Slate 800
    ACCENT_BLUE = colors.HexColor("#2563EB")    # Blue 600
    TEXT_DARK = colors.HexColor("#0F172A")      # Slate 900
    TEXT_MUTED = colors.HexColor("#64748B")     # Slate 500
    BG_LIGHT = colors.HexColor("#F8FAFC")       # Slate 50

    # Severity Colors
    COLOR_CRITICAL = colors.HexColor("#DC2626") # Red 600
    COLOR_HIGH = colors.HexColor("#EA580C")     # Orange 600
    COLOR_MEDIUM = colors.HexColor("#D97706")   # Amber 600
    COLOR_LOW = colors.HexColor("#2563EB")      # Blue 600

    # Custom Typography Styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=PRIMARY_COLOR,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=TEXT_MUTED,
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=PRIMARY_COLOR,
        spaceBefore=12,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
    )

    bold_body = ParagraphStyle(
        "BoldBody",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    story = []

    # 1. Header Banner
    today_str = datetime.now().strftime("%B %d, %Y - %H:%M UTC")
    story.append(Paragraph("Secoria AI — Code Review & Security Report", title_style))
    story.append(Paragraph(f"Generated on {today_str} | Target Language: {report.language.capitalize()}", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_BLUE, spaceBefore=2, spaceAfter=12))

    # 2. Executive Summary Metrics Grid
    sev_color = COLOR_LOW
    if report.overall_severity == "critical":
        sev_color = COLOR_CRITICAL
    elif report.overall_severity == "high":
        sev_color = COLOR_HIGH
    elif report.overall_severity == "medium":
        sev_color = COLOR_MEDIUM

    metrics_data = [
        [
            Paragraph("<b>Overall Code Health Score</b>", body_style),
            Paragraph("<b>Overall Severity Status</b>", body_style),
            Paragraph("<b>Total Findings Flagged</b>", body_style),
        ],
        [
            Paragraph(f"<font size=16 color='{ACCENT_BLUE.hexval()}'><b>{report.health_score} / 100</b></font>", body_style),
            Paragraph(f"<font size=14 color='{sev_color.hexval()}'><b>{report.overall_severity.upper()}</b></font>", body_style),
            Paragraph(f"<font size=16 color='{PRIMARY_COLOR.hexval()}'><b>{report.summary.total_findings}</b></font>", body_style),
        ],
    ]

    metrics_table = Table(metrics_data, colWidths=[180, 180, 180])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 14))

    # 3. Severity & Agent Breakdown Table
    story.append(Paragraph("Severity Breakdown", section_heading))
    breakdown_data = [
        ["Agent Source", "Critical", "High", "Medium", "Low", "Total Findings"],
        [
            "Code Quality Agent",
            "-",
            "-",
            "-",
            "-",
            str(report.summary.code_analysis_findings),
        ],
        [
            "Security Vulnerability Agent",
            "-",
            "-",
            "-",
            "-",
            str(report.summary.security_findings),
        ],
        [
            "Combined Portfolio Summary",
            str(report.summary.critical),
            str(report.summary.high),
            str(report.summary.medium),
            str(report.summary.low),
            str(report.summary.total_findings),
        ],
    ]

    breakdown_table = Table(breakdown_data, colWidths=[160, 75, 75, 75, 75, 80])
    breakdown_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, BG_LIGHT]),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#F1F5F9")),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, PRIMARY_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94A3B8")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(breakdown_table)
    story.append(Spacer(1, 14))

    # 4. Detailed Findings Inventory
    story.append(Paragraph("Detailed Findings Inventory", section_heading))

    if not report.findings:
        story.append(Paragraph("<b>No code smells or security vulnerabilities detected. Code passes all quality gates.</b>", body_style))
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

            line_info = f"Line {finding.line}" if finding.line is not None else "Global / Structure"
            owasp_info = f" | OWASP: {finding.owasp_category}" if getattr(finding, "owasp_category", None) else ""
            rule_info = f" ({finding.rule_id})" if getattr(finding, "rule_id", None) else ""

            finding_box = [
                [
                    Paragraph(
                        f"<b>#{idx}. {finding.title}</b>{rule_info}",
                        bold_body
                    ),
                    Paragraph(
                        f"<font color='{badge_color.hexval()}'><b>[{finding.severity.upper()}]</b></font>",
                        ParagraphStyle("RightBadge", parent=bold_body, alignment=2)
                    )
                ],
                [
                    Paragraph(
                        f"<b>Source:</b> {finding.source_agent} | <b>Location:</b> {line_info}{owasp_info}",
                        subtitle_style
                    ),
                    ""
                ],
                [
                    Paragraph(finding.description, body_style),
                    ""
                ],
            ]

            finding_table = Table(finding_box, colWidths=[400, 140])
            finding_table.setStyle(TableStyle([
                ('SPAN', (0, 1), (1, 1)),
                ('SPAN', (0, 2), (1, 2)),
                ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('LINELEFT', (0, 0), (0, -1), 3.5, badge_color),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ]))

            story.append(KeepTogether([finding_table, Spacer(1, 8)]))

    # 5. Actionable Remediation Roadmap
    story.append(Spacer(1, 10))
    story.append(Paragraph("Actionable Remediation Roadmap", section_heading))
    roadmap_items = [
        "1. <b>Prioritize Critical & High Vulnerabilities:</b> Address all SQL Injection and OS Command Execution flaws immediately before deploying.",
        "2. <b>Refactor High Complexity Functions:</b> Break down deeply nested decision trees into modular helper methods.",
        "3. <b>Remove Hardcoded Secrets:</b> Move raw API keys and database credentials to secure environment variables (`.env`).",
        "4. <b>Upgrade Cryptographic Hashing:</b> Replace weak algorithms (MD5/SHA-1) with secure hashing functions (PBKDF2/bcrypt/SHA-256).",
        "5. <b>Automate CI/CD Gateways:</b> Run Secoria automated reviews on pull requests to prevent security regressions.",
    ]
    for item in roadmap_items:
        story.append(Paragraph(item, body_style))
        story.append(Spacer(1, 4))

    doc.build(story)
    buffer.seek(0)
    return buffer


@router.post("/report/pdf")
async def generate_pdf_report(report: UnifiedReviewReport):
    """
    Generates and downloads an exportable PDF report for a Secoria review scan.
    """
    try:
        pdf_stream = _build_pdf_report(report)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"secoria_code_review_report_{timestamp}.pdf"

        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        logger.exception("Failed to generate PDF report")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
