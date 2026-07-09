import React from 'react'
import {
  Document, Page, Text, View, StyleSheet, Link
} from '@react-pdf/renderer'
import type { ParsedResume } from '../types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 35,
    paddingBottom: 35,
    paddingLeft: 45,
    paddingRight: 45,
    color: '#000000',
    backgroundColor: '#ffffff'
  },
  // Header
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 6
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 8.5,
    color: '#333333'
  },
  contactItem: { fontSize: 8.5, color: '#333333' },
  link: { fontSize: 8.5, color: '#0000EE', textDecoration: 'underline' },
  // Section
  section: {
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    marginBottom: 6,
    marginTop: 10
  },
  // Experience / Projects / Education
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  entryTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5
  },
  entrySubtitle: {
    fontSize: 8.5,
    color: '#444444',
    marginBottom: 3
  },
  entryDate: {
    fontSize: 8.5,
    color: '#444444'
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 2.5,
    paddingLeft: 4
  },
  bulletDot: {
    width: 10,
    fontSize: 9
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 1.4
  },
  // Skills
  skillsText: {
    fontSize: 9,
    lineHeight: 1.4
  },
  entryBlock: {
    marginBottom: 8
  },
  bodyText: {
    fontSize: 9,
    lineHeight: 1.4
  }
})

interface ResumePDFProps {
  resume: ParsedResume
  filename?: string
  links?: {
    linkedin?: string;
    github?: string;
  };
}

export const ResumePDF: React.FC<ResumePDFProps> = ({ resume, links }) => {
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={[styles.bodyText, { fontStyle: 'italic', color: '#333333' }]}>
              {resume.summary.split('|').map(line => line.trim()).join('\n')}
            </Text>
          </View>
        )}

        {/* Technical Skills */}
        {resume.skillCategories && resume.skillCategories.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            {resume.skillCategories.map((cat, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
                <Text style={[{ fontFamily: 'Helvetica-Bold', width: 100, fontSize: 8.5 }]}>
                  {cat.category}:
                </Text>
                <Text style={{ flex: 1, fontSize: 9 }}>
                  {cat.skills.join(', ')}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          resume.skills && resume.skills.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Technical Skills</Text>
              <Text style={styles.skillsText}>{resume.skills.join(' • ')}</Text>
            </View>
          )
        )}

        {/* Experience */}
        {resume.experience && resume.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {resume.experience.map((exp, idx) => (
              <View key={idx} style={styles.entryBlock}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {exp.role} — {exp.company}{exp.location ? ` (${exp.location})` : ''}
                  </Text>
                  <Text style={styles.entryDate}>{exp.duration}</Text>
                </View>
                {exp.bullets?.map((bullet, bidx) => (
                  <View key={bidx} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {resume.projects && resume.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {resume.projects.map((proj, idx) => (
              <View key={idx} style={styles.entryBlock}>
                <View style={styles.entryHeader}>
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
                {proj.bullets?.map((bullet, bidx) => (
                  <View key={bidx} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {resume.education && resume.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {resume.education.map((edu, idx) => (
              <View key={idx} style={styles.entryBlock}>
                <View style={styles.entryHeader}>
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

        {/* Achievements */}
        {resume.achievements && resume.achievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {resume.achievements.map((ach, idx) => (
              <View key={idx} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{ach}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Positions of Responsibility */}
        {resume.positions && resume.positions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Positions of Responsibility</Text>
            {resume.positions.map((pos, idx) => (
              <View key={idx} style={styles.entryBlock}>
                <View style={styles.entryHeader}>
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {resume.certifications.map((cert, idx) => (
              <View key={idx} style={styles.entryBlock}>
                <View style={styles.entryHeader}>
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
}
