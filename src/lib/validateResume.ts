import type { ParsedResume, JDIntelligence, ATSBreakdown } from '../types';

export interface ValidationWarning {
  section: 'experience' | 'projects' | 'skills' | 'summary';
  itemIndex: number;
  bulletIndex?: number;
  issue: 'weak_verb' | 'too_short' | 'missing_metric' | 'generic_language';
  message: string;
}

const BANNED_VERBS = new Set([
  'worked',
  'helped',
  'assisted',
  'responsible',
  'handled',
  'did',
  'made'
]);

const GENERIC_PHRASES = [
  'various tasks',
  'many things',
  'hard worker',
  'team player'
];

export function validateResume(resume: ParsedResume): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  const validateBullet = (
    text: string,
    section: 'experience' | 'projects',
    itemIndex: number,
    bulletIndex: number
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 1. weak_verb check
    const firstWord = trimmed.split(/\s+/)[0]?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
    if (firstWord && BANNED_VERBS.has(firstWord)) {
      warnings.push({
        section,
        itemIndex,
        bulletIndex,
        issue: 'weak_verb',
        message: `Bullet starts with a weak/passive verb: "${trimmed.split(/\s+/)[0]}". Start with a strong action verb instead.`
      });
    }

    // 2. too_short check
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    if (wordCount < 8) {
      warnings.push({
        section,
        itemIndex,
        bulletIndex,
        issue: 'too_short',
        message: `Bullet is too short (${wordCount} words). Elaborate using X, Y, Z structure (minimum 8 words).`
      });
    }

    // 3. missing_metric check
    const hasDigit = /\d/.test(trimmed);
    const hasPercent = trimmed.includes('%');
    if (!hasDigit && !hasPercent) {
      warnings.push({
        section,
        itemIndex,
        bulletIndex,
        issue: 'missing_metric',
        message: "Bullet lacks a quantifiable metric (numbers or percentages). Quantify your achievements."
      });
    }

    // 4. generic_language check
    const lowerText = trimmed.toLowerCase();
    for (const phrase of GENERIC_PHRASES) {
      if (lowerText.includes(phrase)) {
        warnings.push({
          section,
          itemIndex,
          bulletIndex,
          issue: 'generic_language',
          message: `Bullet contains generic buzzwords or phrases: "${phrase}". Be specific about your accomplishments.`
        });
      }
    }
  };

  // Check Experience bullets
  if (resume.experience) {
    resume.experience.forEach((exp, itemIndex) => {
      if (exp.bullets) {
        exp.bullets.forEach((bullet, bulletIndex) => {
          validateBullet(bullet, 'experience', itemIndex, bulletIndex);
        });
      }
    });
  }

  // Check Projects bullets
  if (resume.projects) {
    resume.projects.forEach((proj, itemIndex) => {
      if (proj.bullets) {
        proj.bullets.forEach((bullet, bulletIndex) => {
          validateBullet(bullet, 'projects', itemIndex, bulletIndex);
        });
      }
    });
  }

  return warnings;
}

export function computeATSBreakdown(
  resume: ParsedResume,
  jdIntelligence: JDIntelligence,
  warnings: ValidationWarning[]
): ATSBreakdown {
  // 1. keywordMatch
  const allResumeSkills = [
    ...(resume.skills || []),
    ...(resume.skillCategories?.flatMap(c => c.skills) || [])
  ].map(s => s.toLowerCase());

  let matched = 0;
  const reqSkills = jdIntelligence.requiredSkills || [];
  let keywordMatch = 0;
  if (reqSkills.length > 0) {
    reqSkills.forEach(reqSkill => {
      const lowerReq = reqSkill.toLowerCase();
      const isMatched = allResumeSkills.some(s => s.includes(lowerReq) || lowerReq.includes(s));
      if (isMatched) {
        matched++;
      }
    });
    keywordMatch = Math.round((matched / reqSkills.length) * 100);
  } else {
    keywordMatch = 100;
  }

  // 2. bulletQuality
  const qualityWarningsCount = warnings.filter(
    w => w.issue === 'weak_verb' || w.issue === 'too_short'
  ).length;
  const bulletQuality = Math.max(0, 100 - qualityWarningsCount * 10);

  // 3. quantification
  let totalBullets = 0;
  let quantifiedBulletsCount = 0;

  if (resume.experience) {
    resume.experience.forEach(exp => {
      if (exp.bullets) {
        exp.bullets.forEach(b => {
          totalBullets++;
          if (/\d/.test(b) || b.includes('%')) {
            quantifiedBulletsCount++;
          }
        });
      }
    });
  }

  if (resume.projects) {
    resume.projects.forEach(proj => {
      if (proj.bullets) {
        proj.bullets.forEach(b => {
          totalBullets++;
          if (/\d/.test(b) || b.includes('%')) {
            quantifiedBulletsCount++;
          }
        });
      }
    });
  }

  const quantification = totalBullets > 0 ? Math.round((quantifiedBulletsCount / totalBullets) * 100) : 0;

  // 4. sectionsComplete
  let sectionsCount = 0;
  if (resume.summary && resume.summary.trim()) sectionsCount++;
  if (resume.skillCategories && resume.skillCategories.length > 0) sectionsCount++;
  else if (resume.skills && resume.skills.length > 0) sectionsCount++;
  if (resume.experience && resume.experience.length > 0) sectionsCount++;
  if (resume.projects && resume.projects.length > 0) sectionsCount++;
  if (resume.education && resume.education.length > 0) sectionsCount++;
  if (resume.achievements && resume.achievements.length > 0) sectionsCount++;

  const sectionsComplete = Math.round((sectionsCount / 6) * 100);

  // 5. achievementsPresent
  const achievementsPresent = (resume.achievements && resume.achievements.length > 0) ? 100 : 0;

  return {
    keywordMatch,
    bulletQuality,
    quantification,
    sectionsComplete,
    achievementsPresent
  };
}

const STRONG_VERBS = new Set([
  'built', 'led', 'designed', 'implemented', 'optimized',
  'reduced', 'increased', 'automated', 'architected', 'shipped',
  'developed', 'delivered', 'collaborated', 'created', 'engineered',
  'formulated', 'scaled', 'modernized', 'deployed', 'spearheaded',
  'transformed', 'accelerated'
]);

export function getBulletBadges(
  original: string,
  rewritten: string,
  jdIntelligence: JDIntelligence | null
): string[] {
  const badges: string[] = [];
  const origTrimmed = original.trim();
  const rewTrimmed = rewritten.trim();
  if (!rewTrimmed) return badges;

  const origLower = origTrimmed.toLowerCase();
  const rewLower = rewTrimmed.toLowerCase();

  // 1. JD keyword: rewritten bullet contains a term from jdIntelligence.requiredSkills/preferredSkills that the original didn't.
  if (jdIntelligence) {
    const allSkills = [
      ...(jdIntelligence.requiredSkills || []),
      ...(jdIntelligence.preferredSkills || [])
    ];
    const hasNewSkill = allSkills.some(skill => {
      const lowerSkill = skill.toLowerCase();
      return rewLower.includes(lowerSkill) && !origLower.includes(lowerSkill);
    });
    if (hasNewSkill) {
      badges.push('JD keyword');
    }
  }

  // 2. Quantified: rewritten bullet contains a digit/% that the original bullet didn't.
  const origHasMetric = /\d/.test(origTrimmed) || origTrimmed.includes('%');
  const rewHasMetric = /\d/.test(rewTrimmed) || rewTrimmed.includes('%');
  if (rewHasMetric && !origHasMetric) {
    badges.push('Quantified');
  }

  // 3. Action verb: rewritten bullet's first word is on a strong-verb list and the original's wasn't.
  const getFirstWord = (s: string) =>
    s.split(/\s+/)[0]?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase() || '';

  const origFirstWord = getFirstWord(origTrimmed);
  const rewFirstWord = getFirstWord(rewTrimmed);

  if (STRONG_VERBS.has(rewFirstWord) && !STRONG_VERBS.has(origFirstWord)) {
    badges.push('Action verb');
  }

  // 4. Impact: rewritten bullet is longer AND contains a metric AND wasn't flagged too_short/missing_metric.
  const origWords = origTrimmed.split(/\s+/).filter(Boolean).length;
  const rewWords = rewTrimmed.split(/\s+/).filter(Boolean).length;
  const isTooShort = rewWords < 8;
  const isMissingMetric = !rewHasMetric;

  if (rewWords > origWords && rewHasMetric && !isTooShort && !isMissingMetric) {
    badges.push('Impact');
  }

  return badges;
}
