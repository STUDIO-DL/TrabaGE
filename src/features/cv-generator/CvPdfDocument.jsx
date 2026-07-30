import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import { cvStyles } from './cvStyles';

function Section({ title, children }) {
  // Allow section content to paginate. wrap={false} + minPresenceAhead on large
  // blocks can hang @react-pdf when content exceeds one A4 page.
  return (
    <View style={cvStyles.section} minPresenceAhead={24}>
      <Text style={cvStyles.sectionTitle} wrap={false}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function ContactLine({ data }) {
  const items = [data.location, data.email].filter(Boolean);
  if (!items.length) return null;

  return (
    <View style={cvStyles.contactRow}>
      {items.flatMap((item, index) => {
        const nodes = [];
        if (index > 0) {
          nodes.push(
            <Text key={`sep-${index}`} style={cvStyles.contactSep}>
              ·
            </Text>,
          );
        }
        nodes.push(
          <Text key={item} style={cvStyles.contactItem}>
            {item}
          </Text>,
        );
        return nodes;
      })}
    </View>
  );
}

function ExperienceSection({ items }) {
  if (!items.length) return null;

  return (
    <Section title="Experiencia profesional">
      {items.map((item, index) => (
        <View key={`exp-${index}`} style={cvStyles.entryBlock} minPresenceAhead={28}>
          <View style={cvStyles.entryHeader} wrap={false}>
            <Text style={cvStyles.entryTitle}>{item.position || item.company}</Text>
            {item.dateRange ? <Text style={cvStyles.entryDate}>{item.dateRange}</Text> : null}
          </View>
          {item.company && item.position ? (
            <Text style={cvStyles.entrySubtitle}>{item.company}</Text>
          ) : null}
          {item.description ? (
            <Text style={cvStyles.entryDescription}>{item.description}</Text>
          ) : null}
        </View>
      ))}
    </Section>
  );
}

function EducationSection({ items }) {
  if (!items.length) return null;

  return (
    <Section title="Formación académica">
      {items.map((item, index) => (
        <View key={`edu-${index}`} style={cvStyles.entryBlock} minPresenceAhead={28}>
          <View style={cvStyles.entryHeader} wrap={false}>
            <Text style={cvStyles.entryTitle}>{item.program || item.institution}</Text>
            {item.dateRange ? <Text style={cvStyles.entryDate}>{item.dateRange}</Text> : null}
          </View>
          {item.institution && item.program ? (
            <Text style={cvStyles.entrySubtitle}>{item.institution}</Text>
          ) : null}
        </View>
      ))}
    </Section>
  );
}

function SkillsSection({ items }) {
  if (!items.length) return null;

  return (
    <Section title="Habilidades">
      <View style={cvStyles.skillsRow}>
        {items.map((skill) => (
          <Text key={skill} style={cvStyles.skillChip}>
            {skill}
          </Text>
        ))}
      </View>
    </Section>
  );
}

function LanguagesSection({ items }) {
  if (!items.length) return null;

  return (
    <Section title="Idiomas">
      {items.map((item, index) => (
        <View key={`lang-${index}`} style={cvStyles.languageRow}>
          <Text style={cvStyles.languageName}>{item.language}</Text>
          {item.level ? <Text style={cvStyles.languageLevel}>{item.level}</Text> : null}
        </View>
      ))}
    </Section>
  );
}

function CertificationsSection({ items }) {
  if (!items.length) return null;

  return (
    <Section title="Certificados">
      {items.map((item, index) => {
        const meta = [item.issuer, item.year].filter(Boolean).join(' · ');
        return (
          <View key={`cert-${index}`} style={cvStyles.certRow}>
            <Text style={cvStyles.certName}>{item.name}</Text>
            {meta ? <Text style={cvStyles.certMeta}>{meta}</Text> : null}
          </View>
        );
      })}
    </Section>
  );
}

export default function CvPdfDocument({ data }) {
  return (
    <Document title={`CV - ${data.fullName}`} author="TrabaGE">
      <Page size="A4" style={cvStyles.page}>
        <View style={cvStyles.header}>
          {data.avatarDataUri ? (
            <Image src={data.avatarDataUri} style={cvStyles.avatar} />
          ) : null}
          <View style={cvStyles.headerContent}>
            <View style={cvStyles.nameBlock}>
              <Text style={cvStyles.name}>{data.fullName}</Text>
            </View>
            {data.headline ? (
              <View style={cvStyles.headlineBlock}>
                <Text style={cvStyles.headline}>{data.headline}</Text>
              </View>
            ) : null}
            <ContactLine data={data} />
          </View>
        </View>

        <View style={cvStyles.divider} />

        {data.about ? (
          <Section title="Sobre mí">
            <Text style={cvStyles.aboutText}>{data.about}</Text>
          </Section>
        ) : null}

        <ExperienceSection items={data.experience} />
        <EducationSection items={data.education} />
        <SkillsSection items={data.skills} />
        <LanguagesSection items={data.languages} />
        <CertificationsSection items={data.certifications} />

        <Text style={cvStyles.footer} fixed>
          Generado con{' '}
          <Text style={cvStyles.brandTraba}>Traba</Text>
          <Text style={cvStyles.brandGE}>GE</Text>
        </Text>
      </Page>
    </Document>
  );
}
