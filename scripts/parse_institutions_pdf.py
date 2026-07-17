"""
Parse official TrabaGE institutions catalog PDF into institutions.js.

The PDF table columns (name, city, country, type) are often split across lines.
This parser walks backwards from known type suffixes to recover each row.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader

PDF_PATH = Path(r"c:\Users\user\Desktop\imagenes\catalogo_instituciones_educativas_trabage.pdf")
OUT_JS = Path(__file__).resolve().parent.parent / "src" / "data" / "institutions.js"

COUNTRIES = [
    "Guinea Ecuatorial",
    "Camerún",
    "Benín",
    "Senegal",
    "China",
    "España",
]

CITIES = [
    "Ciudad de la Paz (Oyala)",
    "Las Palmas de Gran Canaria",
    "Alcalá de Henares",
    "Abomey-Calavi",
    "Malabo",
    "Mongomo",
    "Bata",
    "Ebibeyín",
    "Yaundé",
    "Duala",
    "Dakar",
    "Hangzhou",
    "Pekín",
    "Shanghái",
    "Tianjín",
    "Madrid",
]

TYPE_SUFFIXES = [
    ("Instituto de Formación Profesional", "fp"),
    ("Instituto de Educación Secundaria", "institute"),
    ("Centro Técnico", "technical"),
    ("Universidad", "university"),
    ("Colegio", "school"),
]


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    ascii_text = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    ascii_text = ascii_text.lower()
    ascii_text = re.sub(r"[^a-z0-9]+", "-", ascii_text)
    return ascii_text.strip("-")


def extract_pages_text() -> str:
    reader = PdfReader(str(PDF_PATH))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def normalize_pdf_text(text: str) -> str:
    text = text.replace("\ufb01", "fi").replace("\ufb02", "fl")
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl")
    text = re.sub(r"\r\n?", "\n", text)
    return text


def clean_lines(text: str) -> list[str]:
    skip_prefixes = (
        "Catálogo de Instituciones",
        "— TrabaGE",
        "Documento de referencia",
        "Nombre oficial",
        "Universidades",
        "Institutos de Formación Profesional",
        "Centros de Formación Técnica",
        "Institutos de Educación Secundaria",
        "Colegios oficiales",
        "Notas metodológicas",
        "Este catálogo",
        "La lista de colegios",
        "Para Camerún",
        "Todas las instituciones",
    )
    country_markers = ("🇬🇶", "🇨🇲", "🇧🇯", "🇸🇳", "China", "España", "󾓭", "󾓫")

    lines: list[str] = []
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            continue
        if any(line.startswith(prefix) for prefix in skip_prefixes):
            continue
        if line == "Ciudad País Tipo":
            continue
        if any(marker in line for marker in country_markers) and "Universidad" not in line and "Colegio" not in line:
            # Keep country header lines like "🇨🇲  Camerún" but strip emoji
            for country in COUNTRIES:
                if country in line:
                    lines.append(country)
                    break
            continue
        lines.append(line)
    return lines


def join_lines_from_index(lines: list[str], start: int) -> str:
    return " ".join(lines[start:]).strip()


def match_suffix(lines: list[str], index: int) -> tuple[str, int] | None:
    """Return (internal_type, lines_consumed) if lines[index:] starts with a known suffix."""
    tail = join_lines_from_index(lines, index)

    for suffix, internal in TYPE_SUFFIXES:
        if tail == suffix or tail.startswith(suffix + " "):
            consumed = len(suffix.split())
            return internal, consumed

    # Multi-line suffixes broken across lines
    for suffix, internal in TYPE_SUFFIXES:
        suffix_parts = suffix.split()
        if len(suffix_parts) <= 1:
            continue
        candidate = " ".join(lines[index : index + len(suffix_parts)])
        if candidate == suffix:
            return internal, len(suffix_parts)

    return None


def extract_country_and_city(before: str) -> tuple[str, str, str]:
    """Return (name, city, country) from text preceding type suffix."""
    text = before.strip()
    country = ""
    for c in COUNTRIES:
        if text.endswith(c):
            country = c
            text = text[: -len(c)].strip()
            break
        # Handle split country across words at end
        if c == "Guinea Ecuatorial" and text.endswith("Ecuatorial"):
            # Could be "... Guinea Ecuatorial" or just "... Ecuatorial"
            if text.endswith("Guinea Ecuatorial"):
                country = c
                text = text[: -len(c)].strip()
                break
            if text.endswith("Ecuatorial"):
                country = c
                text = text[: -len("Ecuatorial")].strip()
                if text.endswith("Guinea"):
                    text = text[: -len("Guinea")].strip()
                break

    city = ""
    for c in sorted(CITIES, key=len, reverse=True):
        if text.endswith(c):
            city = c
            text = text[: -len(c)].strip()
            break

    name = text.strip(" ,—-")
    return name, city, country


def parse_institutions(text: str) -> list[dict]:
    lines = clean_lines(text)
    joined = " ".join(lines)

    institutions: list[dict] = []
    current_country = "Guinea Ecuatorial"

    # Re-split joined stream by scanning for type suffixes
    i = 0
    while i < len(lines):
        if lines[i] in COUNTRIES:
            current_country = lines[i]
            i += 1
            continue

        suffix_match = match_suffix(lines, i)
        if not suffix_match:
            i += 1
            continue

        inst_type, consumed = suffix_match
        before_parts = lines[:i]
        before_text = " ".join(before_parts)

        # Only use text since previous institution (after last parsed point)
        if institutions:
            # Find overlap: use lines from after previous entry's consumed block
            pass

        i += consumed

    # Simpler approach: regex on full joined text with known suffix patterns
    return parse_by_regex(joined)


def parse_by_regex(joined: str) -> list[dict]:
    # Normalize spaces
    joined = re.sub(r"\s+", " ", joined)

    # Insert markers before each type suffix to split entries
    patterns = [
        (r" Instituto de Formación Profesional", "fp"),
        (r" Instituto de Educación Secundaria", "institute"),
        (r" Centro Técnico", "technical"),
        (r" Universidad", "university"),
        (r" Colegio", "school"),
    ]

    # Split while keeping suffix
    entries: list[tuple[str, str]] = []
    remaining = joined

    # Process country sections
    country_sections: list[tuple[str, str]] = []
    section_start = 0
    for country in COUNTRIES:
        idx = remaining.find(country)
        if idx >= 0:
            country_sections.append((country, idx))

    country_sections.sort(key=lambda x: x[1])

    institutions: list[dict] = []

    def parse_section(section_text: str, default_country: str) -> None:
        # Split on type suffixes - use last occurrence pattern
        # Build regex: (.*?)(?: Instituto de Formación Profesional|...| Colegio)$
        type_regex = (
            r"(.+?)\s+(Instituto de Formación Profesional|Instituto de Educación Secundaria|"
            r"Centro Técnico|Universidad|Colegio)\s*"
        )
        for match in re.finditer(type_regex, section_text):
            body = match.group(1).strip()
            pdf_type = match.group(2).strip()
            internal = next(v for s, v in TYPE_SUFFIXES if s == pdf_type)

            name, city, country = extract_country_and_city(body)
            if not country:
                country = default_country
            if not name:
                continue

            institutions.append(
                {
                    "name": name,
                    "country": country,
                    "city": city,
                    "type": internal,
                }
            )

    # Guinea Ecuatorial is first section before Camerún marker
    ge_end = joined.find("Camerún")
    if ge_end == -1:
        ge_end = len(joined)
    parse_section(joined[:ge_end], "Guinea Ecuatorial")

    for idx, (country, pos) in enumerate(country_sections):
        if country == "Guinea Ecuatorial":
            continue
        end = country_sections[idx + 1][1] if idx + 1 < len(country_sections) else joined.find("Notas metodológicas")
        if end == -1:
            end = len(joined)
        section = joined[pos + len(country) : end]
        parse_section(section, country)

    return institutions


def assign_ids(institutions: list[dict]) -> list[dict]:
    seen: dict[str, int] = {}
    result = []
    for inst in institutions:
        base = slugify(f"{inst['name']}-{inst['city']}-{inst['country']}")
        count = seen.get(base, 0)
        seen[base] = count + 1
        inst_id = base if count == 0 else f"{base}-{count + 1}"
        result.append({"id": inst_id, **inst})
    return result


def render_js(institutions: list[dict]) -> str:
    payload = json.dumps(institutions, ensure_ascii=False, indent=2)
    return f"""/**
 * Official educational institutions catalog for TrabaGE.
 * Source: catalogo_instituciones_educativas_trabage.pdf (verified official names).
 *
 * @typedef {{'university'|'institute'|'school'|'fp'|'technical'}} InstitutionType
 *
 * @typedef {{Object}} Institution
 * @property {{string}} id - Stable slug/id for the institution
 * @property {{string}} name - Official full name (saved to profile as-is)
 * @property {{string}} country
 * @property {{string}} city
 * @property {{InstitutionType}} type
 * @property {{string}} [verifiedId] - Future: TrabaGE verified organization account id
 * @property {{string}} [logoUrl] - Future: official logo when institution is verified on TrabaGE
 */

/** @type {{Record<InstitutionType, string>}} */
export const INSTITUTION_TYPE_LABELS = {{
  university: 'Universidad',
  institute: 'Instituto',
  school: 'Colegio',
  fp: 'FP',
  technical: 'Técnico',
}};

/** @type {{Institution[]}} */
export const INSTITUTIONS = {payload};

export default INSTITUTIONS;
"""


def main() -> None:
    text = normalize_pdf_text(extract_pages_text())
    institutions = parse_institutions(text)
    institutions = assign_ids(institutions)

    OUT_JS.write_text(render_js(institutions), encoding="utf-8")

    by_country: dict[str, int] = {}
    for inst in institutions:
        by_country[inst["country"]] = by_country.get(inst["country"], 0) + 1

    print(f"Total institutions: {len(institutions)}")
    for country in COUNTRIES:
        print(f"  {country}: {by_country.get(country, 0)}")
    print(f"Written: {OUT_JS}")

    # Validation output
    for inst in institutions:
        print(f"  [{inst['type']}] {inst['name']} | {inst['city']} | {inst['country']}")


if __name__ == "__main__":
    main()
