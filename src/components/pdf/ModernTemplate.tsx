import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import type { ParsedResume } from '../../types';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 45,
    paddingBottom: 45,
    paddingLeft: 50,
    paddingRight: 50,
    color: '#333333',
    backgroundColor: '#ffffff'
  },
  header: { marginBottom: 15 },
  name: { 
    fontSize: 24, 
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
    marginBottom: 4
  },
  contactRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 9,
    color: '#555555'
  },
  contactItem: { fontSize: 9, color: '#555555' },
  link: { fontSize: 9, color: '#1a1a2e', textDecoration: 'underline' },
  accentLine: {
    height: 2,
    backgroundColor: '#1a1a2e',
    marginBottom: 16,
    marginTop: 6
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#1a1a2e',
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1a1a2e',
    paddingBottom: 3
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1
  },
  entryTitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#1a1a2e' },
  entrySubtitle: { fontSize: 9, color: '#555555', marginBottom: 2 },
  entryDate: { fontSize: 9, color: '#555555' },
  bullet: { flexDirection: 'row', marginBottom: 2.5, paddingLeft: 4 },
  bulletDot: { width: 12, fontSize: 10, color: '#1a1a2e' },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.5 },
  skillItem: { fontSize: 9.5 },
  entryBlock: { marginBottom: 8 }
});

interface ModernTemplateProps {
  resume: ParsedResume;
  links?: {
    linkedin?: string;
    github?: string;
  };
}

export const ModernTemplate: React.FC<ModernTemplateProps> = ({ resume, links }) => {
  const linkedinUrl = links?.linkedin || resume.linkedin;
  const githubUrl = links?.github || resume.github;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{resume.name}</Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactItem}>{resume.email}</Text>
            <Text style={styles.contactItem}> | </Text>
            <Text style={styles.contactItem}>{resume.phone}</Text>
            {linkedinUrl && (
              <>
                <Text style={styles.contactItem}> | </Text>
                <Link src={linkedinUrl} style={styles.link}>LinkedIn</Link>
              </>
            )}
            {githubUrl && (
              <>
                <Text style={styles.contactItem}> | </Text>
                <Link src={githubUrl} style={styles.link}>GitHub</Link>
              </>
            )}
          </View>
          <View style={styles.accentLine} />
        </View>

        {/* Skills */}
        {resume.skills && resume.skills.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            <Text style={styles.skillItem}>
              {resume.skills.join(' • ')}
            </Text>
          </View>
        )}

        {/* Experience */}
        {resume.experience && resume.experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {resume.experience.map((exp, i) => (
              <View key={i} style={styles.entryBlock}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>
                    {exp.role} — {exp.company}
                  </Text>
                  <Text style={styles.entryDate}>{exp.duration}</Text>
                </View>
                {exp.bullets?.map((b, bi) => (
                  <View key={bi} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {resume.projects && resume.projects.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Projects</Text>
            {resume.projects.map((proj, i) => (
              <View key={i} style={styles.entryBlock}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>{proj.name}</Text>
                  {proj.link && (
                    <Link src={proj.link} style={styles.link}>
                      View Project
                    </Link>
                  )}
                </View>
                {proj.tech && proj.tech.length > 0 && (
                  <Text style={styles.entrySubtitle}>
                    {proj.tech.join(', ')}
                  </Text>
                )}
                {proj.bullets?.map((b, bi) => (
                  <View key={bi} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {resume.education && resume.education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {resume.education.map((edu, i) => (
              <View key={i} style={styles.entryBlock}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>{edu.institution}</Text>
                  <Text style={styles.entryDate}>{edu.year}</Text>
                </View>
                <Text style={styles.entrySubtitle}>{edu.degree}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Achievements */}
        {resume.achievements && resume.achievements.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {resume.achievements.map((ach, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{ach}</Text>
              </View>
            ))}
          </View>
        )}

      </Page>
    </Document>
  );
};
