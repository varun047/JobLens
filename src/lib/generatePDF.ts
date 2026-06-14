import { pdf } from '@react-pdf/renderer';
import React from 'react';
import { ClassicTemplate } from '../components/pdf/ClassicTemplate';
import { ModernTemplate } from '../components/pdf/ModernTemplate';
import { MinimalTemplate } from '../components/pdf/MinimalTemplate';
import { TwoColumnTemplate } from '../components/pdf/TwoColumnTemplate';
import { DynamicTemplate } from '../components/pdf/DynamicTemplate';
import type { ParsedResume } from '../types';
import type { CustomTemplateConfig } from '../store/templateStore';

export type ResumeStyle = 'classic' | 'modern' | 'minimal' | 'two-column' | string;

export interface ResumeLinks {
  linkedin?: string;
  github?: string;
}

export async function downloadResumePDF(
  resume: ParsedResume,
  filename: string = 'Resume.pdf',
  style: ResumeStyle = 'modern',
  links?: ResumeLinks,
  customConfig?: CustomTemplateConfig
) {
  try {
    let Template: React.ComponentType<any>;

    if (customConfig) {
      Template = () => React.createElement(DynamicTemplate, { resume, links, config: customConfig });
    } else {
      const templates: Record<string, React.ComponentType<any>> = {
        classic: ClassicTemplate,
        modern: ModernTemplate,
        minimal: MinimalTemplate,
        'two-column': TwoColumnTemplate
      };
      Template = templates[style] || ModernTemplate;
    }

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
