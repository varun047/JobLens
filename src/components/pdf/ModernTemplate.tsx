import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import type { ParsedResume } from '../../types';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 35,
    paddingBottom: 35,
    paddingLeft: 45,
    paddingRight: 45,
    color: '#333333',
    backgroundColor: '#ffffff'
  },
  header: { marginBottom: 12 },
  name: { 
    fontSize: 22, 
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
    marginBottom: 12,
    marginTop: 6
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#1a1a2e',
    marginTop: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
    paddingBottom: 2
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
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skillItem: { fontSize: 9.5 },
  entryBlock: { marginBottom: 8 },
  bodyText: { fontSize: 9.5, lineHeight: 1.4 }
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
            {resume.email && <Link src={`mailto:${resume.email}`} style={styles.link}>{resume.email}</Link>}
            {resume.phone && (
              <>
                <Text style={styles.contactItem}> | </Text>
                <Text style={styles.contactItem}>{resume.phone}</Text>
              </>
            )}
            {linkedinUrl && (
              <>
                <Text style={styles.contactItem}> | </Text>
                <Link src={linkedinUrl} style={styles.link}>LinkedIn ↗</Link>
              </>
            )}
            {githubUrl && (
              <>
                <Text style={styles.contactItem}> | </Text>
                <Link src={githubUrl} style={styles.link}>GitHub ↗</Link>
              </>
            )}
            {resume.portfolio && (
              <>
                <Text style={styles.contactItem}> | </Text>
                <Link src={resume.portfolio} style={styles.link}>Portfolio ↗</Link>
              </>
            )}
          </View>
          <View style={styles.accentLine} />
        </View>

        {/* Professional Summary */}
        {resume.summary && (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={[styles.bodyText, { fontStyle: 'italic', color: '#444444' }]}>
              {resume.summary.split('|').map(line => line.trim()).join('\n')}
            </Text>
          </View>
        )}

        {/* Technical Skills */}
        {resume.skillCategories && resume.skillCategories.length > 0 ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            {resume.skillCategories.map((cat, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
                <Text style={[{ fontFamily: 'Helvetica-Bold', width: 100, fontSize: 9, color: '#1a1a2e' }]}>
                  {cat.category}:
                </Text>
                <Text style={{ flex: 1, fontSize: 9.5 }}>
                  {cat.skills.join(', ')}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          resume.skills && resume.skills.length > 0 && (
            <View style={{ marginBottom: 6 }}>
              <Text style={styles.sectionTitle}>Technical Skills</Text>
              <Text style={styles.skillItem}>{resume.skills.join(' • ')}</Text>
            </View>
          )
        )}

        {/* Experience */}
        {resume.experience && resume.experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {resume.experience.map((exp, i) => (
              <View key={i} style={styles.entryBlock}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>
                    {exp.role} — {exp.company}{exp.location ? ` (${exp.location})` : ''}
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
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {proj.link && (
                      <Link src={proj.link} style={styles.link}>
                        GitHub ↗
                      </Link>
                    )}
                    {proj.liveDemo && (
                      <Link src={proj.liveDemo} style={styles.link}>
                        Live Demo ↗
                      </Link>
                    )}
                  </View>
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.entrySubtitle}>{edu.degree}</Text>
                  {edu.grade && (
                    <Text style={[styles.entryDate, { fontFamily: 'Helvetica-Bold' }]}>
                      Grade: {edu.grade}
                    </Text>
                  )}
                </View>
                {edu.coursework && edu.coursework.length > 0 && (
                  <Text style={[styles.entrySubtitle, { fontSize: 8, marginTop: 1 }]}>
                    Coursework: {edu.coursework.join(', ')}
                  </Text>
                )}
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

        {/* Positions of Responsibility */}
        {resume.positions && resume.positions.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Positions of Responsibility</Text>
            {resume.positions.map((pos, i) => (
              <View key={i} style={styles.entryBlock}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>
                    {pos.title} — {pos.organization}
                  </Text>
                  <Text style={styles.entryDate}>{pos.duration}</Text>
                </View>
                {pos.description && (
                  <View style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{pos.description}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {resume.certifications && resume.certifications.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {resume.certifications.map((cert, i) => (
              <View key={i} style={styles.entryBlock}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>
                    {cert.name}{cert.issuer ? ` — ${cert.issuer}` : ''}
                  </Text>
                  {cert.year && <Text style={styles.entryDate}>{cert.year}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};

