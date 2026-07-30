/**
 * Progressive CV PDF generation diagnostics for @react-pdf DataView errors.
 * Run: node scripts/diagnose-cv-pdf.mjs
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createElement } from 'react';

const require = createRequire(import.meta.url);
const { pdf, Document, Page, Text, View, Image, Font, StyleSheet } =
  require('@react-pdf/renderer');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'tmp-cv-diag');

function fontPath(name) {
  return join(root, 'public', 'fonts', name);
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  pageInter: { padding: 40, fontSize: 11, fontFamily: 'Inter' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  titleInter: { fontSize: 18, fontFamily: 'Inter', fontWeight: 600, marginBottom: 8 },
  body: { marginBottom: 6 },
});

async function runCase(name, buildDoc) {
  process.stdout.write(`PRUEBA ${name}... `);
  try {
    const instance = pdf(buildDoc());
    const blob = await instance.toBlob();
    const buf = Buffer.from(await blob.arrayBuffer());
    if (buf.length < 100 || buf.slice(0, 4).toString() !== '%PDF') {
      throw new Error(`Invalid PDF bytes (${buf.length})`);
    }
    writeFileSync(join(outDir, `${name.replace(/\s+/g, '_')}.pdf`), buf);
    console.log(`OK (${buf.length} bytes)`);
    return true;
  } catch (error) {
    console.log(`FAIL: ${error?.message || error}`);
    return false;
  }
}

async function main() {
  if (!existsSync(outDir)) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(outDir, { recursive: true });
  }

  // PRUEBA 1 — texto mínimo (Helvetica built-in)
  await runCase('1_minimo_texto', () =>
    createElement(
      Document,
      null,
      createElement(
        Page,
        { size: 'A4', style: styles.page },
        createElement(Text, null, 'Hola TrabaGE'),
      ),
    ),
  );

  // PRUEBA 2 — datos personales
  await runCase('2_datos_personales', () =>
    createElement(
      Document,
      null,
      createElement(
        Page,
        { size: 'A4', style: styles.page },
        createElement(Text, { style: styles.title }, 'Juan Perez'),
        createElement(Text, { style: styles.body }, 'Malabo, Guinea Ecuatorial'),
        createElement(Text, { style: styles.body }, 'user@example.com'),
      ),
    ),
  );

  // PRUEBA 3-5 — secciones de texto
  await runCase('3_5_secciones', () =>
    createElement(
      Document,
      null,
      createElement(
        Page,
        { size: 'A4', style: styles.page },
        createElement(Text, { style: styles.title }, 'Maria Lopez'),
        createElement(Text, { style: styles.body }, 'Educacion: UNGE'),
        createElement(Text, { style: styles.body }, 'Experiencia: Desarrolladora'),
        createElement(Text, { style: styles.body }, 'Habilidades: React, Supabase'),
      ),
    ),
  );

  // PRUEBA 6 — imagen PNG mínima 1x1
  const tinyPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await runCase('6_imagen_png', () =>
    createElement(
      Document,
      null,
      createElement(
        Page,
        { size: 'A4', style: styles.page },
        createElement(View, null, createElement(Image, { src: tinyPng, style: { width: 40, height: 40 } })),
        createElement(Text, null, 'Con avatar PNG'),
      ),
    ),
  );

  // PRUEBA 6b — WebP data URI (reproduce DataView / invalid format)
  const tinyWebp =
    'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
  await runCase('6b_imagen_webp_raw', () =>
    createElement(
      Document,
      null,
      createElement(
        Page,
        { size: 'A4', style: styles.page },
        createElement(View, null, createElement(Image, { src: tinyWebp, style: { width: 40, height: 40 } })),
        createElement(Text, null, 'Con avatar WebP crudo'),
      ),
    ),
  );

  // PRUEBA 7a — WOFF2 (sospechoso)
  const woff2 = fontPath('Inter-Regular.woff2');
  if (existsSync(woff2)) {
    try {
      Font.register({
        family: 'InterWoff2',
        fonts: [{ src: woff2, fontWeight: 400 }],
      });
    } catch {
      // ignore register errors
    }
    await runCase('7a_fuente_woff2', () =>
      createElement(
        Document,
        null,
        createElement(
          Page,
          { size: 'A4', style: { padding: 40, fontSize: 11, fontFamily: 'InterWoff2' } },
          createElement(Text, null, 'Fuente WOFF2'),
        ),
      ),
    );
  } else {
    console.log('PRUEBA 7a_fuente_woff2... SKIP (file missing)');
  }

  // PRUEBA 7b — WOFF (compatible)
  const woff = fontPath('Inter-Regular.woff');
  if (existsSync(woff)) {
    Font.register({
      family: 'InterWoff',
      fonts: [
        { src: woff, fontWeight: 400 },
        { src: fontPath('Inter-SemiBold.woff'), fontWeight: 600 },
      ],
    });
    await runCase('7b_fuente_woff', () =>
      createElement(
        Document,
        null,
        createElement(
          Page,
          { size: 'A4', style: { padding: 40, fontSize: 11, fontFamily: 'InterWoff' } },
          createElement(Text, { style: { fontFamily: 'InterWoff', fontWeight: 600 } }, 'Fuente WOFF SemiBold'),
          createElement(Text, null, 'Fuente WOFF Regular'),
        ),
      ),
    );
  } else {
    console.log('PRUEBA 7b_fuente_woff... SKIP (file missing)');
  }

  // PRUEBA 8 — documento completo estilo CV con WOFF
  if (existsSync(woff)) {
    await runCase('8_cv_completo_woff', () =>
      createElement(
        Document,
        null,
        createElement(
          Page,
          { size: 'A4', style: { padding: 40, fontSize: 10, fontFamily: 'InterWoff', color: '#374151' } },
          createElement(View, { style: { flexDirection: 'row', marginBottom: 16, gap: 12 } },
            createElement(Image, { src: tinyPng, style: { width: 64, height: 64 } }),
            createElement(View, null,
              createElement(Text, { style: { fontSize: 20, fontWeight: 600, color: '#111827' } }, 'Ana Ndong'),
              createElement(Text, null, 'Desarrolladora frontend'),
              createElement(Text, null, 'Malabo · ana@trabage.org'),
            ),
          ),
          createElement(Text, { style: { fontWeight: 600, marginBottom: 4 } }, 'SOBRE MI'),
          createElement(Text, { style: { marginBottom: 12 } }, 'Perfil profesional de prueba.'),
          createElement(Text, { style: { fontWeight: 600, marginBottom: 4 } }, 'EXPERIENCIA'),
          createElement(Text, { style: { marginBottom: 12 } }, 'TrabaGE — Frontend (2024-2026)'),
          createElement(Text, { style: { fontWeight: 600, marginBottom: 4 } }, 'FORMACION'),
          createElement(Text, { style: { marginBottom: 12 } }, 'UNGE — Ingenieria'),
          createElement(Text, { style: { fontWeight: 600, marginBottom: 4 } }, 'HABILIDADES'),
          createElement(Text, null, 'React, Supabase, PWA'),
        ),
      ),
    );
  }

  console.log(`\nPDFs escritos en ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
