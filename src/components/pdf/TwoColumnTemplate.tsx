import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import type { ParsedResume } from '../../types';

const styles = StyleSheet.create({
  page: { 
    flexDirection: 'row',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#333333',
    backgroundColor: '#ffffff'
  },
  sidebar: {
    width: '32%',
    backgroundColor: '#1a1a2e',
    paddingTop: 30,
    paddingBottom: 30,
    paddingLeft: 12,
    paddingRight: 12,
    color: '#ffffff'
  },
  main: {
    width: '68%',
    paddingTop: 30,
    paddingBottom: 30,
    paddingLeft: 18,
    paddingRight: 18
  },
  sidebarName: { 
    fontSize: 14, 
    fontFamily: 'Helvetica-Bold', 
    color: '#ffffff', 
    marginBottom: 8,
    lineHeight: 1.2
  },
  sidebarSection: { 
    fontSize: 8, 
    textTransform: 'uppercase', 
    letterSpacing: 2, 
    color: '#aaaaaa', 
    marginTop: 14, 
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#444444',
    paddingBottom: 2
  },
  sidebarText: { 
    fontSize: 8, 
    color: '#dddddd', 
    marginBottom: 3, 
    lineHeight: 1.4 
  },
  sidebarLink: {
    fontSize: 8,
    color: '#38bdf8',
    textDecoration: 'underline',
    marginBottom: 3
  },
  mainSection: { 
    fontSize: 9, 
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase', 
    letterSpacing: 1.5, 
    marginTop: 12, 
    marginBottom: 6, 
    borderBottomWidth: 0.5, 
    borderBottomColor: '#cccccc', 
    paddingBottom: 2,
    color: '#1a1a2e'
  },
  entryBlock: { marginBottom: 10 },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1
  },
  entryTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: '#1a1a2e' },
  entrySubtitle: { fontSize: 8.5, color: '#555555', marginBottom: 2 },
  entryDate: { fontSize: 8, color: '#666666' },
  bullet: { flexDirection: 'row', marginBottom: 2.5, paddingLeft: 4 },
  bulletDot: { width: 10, fontSize: 9, color: '#1a1a2e' },
  bulletText: { flex: 1, fontSize: 8.5, lineHeight: 1.4 },
  link: { fontSize: 8.5, color: '#1a1a2e', textDecoration: 'underline' },
  bodyText: { fontSize: 8.5, lineHeight: 1.4, color: '#444444' }
});

interface TwoColumnTemplateProps {
  resume: ParsedResume;
  links?: {
    linkedin?: string;
    github?: string;
  };
}

export const TwoColumnTemplate: React.FC<TwoColumnTemplateProps> = ({ resume, links }) => {
  const linkedinUrl = links?.linkedin || resume.linkedin;
  const githubUrl = links?.github || resume.github;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarName}>{resume.name}</Text>
          
          <Text style={styles.sidebarSection}>Contact</Text>
          {resume.email && (
            <Link src={`mailto:${resume.email}`} style={styles.sidebarLink}>
              {resume.email}
            </Link>
          )}
          {resume.phone && <Text style={styles.sidebarText}>{resume.phone}</Text>}
          {linkedinUrl && (
            <Link src={linkedinUrl} style={styles.sidebarLink}>LinkedIn ↗</Link>
          )}
          {githubUrl && (
            <Link src={githubUrl} style={styles.sidebarLink}>GitHub ↗</Link>
          )}
          {resume.portfolio && (
            <Link src={resume.portfolio} style={styles.sidebarLink}>Portfolio ↗</Link>
          )}

          {/* Skills */}
          {resume.skillCategories && resume.skillCategories.length > 0 ? (
            <View>
              <Text style={styles.sidebarSection}>Skills</Text>
              {resume.skillCategories.map((cat, idx) => (
                <View key={idx} style={{ marginBottom: 4 }}>
                  <Text style={[styles.sidebarText, { fontFamily: 'Helvetica-Bold', color: '#ffffff', fontSize: 7.5 }]}>
                    {cat.category}
                  </Text>
                  <Text style={[styles.sidebarText, { fontSize: 7.5, color: '#cccccc' }]}>
                    {cat.skills.join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            resume.skills && resume.skills.length > 0 && (
              <View>
                <Text style={styles.sidebarSection}>Skills</Text>
                {resume.skills.map((skill, idx) => (
                  <Text key={idx} style={styles.sidebarText}>• {skill}</Text>
                ))}
              </View>
            )
          )}

          {/* Certifications */}
          {resume.certifications && resume.certifications.length > 0 && (
            <View>
              <Text style={styles.sidebarSection}>Certifications</Text>
              {resume.certifications.map((cert, idx) => (
                <View key={idx} style={{ marginBottom: 3 }}>
                  <Text style={[styles.sidebarText, { fontFamily: 'Helvetica-Bold' }]}>
                    {cert.name}
                  </Text>
                  <Text style={[styles.sidebarText, { fontSize: 7.5, color: '#cccccc' }]}>
                    {cert.issuer}{cert.year ? ` (${cert.year})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Achievements */}
          {resume.achievements && resume.achievements.length > 0 && (
            <View>
              <Text style={styles.sidebarSection}>Achievements</Text>
              {resume.achievements.map((ach, idx) => (
                <Text key={idx} style={styles.sidebarText}>• {ach}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Main Content */}
        <View style={styles.main}>
          {/* Professional Summary */}
          {resume.summary && (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.mainSection}>Professional Summary</Text>
              <Text style={[styles.bodyText, { fontStyle: 'italic' }]}>
                {resume.summary.split('|').map(line => line.trim()).join('\n')}
              </Text>
            </View>
          )}

          {/* Experience */}
          {resume.experience && resume.experience.length > 0 && (
            <View>
              <Text style={styles.mainSection}>Experience</Text>
              {resume.experience.map((exp, i) => (
                <View key={i} style={styles.entryBlock}>
                  <View style={styles.entryRow}>
                    <Text style={styles.entryTitle}>
                      {exp.role}
                    </Text>
                    <Text style={styles.entryDate}>{exp.duration}</Text>
                  </View>
                  <Text style={styles.entrySubtitle}>
                    {exp.company}{exp.location ? ` (${exp.location})` : ''}
                  </Text>
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
              <Text style={styles.mainSection}>Projects</Text>
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
              <Text style={styles.mainSection}>Education</Text>
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
                    <Text style={[styles.entrySubtitle, { fontSize: 7.5, marginTop: 1 }]}>
                      Coursework: {edu.coursework.join(', ')}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Positions of Responsibility */}
          {resume.positions && resume.positions.length > 0 && (
            <View>
              <Text style={styles.mainSection}>Positions of Responsibility</Text>
              {resume.positions.map((pos, i) => (
                <View key={i} style={styles.entryBlock}>
                  <View style={styles.entryRow}>
                    <Text style={styles.entryTitle}>{pos.title}</Text>
                    <Text style={styles.entryDate}>{pos.duration}</Text>
                  </View>
                  <Text style={styles.entrySubtitle}>{pos.organization}</Text>
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
        </View>
      </Page>
    </Document>
  );
};
