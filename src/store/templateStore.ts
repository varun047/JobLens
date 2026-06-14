import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomTemplateConfig {
  id: string;
  name: string;
  isCustom: boolean;
  baseStyle: 'classic' | 'modern' | 'minimal' | 'two-column';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontSizeBase: number;
  marginVertical: number;
  marginHorizontal: number;
  headerAlignment: 'left' | 'center';
  skillsLayout: 'bullets' | 'tags';
}

export const DEFAULT_TEMPLATES: Record<string, CustomTemplateConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic Preset',
    isCustom: false,
    baseStyle: 'classic',
    primaryColor: '#000000',
    secondaryColor: '#333333',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    fontSizeBase: 9,
    marginVertical: 40,
    marginHorizontal: 45,
    headerAlignment: 'center',
    skillsLayout: 'bullets'
  },
  modern: {
    id: 'modern',
    name: 'Modern Preset',
    isCustom: false,
    baseStyle: 'modern',
    primaryColor: '#1a1a2e',
    secondaryColor: '#555555',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    fontSizeBase: 10,
    marginVertical: 45,
    marginHorizontal: 50,
    headerAlignment: 'left',
    skillsLayout: 'tags'
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Preset',
    isCustom: false,
    baseStyle: 'minimal',
    primaryColor: '#444444',
    secondaryColor: '#666666',
    backgroundColor: '#ffffff',
    textColor: '#222222',
    fontSizeBase: 9,
    marginVertical: 50,
    marginHorizontal: 55,
    headerAlignment: 'left',
    skillsLayout: 'tags'
  },
  'two-column': {
    id: 'two-column',
    name: 'Two Column Preset',
    isCustom: false,
    baseStyle: 'two-column',
    primaryColor: '#111827',
    secondaryColor: '#4b5563',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    fontSizeBase: 9.5,
    marginVertical: 40,
    marginHorizontal: 40,
    headerAlignment: 'left',
    skillsLayout: 'bullets'
  }
};

interface TemplateState {
  customTemplates: CustomTemplateConfig[];
  addTemplate: (template: Omit<CustomTemplateConfig, 'id' | 'isCustom'>) => CustomTemplateConfig;
  updateTemplate: (id: string, updates: Partial<Omit<CustomTemplateConfig, 'id' | 'isCustom'>>) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => CustomTemplateConfig;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      customTemplates: [],

      addTemplate: (templateData) => {
        const id = `custom-${Date.now()}`;
        const newTemplate: CustomTemplateConfig = {
          ...templateData,
          id,
          isCustom: true
        };
        set((state) => ({
          customTemplates: [...state.customTemplates, newTemplate]
        }));
        return newTemplate;
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          customTemplates: state.customTemplates.map((tpl) =>
            tpl.id === id ? { ...tpl, ...updates } : tpl
          )
        }));
      },

      deleteTemplate: (id) => {
        set((state) => ({
          customTemplates: state.customTemplates.filter((tpl) => tpl.id !== id)
        }));
      },

      getTemplate: (id) => {
        // First check default templates
        if (DEFAULT_TEMPLATES[id]) {
          return DEFAULT_TEMPLATES[id];
        }
        // Then check custom templates
        const found = get().customTemplates.find((tpl) => tpl.id === id);
        if (found) return found;
        
        // Fail-safe fallback: return Modern default
        return DEFAULT_TEMPLATES.modern;
      }
    }),
    {
      name: 'resumeai-template-state'
    }
  )
);
