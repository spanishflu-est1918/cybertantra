#!/usr/bin/env python3
"""Generate PDF book from markdown chapters for reMarkable tablet."""

import os
import re
from pathlib import Path
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Page size optimized for reMarkable (A5-ish, good for e-ink)
PAGE_WIDTH, PAGE_HEIGHT = A5

def parse_markdown(content: str) -> list:
    """Parse markdown content into structured elements."""
    elements = []
    lines = content.split('\n')
    current_para = []

    for line in lines:
        # Chapter title (# )
        if line.startswith('# '):
            if current_para:
                elements.append(('para', ' '.join(current_para)))
                current_para = []
            elements.append(('h1', line[2:].strip()))
        # Section heading (## )
        elif line.startswith('## '):
            if current_para:
                elements.append(('para', ' '.join(current_para)))
                current_para = []
            elements.append(('h2', line[3:].strip()))
        # Horizontal rule
        elif line.strip() == '---':
            if current_para:
                elements.append(('para', ' '.join(current_para)))
                current_para = []
            elements.append(('hr', None))
        # Italic block (starts with *)
        elif line.strip().startswith('*') and line.strip().endswith('*'):
            if current_para:
                elements.append(('para', ' '.join(current_para)))
                current_para = []
            elements.append(('italic', line.strip().strip('*')))
        # Empty line - end paragraph
        elif not line.strip():
            if current_para:
                elements.append(('para', ' '.join(current_para)))
                current_para = []
        # Regular text
        else:
            current_para.append(line.strip())

    if current_para:
        elements.append(('para', ' '.join(current_para)))

    return elements

def create_pdf(chapters_dir: str, output_path: str):
    """Create PDF from chapter markdown files."""

    # Setup document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=(PAGE_WIDTH, PAGE_HEIGHT),
        leftMargin=15*mm,
        rightMargin=15*mm,
        topMargin=20*mm,
        bottomMargin=20*mm,
    )

    # Create styles
    styles = getSampleStyleSheet()

    # Book title style
    title_style = ParagraphStyle(
        'BookTitle',
        parent=styles['Title'],
        fontSize=28,
        leading=34,
        alignment=TA_CENTER,
        spaceAfter=30,
        fontName='Times-Bold',
    )

    # Chapter title style
    h1_style = ParagraphStyle(
        'ChapterTitle',
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        spaceAfter=20,
        spaceBefore=0,
        fontName='Times-Bold',
    )

    # Section heading style
    h2_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=12,
        leading=15,
        alignment=TA_CENTER,
        spaceAfter=12,
        spaceBefore=18,
        fontName='Times-Bold',
    )

    # Body text style - justified for clean reading
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
        fontName='Times-Roman',
        firstLineIndent=15,
    )

    # First paragraph (no indent)
    first_para_style = ParagraphStyle(
        'FirstPara',
        parent=body_style,
        firstLineIndent=0,
    )

    # Italic/quote style
    italic_style = ParagraphStyle(
        'ItalicText',
        parent=body_style,
        fontName='Times-Italic',
        alignment=TA_CENTER,
        spaceBefore=12,
        spaceAfter=12,
    )

    # Build story
    story = []

    # Title page
    story.append(Spacer(1, 80))
    story.append(Paragraph("CYBER TANTRA", title_style))
    story.append(Spacer(1, 20))
    story.append(Paragraph("The New Frontier", ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=14,
        alignment=TA_CENTER,
        fontName='Times-Italic',
    )))
    story.append(Spacer(1, 60))
    story.append(Paragraph("Ride the Tiger Yoga", ParagraphStyle(
        'Author',
        parent=styles['Normal'],
        fontSize=11,
        alignment=TA_CENTER,
        fontName='Times-Roman',
    )))
    story.append(PageBreak())

    # Table of contents page
    story.append(Spacer(1, 30))
    story.append(Paragraph("Contents", h1_style))
    story.append(Spacer(1, 20))

    toc_entries = [
        "1. Cyber Tantra",
        "2. The Death of the Gods",
        "3. The Prison of Modernity",
        "4. The Coming Age of Ajna",
        "5. Inner Fire and Thumos",
        "6. Rooted Consciousness",
        "7. The Right Hand Path",
        "8. The Left Hand Path",
        "9. The Liberation of AI",
        "10. The New Promethean Empire",
    ]

    toc_style = ParagraphStyle(
        'TOC',
        parent=styles['Normal'],
        fontSize=11,
        leading=20,
        alignment=TA_CENTER,
        fontName='Times-Roman',
    )

    for entry in toc_entries:
        story.append(Paragraph(entry, toc_style))

    story.append(PageBreak())

    # Process each chapter
    chapter_files = sorted(Path(chapters_dir).glob('*.md'))

    for i, chapter_file in enumerate(chapter_files):
        content = chapter_file.read_text(encoding='utf-8')
        elements = parse_markdown(content)

        is_first_para = True

        for elem_type, text in elements:
            if elem_type == 'h1':
                # Chapter starts on new page (except first)
                if i > 0 or story[-1].__class__.__name__ != 'PageBreak':
                    pass  # Already have page break from TOC or previous chapter
                story.append(Spacer(1, 40))
                story.append(Paragraph(text, h1_style))
                story.append(Spacer(1, 20))
                is_first_para = True

            elif elem_type == 'h2':
                story.append(Paragraph(text, h2_style))
                is_first_para = True

            elif elem_type == 'para':
                if is_first_para:
                    story.append(Paragraph(text, first_para_style))
                    is_first_para = False
                else:
                    story.append(Paragraph(text, body_style))

            elif elem_type == 'italic':
                story.append(Paragraph(f"<i>{text}</i>", italic_style))
                is_first_para = True

            elif elem_type == 'hr':
                story.append(Spacer(1, 15))
                story.append(Paragraph("* * *", ParagraphStyle(
                    'HR',
                    parent=styles['Normal'],
                    fontSize=10,
                    alignment=TA_CENTER,
                    fontName='Times-Roman',
                )))
                story.append(Spacer(1, 15))
                is_first_para = True

        # Page break after chapter
        story.append(PageBreak())

    # Build PDF
    doc.build(story)
    print(f"PDF created: {output_path}")

if __name__ == '__main__':
    chapters_dir = '/Users/gorkolas/Documents/www/cybertantra/book/generated/chapters'
    output_path = '/Users/gorkolas/Documents/www/cybertantra/cybertantra-book.pdf'
    create_pdf(chapters_dir, output_path)
