"""
Build PDF from the markdown draft using pandoc.

Usage:
  python writeup/build_pdf.py

Requires: pandoc (brew install pandoc)
Falls back to weasyprint if no LaTeX engine is available.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRAFT = ROOT / "writeup" / "draft.md"
OUT_PDF = ROOT / "writeup" / "uap_corpus_paper.pdf"
OUT_HTML = ROOT / "writeup" / "uap_corpus_paper.html"

CSS = """
@page {
    size: letter;
    margin: 1in;
}
body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a1a;
    max-width: 7.5in;
    margin: 0 auto;
}
h1 {
    font-size: 22pt;
    text-align: center;
    margin-bottom: 0.5em;
    border-bottom: none;
}
h2 {
    font-size: 14pt;
    margin-top: 1.5em;
    border-bottom: 1px solid #ccc;
    padding-bottom: 0.3em;
}
h3 {
    font-size: 12pt;
    margin-top: 1.2em;
}
blockquote {
    border-left: 3px solid #999;
    padding-left: 1em;
    margin-left: 0;
    color: #444;
    font-style: italic;
}
img {
    max-width: 100%;
    display: block;
    margin: 1em auto;
}
table {
    border-collapse: collapse;
    width: 100%;
    font-size: 9pt;
    margin: 1em 0;
}
th, td {
    border: 1px solid #ddd;
    padding: 4px 8px;
    text-align: left;
}
th {
    background: #f5f5f5;
    font-weight: bold;
}
code {
    font-size: 9pt;
    background: #f5f5f5;
    padding: 1px 4px;
    border-radius: 2px;
}
p img + em, p img ~ em {
    display: block;
    text-align: center;
    font-size: 9pt;
    color: #666;
    margin-top: -0.5em;
}
"""


def build_with_pandoc_latex():
    """Try pandoc with LaTeX engine."""
    cmd = [
        "pandoc", str(DRAFT),
        "-o", str(OUT_PDF),
        "--pdf-engine=xelatex",
        "-V", "geometry:margin=1in",
        "-V", "fontsize=11pt",
        "-V", "mainfont=Georgia",
        "--resource-path", str(ROOT),
        "--standalone",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        return True
    return False


def build_with_pandoc_html():
    """pandoc to HTML, then weasyprint to PDF."""
    css_path = ROOT / "writeup" / "paper.css"
    css_path.write_text(CSS)

    # Step 1: pandoc markdown -> standalone HTML
    cmd = [
        "pandoc", str(DRAFT),
        "-o", str(OUT_HTML),
        "--standalone",
        "--css", str(css_path),
        "--self-contained",
        "--resource-path", str(ROOT),
        "--metadata", "title=",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"pandoc HTML failed: {result.stderr}")
        return False

    # Step 2: weasyprint HTML -> PDF
    try:
        from weasyprint import HTML
        HTML(filename=str(OUT_HTML)).write_pdf(str(OUT_PDF))
        return True
    except Exception as e:
        print(f"weasyprint failed: {e}")
        return False


def build_weasyprint_direct():
    """Pure Python fallback: markdown -> HTML manually, then weasyprint."""
    try:
        import markdown
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "markdown"],
                       capture_output=True)
        import markdown

    from weasyprint import HTML

    md_text = DRAFT.read_text()
    html_body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code"],
    )

    # Fix image paths to be absolute
    html_body = html_body.replace('src="../', f'src="{ROOT}/')

    full_html = f"""<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>{CSS}</style>
</head><body>
{html_body}
</body></html>"""

    OUT_HTML.write_text(full_html)
    HTML(string=full_html, base_url=str(ROOT)).write_pdf(str(OUT_PDF))
    return True


def main():
    print(f"Building PDF from {DRAFT}...")

    # Try pandoc + LaTeX first
    if subprocess.run(["which", "pandoc"], capture_output=True).returncode == 0:
        if subprocess.run(["which", "xelatex"], capture_output=True).returncode == 0:
            print("  trying pandoc + xelatex...")
            if build_with_pandoc_latex():
                print(f"  wrote {OUT_PDF}")
                return

        print("  trying pandoc + weasyprint...")
        if build_with_pandoc_html():
            print(f"  wrote {OUT_PDF}")
            return

    # Pure Python fallback
    print("  trying pure Python (markdown + weasyprint)...")
    if build_weasyprint_direct():
        print(f"  wrote {OUT_PDF}")
        return

    print("  all methods failed")
    sys.exit(1)


if __name__ == "__main__":
    main()
