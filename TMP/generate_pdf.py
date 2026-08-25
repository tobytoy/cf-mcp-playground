#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert tdx_vs_context_mcp_report.md to high-quality Blue-themed HTML and PDF.
"""

import os
import re
import markdown
import weasyprint

MD_PATH = "/home/toby/projects/Github/cf-mcp-playground/TMP/tdx_vs_context_mcp_report.md"
HTML_PATH = "/home/toby/projects/Github/cf-mcp-playground/TMP/tdx_vs_context_mcp_report.html"
PDF_PATH = "/home/toby/projects/Github/cf-mcp-playground/TMP/tdx_vs_context_mcp_report.pdf"

def generate_html_and_pdf():
    with open(MD_PATH, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Convert markdown to html with rich extensions
    html_body = markdown.markdown(
        md_text,
        extensions=[
            "extra",
            "codehilite",
            "toc",
            "sane_lists",
            "tables",
            "fenced_code",
        ],
        output_format="html5",
    )

    # Enhance visual styling for blockquotes and code blocks if needed
    # CSS with modern executive blue theme
    css_style = """
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+TC:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
        size: A4 portrait;
        margin: 18mm 16mm 18mm 16mm;
        @top-right {
            content: "交通部 TDX vs. 情境感知 MCP 評估報告";
            font-family: 'Inter', 'Noto Sans TC', sans-serif;
            font-size: 8pt;
            font-weight: 500;
            color: #64748B;
        }
        @bottom-left {
            content: "專案儲存庫: tobytoy/cf-mcp-playground";
            font-family: 'Inter', 'Noto Sans TC', sans-serif;
            font-size: 8pt;
            color: #94A3B8;
        }
        @bottom-right {
            content: "第 " counter(page) " 頁，共 " counter(pages) " 頁";
            font-family: 'Inter', 'Noto Sans TC', sans-serif;
            font-size: 8pt;
            font-weight: 500;
            color: #475569;
        }
    }

    * {
        box-sizing: border-box;
    }

    body {
        font-family: 'Inter', 'Noto Sans TC', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 10pt;
        line-height: 1.65;
        color: #1E293B;
        background-color: #FFFFFF;
        margin: 0;
        padding: 0;
    }

    /* Top Cover / Header Banner */
    h1 {
        color: #0F2744;
        font-size: 20pt;
        font-weight: 800;
        line-height: 1.3;
        margin-top: 0;
        margin-bottom: 6px;
        padding-bottom: 12px;
        border-bottom: 3px solid #2563EB;
        letter-spacing: -0.5px;
    }

    h2 {
        color: #1E3A8A;
        font-size: 13.5pt;
        font-weight: 700;
        margin-top: 24px;
        margin-bottom: 12px;
        padding-bottom: 6px;
        border-bottom: 1.5px solid #DBEAFE;
        page-break-after: avoid;
        break-after: avoid;
    }

    h3 {
        color: #1D4ED8;
        font-size: 11.5pt;
        font-weight: 600;
        margin-top: 18px;
        margin-bottom: 8px;
        page-break-after: avoid;
        break-after: avoid;
    }

    h4 {
        color: #2563EB;
        font-size: 10.5pt;
        font-weight: 600;
        margin-top: 14px;
        margin-bottom: 6px;
        page-break-after: avoid;
        break-after: avoid;
    }

    p {
        margin-top: 0;
        margin-bottom: 10px;
        text-align: justify;
    }

    /* Executive Metadata Callout */
    blockquote {
        background: linear-gradient(135deg, #F0F7FF 0%, #E0EFFF 100%);
        border-left: 4px solid #2563EB;
        border-radius: 6px;
        margin: 12px 0 18px 0;
        padding: 10px 14px;
        color: #1E3A8A;
        font-size: 9.5pt;
    }

    blockquote p {
        margin: 0;
        line-height: 1.55;
    }

    /* Links */
    a {
        color: #2563EB;
        text-decoration: none;
        font-weight: 500;
    }

    /* Tables - Professional Cobalt Blue Styling */
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0 18px 0;
        font-size: 9pt;
        background-color: #FFFFFF;
        border-radius: 6px;
        overflow: hidden;
        page-break-inside: avoid;
        break-inside: avoid;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    th {
        background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);
        color: #FFFFFF;
        font-weight: 600;
        text-align: left;
        padding: 8px 10px;
        border: 1px solid #1D4ED8;
    }

    td {
        padding: 7px 10px;
        border: 1px solid #E2E8F0;
        vertical-align: top;
        color: #334155;
    }

    tr:nth-child(even) td {
        background-color: #F8FAFC;
    }

    tr:hover td {
        background-color: #EFF6FF;
    }

    /* Code & Pre */
    code {
        font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        font-size: 8.5pt;
        background-color: #EFF6FF;
        color: #1E40AF;
        padding: 2px 5px;
        border-radius: 4px;
        border: 1px solid #BFDBFE;
    }

    pre {
        background-color: #0B192C;
        color: #E2E8F0;
        padding: 12px 14px;
        border-radius: 8px;
        overflow-x: auto;
        font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
        font-size: 8pt;
        line-height: 1.45;
        margin: 12px 0 16px 0;
        border: 1px solid #1E293B;
        page-break-inside: avoid;
        break-inside: avoid;
    }

    pre code {
        background-color: transparent;
        color: inherit;
        padding: 0;
        border: none;
        font-size: inherit;
    }

    /* Lists */
    ul, ol {
        margin-top: 4px;
        margin-bottom: 12px;
        padding-left: 20px;
    }

    li {
        margin-bottom: 4px;
        line-height: 1.55;
    }

    /* Horizontal Rules */
    hr {
        border: none;
        border-top: 1px dashed #CBD5E1;
        margin: 20px 0;
    }

    /* Badges & Highlights */
    .badge {
        display: inline-block;
        padding: 2px 6px;
        font-size: 8pt;
        font-weight: 600;
        border-radius: 4px;
    }
    .badge-blue { background-color: #DBEAFE; color: #1E40AF; }
    .badge-green { background-color: #DCFCE7; color: #166534; }
    .badge-red { background-color: #FEE2E2; color: #991B1B; }

    /* Page Break Helpers */
    .page-break {
        page-break-before: always;
        break-before: page;
    }
    """

    full_html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>智慧交通情境感知 MCP vs. 交通部官方 TDX MCP 評估報告</title>
    <style>
{css_style}
    </style>
</head>
<body>
{html_body}
</body>
</html>
"""

    with open(HTML_PATH, "w", encoding="utf-8") as f:
        f.write(full_html)
    print(f"HTML generated successfully: {HTML_PATH}")

    # Generate PDF with WeasyPrint
    print("Converting HTML to PDF with WeasyPrint...")
    weasyprint.HTML(HTML_PATH).write_pdf(PDF_PATH)
    print(f"PDF generated successfully: {PDF_PATH}")

if __name__ == "__main__":
    generate_html_and_pdf()
