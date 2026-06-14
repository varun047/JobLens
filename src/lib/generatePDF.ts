import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { ClassicTemplate } from '../components/pdf/ClassicTemplate';
import { ModernTemplate } from '../components/pdf/ModernTemplate';
import { MinimalTemplate } from '../components/pdf/MinimalTemplate';
import { TwoColumnTemplate } from '../components/pdf/TwoColumnTemplate';
import type { ParsedResume } from '../types';

export type ResumeStyle = 'classic' | 'modern' | 'minimal' | 'two-column';

export interface ResumeLinks {
  linkedin?: string;
  github?: string;
}

export async function downloadResumePDF(
  resume: ParsedResume,
  filename: string = 'Resume.pdf',
  style: ResumeStyle = 'modern',
  links?: ResumeLinks
) {
  try {
    const templates = {
      classic: ClassicTemplate,
      modern: ModernTemplate,
      minimal: MinimalTemplate,
      'two-column': TwoColumnTemplate
    };

    const Template = templates[style] || ModernTemplate;

    const blob = await pdf(
      React.createElement(Template, { resume, links }) as any
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (err) {
    console.error('PDF generation failed:', err);
    throw err;
  }
}
