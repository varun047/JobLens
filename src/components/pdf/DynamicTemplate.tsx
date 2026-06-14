import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import type { ParsedResume } from '../../types';
import type { CustomTemplateConfig } from '../../store/templateStore';

interface DynamicTemplateProps {
  resume: ParsedResume;
  links?: {
    linkedin?: string;
    github?: string;
  };
  config: CustomTemplateConfig;
}

export const DynamicTemplate: React.FC<DynamicTemplateProps> = ({ resume, links, config }) => {
  const linkedinUrl = links?.linkedin || resume.linkedin;
  const githubUrl = links?.github || resume.github;

  const fSize = config.fontSizeBase;

  // Build stylesheet dynamically
  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: fSize,
      paddingTop: config.baseStyle === 'two-column' ? 0 : config.marginVertical,
      paddingBottom: config.baseStyle === 'two-column' ? 0 : config.marginVertical,
      paddingLeft: config.baseStyle === 'two-column' ? 0 : config.marginHorizontal,
      paddingRight: config.baseStyle === 'two-column' ? 0 : config.marginHorizontal,
      color: config.textColor,
      backgroundColor: config.backgroundColor,
      flexDirection: config.baseStyle === 'two-column' ? 'row' : 'column',
    },
    // Sidebar layouts (only for two-column)
    sidebar: {
      width: '32%',
      backgroundColor: config.primaryColor,
      paddingTop: config.marginVertical,
      paddingBottom: config.marginVertical,
      paddingLeft: 12,
      paddingRight: 12,
      color: '#ffffff',
    },
    sidebarName: {
      fontSize: fSize * 1.6,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
      marginBottom: 8,
      lineHeight: 1.2,
    },
    sidebarSection: {
      fontSize: fSize * 0.85,
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      color: '#e2e8f0',
      marginTop: 14,
      marginBottom: 5,
      borderBottomWidth: 0.5,
      borderBottomColor: '#cbd5e1',
      paddingBottom: 2,
    },
    sidebarText: {
      fontSize: fSize * 0.85,
      color: '#f1f5f9',
      marginBottom: 3,
      lineHeight: 1.3,
    },
    sidebarLink: {
      fontSize: fSize * 0.85,
      color: '#93c5fd',
      textDecoration: 'underline',
      marginBottom: 3,
    },
    main: {
      width: '68%',
      paddingTop: config.marginVertical,
      paddingBottom: config.marginVertical,
      paddingLeft: 16,
      paddingRight: 16,
      backgroundColor: config.backgroundColor,
    },
    // Standard layouts (Classic, Modern, Minimal)
    header: {
      marginBottom: config.baseStyle === 'minimal' ? 10 : 14,
      alignItems: config.headerAlignment === 'center' ? 'center' : 'flex-start',
    },
    name: {
      fontSize: fSize * 2.2,
      fontFamily: 'Helvetica-Bold',
      color: config.primaryColor,
      marginBottom: 3,
    },
    contactRow: {
      flexDirection: 'row',
      justifyContent: config.headerAlignment === 'center' ? 'center' : 'flex-start',
      flexWrap: 'wrap',
      gap: 6,
      fontSize: fSize * 0.85,
      color: config.secondaryColor,
    },
    contactItem: {
      fontSize: fSize * 0.85,
      color: config.secondaryColor,
    },
    link: {
      fontSize: fSize * 0.85,
      color: config.primaryColor,
      textDecoration: 'underline',
    },
    accentLine: {
      height: config.baseStyle === 'modern' ? 2 : 0,
      backgroundColor: config.primaryColor,
      width: '100%',
      marginTop: 5,
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: fSize * 1.05,
      fontFamily: 'Helvetica-Bold',
      textTransform: config.baseStyle === 'minimal' ? 'uppercase' : 'none',
      letterSpacing: config.baseStyle === 'minimal' ? 1.5 : 0.5,
      color: config.primaryColor,
      marginTop: 12,
      marginBottom: 5,
      borderBottomWidth: config.baseStyle === 'minimal' ? 0 : 0.5,
      borderBottomColor: config.primaryColor,
      paddingBottom: config.baseStyle === 'minimal' ? 0 : 2,
    },
    entryBlock: {
      marginBottom: 6,
    },
    entryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 1,
    },
    entryTitle: {
      fontFamily: 'Helvetica-Bold',
      fontSize: fSize * 0.95,
      color: config.primaryColor,
    },
    entrySubtitle: {
      fontSize: fSize * 0.85,
      color: config.secondaryColor,
      marginBottom: 2,
    },
    entryDate: {
      fontSize: fSize * 0.85,
      color: config.secondaryColor,
    },
    bullet: {
      flexDirection: 'row',
      marginBottom: 2,
      paddingLeft: 4,
    },
    bulletDot: {
      width: 10,
      fontSize: fSize * 0.9,
      color: config.primaryColor,
    },
    bulletText: {
      flex: 1,
      fontSize: fSize * 0.9,
      lineHeight: 1.35,
    },
    skillItem: {
      fontSize: fSize * 0.9,
      lineHeight: 1.35,
    },
  });

  if (config.baseStyle === 'two-column') {
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

          {/* Main Body */}
          <View style={styles.main}>
            {/* Experience */}
            {resume.experience && resume.experience.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Experience</Text>
                {resume.experience.map((exp, i) => (
                  <View key={i} style={styles.entryBlock}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitle}>{exp.role}</Text>
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
                <Text style={styles.sectionTitle}>Projects</Text>
                {resume.projects.map((proj, i) => (
                  <View key={i} style={styles.entryBlock}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitle}>{proj.name}</Text>
                      {proj.link && (
                        <Link src={proj.link} style={styles.link}>View Project</Link>
                      )}
                    </View>
                    {proj.tech && proj.tech.length > 0 && (
                      <Text style={styles.entrySubtitle}>{proj.tech.join(', ')}</Text>
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
          </View>
        </Page>
      </Document>
    );
  }

  // Render standard Classic, Modern, or Minimal layout
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
          {config.baseStyle === 'modern' && <View style={styles.accentLine} />}
        </View>

        {/* Skills */}
        {resume.skills && resume.skills.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            {config.skillsLayout === 'tags' ? (
              <Text style={styles.skillItem}>
                {resume.skills.join(' • ')}
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {resume.skills.map((skill, idx) => (
                  <Text key={idx} style={styles.skillItem}>• {skill}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Experience */}
        {resume.experience && resume.experience.length > 0 && (
          <View style={{ marginBottom: 8 }}>
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
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {resume.projects.map((proj, i) => (
              <View key={i} style={styles.entryBlock}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>{proj.name}</Text>
                  {proj.link && (
                    <Link src={proj.link} style={styles.link}>View Project</Link>
                  )}
                </View>
                {proj.tech && proj.tech.length > 0 && (
                  <Text style={styles.entrySubtitle}>{proj.tech.join(', ')}</Text>
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
          <View style={{ marginBottom: 8 }}>
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
          <View style={{ marginBottom: 8 }}>
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
