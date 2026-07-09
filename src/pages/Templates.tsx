import React, { useState } from 'react';
import { useTemplateStore } from '../store/templateStore';
import { useResumeStore } from '../store/resumeStore';

const MOCK_RESUME = {
  name: 'Alex Rivera',
  email: 'alex.rivera@devmail.com',
  phone: '+1 (555) 019-2834',
  linkedin: 'linkedin.com/in/alex-dev',
  github: 'github.com/alex-rivera',
  skills: ['React', 'TypeScript', 'Node.js', 'Next.js', 'GraphQL', 'Tailwind CSS', 'Docker', 'PostgreSQL'],
  experience: [
    {
      company: 'InnovateTech Solutions',
      role: 'Senior Frontend Engineer',
      duration: '2023 - Present',
      bullets: [
        'Architected and deployed a highly responsive next-gen SaaS dashboard, improving client load time by 42%.',
        'Led a team of 4 engineers to migrate legacy React modules to modern TypeScript components.'
      ]
    }
  ],
  projects: [
    {
      name: 'GitInsight Dashboard',
      tech: ['React', 'Zustand', 'Recharts', 'Tailwind'],
      bullets: [
        'Built a visual analyzer for GitHub repositories displaying commits mix and stack statistics in real time.'
      ]
    }
  ],
  education: [
    {
      institution: 'State Tech University',
      degree: 'B.S. in Computer Science',
      year: '2019 - 2023'
    }
  ]
};

export const Templates: React.FC = () => {
  const { resume: baseResume } = useResumeStore();
  const resumeData = baseResume || MOCK_RESUME;

  const {
    customTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate
  } = useTemplateStore();

  // Selected template states
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('modern');
  const [isEditing, setIsEditing] = useState(false);

  // Edit config states
  const [name, setName] = useState('');
  const [baseStyle, setBaseStyle] = useState<'classic' | 'modern' | 'minimal' | 'two-column'>('modern');
  const [primaryColor, setPrimaryColor] = useState('#1a1a2e');
  const [secondaryColor, setSecondaryColor] = useState('#555555');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#333333');
  const [fontSizeBase, setFontSizeBase] = useState(10);
  const [marginVertical, setMarginVertical] = useState(45);
  const [marginHorizontal, setMarginHorizontal] = useState(50);
  const [headerAlignment, setHeaderAlignment] = useState<'left' | 'center'>('left');
  const [skillsLayout, setSkillsLayout] = useState<'bullets' | 'tags'>('tags');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEdit = (id: string) => {
    const config = getTemplate(id);
    setName(config.name === 'Classic Preset' || config.name === 'Modern Preset' || config.name === 'Minimal Preset' || config.name === 'Two Column Preset' ? 'My Custom ' + config.name.replace(' Preset', '') : config.name);
    setBaseStyle(config.baseStyle);
    setPrimaryColor(config.primaryColor);
    setSecondaryColor(config.secondaryColor);
    setBackgroundColor(config.backgroundColor);
    setTextColor(config.textColor);
    setFontSizeBase(config.fontSizeBase);
    setMarginVertical(config.marginVertical);
    setMarginHorizontal(config.marginHorizontal);
    setHeaderAlignment(config.headerAlignment);
    setSkillsLayout(config.skillsLayout);
    setSelectedTemplateId(id);
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    setName('New Styled Template');
    setBaseStyle('modern');
    setPrimaryColor('#3b82f6');
    setSecondaryColor('#6b7280');
    setBackgroundColor('#ffffff');
    setTextColor('#1f2937');
    setFontSizeBase(10);
    setMarginVertical(40);
    setMarginHorizontal(45);
    setHeaderAlignment('left');
    setSkillsLayout('tags');
    setSelectedTemplateId('new');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Template Name is required');
      return;
    }

    const payload = {
      name,
      baseStyle,
      primaryColor,
      secondaryColor,
      backgroundColor,
      textColor,
      fontSizeBase,
      marginVertical,
      marginHorizontal,
      headerAlignment,
      skillsLayout
    };

    if (selectedTemplateId.startsWith('custom-')) {
      updateTemplate(selectedTemplateId, payload);
      triggerToast('✓ Template updated successfully');
    } else {
      const newTpl = addTemplate(payload);
      setSelectedTemplateId(newTpl.id);
      triggerToast('✓ Custom template saved');
    }
    setIsEditing(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this template?')) {
      deleteTemplate(id);
      setSelectedTemplateId('modern');
      setIsEditing(false);
      triggerToast('✓ Template deleted');
    }
  };


  // Render a simulated live HTML preview
  const renderLiveMockPreview = () => {
    const scale = 0.85; // slightly scale down to fit container
    const paddingV = `${marginVertical * scale}px`;
    const paddingH = `${marginHorizontal * scale}px`;
    const fontSz = `${fontSizeBase * scale}px`;

    const alignClass = headerAlignment === 'center' ? 'text-center items-center' : 'text-left items-start';

    if (baseStyle === 'two-column') {
      return (
        <div 
          className="w-full min-h-[580px] shadow-2xl rounded-2xl flex text-left transition-all overflow-hidden border border-zinc-200 dark:border-zinc-850"
          style={{ backgroundColor, color: textColor, fontSize: fontSz }}
        >
          {/* Sidebar */}
          <div 
            className="w-[32%] p-4 text-white flex flex-col gap-4 border-r border-zinc-100 dark:border-zinc-800"
            style={{ backgroundColor: primaryColor }}
          >
            <div>
              <h4 className="font-extrabold tracking-tight" style={{ fontSize: `${fontSizeBase * 1.5 * scale}px` }}>
                {resumeData.name}
              </h4>
              <p className="opacity-90 mt-1" style={{ fontSize: `${fontSizeBase * 0.8 * scale}px` }}>{resumeData.email}</p>
              <p className="opacity-90" style={{ fontSize: `${fontSizeBase * 0.8 * scale}px` }}>{resumeData.phone}</p>
            </div>

            <div>
              <h5 className="font-bold border-b border-white/20 pb-1 uppercase tracking-wider text-[8px]" style={{ color: '#e2e8f0' }}>
                Skills
              </h5>
              <div className="flex flex-col gap-1 mt-1.5" style={{ fontSize: `${fontSizeBase * 0.8 * scale}px` }}>
                {resumeData.skills.slice(0, 6).map((s, i) => (
                  <span key={i} className="opacity-90">• {s}</span>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-bold border-b border-white/20 pb-1 uppercase tracking-wider text-[8px]" style={{ color: '#e2e8f0' }}>
                Education
              </h5>
              <div className="mt-1.5" style={{ fontSize: `${fontSizeBase * 0.8 * scale}px` }}>
                <p className="font-semibold">{resumeData.education[0].institution}</p>
                <p className="opacity-95 text-[7.5px]">{resumeData.education[0].degree}</p>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="w-[68%] p-5 flex flex-col gap-4">
            <div>
              <h5 className="font-bold border-b pb-1 uppercase tracking-wider" style={{ borderBottomColor: primaryColor, color: primaryColor, fontSize: `${fontSizeBase * 1.05 * scale}px` }}>
                Experience
              </h5>
              <div className="mt-2 text-left">
                <div className="flex justify-between font-bold" style={{ fontSize: `${fontSizeBase * 0.95 * scale}px`, color: primaryColor }}>
                  <span>{resumeData.experience[0].role}</span>
                  <span className="font-normal text-[8px]" style={{ color: secondaryColor }}>{resumeData.experience[0].duration}</span>
                </div>
                <p className="italic font-medium" style={{ fontSize: `${fontSizeBase * 0.85 * scale}px`, color: secondaryColor }}>{resumeData.experience[0].company}</p>
                <ul className="list-disc list-outside mt-1 pl-4 space-y-1" style={{ fontSize: `${fontSizeBase * 0.9 * scale}px` }}>
                  {resumeData.experience[0].bullets.map((b, i) => (
                    <li key={i} className="leading-relaxed">{b}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h5 className="font-bold border-b pb-1 uppercase tracking-wider" style={{ borderBottomColor: primaryColor, color: primaryColor, fontSize: `${fontSizeBase * 1.05 * scale}px` }}>
                Projects
              </h5>
              <div className="mt-2 text-left">
                <div className="flex justify-between font-bold" style={{ fontSize: `${fontSizeBase * 0.95 * scale}px`, color: primaryColor }}>
                  <span>{resumeData.projects[0].name}</span>
                </div>
                <p className="italic font-medium" style={{ fontSize: `${fontSizeBase * 0.85 * scale}px`, color: secondaryColor }}>
                  {resumeData.projects[0].tech.join(', ')}
                </p>
                <p className="mt-1" style={{ fontSize: `${fontSizeBase * 0.9 * scale}px` }}>{resumeData.projects[0].bullets[0]}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Classic, Modern, or Minimal layout simulator
    return (
      <div 
        className="w-full min-h-[580px] shadow-2xl rounded-2xl flex flex-col text-left transition-all overflow-hidden border border-zinc-200 dark:border-zinc-850"
        style={{ 
          backgroundColor, 
          color: textColor, 
          fontSize: fontSz,
          paddingTop: paddingV,
          paddingBottom: paddingV,
          paddingLeft: paddingH,
          paddingRight: paddingH
        }}
      >
        {/* Header */}
        <div className={`flex flex-col ${alignClass} mb-4`}>
          <h4 className="font-extrabold tracking-tight" style={{ fontSize: `${fontSizeBase * 2.2 * scale}px`, color: primaryColor }}>
            {resumeData.name}
          </h4>
          <div className="flex flex-wrap gap-2 mt-1.5" style={{ fontSize: `${fontSizeBase * 0.85 * scale}px`, color: secondaryColor }}>
            <span>{resumeData.email}</span>
            <span>|</span>
            <span>{resumeData.phone}</span>
            <span>|</span>
            <span style={{ color: primaryColor, textDecoration: 'underline' }}>LinkedIn</span>
            <span>|</span>
            <span style={{ color: primaryColor, textDecoration: 'underline' }}>GitHub</span>
          </div>
          {baseStyle === 'modern' && (
            <div className="h-0.5 w-full mt-2" style={{ backgroundColor: primaryColor }} />
          )}
        </div>

        {/* Skills */}
        <div className="mb-3">
          <h5 className="font-bold border-b pb-1 uppercase tracking-wider" style={{ borderBottomWidth: baseStyle === 'minimal' ? 0 : '0.5px', borderBottomColor: primaryColor, color: primaryColor, fontSize: `${fontSizeBase * 1.05 * scale}px` }}>
            Technical Skills
          </h5>
          {skillsLayout === 'tags' ? (
            <p className="mt-1.5 leading-relaxed" style={{ fontSize: `${fontSizeBase * 0.9 * scale}px` }}>
              {resumeData.skills.join(' • ')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5" style={{ fontSize: `${fontSizeBase * 0.9 * scale}px` }}>
              {resumeData.skills.map((s, i) => (
                <span key={i}>• {s}</span>
              ))}
            </div>
          )}
        </div>

        {/* Experience */}
        <div className="mb-3">
          <h5 className="font-bold border-b pb-1 uppercase tracking-wider" style={{ borderBottomWidth: baseStyle === 'minimal' ? 0 : '0.5px', borderBottomColor: primaryColor, color: primaryColor, fontSize: `${fontSizeBase * 1.05 * scale}px` }}>
            Experience
          </h5>
          <div className="mt-1.5">
            <div className="flex justify-between font-bold" style={{ fontSize: `${fontSizeBase * 0.95 * scale}px`, color: primaryColor }}>
              <span>{resumeData.experience[0].role} — {resumeData.experience[0].company}</span>
              <span className="font-normal text-[8px]" style={{ color: secondaryColor }}>{resumeData.experience[0].duration}</span>
            </div>
            <ul className="list-disc list-outside mt-1.5 pl-4 space-y-1" style={{ fontSize: `${fontSizeBase * 0.9 * scale}px` }}>
              {resumeData.experience[0].bullets.map((b, i) => (
                <li key={i} className="leading-relaxed">{b}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Education */}
        <div className="mb-3">
          <h5 className="font-bold border-b pb-1 uppercase tracking-wider" style={{ borderBottomWidth: baseStyle === 'minimal' ? 0 : '0.5px', borderBottomColor: primaryColor, color: primaryColor, fontSize: `${fontSizeBase * 1.05 * scale}px` }}>
            Education
          </h5>
          <div className="mt-1.5">
            <div className="flex justify-between font-bold" style={{ fontSize: `${fontSizeBase * 0.95 * scale}px`, color: primaryColor }}>
              <span>{resumeData.education[0].institution}</span>
              <span className="font-normal text-[8px]" style={{ color: secondaryColor }}>{resumeData.education[0].year}</span>
            </div>
            <p style={{ fontSize: `${fontSizeBase * 0.85 * scale}px`, color: secondaryColor }}>{resumeData.education[0].degree}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto px-6 py-10 max-w-7xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-emerald-650 dark:text-emerald-400 px-4.5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-[9999] text-xs font-semibold animate-slideUp">
          <span className="text-sm">✓</span> {toastMessage}
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <span>🎨</span> Template Manager
          </h1>
          <p className="font-body text-sm text-zinc-500 dark:text-white/50 mt-1">
            Design and customize your resume templates. Saved layouts will be available when downloading optimized resumes.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleCreateNew}
            className="font-body text-sm font-semibold tracking-[0.1px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            + Create New Template
          </button>
        )}
      </div>

      {isEditing ? (
        /* SIDE-BY-SIDE BUILDER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fadeIn">
          {/* Left panel: form controls (5 cols) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-150 dark:border-zinc-900">
              <h3 className="text-xs.5 font-bold text-zinc-900 dark:text-white">
                Customize Style Properties
              </h3>
              <span className="text-[10px] text-zinc-500 font-semibold capitalize bg-zinc-100 dark:bg-zinc-950 px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-900">
                {baseStyle} base
              </span>
            </div>

            {/* Name input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider block">
                Template Label
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 transition-colors"
                placeholder="e.g. Minimal Blue Design"
              />
            </div>

            {/* Layout selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                Base Layout Grid
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['classic', 'modern', 'minimal', 'two-column'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBaseStyle(s)}
                    className={`py-2 px-1 rounded-lg border text-center text-[10px] font-semibold transition-all capitalize ${
                      baseStyle === s
                        ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400 font-bold'
                        : 'border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
                    }`}
                  >
                    {s.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                  Accent Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                  Secondary Text
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                  Background Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                  Body Text Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded border border-zinc-800 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-955 border border-zinc-250 dark:border-zinc-850 rounded-lg px-2 text-xs text-zinc-900 dark:text-white uppercase font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Layout parameters */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                  Font Size ({fontSizeBase}pt)
                </label>
                <input
                  type="range"
                  min="8"
                  max="14"
                  step="0.5"
                  value={fontSizeBase}
                  onChange={(e) => setFontSizeBase(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                  Margin V ({marginVertical}px)
                </label>
                <input
                  type="range"
                  min="15"
                  max="80"
                  step="5"
                  value={marginVertical}
                  onChange={(e) => setMarginVertical(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                  Margin H ({marginHorizontal}px)
                </label>
                <input
                  type="range"
                  min="15"
                  max="80"
                  step="5"
                  value={marginHorizontal}
                  onChange={(e) => setMarginHorizontal(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Format choice parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                  Header Align
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['left', 'center'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setHeaderAlignment(align)}
                      className={`py-1.5 rounded-lg border text-center text-[10px] font-semibold transition-all capitalize ${
                        headerAlignment === align
                          ? 'border-emerald-500 bg-emerald-955/20 text-emerald-450 font-bold'
                          : 'border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-650 dark:text-zinc-400 hover:border-zinc-450'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-455 dark:text-zinc-400 uppercase tracking-wider block">
                  Skills Display
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['bullets', 'tags'] as const).map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      onClick={() => setSkillsLayout(layout)}
                      className={`py-1.5 rounded-lg border text-center text-[10px] font-semibold transition-all capitalize ${
                        skillsLayout === layout
                          ? 'border-emerald-500 bg-emerald-955/20 text-emerald-455 font-bold'
                          : 'border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-650 dark:text-zinc-400 hover:border-zinc-450'
                      }`}
                    >
                      {layout === 'bullets' ? 'Bullets' : 'Tags'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-900 mt-6">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm active:scale-95"
              >
                Save Layout Template
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-750 dark:text-zinc-200 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Back to List
              </button>
            </div>
          </div>

          {/* Right panel: live visual mockup preview (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <span className="text-[10px] font-black text-zinc-450 dark:text-zinc-550 uppercase tracking-widest block text-left">
              📺 Live Mockup Preview
            </span>
            {renderLiveMockPreview()}
          </div>
        </div>
      ) : (
        /* TEMPLATE LIST GRID */
        <div className="space-y-8 animate-fadeIn">
          {/* Preset Styles Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-left">
              <span>🗂️</span> Default Styling Presets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  id: 'classic',
                  name: 'Classic Preset',
                  desc: 'Traditional ATS-safe format',
                  best: 'Banks, PSUs, Enterprise applications',
                  colors: ['#000000', '#333333', '#ffffff']
                },
                {
                  id: 'modern',
                  name: 'Modern Preset',
                  desc: 'Clean layouts with an accent line',
                  best: 'Tech startups, SaaS companies',
                  colors: ['#1a1a2e', '#555555', '#ffffff']
                },
                {
                  id: 'minimal',
                  name: 'Minimal Preset',
                  desc: 'Ultra clean focusing on whitespace',
                  best: 'Design, Product Management, Creative roles',
                  colors: ['#444444', '#666666', '#ffffff']
                },
                {
                  id: 'two-column',
                  name: 'Two Column Preset',
                  desc: 'Sidebar layout for technical density',
                  best: 'Technical, Engineering, Developers',
                  colors: ['#111827', '#4b5563', '#ffffff']
                }
              ].map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleEdit(tpl.id)}
                  className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700 rounded-2xl p-5 text-left cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="font-heading text-sm font-bold text-zinc-900 dark:text-white truncate">{tpl.name}</p>
                    <span className="font-body text-[8px] font-extrabold uppercase tracking-wider text-zinc-450 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-850">
                      Preset
                    </span>
                  </div>
                  <p className="font-body text-xs text-zinc-500 dark:text-white/50 mb-3 leading-relaxed">{tpl.desc}</p>
                  <div className="flex justify-between items-center mt-4 border-t border-zinc-100 dark:border-zinc-950 pt-3">
                    <div className="flex gap-1.5">
                      {tpl.colors.map((c, idx) => (
                        <span
                          key={idx}
                          className="w-3.5 h-3.5 rounded-full border border-zinc-200 dark:border-zinc-800"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-bold group-hover:underline">
                      Customize →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Styles Section */}
          <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-900">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 text-left">
              <span>⭐</span> Your Saved Custom Layouts
            </h3>

            {customTemplates.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl p-12 text-center flex flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/5">
                <svg className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">No Custom Layouts Yet</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-0.5 max-w-xs leading-relaxed">
                  Click "+ Create New Template" above or select a preset to design and save your own layout presets.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {customTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleEdit(tpl.id)}
                    className="relative bg-white dark:bg-[#121212]/70 border border-zinc-200 dark:border-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700 rounded-2xl p-5 text-left cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm group"
                  >
                    {/* Delete action overlay */}
                    <button
                      onClick={(e) => handleDelete(tpl.id, e)}
                      className="absolute top-4 right-4 p-1.5 hover:bg-red-500/10 hover:text-red-400 text-zinc-450 dark:text-zinc-500 rounded-lg transition-colors cursor-pointer z-10"
                      title="Delete Template"
                    >
                      🗑️
                    </button>

                    <div className="flex items-center justify-between gap-2 mb-1.5 pr-8">
                      <p className="font-heading text-sm font-bold text-zinc-900 dark:text-white truncate">{tpl.name}</p>
                      <span className="font-body text-[8px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-250 dark:border-emerald-900/30">
                        Custom
                      </span>
                    </div>
                    <p className="font-body text-xs text-zinc-500 dark:text-white/50 mb-3 capitalize">Base: {tpl.baseStyle.replace('-', ' ')}</p>
                    
                    <div className="flex justify-between items-center mt-4 border-t border-zinc-100 dark:border-zinc-950 pt-3">
                      <div className="flex gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full border border-zinc-200 dark:border-zinc-800" style={{ backgroundColor: tpl.primaryColor }} />
                        <span className="w-3.5 h-3.5 rounded-full border border-zinc-200 dark:border-zinc-800" style={{ backgroundColor: tpl.secondaryColor }} />
                        <span className="w-3.5 h-3.5 rounded-full border border-zinc-200 dark:border-zinc-800" style={{ backgroundColor: tpl.backgroundColor }} />
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-bold group-hover:underline">
                        Edit Style →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
