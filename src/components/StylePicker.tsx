import React from 'react';
import { useAppThemeStore } from '../store/themeStore';
import type { ResumeStyle } from '../lib/generatePDF';
import type { CompanyInsight } from '../lib/companyResearch';

interface StylePickerProps {
  company: string;
  jobTitle: string;
  selectedStyle: ResumeStyle;
  onStyleSelected: (style: ResumeStyle) => void;
  companyInsight: CompanyInsight | null;
  researchingCompany: boolean;
  onGenerate: () => void;
  generating?: boolean;
}

const stylesList = [
  {
    id: 'classic' as ResumeStyle,
    name: 'Classic',
    description: 'Traditional ATS-safe format',
    preview: '═══ Clean lines, no design ═══',
    best: 'Banks, PSUs, Enterprise'
  },
  {
    id: 'modern' as ResumeStyle,
    name: 'Modern',
    description: 'Clean with accent line',
    preview: '▬▬▬ Accent line design ▬▬▬',
    best: 'Tech startups, Product companies'
  },
  {
    id: 'minimal' as ResumeStyle,
    name: 'Minimal',
    description: 'Ultra clean whitespace',
    preview: '    Lots of breathing room    ',
    best: 'Design, Creative, Product'
  },
  {
    id: 'two-column' as ResumeStyle,
    name: 'Two Column',
    description: 'Sidebar + main content',
    preview: '│Skills│ Main Content Area │',
    best: 'Technical roles, Engineering'
  }
];

export const StylePicker: React.FC<StylePickerProps> = ({
  company,
  jobTitle,
  selectedStyle,
  onStyleSelected,
  companyInsight,
  researchingCompany,
  onGenerate,
  generating = false
}) => {
  const { selectedTheme } = useAppThemeStore();
  return (
    <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-md space-y-6 animate-fadeIn">
      <div>
        <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
          Style & Template Recommendation
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Pick a template style optimized for your target company.
        </p>
      </div>

      {researchingCompany && (
        <div className="flex flex-col items-center justify-center py-6 space-y-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 rounded-lg animate-pulse">
          <div className="w-5 h-5 border-2 border-[var(--theme-accent)] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Researching hiring style at <span className="font-semibold text-[var(--theme-accent)]">{company}</span>...
          </span>
        </div>
      )}

      {!researchingCompany && companyInsight && (
        <div className="bg-[var(--theme-accent-tint)] border border-[var(--theme-accent-tint)] rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-[var(--theme-accent-text)] font-semibold text-xs">
            <span>✨</span> AI Recommendation
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-350 leading-relaxed font-medium">
            We researched <span className="font-semibold">{company}</span> ({companyInsight.size} {companyInsight.industry} company) and recommend the <span className="text-[var(--theme-accent-text)] font-bold uppercase tracking-wide">{companyInsight.recommendedStyle}</span> style for a <span className="font-semibold">{jobTitle}</span> role there.
          </p>
          {companyInsight.reason && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
              &ldquo;{companyInsight.reason}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Grid of Styles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stylesList.map((style) => {
          const isSelected = selectedStyle === style.id;
          const isRecommended = companyInsight?.recommendedStyle === style.id;

          return (
            <button
              key={style.id}
              onClick={() => onStyleSelected(style.id)}
              className={`relative flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer select-none group
                ${isSelected
                  ? 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-900 dark:border-white shadow-sm ring-1 ring-zinc-900 dark:ring-white'
                  : 'bg-transparent border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-750'
                }`}
            >
              {isRecommended && (
                <div className="absolute -top-2 -right-2 bg-[var(--theme-accent)] text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm z-10 animate-bounce">
                  ★ Recommended
                </div>
              )}

              <div className="flex flex-col h-full justify-between space-y-4">
                <div>
                  <h4 className={`text-xs font-bold ${isSelected ? 'text-zinc-950 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {style.name}
                  </h4>
                  <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-1 leading-snug">
                    {style.description}
                  </p>
                </div>

                {/* Micro-preview box */}
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 rounded py-2 px-1 text-center font-mono text-[8px] text-zinc-400 dark:text-zinc-650 overflow-hidden truncate">
                  {style.preview}
                </div>

                <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium pt-1 border-t border-zinc-100 dark:border-zinc-850">
                  <span className="font-bold text-zinc-500 dark:text-zinc-400">Best for: </span>
                  {style.best}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Company tips */}
      {!researchingCompany && companyInsight?.tips && companyInsight.tips.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
          <h4 className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <span>💡</span> Application Tips for {company}
          </h4>
          <ul className="space-y-1.5 pl-5 list-disc text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed">
            {companyInsight.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-900">
        <button
          onClick={onGenerate}
          disabled={generating || researchingCompany}
          className="flex items-center gap-2 bg-zinc-950 dark:bg-white text-white dark:text-black text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-zinc-850 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
        >
          {generating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              Generating PDF...
            </>
          ) : (
            <>
              <span>⬇</span> Generate & Download Resume
            </>
          )}
        </button>
      </div>
    </div>
  );
};
