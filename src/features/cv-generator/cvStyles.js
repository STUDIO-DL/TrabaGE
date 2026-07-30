import { StyleSheet, Font } from '@react-pdf/renderer';

export const CV_COLORS = {
  black: '#000000',
  text: '#111827',
  body: '#374151',
  muted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  /** Brand primary — matches designTokens primary.600 */
  primary: '#2563EB',
};

export const cvStyles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    lineHeight: 1.45,
    color: CV_COLORS.body,
    backgroundColor: CV_COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 18,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    objectFit: 'cover',
  },
  headerContent: {
    flex: 1,
    paddingTop: 2,
  },
  nameBlock: {
    marginBottom: 10,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: 600,
    color: CV_COLORS.text,
    letterSpacing: -0.3,
    lineHeight: 1.25,
  },
  headlineBlock: {
    marginBottom: 12,
  },
  headline: {
    fontSize: 11,
    color: CV_COLORS.muted,
    lineHeight: 1.5,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  contactItem: {
    fontSize: 9,
    color: CV_COLORS.muted,
    lineHeight: 1.4,
  },
  contactSep: {
    fontSize: 9,
    color: CV_COLORS.muted,
    marginHorizontal: 2,
  },
  divider: {
    height: 1,
    backgroundColor: CV_COLORS.border,
    marginBottom: 22,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Inter',
    fontWeight: 600,
    color: CV_COLORS.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: CV_COLORS.border,
  },
  aboutText: {
    fontSize: 10,
    color: CV_COLORS.body,
    lineHeight: 1.5,
  },
  entryBlock: {
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 2,
  },
  entryTitle: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: 600,
    color: CV_COLORS.text,
    flex: 1,
  },
  entrySubtitle: {
    fontSize: 9.5,
    color: CV_COLORS.body,
    marginBottom: 2,
  },
  entryDate: {
    fontSize: 8.5,
    color: CV_COLORS.muted,
    textAlign: 'right',
    minWidth: 72,
  },
  entryDescription: {
    fontSize: 9,
    color: CV_COLORS.body,
    lineHeight: 1.45,
    marginTop: 3,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChip: {
    fontSize: 8.5,
    color: CV_COLORS.text,
    backgroundColor: '#F3F4F6',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  languageName: {
    fontSize: 9.5,
    color: CV_COLORS.text,
    fontFamily: 'Inter',
    fontWeight: 600,
  },
  languageLevel: {
    fontSize: 9,
    color: CV_COLORS.muted,
  },
  certRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  certName: {
    fontSize: 9.5,
    color: CV_COLORS.text,
    fontFamily: 'Inter',
    fontWeight: 600,
    flex: 1,
  },
  certMeta: {
    fontSize: 8.5,
    color: CV_COLORS.muted,
    textAlign: 'right',
    maxWidth: 140,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: CV_COLORS.muted,
  },
  brandTraba: {
    color: CV_COLORS.text,
    fontFamily: 'Inter',
    fontWeight: 700,
  },
  brandGE: {
    color: CV_COLORS.primary,
    fontFamily: 'Inter',
    fontWeight: 700,
  },
});

let fontsRegistered = false;

/**
 * Register Inter as WOFF (not WOFF2).
 * @react-pdf/fontkit often throws "Offset is outside the bounds of the DataView"
 * when parsing WOFF2 binaries in mobile browsers; WOFF is the supported path.
 */
export function registerCvFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;

  Font.register({
    family: 'Inter',
    fonts: [
      { src: '/fonts/Inter-Regular.woff', fontWeight: 400 },
      { src: '/fonts/Inter-SemiBold.woff', fontWeight: 600 },
    ],
  });

  Font.registerHyphenationCallback((word) => [word]);
}
