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
    width: '30%',
    backgroundColor: '#1a1a2e',
    paddingTop: 30,
    paddingBottom: 30,
    paddingLeft: 15,
    paddingRight: 15,
    color: '#ffffff'
  },
  main: {
    width: '70%',
    paddingTop: 30,
    paddingBottom: 30,
    paddingLeft: 20,
    paddingRight: 20
  },
  sidebarName: { 
    fontSize: 15, 
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
    marginTop: 16, 
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
  link: { fontSize: 8.5, color: '#1a1a2e', textDecoration: 'underline' }
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
          <Text style={styles.sidebarText}>{resume.email}</Text>
          <Text style={styles.sidebarText}>{resume.phone}</Text>
          {linkedinUrl && (
            <Link src={linkedinUrl} style={styles.sidebarLink}>LinkedIn</Link>
          )}
          {githubUrl && (
            <Link src={githubUrl} style={styles.sidebarLink}>GitHub</Link>
          )}

          {resume.skills && resume.skills.length > 0 && (
            <View>
              <Text style={styles.sidebarSection}>Skills</Text>
              {resume.skills.map((skill, idx) => (
                <Text key={idx} style={styles.sidebarText}>• {skill}</Text>
              ))}
            </View>
          )}

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
                  <Text style={styles.entrySubtitle}>{exp.company}</Text>
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
              <Text style={styles.mainSection}>Education</Text>
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
        </View>
      </Page>
    </Document>
  );
};
