import { StyleSheet, Font } from '@react-pdf/renderer';

export const CV_COLORS = {
  black: '#000000',
  text: '#111827',
  body: '#374151',
  muted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

export const cvStyles = StyleSheet.create({
  page: {
    paddingTop: 40,
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
    marginBottom: 16,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    objectFit: 'cover',
  },
  headerContent: {
    flex: 1,
    paddingTop: 2,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: 600,
    color: CV_COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  headline: {
    fontSize: 11,
    color: CV_COLORS.muted,
    marginBottom: 8,
    lineHeight: 1.35,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactItem: {
    fontSize: 9,
    color: CV_COLORS.muted,
  },
  divider: {
    height: 1,
    backgroundColor: CV_COLORS.border,
    marginBottom: 18,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Inter',
    fontWeight: 600,
    color: CV_COLORS.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingBottom: 4,
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
});

let fontsRegistered = false;

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
