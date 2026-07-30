import { pdf, Document, Page, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { createElement } from 'react';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.45,
  },
  title: { fontSize: 18, fontFamily: 'Inter', fontWeight: 600, color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#6B7280', marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: 600,
    color: '#111827',
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 3,
  },
  row: { marginBottom: 3 },
  muted: { color: '#6B7280', fontSize: 9 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

let fontsReady = false;

function ensureFonts() {
  if (fontsReady) return;
  fontsReady = true;
  Font.register({
    family: 'Inter',
    fonts: [
      { src: '/fonts/Inter-Regular.woff', fontWeight: 400 },
      { src: '/fonts/Inter-SemiBold.woff', fontWeight: 600 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
}

function MetricLine({ label, value }) {
  return createElement(Text, { style: styles.row }, `${label}: ${value ?? 0}`);
}

function ReportDocument({ data, generatedAt }) {
  const summary = data?.summary ?? {};
  const rankings = data?.rankings ?? {};
  const period = data?.period ?? {};
  const filters = data?.filters ?? {};

  return createElement(
    Document,
    { title: 'Informe analítica TrabaGE', author: 'TrabaGE Admin' },
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      createElement(Text, { style: styles.title }, 'Informe de Analítica e Inteligencia'),
      createElement(Text, { style: styles.subtitle }, 'TrabaGE · Panel de administración'),
      createElement(Text, { style: styles.muted }, `Generado: ${generatedAt}`),
      createElement(
        Text,
        { style: styles.muted },
        `Período: ${period.from ?? '—'} → ${period.to ?? '—'}`,
      ),
      createElement(
        Text,
        { style: [styles.muted, { marginBottom: 8 }] },
        `Filtros: ciudad=${filters.city || 'todas'}; sector=${filters.sector || 'todos'}; cuenta=${filters.account_role || 'todas'}`,
      ),
      createElement(Text, { style: styles.sectionTitle }, 'Resumen'),
      createElement(MetricLine, { label: 'Perfiles personales', value: summary.users_total }),
      createElement(MetricLine, { label: 'Nuevos personales', value: summary.users_new }),
      createElement(MetricLine, { label: 'Empresas', value: summary.business_total }),
      createElement(MetricLine, { label: 'Organizaciones', value: summary.org_total }),
      createElement(MetricLine, { label: 'Ofertas activas', value: summary.jobs_active }),
      createElement(MetricLine, { label: 'Ofertas nuevas', value: summary.jobs_new }),
      createElement(MetricLine, { label: 'Candidaturas', value: summary.applications_total }),
      createElement(MetricLine, { label: 'Publicaciones', value: summary.posts_total }),
      createElement(Text, { style: styles.sectionTitle }, 'Puestos más publicados'),
      ...(rankings.job_titles?.length
        ? rankings.job_titles.slice(0, 12).map((row, i) =>
            createElement(
              Text,
              { key: `j-${i}`, style: styles.row },
              `${row.label}: ${row.offers} ofertas · ${row.applications} candidaturas`,
            ),
          )
        : [createElement(Text, { key: 'j-empty', style: styles.muted }, 'Datos insuficientes')]),
      createElement(Text, { style: styles.sectionTitle }, 'Sectores con mayor actividad'),
      ...(rankings.sector_activity?.length
        ? rankings.sector_activity.slice(0, 12).map((row, i) =>
            createElement(
              Text,
              { key: `s-${i}`, style: styles.row },
              `${row.label}: ${row.offers} ofertas · ${row.applications} candidaturas`,
            ),
          )
        : [createElement(Text, { key: 's-empty', style: styles.muted }, 'Datos insuficientes')]),
      createElement(Text, { style: styles.sectionTitle }, 'Habilidades más demandadas'),
      ...(rankings.skills_demand?.length
        ? rankings.skills_demand.slice(0, 12).map((row, i) =>
            createElement(Text, { key: `sk-${i}`, style: styles.row }, `${row.label}: ${row.value}`),
          )
        : [createElement(Text, { key: 'sk-empty', style: styles.muted }, 'Datos insuficientes')]),
      createElement(Text, { style: styles.sectionTitle }, 'Notas metodológicas'),
      createElement(Text, { style: styles.muted }, data?.methodology || data?.disclaimer || ''),
      createElement(
        Text,
        { style: styles.footer, fixed: true },
        'TrabaGE · Datos observados dentro de la plataforma · Informe administrativo',
      ),
    ),
  );
}

export async function generateAnalyticsReportPdf(data) {
  ensureFonts();
  const generatedAt = new Date().toLocaleString('es-GQ', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const instance = pdf(createElement(ReportDocument, { data, generatedAt }));
  return instance.toBlob();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
