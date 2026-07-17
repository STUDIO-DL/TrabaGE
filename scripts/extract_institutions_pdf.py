"""Extract raw text from official TrabaGE institutions PDF for parsing."""
import sys
from pathlib import Path

from pypdf import PdfReader

PDF_PATH = Path(r"c:\Users\user\Desktop\imagenes\catalogo_instituciones_educativas_trabage.pdf")
OUT_PATH = Path(__file__).resolve().parent / "catalogo_instituciones_raw.txt"


def main() -> None:
    reader = PdfReader(str(PDF_PATH))
    parts = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        parts.append(f"\n--- PAGE {i + 1} ---\n{text}")
    OUT_PATH.write_text("\n".join(parts), encoding="utf-8")
    print(f"Pages: {len(reader.pages)}")
    print(f"Written: {OUT_PATH}")
    print(f"Chars: {sum(len(p) for p in parts)}")


if __name__ == "__main__":
    main()
