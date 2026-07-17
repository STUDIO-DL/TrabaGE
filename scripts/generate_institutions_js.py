#!/usr/bin/env python3
"""Generate institutions.js from verified PDF entries (exact official names)."""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

OUT_JS = Path(__file__).resolve().parent.parent / "src" / "data" / "institutions.js"

# Exact entries transcribed from catalogo_instituciones_educativas_trabage.pdf
RAW_INSTITUTIONS = [
    # Guinea Ecuatorial — Universidades
    ("Universidad Nacional de Guinea Ecuatorial", "Malabo", "Guinea Ecuatorial", "university"),
    ("Universidad Afro-Americana de África Central", "Ciudad de la Paz (Oyala)", "Guinea Ecuatorial", "university"),
    (
        "Universidad Nacional de Educación a Distancia — Centro Asociado de Guinea Ecuatorial",
        "Malabo",
        "Guinea Ecuatorial",
        "university",
    ),
    (
        "Escuela Complutense Africana (Universidad Complutense de Madrid)",
        "Malabo",
        "Guinea Ecuatorial",
        "university",
    ),
    (
        "Fundación Universitaria Iberoamericana — FUNIBER (en alianza con Universidad Europea del Atlántico)",
        "Malabo",
        "Guinea Ecuatorial",
        "university",
    ),
    (
        "BANGE Business School (en alianza con el Centro de Estudios Financieros — Universidad a Distancia de Madrid)",
        "Malabo",
        "Guinea Ecuatorial",
        "university",
    ),
    # Guinea Ecuatorial — Institutos de Formación Profesional
    ("Instituto Nacional de Formación Profesional", "Malabo", "Guinea Ecuatorial", "fp"),
    (
        "Instituto Nacional de Formación Profesional en Hostelería, Turismo, Artes y Oficios de Mongomo",
        "Mongomo",
        "Guinea Ecuatorial",
        "fp",
    ),
    ("Centro de Formación Profesional de Bata", "Bata", "Guinea Ecuatorial", "fp"),
    ("Instituto Nostradamus de Formación Técnica y Profesional", "Malabo", "Guinea Ecuatorial", "fp"),
    ("Centro de Estudios Vitae", "Malabo", "Guinea Ecuatorial", "fp"),
    # Guinea Ecuatorial — Centros de Formación Técnica
    (
        "Instituto Tecnológico Nacional de Hidrocarburos de Guinea Ecuatorial",
        "Ciudad de la Paz (Oyala)",
        "Guinea Ecuatorial",
        "technical",
    ),
    (
        "Escuela Nacional de Electricidad de Guinea Ecuatorial",
        "Ciudad de la Paz (Oyala)",
        "Guinea Ecuatorial",
        "technical",
    ),
    ("Instituto Nacional de Administración Pública", "Malabo", "Guinea Ecuatorial", "technical"),
    # Guinea Ecuatorial — Institutos de Educación Secundaria
    ("Instituto de Enseñanza Secundaria Rey Malabo", "Malabo", "Guinea Ecuatorial", "institute"),
    ("Colegio Nacional Enrique Nvó Okenve", "Bata", "Guinea Ecuatorial", "institute"),
    ("Instituto Bioko Norte", "Malabo", "Guinea Ecuatorial", "institute"),
    ("Instituto Politécnico Modesto Gené", "Bata", "Guinea Ecuatorial", "institute"),
    ("Instituto Padre Sialó", "Bata", "Guinea Ecuatorial", "institute"),
    ("Instituto África Piloto", "Bata", "Guinea Ecuatorial", "institute"),
    # Guinea Ecuatorial — Colegios
    ("Colegio Español Don Bosco de Malabo", "Malabo", "Guinea Ecuatorial", "school"),
    ("Colegio Español de Bata", "Bata", "Guinea Ecuatorial", "school"),
    ("Colegio E'Waiso Ipola", "Malabo", "Guinea Ecuatorial", "school"),
    ("Colegio Santa Teresita", "Malabo", "Guinea Ecuatorial", "school"),
    ("Colegio Claret", "Malabo", "Guinea Ecuatorial", "school"),
    ("Colegio Virgen del Carmen", "Malabo", "Guinea Ecuatorial", "school"),
    ("Colegio Madre Catalina", "Bata", "Guinea Ecuatorial", "school"),
    ("Colegio Calasanz", "Bata", "Guinea Ecuatorial", "school"),
    ("Colegio La Salle", "Bata", "Guinea Ecuatorial", "school"),
    ("Colegio Internacional de Guinea Ecuatorial", "Malabo", "Guinea Ecuatorial", "school"),
    ("Royal International College", "Malabo", "Guinea Ecuatorial", "school"),
    ("Colegio Diocesano Rafael M. Nze Abuy", "Ebibeyín", "Guinea Ecuatorial", "school"),
    # Camerún
    ("Universidad Católica de África Central", "Yaundé", "Camerún", "university"),
    ("Universidad de Yaundé I", "Yaundé", "Camerún", "university"),
    ("Universidad de Yaundé II", "Yaundé", "Camerún", "university"),
    ("Universidad de Duala", "Duala", "Camerún", "university"),
    ("Instituto de Formación e Investigación Demográfica", "Yaundé", "Camerún", "fp"),
    # Benín
    ("Universidad de Abomey-Calavi", "Abomey-Calavi", "Benín", "university"),
    # Senegal
    ("Universidad Cheikh Anta Diop de Dakar", "Dakar", "Senegal", "university"),
    # China
    ("Universidad de Estudios Internacionales de Zhejiang", "Hangzhou", "China", "university"),
    ("Universidad de Lengua y Cultura de Pekín", "Pekín", "China", "university"),
    ("Universidad de Estudios Internacionales de Shanghái", "Shanghái", "China", "university"),
    ("Universidad de Estudios Extranjeros de Tianjin", "Tianjín", "China", "university"),
    # España
    ("Universidad Nacional de Educación a Distancia", "Madrid", "España", "university"),
    ("Universidad Complutense de Madrid", "Madrid", "España", "university"),
    ("Universidad de Alcalá", "Alcalá de Henares", "España", "university"),
    ("Universidad de Las Palmas de Gran Canaria", "Las Palmas de Gran Canaria", "España", "university"),
]


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    ascii_text = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    ascii_text = ascii_text.lower()
    ascii_text = re.sub(r"[^a-z0-9]+", "-", ascii_text)
    return ascii_text.strip("-")


def build_records() -> list[dict]:
    seen: dict[str, int] = {}
    records = []
    for name, city, country, inst_type in RAW_INSTITUTIONS:
        base = slugify(f"{name}-{city}-{country}")
        count = seen.get(base, 0)
        seen[base] = count + 1
        inst_id = base if count == 0 else f"{base}-{count + 1}"
        records.append(
            {
                "id": inst_id,
                "name": name,
                "country": country,
                "city": city,
                "type": inst_type,
            }
        )
    return records


def render_js(records: list[dict]) -> str:
    payload = json.dumps(records, ensure_ascii=False, indent=2)
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
    records = build_records()
    OUT_JS.write_text(render_js(records), encoding="utf-8")
    by_country: dict[str, int] = {}
    for r in records:
        by_country[r["country"]] = by_country.get(r["country"], 0) + 1
    print(f"Total: {len(records)}")
    for country, count in by_country.items():
        print(f"  {country}: {count}")


if __name__ == "__main__":
    main()
