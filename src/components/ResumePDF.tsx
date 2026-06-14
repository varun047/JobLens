import React from 'react'
import {
  Document, Page, Text, View, StyleSheet
} from '@react-pdf/renderer'
import type { ParsedResume } from '../types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 45,
    paddingRight: 45,
    color: '#000000',
    backgroundColor: '#ffffff'
  },
  // Header
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 8
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4
  },
  contactLine: {
    fontSize: 8,
    color: '#333333'
  },
  // Section
  section: {
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    paddingBottom: 2,
    marginBottom: 6
  },
  // Experience
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  entryTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9
  },
  entrySubtitle: {
    fontSize: 8,
    color: '#444444',
    marginBottom: 3
  },
  entryDate: {
    fontSize: 8,
    color: '#444444'
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 8
  },
  bulletDot: {
    width: 10,
    fontSize: 9
  },
  bulletText: {
    flex: 1,
    fontSize: 8.5,
    lineHeight: 1.4
  },
  // Skills
  skillsText: {
    fontSize: 8.5,
    lineHeight: 1.5
  },
  // Projects
  projectName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9
  },
  projectTech: {
    fontSize: 8,
    color: '#555555',
    marginBottom: 2
  },
  entryBlock: {
    marginBottom: 8
  }
})

interface ResumePDFProps {
  resume: ParsedResume
  filename?: string
}

export const ResumePDF: React.FC<ResumePDFProps> = ({ resume }) => (
  <Document>
    <Page size="A4" style={styles.page}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{resume.name}</Text>
        <Text style={styles.contactLine}>
          {[resume.email, resume.phone].filter(Boolean).join(' | ')}
        </Text>
      </View>

      {/* Skills */}
      {resume.skills?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <Text style={styles.skillsText}>
            {resume.skills.join(' • ')}
          </Text>
        </View>
      )}

      {/* Experience */}
      {resume.experience?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {resume.experience.map((exp, idx) => (
            <View key={idx} style={styles.entryBlock}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{exp.role} — {exp.company}</Text>
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
      {resume.projects?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          {resume.projects.map((proj, idx) => (
            <View key={idx} style={styles.entryBlock}>
              <View style={styles.entryHeader}>
                <Text style={styles.projectName}>{proj.name}</Text>
              </View>
              {proj.tech?.length > 0 && (
                <Text style={styles.projectTech}>
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
      {resume.education?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {resume.education.map((edu, idx) => (
            <View key={idx} style={styles.entryBlock}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{edu.institution}</Text>
                <Text style={styles.entryDate}>{edu.year}</Text>
              </View>
              <Text style={styles.entrySubtitle}>{edu.degree}</Text>
            </View>
          ))}
        </View>
      )}

    </Page>
  </Document>
)
