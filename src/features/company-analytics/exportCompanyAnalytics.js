import { buildCsv, downloadCsv } from '../admin-analytics/exportAnalyticsCsv';
import { downloadBlob } from '../admin-analytics/generateAnalyticsReportPdf';
import { pdf, Document, Page, Text, StyleSheet, Font } from '@react-pdf/renderer';
import { createElement } from 'react';
import { jobStatusLabel } from './companyAnalyticsPeriods';

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

function ReportDocument({ data, companyName, generatedAt, periodLabel }) {
  const summary = data?.summary ?? {};
  const profile = data?.profile ?? {};
  const posts = data?.posts ?? {};
  const topJobs = data?.top_jobs ?? [];

  return createElement(
    Document,
    { title: 'Analíticas empresa TrabaGE', author: 'TrabaGE' },
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      createElement(Text, { style: styles.title }, 'Informe de analíticas'),
      createElement(Text, { style: styles.subtitle }, companyName || 'Tu empresa · TrabaGE'),
      createElement(Text, { style: styles.muted }, `Generado: ${generatedAt}`),
      createElement(Text, { style: styles.muted }, `Período: ${periodLabel}`),
      createElement(Text, { style: styles.sectionTitle }, 'Resumen'),
      createElement(MetricLine, { label: 'Ofertas publicadas', value: summary.jobs_published }),
      createElement(MetricLine, { label: 'Visualizaciones de ofertas', value: summary.job_views }),
      createElement(MetricLine, { label: 'Candidaturas', value: summary.applications_total }),
      createElement(MetricLine, { label: 'Aceptados', value: summary.applications_accepted }),
      createElement(MetricLine, { label: 'Rechazados', value: summary.applications_rejected }),
      createElement(MetricLine, { label: 'Pendientes', value: summary.applications_pending }),
      createElement(MetricLine, { label: 'Seguidores', value: summary.followers }),
      createElement(MetricLine, { label: 'Interacciones en publicaciones', value: summary.post_interactions }),
      createElement(Text, { style: styles.sectionTitle }, 'Perfil'),
      createElement(MetricLine, { label: 'Visitas al perfil', value: profile.visits }),
      createElement(MetricLine, { label: 'Clics web', value: profile.website_clicks }),
      createElement(MetricLine, { label: 'Clics WhatsApp', value: profile.whatsapp_clicks }),
      createElement(MetricLine, { label: 'Clics email', value: profile.email_clicks }),
      createElement(MetricLine, { label: 'Guardados', value: profile.saves }),
      createElement(Text, { style: styles.sectionTitle }, 'Publicaciones'),
      createElement(MetricLine, { label: 'Vistas', value: posts.views }),
      createElement(MetricLine, { label: 'Likes', value: posts.likes }),
      createElement(MetricLine, { label: 'Comentarios', value: posts.comments }),
      createElement(MetricLine, { label: 'Compartidos', value: posts.shares }),
      createElement(MetricLine, { label: 'Reposts', value: posts.reposts }),
      createElement(MetricLine, { label: 'Alcance por reposts', value: posts.repost_reach }),
      createElement(MetricLine, { label: 'Vistas por reposts', value: posts.views_from_reposts }),
      createElement(MetricLine, { label: 'Guardados', value: posts.saves }),
      createElement(Text, { style: styles.sectionTitle }, 'Top ofertas'),
      ...(topJobs.length
        ? topJobs.map((job, i) =>
            createElement(
              Text,
              { key: `tj-${i}`, style: styles.row },
              `${job.title}: ${job.applications ?? 0} postulaciones · ${job.views ?? 0} vistas · ${jobStatusLabel(job.status)}`,
            ),
          )
        : [createElement(Text, { key: 'tj-empty', style: styles.muted }, 'Sin datos suficientes')]),
      createElement(
        Text,
        { style: styles.footer, fixed: true },
        createElement(Text, { style: { color: '#111827', fontFamily: 'Inter', fontWeight: 700 } }, 'Traba'),
        createElement(Text, { style: { color: '#2563EB', fontFamily: 'Inter', fontWeight: 700 } }, 'GE'),
        ' · Solo datos de tu cuenta · Uso interno de la empresa',
      ),
    ),
  );
}

export function exportCompanyAnalyticsCsv(data, { periodLabel = '' } = {}) {
  const summary = data?.summary ?? {};
  const profile = data?.profile ?? {};
  const posts = data?.posts ?? {};
  const jobs = data?.jobs ?? [];

  downloadCsv(
    `trabage-analiticas-${Date.now()}.csv`,
    ['seccion', 'metrica', 'valor', 'periodo'],
    [
      { seccion: 'resumen', metrica: 'ofertas_publicadas', valor: summary.jobs_published, periodo: periodLabel },
      { seccion: 'resumen', metrica: 'visualizaciones_ofertas', valor: summary.job_views, periodo: periodLabel },
      { seccion: 'resumen', metrica: 'candidaturas', valor: summary.applications_total, periodo: periodLabel },
      { seccion: 'resumen', metrica: 'aceptados', valor: summary.applications_accepted, periodo: periodLabel },
      { seccion: 'resumen', metrica: 'rechazados', valor: summary.applications_rejected, periodo: periodLabel },
      { seccion: 'resumen', metrica: 'pendientes', valor: summary.applications_pending, periodo: periodLabel },
      { seccion: 'resumen', metrica: 'seguidores', valor: summary.followers, periodo: periodLabel },
      { seccion: 'resumen', metrica: 'interacciones_posts', valor: summary.post_interactions, periodo: periodLabel },
      { seccion: 'perfil', metrica: 'visitas', valor: profile.visits, periodo: periodLabel },
      { seccion: 'perfil', metrica: 'clics_web', valor: profile.website_clicks, periodo: periodLabel },
      { seccion: 'perfil', metrica: 'clics_whatsapp', valor: profile.whatsapp_clicks, periodo: periodLabel },
      { seccion: 'perfil', metrica: 'clics_email', valor: profile.email_clicks, periodo: periodLabel },
      { seccion: 'perfil', metrica: 'guardados', valor: profile.saves, periodo: periodLabel },
      { seccion: 'posts', metrica: 'vistas', valor: posts.views, periodo: periodLabel },
      { seccion: 'posts', metrica: 'likes', valor: posts.likes, periodo: periodLabel },
      { seccion: 'posts', metrica: 'comentarios', valor: posts.comments, periodo: periodLabel },
      { seccion: 'posts', metrica: 'compartidos', valor: posts.shares, periodo: periodLabel },
      { seccion: 'posts', metrica: 'reposts', valor: posts.reposts, periodo: periodLabel },
      { seccion: 'posts', metrica: 'alcance_reposts', valor: posts.repost_reach, periodo: periodLabel },
      { seccion: 'posts', metrica: 'vistas_por_reposts', valor: posts.views_from_reposts, periodo: periodLabel },
      { seccion: 'posts', metrica: 'guardados', valor: posts.saves, periodo: periodLabel },
      ...jobs.map((job) => ({
        seccion: 'oferta',
        metrica: job.title,
        valor: `vistas=${job.views}; postulaciones=${job.applications}; pendientes=${job.pending}; aceptados=${job.accepted}; rechazados=${job.rejected}; estado=${jobStatusLabel(job.status)}`,
        periodo: periodLabel,
      })),
    ],
  );
}

export async function exportCompanyAnalyticsPdf(data, { companyName = '', periodLabel = '' } = {}) {
  ensureFonts();
  const generatedAt = new Date().toLocaleString('es-GQ', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const instance = pdf(
    createElement(ReportDocument, { data, companyName, generatedAt, periodLabel }),
  );
  const blob = await instance.toBlob();
  downloadBlob(blob, `trabage-analiticas-${Date.now()}.pdf`);
}

export { buildCsv };
