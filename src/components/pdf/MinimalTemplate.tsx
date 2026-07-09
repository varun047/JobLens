import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import type { ParsedResume } from '../../types';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    paddingTop: 35,
    paddingBottom: 35,
    paddingLeft: 45,
    paddingRight: 45,
    color: '#333333',
    backgroundColor: '#ffffff'
  },
  header: { marginBottom: 15 },
  name: { 
    fontSize: 22, 
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    color: '#111111',
    marginBottom: 4
  },
  contactRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 8.5,
    color: '#777777'
  },
  contactItem: { fontSize: 8.5, color: '#777777' },
  link: { fontSize: 8.5, color: '#555555', textDecoration: 'underline' },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#666666',
    marginTop: 12,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eeeeee',
    paddingBottom: 2
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1
  },
  entryTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: '#222222' },
  entrySubtitle: { fontSize: 8.5, color: '#666666', marginBottom: 2 },
  entryDate: { fontSize: 8.5, color: '#777777' },
  bullet: { flexDirection: 'row', marginBottom: 2.5, paddingLeft: 4 },
  bulletDot: { width: 12, fontSize: 10, color: '#999999' },
  bulletText: { flex: 1, fontSize: 9, lineHeight: 1.4, color: '#444444' },
  skillItem: { fontSize: 9, lineHeight: 1.4, color: '#444444' },
  entryBlock: { marginBottom: 8 },
  bodyText: { fontSize: 9, lineHeight: 1.4, color: '#444444' }
});

interface MinimalTemplateProps {
  resume: ParsedResume;
  links?: {
    linkedin?: string;
    github?: string;
  };
}

export const MinimalTemplate: React.FC<MinimalTemplateProps> = ({ resume, links }) => {
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
        </View>

        {/* Professional Summary */}
        {resume.summary && (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={[styles.bodyText, { fontStyle: 'italic', color: '#555555' }]}>
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
                <Text style={[{ fontFamily: 'Helvetica-Bold', width: 100, fontSize: 8.5, color: '#666666' }]}>
                  {cat.category}:
                </Text>
                <Text style={{ flex: 1, fontSize: 9, color: '#444444' }}>
                  {cat.skills.join(', ')}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          resume.skills && resume.skills.length > 0 && (
            <View style={{ marginBottom: 6 }}>
              <Text style={styles.sectionTitle}>Technical Skills</Text>
              <Text style={styles.skillItem}>{resume.skills.join('   •   ')}</Text>
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
