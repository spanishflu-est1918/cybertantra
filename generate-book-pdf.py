#!/usr/bin/env python3
"""Generate PDF book from markdown chapters for reMarkable tablet."""

import os
import re
from pathlib import Path
from reportlab.lib.pagesizes import A5, A6
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Image
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from pathlib import Path

# Page sizes
FORMATS = {
    'tablet': A5,  # reMarkable, iPad
    'mobile': (3.5*inch, 6*inch),  # Phone-friendly (iPhone-ish proportions)
}

# Register custom fonts
FONTS_DIR = Path(__file__).parent / 'fonts'
CORMORANT_DIR = FONTS_DIR / 'Cormorant Garamond Font'
pdfmetrics.registerFont(TTFont('Cormorant', CORMORANT_DIR / 'CormorantGaramond-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Cormorant-Bold', CORMORANT_DIR / 'CormorantGaramond-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Cormorant-Italic', CORMORANT_DIR / 'CormorantGaramond-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Cinzel', FONTS_DIR / 'Cinzel-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Cinzel-Bold', FONTS_DIR / 'Cinzel-Bold.ttf'))

# Cover image
COVER_IMAGE = FONTS_DIR / 'cover.jpeg'

# Color schemes
THEMES = {
    'dark': {
        'bg': HexColor('#1a1a1a'),
        'text': HexColor('#f5f5dc'),
    },
    'light': {
        'bg': HexColor('#fffef9'),
        'text': HexColor('#1a1a1a'),
    },
}

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

def create_pdf(chapters_dir: str, output_path: str, theme: str = 'dark', format: str = 'tablet'):
    """Create PDF from chapter markdown files."""

    # Get colors for theme
    colors = THEMES.get(theme, THEMES['dark'])
    BG_COLOR = colors['bg']
    TEXT_COLOR = colors['text']

    # Get page size for format
    PAGE_WIDTH, PAGE_HEIGHT = FORMATS.get(format, FORMATS['tablet'])
    is_mobile = format == 'mobile'

    # Adjust margins for format (mobile gets tighter margins for more text area)
    if is_mobile:
        margins = {'left': 5*mm, 'right': 5*mm, 'top': 6*mm, 'bottom': 6*mm}
    else:
        margins = {'left': 15*mm, 'right': 15*mm, 'top': 20*mm, 'bottom': 20*mm}

    # Setup document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=(PAGE_WIDTH, PAGE_HEIGHT),
        leftMargin=margins['left'],
        rightMargin=margins['right'],
        topMargin=margins['top'],
        bottomMargin=margins['bottom'],
    )

    # Create styles
    styles = getSampleStyleSheet()

    # Font sizes - mobile gets larger text for readability
    if is_mobile:
        sizes = {'title': 24, 'h1': 16, 'h2': 12, 'body': 11, 'toc': 11}
        spacing = {'title_after': 12, 'h1_after': 10, 'h2_after': 8, 'body_after': 6}
    else:
        sizes = {'title': 28, 'h1': 18, 'h2': 12, 'body': 11, 'toc': 11}
        spacing = {'title_after': 30, 'h1_after': 20, 'h2_after': 12, 'body_after': 8}

    # Track if we've drawn the cover
    cover_drawn = [False]  # Use list to allow modification in nested function

    # Background drawing function
    def draw_background(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(BG_COLOR)
        canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=1, stroke=0)
        canvas.restoreState()

    # First page with cover (tablet only - mobile skips cover)
    def draw_first_page(canvas, doc):
        if COVER_IMAGE.exists() and not cover_drawn[0] and not is_mobile:
            # Draw cover image full-bleed (tablet only)
            canvas.drawImage(str(COVER_IMAGE), 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT, preserveAspectRatio=False)
            cover_drawn[0] = True
        else:
            draw_background(canvas, doc)

    # Book title style - Cinzel for that carved-in-stone feel
    title_style = ParagraphStyle(
        'BookTitle',
        parent=styles['Title'],
        fontSize=sizes['title'],
        leading=sizes['title'] + 6,
        alignment=TA_CENTER,
        spaceAfter=spacing['title_after'],
        fontName='Cinzel-Bold',
        textColor=TEXT_COLOR,
    )

    # Chapter title style - Cinzel
    h1_style = ParagraphStyle(
        'ChapterTitle',
        parent=styles['Heading1'],
        fontSize=sizes['h1'],
        leading=sizes['h1'] + 4,
        alignment=TA_CENTER,
        spaceAfter=spacing['h1_after'],
        spaceBefore=0,
        fontName='Cinzel-Bold',
        textColor=TEXT_COLOR,
    )

    # Section heading style - Cinzel
    h2_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=sizes['h2'],
        leading=sizes['h2'] + 3,
        alignment=TA_CENTER,
        spaceAfter=spacing['h2_after'],
        spaceBefore=12 if not is_mobile else 8,
        fontName='Cinzel',
        textColor=TEXT_COLOR,
    )

    # Body text style - Cormorant Garamond for elegant reading
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=sizes['body'],
        leading=sizes['body'] + 4,
        alignment=TA_JUSTIFY,
        spaceAfter=spacing['body_after'],
        fontName='Cormorant',
        firstLineIndent=12 if is_mobile else 15,
        textColor=TEXT_COLOR,
    )

    # First paragraph (no indent)
    first_para_style = ParagraphStyle(
        'FirstPara',
        parent=body_style,
        firstLineIndent=0,
        textColor=TEXT_COLOR,
    )

    # Italic/quote style
    italic_style = ParagraphStyle(
        'ItalicText',
        parent=body_style,
        fontName='Cormorant-Italic',
        alignment=TA_CENTER,
        spaceBefore=8 if is_mobile else 12,
        spaceAfter=8 if is_mobile else 12,
        textColor=TEXT_COLOR,
    )

    # Build story
    story = []

    # Cover page - just a page break, the image is drawn by draw_first_page (tablet only)
    if COVER_IMAGE.exists() and not is_mobile:
        story.append(PageBreak())

    # Title page
    story.append(Spacer(1, 40 if is_mobile else 80))
    story.append(Paragraph("CYBERTANTRA", title_style))
    story.append(Spacer(1, 10 if is_mobile else 20))
    story.append(Paragraph("The New Frontier", ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=11 if is_mobile else 14,
        alignment=TA_CENTER,
        fontName='Cormorant-Italic',
        textColor=TEXT_COLOR,
    )))
    story.append(Spacer(1, 30 if is_mobile else 60))
    story.append(Paragraph("Ride the Tiger Yoga", ParagraphStyle(
        'Author',
        parent=styles['Normal'],
        fontSize=9 if is_mobile else 11,
        alignment=TA_CENTER,
        fontName='Cormorant',
        textColor=TEXT_COLOR,
    )))
    story.append(PageBreak())

    # Table of contents page
    story.append(Spacer(1, 15 if is_mobile else 30))
    story.append(Paragraph("Contents", h1_style))
    story.append(Spacer(1, 10 if is_mobile else 20))

    toc_entries = [
        "1. Cybertantra",
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
        fontSize=sizes['toc'],
        leading=14 if is_mobile else 20,
        alignment=TA_CENTER,
        fontName='Cormorant',
        textColor=TEXT_COLOR,
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
                story.append(Spacer(1, 20 if is_mobile else 40))
                story.append(Paragraph(text, h1_style))
                story.append(Spacer(1, 10 if is_mobile else 20))
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
                hr_space = 8 if is_mobile else 15
                story.append(Spacer(1, hr_space))
                story.append(Paragraph("* * *", ParagraphStyle(
                    'HR',
                    parent=styles['Normal'],
                    fontSize=sizes['body'],
                    alignment=TA_CENTER,
                    fontName='Cormorant',
                    textColor=TEXT_COLOR,
                )))
                story.append(Spacer(1, hr_space))
                is_first_para = True

        # Page break after chapter
        story.append(PageBreak())

    # Build PDF with cover on first page, dark background on others
    doc.build(story, onFirstPage=draw_first_page, onLaterPages=draw_background)
    print(f"PDF created: {output_path}")

if __name__ == '__main__':
    import sys
    import argparse

    parser = argparse.ArgumentParser(description='Generate PDF book from markdown chapters')
    parser.add_argument('--theme', choices=['dark', 'light', 'both'], default='both',
                        help='Color theme (default: both)')
    parser.add_argument('--format', choices=['tablet', 'mobile', 'all'], default='tablet',
                        help='Page format (default: tablet)')
    parser.add_argument('--chapters', default='./book/generated/chapters',
                        help='Path to chapters directory')
    parser.add_argument('--output', default='.',
                        help='Output directory')

    args = parser.parse_args()

    chapters_dir = args.chapters
    base_path = args.output

    themes = ['dark', 'light'] if args.theme == 'both' else [args.theme]
    formats = ['tablet', 'mobile'] if args.format == 'all' else [args.format]

    for fmt in formats:
        for theme in themes:
            fmt_suffix = f'-{fmt}' if fmt != 'tablet' else ''
            theme_suffix = f'-{theme}'
            output_file = f'{base_path}/cybertantra-book{fmt_suffix}{theme_suffix}.pdf'
            create_pdf(chapters_dir, output_file, theme, fmt)

    print("Done!")
