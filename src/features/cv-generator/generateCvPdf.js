import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import CvPdfDocument from './CvPdfDocument';
import { registerCvFonts } from './cvStyles';

export async function generateCvPdf(data) {
  registerCvFonts();
  const instance = pdf(createElement(CvPdfDocument, { data }));
  return instance.toBlob();
}
