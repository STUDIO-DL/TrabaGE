#!/usr/bin/env python3
"""Verify every institution name exists in the official PDF text."""
import re
from pathlib import Path

from pypdf import PdfReader

from generate_institutions_js import RAW_INSTITUTIONS

PDF_PATH = Path(r"c:\Users\user\Desktop\imagenes\catalogo_instituciones_educativas_trabage.pdf")


def normalize(text: str) -> str:
    text = text.replace("\ufb01", "fi").replace("\ufb02", "fl")
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl")
    return " ".join(text.split()).lower()


def main() -> None:
    reader = PdfReader(str(PDF_PATH))
    pdf_text = normalize(" ".join(page.extract_text() or "" for page in reader.pages))

    missing = []
    for name, city, country, _ in RAW_INSTITUTIONS:
        # PDF line breaks may split hyphenated words; check token presence
        tokens = [t for t in re.split(r"[\s—\-]+", normalize(name)) if len(t) > 2]
        if not all(token in pdf_text for token in tokens):
            missing.append(name)

    if missing:
        print("MISSING from PDF:")
        for name in missing:
            print(f"  - {name}")
        raise SystemExit(1)

    print(f"Verified {len(RAW_INSTITUTIONS)} institution names against PDF.")


if __name__ == "__main__":
    main()
