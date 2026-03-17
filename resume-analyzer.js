/* ============================================================
   RESUME COMPATIBILITY ANALYZER — Core Logic
   Pure client-side: no API keys, no data sent anywhere.
   ============================================================ */

// ── STOP WORDS ──────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','up','about','into','through','during','before','after','above','below',
  'between','each','all','both','few','more','most','other','some','such',
  'no','nor','not','only','own','same','so','than','too','very','can','will',
  'just','should','now','would','could','may','might','must','shall','need',
  'i','me','my','myself','we','our','ours','ourselves','you','your','yours',
  'yourself','yourselves','he','him','his','himself','she','her','hers',
  'herself','it','its','itself','they','them','their','theirs','themselves',
  'what','which','who','whom','this','that','these','those','am','is','are',
  'was','were','be','been','being','have','has','had','having','do','does',
  'did','doing','get','make','us','also','like','well','new','use','used',
  'using','as','if','then','else','because','while','although','though',
  'since','unless','until','when','where','how','why','year','years','month',
  'months','time','way','part','level','world','day','days','result','people',
  'number','case','system','area','place','group','company','business','work',
  'working','role','position','team','please','candidate','applicant','apply',
  'application','requirements','qualifications','responsibilities','preferred',
  'required','ideal','desired','bonus','additional','looking','seeking',
  'ability','abilities','proven','across','within','strong','ensure','good',
  'high','large','small','great','next','right','based','including','related',
  'various','different','clear','full','able','any','type','key','focus',
  'specific','possible','current','similar','often','always','never','per',
  'etc','eg','ie','re','vs','etc','via','e','g','s','t','d','ll','m','ve',
  'won','don','isn','aren','wasn','weren','hasn','haven','hadn','doesn',
  'didn','couldn','wouldn','shouldn','mightn','mustn','needn'
]);

// ── ACTION VERBS ─────────────────────────────────────────────
const ACTION_VERBS = [
  'achieved','accelerated','accomplished','acquired','adapted','administered',
  'advanced','advised','analyzed','automated','boosted','built','championed',
  'collaborated','communicated','conducted','coordinated','created','delivered',
  'designed','developed','directed','drove','enabled','engineered','enhanced',
  'established','evaluated','exceeded','executed','expanded','facilitated',
  'formulated','generated','grew','guided','identified','implemented','improved',
  'increased','influenced','initiated','innovated','integrated','launched','led',
  'managed','maximized','mentored','negotiated','optimized','oversaw','partnered',
  'planned','produced','reduced','restructured','scaled','secured','simplified',
  'solved','spearheaded','streamlined','strengthened','supervised','surpassed',
  'transformed','trained','utilized','validated','conceived','cultivated',
  'defined','deployed','devised','established','exceeded','forecasted',
  'implemented','maintained','modernized','operated','orchestrated','pioneered'
];

// ── ATS SECTION HEADERS ──────────────────────────────────────
const ATS_SECTIONS = {
  experience: [
    'work experience','professional experience','employment history',
    'career history','work history','experience'
  ],
  education: [
    'education','academic background','academic history','qualifications'
  ],
  skills: [
    'technical skills','core competencies','competencies','key skills',
    'skills & expertise','skills and expertise','skills'
  ],
  summary: [
    'professional summary','career objective','professional profile',
    'executive summary','profile','summary','objective','about me'
  ]
};

// ── PDF.JS SETUP ─────────────────────────────────────────────
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

// ── TEXT UTILITIES ───────────────────────────────────────────

function normalizeText(text) {
  return text
    .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')  // rejoin hyphenated line-breaks
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function isMeaningful(word) {
  return !STOP_WORDS.has(word) && word.length > 2 && /[a-z]/.test(word);
}

// ── KEYWORD EXTRACTION ───────────────────────────────────────
/**
 * Returns top keywords from text, weighted by:
 * - single words: weight 1
 * - bigrams (both non-stop): weight 1.5
 * - trigrams (all non-stop): weight 2
 */
function extractKeywords(text, limit = 60) {
  const words = tokenize(text);
  const freq = {};

  // 1-grams
  words.filter(isMeaningful).forEach(w => {
    freq[w] = (freq[w] || 0) + 1;
  });

  // 2-grams
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i], w2 = words[i + 1];
    if (isMeaningful(w1) && isMeaningful(w2)) {
      const bg = `${w1} ${w2}`;
      freq[bg] = (freq[bg] || 0) + 1.5;
    }
  }

  // 3-grams
  for (let i = 0; i < words.length - 2; i++) {
    const w1 = words[i], w2 = words[i + 1], w3 = words[i + 2];
    if (isMeaningful(w1) && isMeaningful(w2) && isMeaningful(w3)) {
      const tg = `${w1} ${w2} ${w3}`;
      freq[tg] = (freq[tg] || 0) + 2;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([kw]) => kw);
}

// ── PDF TEXT EXTRACTION ──────────────────────────────────────
async function extractTextFromPDF(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return normalizeText(text);
}

// ── ATS CHECKS ───────────────────────────────────────────────
function runATSChecks(resumeText) {
  const lower = resumeText.toLowerCase();
  const raw   = resumeText;
  const checks = [];

  // Email
  checks.push({
    label: 'Email address present',
    pass:  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(raw),
    points: 5,
    tip: 'Include a professional email address in your contact section.'
  });

  // Phone
  checks.push({
    label: 'Phone number present',
    pass:  /(\+?1[\s.\-]?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/.test(raw),
    points: 5,
    tip: 'Add a phone number to your resume header.'
  });

  // LinkedIn
  checks.push({
    label: 'LinkedIn profile URL',
    pass:  /linkedin\.com\/in\//i.test(raw),
    points: 3,
    tip: 'Add your LinkedIn URL (e.g. linkedin.com/in/yourname).'
  });

  // Section: Experience
  checks.push({
    label: 'Work experience section',
    pass:  ATS_SECTIONS.experience.some(h => lower.includes(h)),
    points: 5,
    tip: 'Add a clearly labelled "Work Experience" or "Professional Experience" section.'
  });

  // Section: Education
  checks.push({
    label: 'Education section',
    pass:  ATS_SECTIONS.education.some(h => lower.includes(h)),
    points: 4,
    tip: 'Add an "Education" section listing your degrees and institutions.'
  });

  // Section: Skills
  checks.push({
    label: 'Skills section',
    pass:  ATS_SECTIONS.skills.some(h => lower.includes(h)),
    points: 4,
    tip: 'Add a dedicated "Skills" or "Core Competencies" section.'
  });

  // Section: Summary
  checks.push({
    label: 'Professional summary / profile',
    pass:  ATS_SECTIONS.summary.some(h => lower.includes(h)),
    points: 3,
    tip: 'Add a 2–3 sentence professional summary at the top of your resume.'
  });

  // Resume length
  const wordCount = raw.split(/\s+/).filter(w => w.length > 0).length;
  const goodLen   = wordCount >= 250 && wordCount <= 1200;
  checks.push({
    label: `Resume length — ${wordCount} words (optimal: 250–1200)`,
    pass:  goodLen,
    points: 3,
    tip: wordCount < 250
      ? 'Your resume is too short. Expand on your experience and skills.'
      : 'Consider condensing to 1–2 pages for cleaner ATS parsing.'
  });

  // Action verbs
  const foundVerbs = ACTION_VERBS.filter(v => tokenize(resumeText).includes(v));
  checks.push({
    label: `Action verbs — ${foundVerbs.length} found`,
    pass:  foundVerbs.length >= 4,
    points: 4,
    tip: 'Use strong action verbs: led, built, delivered, optimized, launched, etc.'
  });

  // Quantified achievements
  const hasNumbers = /\d+\s*(%|\$|x\b|times|million|thousand|k\b|percent)/i.test(raw)
    || /(\$|£|€)\s*\d+/.test(raw);
  checks.push({
    label: 'Quantified achievements with metrics',
    pass:  hasNumbers,
    points: 4,
    tip: 'Add specific numbers — e.g. "Grew revenue by 35%", "Managed $500K budget".'
  });

  const totalPossible = checks.reduce((s, c) => s + c.points, 0);
  const earned        = checks.filter(c => c.pass).reduce((s, c) => s + c.points, 0);
  const atsScore      = Math.round((earned / totalPossible) * 30);

  return { checks, atsScore, earned, totalPossible };
}

// ── CONTENT QUALITY SCORE (max 20 pts) ──────────────────────
function contentQualityScore(resumeText) {
  let score = 0;
  const lower     = resumeText.toLowerCase();
  const wordCount = resumeText.split(/\s+/).filter(w => w.length > 0).length;

  // Word count (5 pts)
  if (wordCount >= 300 && wordCount <= 1000) score += 5;
  else if (wordCount >= 150) score += 2;

  // Skills/tools section (5 pts)
  if (['skills','tools','technologies','competencies','proficiencies'].some(h => lower.includes(h))) {
    score += 5;
  }

  // Education section (5 pts)
  if (['education','degree','bachelor','master','university','college','diploma','certificate'].some(h => lower.includes(h))) {
    score += 5;
  }

  // Quantified achievements (5 pts)
  const quantCount = (resumeText.match(/\d+\s*(%|million|k\b|\$|x\b|times)/gi) || []).length;
  if (quantCount >= 3) score += 5;
  else if (quantCount >= 1) score += 2;

  return Math.min(20, score);
}

// ── MAIN ANALYSIS ────────────────────────────────────────────
async function analyzeResume(resumeText, jdText) {
  const jdKeywords      = extractKeywords(jdText, 60);
  const lower           = resumeText.toLowerCase();
  const matchingKeywords = jdKeywords.filter(kw => lower.includes(kw));
  const missingKeywords  = jdKeywords.filter(kw => !lower.includes(kw));

  const keywordScore  = Math.round((matchingKeywords.length / Math.max(jdKeywords.length, 1)) * 50);
  const atsResult     = runATSChecks(resumeText);
  const contentScore  = contentQualityScore(resumeText);
  const totalScore    = Math.min(100, keywordScore + atsResult.atsScore + contentScore);
  const wordCount     = resumeText.split(/\s+/).filter(w => w.length > 0).length;

  const baseResults = {
    totalScore,
    keywordScore,
    atsScore: atsResult.atsScore,
    contentScore,
    jdKeywords,
    matchingKeywords,
    missingKeywords,
    atsChecks: atsResult.checks,
    wordCount
  };

  const interviewLikelihood = calculateInterviewLikelihood(baseResults);
  const likelihoodFactors   = buildLikelihoodFactors(baseResults);

  return { ...baseResults, interviewLikelihood, likelihoodFactors };
}

// ── RECOMMENDATIONS ──────────────────────────────────────────
function buildRecommendations(results) {
  const recs = [];

  // Top missing keywords
  if (results.missingKeywords.length > 0) {
    const top = results.missingKeywords.slice(0, 6).map(k => `"${k}"`).join(', ');
    recs.push({ priority: 'high', text: `Add these missing keywords to your resume: ${top}` });
  }

  // Keyword match guidance
  if (results.keywordScore < 20) {
    recs.push({
      priority: 'high',
      text: 'Your keyword match is very low. Rewrite your bullet points to mirror the exact language used in this job description.'
    });
  } else if (results.keywordScore < 35) {
    recs.push({
      priority: 'medium',
      text: 'Improve keyword coverage by naturally weaving missing terms into your experience and skills sections.'
    });
  }

  // ATS failures
  results.atsChecks.filter(c => !c.pass).forEach(c => {
    recs.push({ priority: c.points >= 4 ? 'high' : 'medium', text: c.tip });
  });

  // Overall verdict
  if (results.totalScore >= 80) {
    recs.push({
      priority: 'success',
      text: 'Strong match! Your resume is well-aligned to this role. A few keyword additions could push the score even higher.'
    });
  } else if (results.totalScore >= 60) {
    recs.push({
      priority: 'medium',
      text: 'Good foundation — focus on adding the missing keywords and quantifying achievements to improve your score.'
    });
  } else {
    recs.push({
      priority: 'high',
      text: 'Consider rewriting your resume to specifically target this role. Tailor your experience bullet points to match the requirements language.'
    });
  }

  return recs;
}

// ── INTERVIEW LIKELIHOOD ─────────────────────────────────────
function calculateInterviewLikelihood(results) {
  const kwRate      = results.keywordScore / 50;   // 0–1
  const atsRate     = results.atsScore / 30;        // 0–1
  const contentRate = results.contentScore / 20;    // 0–1

  // Keyword match is the dominant signal; ATS & content support it
  let raw = kwRate * 0.50 + atsRate * 0.30 + contentRate * 0.20;

  // Penalise each critical ATS failure (missing email/phone = likely auto-rejected)
  const criticalFails = results.atsChecks.filter(c => !c.pass && c.points >= 5).length;
  raw = raw * Math.pow(0.80, criticalFails);

  // Map to a realistic range: 4 % (no match) → 82 % (near-perfect)
  const pct = Math.round(4 + raw * 78);
  return Math.min(82, Math.max(4, pct));
}

function buildLikelihoodFactors(results) {
  const factors = [];
  const kwRate  = results.keywordScore / 50;
  const atsPct  = Math.round((results.atsScore / 30) * 100);

  // Keyword match
  if (kwRate >= 0.65)
    factors.push({ pos: true,  text: 'Strong keyword alignment with the job description' });
  else if (kwRate >= 0.40)
    factors.push({ pos: null,  text: 'Moderate keyword match — weaving in more JD terms will help' });
  else
    factors.push({ pos: false, text: 'Low keyword overlap — resume language doesn\'t mirror this JD' });

  // ATS
  if (atsPct >= 75)
    factors.push({ pos: true,  text: 'ATS-friendly format — likely to pass automated screening' });
  else if (atsPct >= 50)
    factors.push({ pos: null,  text: 'Partial ATS compatibility — some formatting issues detected' });
  else
    factors.push({ pos: false, text: 'Poor ATS compatibility — may be filtered before a human sees it' });

  // Contact info
  const emailOk = results.atsChecks.find(c => c.label.startsWith('Email'))?.pass;
  const phoneOk = results.atsChecks.find(c => c.label.startsWith('Phone'))?.pass;
  if (emailOk && phoneOk)
    factors.push({ pos: true, text: 'Contact information is present and complete' });
  else
    factors.push({ pos: false, text: 'Missing email or phone number — fix this before applying' });

  // Quantified achievements
  const hasMetrics = results.atsChecks.find(c => c.label.startsWith('Quantified'))?.pass;
  if (hasMetrics)
    factors.push({ pos: true,  text: 'Quantified achievements make your impact clear to recruiters' });
  else
    factors.push({ pos: false, text: 'No metrics found — add numbers to make your impact concrete' });

  // Summary
  const hasSummary = results.atsChecks.find(c => c.label.startsWith('Professional summary'))?.pass;
  if (hasSummary)
    factors.push({ pos: true,  text: 'Professional summary gives recruiters an immediate snapshot' });
  else
    factors.push({ pos: null,  text: 'A professional summary at the top improves recruiter attention' });

  return factors.slice(0, 5);
}

// ── RENDER HELPERS ────────────────────────────────────────────
function scoreColor(s)  { return s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : '#EF4444'; }
function atsColor(p)    { return p >= 80 ? 'green'   : p >= 55  ? 'yellow'  : 'red';    }
function atsIcon(p)     { return p >= 80 ? '✓'       : p >= 55  ? '~'       : '✗';      }
function atsStatusText(p){return p >= 80 ? 'ATS Friendly' : p >= 55 ? 'Mostly ATS Friendly' : 'Not ATS Optimized'; }

function scoreLabel(s) {
  if (s >= 85) return 'Excellent Match';
  if (s >= 70) return 'Good Match';
  if (s >= 55) return 'Fair Match';
  if (s >= 40) return 'Needs Work';
  return 'Poor Match';
}

function chips(keywords, cls, max = 30) {
  if (!keywords.length) {
    return '<p style="color:var(--text-muted);font-size:0.82rem;margin-top:0.25rem;">None found</p>';
  }
  return keywords
    .slice(0, max)
    .map(k => `<span class="chip chip--${cls}">${k}</span>`)
    .join('');
}

// ── RENDER RESULTS ────────────────────────────────────────────
function renderResults(results) {
  const color  = scoreColor(results.totalScore);
  const label  = scoreLabel(results.totalScore);
  const recs   = buildRecommendations(results);
  const atsPct = Math.round((results.atsScore / 30) * 100);
  const C      = +(2 * Math.PI * 54).toFixed(3);            // SVG circumference r=54
  const target = +(C - (results.totalScore / 100) * C).toFixed(3);

  const kwPct  = Math.round((results.keywordScore  / 50) * 100);
  const atsBPct= Math.round((results.atsScore      / 30) * 100);
  const ctPct  = Math.round((results.contentScore  / 20) * 100);

  return /* html */`
    <!-- ── HEADER ── -->
    <div class="results-header">
      <h2 class="results-title">Analysis Complete</h2>
      <p class="results-subtitle">Based on keyword matching, ATS compatibility, and content quality</p>
    </div>

    <!-- ── OVERVIEW ── -->
    <div class="overview-grid">

      <div class="score-card">
        <svg class="ring-svg" viewBox="0 0 120 120" aria-label="Score: ${results.totalScore} out of 100">
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
          <circle
            class="ring-progress"
            cx="60" cy="60" r="54"
            fill="none"
            stroke="${color}"
            stroke-width="10"
            stroke-dasharray="${C}"
            stroke-dashoffset="${C}"
            stroke-linecap="round"
            transform="rotate(-90 60 60)"
            data-target="${target}"
          />
          <text x="60" y="53" text-anchor="middle" fill="${color}"
            font-size="26" font-weight="700" font-family="Inter,sans-serif">${results.totalScore}</text>
          <text x="60" y="68" text-anchor="middle" fill="rgba(240,244,255,0.38)"
            font-size="11" font-family="Inter,sans-serif">/100</text>
        </svg>

        <div class="score-meta">
          <div class="score-badge" style="color:${color};border-color:${color}33;background:${color}11">${label}</div>
          <p class="score-desc">Overall Compatibility Score</p>

          <div class="sub-scores">
            <div class="sub-score">
              <span class="ss-label">Keywords</span>
              <div class="ss-track">
                <div class="ss-fill" style="background:${color}" data-w="${kwPct}"></div>
              </div>
              <span class="ss-val">${results.keywordScore}<em>/50</em></span>
            </div>
            <div class="sub-score">
              <span class="ss-label">ATS</span>
              <div class="ss-track">
                <div class="ss-fill" style="background:#3B82F6" data-w="${atsBPct}"></div>
              </div>
              <span class="ss-val">${results.atsScore}<em>/30</em></span>
            </div>
            <div class="sub-score">
              <span class="ss-label">Content</span>
              <div class="ss-track">
                <div class="ss-fill" style="background:#7C3AED" data-w="${ctPct}"></div>
              </div>
              <span class="ss-val">${results.contentScore}<em>/20</em></span>
            </div>
          </div>
        </div>
      </div>

      <div class="ats-overview ats-overview--${atsColor(atsPct)}">
        <div class="ats-big-icon">${atsIcon(atsPct)}</div>
        <div>
          <div class="ats-big-label">${atsStatusText(atsPct)}</div>
          <div class="ats-big-sub">
            ${atsPct}% of ATS checks passed<br>
            Resume: ${results.wordCount.toLocaleString()} words
          </div>
        </div>
      </div>

    </div><!-- /overview-grid -->

    <!-- ── INTERVIEW LIKELIHOOD ── -->
    ${(() => {
      const pct   = results.interviewLikelihood;
      const lColor = pct >= 65 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
      const lLabel = pct >= 75 ? 'Very Likely'
                   : pct >= 55 ? 'Likely'
                   : pct >= 35 ? 'Possible'
                   : pct >= 20 ? 'Unlikely'
                   : 'Very Unlikely';
      const lDesc  = pct >= 75
        ? 'Strong candidate. Recruiters are likely to reach out for this role.'
        : pct >= 55
        ? 'Solid application. A few improvements could push you to the top of the pile.'
        : pct >= 35
        ? 'There\'s a chance, but the resume needs better alignment with this specific role.'
        : 'The gap between your resume and this role is significant — consider a targeted rewrite.';
      const factors = results.likelihoodFactors;

      return /* html */`
      <div class="section-block likelihood-card">
        <h3 class="block-title">Interview Call Likelihood</h3>
        <div class="likelihood-inner">

          <div class="likelihood-left">
            <div class="likelihood-pct" style="color:${lColor}">${pct}%</div>
            <div class="likelihood-label" style="color:${lColor};border-color:${lColor}33;background:${lColor}11">${lLabel}</div>
            <div class="likelihood-bar-wrap">
              <div class="likelihood-bar-track">
                <div class="likelihood-bar-fill" style="background:${lColor}" data-w="${pct}"></div>
              </div>
              <div class="likelihood-bar-ends">
                <span>0%</span><span>100%</span>
              </div>
            </div>
            <p class="likelihood-desc">${lDesc}</p>
          </div>

          <div class="likelihood-right">
            <div class="likelihood-factors-title">Key factors</div>
            <div class="likelihood-factors">
              ${factors.map(f => `
                <div class="lf-row lf-row--${f.pos === true ? 'pos' : f.pos === false ? 'neg' : 'neu'}">
                  <span class="lf-icon">${f.pos === true ? '✓' : f.pos === false ? '✗' : '~'}</span>
                  <span class="lf-text">${f.text}</span>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      </div>
      `;
    })()}

    <!-- ── KEYWORDS ── -->
    <div class="section-block">
      <h3 class="block-title">Keyword Analysis</h3>
      <div class="kw-grid">

        <div class="kw-panel kw-panel--match">
          <div class="kw-panel-head">
            <span class="kw-icon match-icon">✓</span>
            <div>
              <div class="kw-panel-title">Matching Keywords</div>
              <div class="kw-panel-count">${results.matchingKeywords.length} found in your resume</div>
            </div>
          </div>
          <div class="chip-container">${chips(results.matchingKeywords, 'match')}</div>
        </div>

        <div class="kw-panel kw-panel--missing">
          <div class="kw-panel-head">
            <span class="kw-icon missing-icon">✗</span>
            <div>
              <div class="kw-panel-title">Missing Keywords</div>
              <div class="kw-panel-count">${results.missingKeywords.length} not found — add these</div>
            </div>
          </div>
          <div class="chip-container">${chips(results.missingKeywords, 'missing')}</div>
        </div>

        <div class="kw-panel kw-panel--jd">
          <div class="kw-panel-head">
            <span class="kw-icon jd-icon">◉</span>
            <div>
              <div class="kw-panel-title">All Job Keywords</div>
              <div class="kw-panel-count">${results.jdKeywords.length} extracted from job description</div>
            </div>
          </div>
          <div class="chip-container">${chips(results.jdKeywords, 'jd')}</div>
        </div>

      </div>
    </div>

    <!-- ── ATS CHECKS ── -->
    <div class="section-block">
      <h3 class="block-title">ATS Compatibility Breakdown</h3>
      <div class="ats-list">
        ${results.atsChecks.map(c => `
          <div class="ats-row ${c.pass ? 'ats-row--pass' : 'ats-row--fail'}">
            <span class="ats-row-icon">${c.pass ? '✓' : '✗'}</span>
            <span class="ats-row-label">${c.label}</span>
            <span class="ats-row-pts">+${c.points} pts</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- ── RECOMMENDATIONS ── -->
    <div class="section-block">
      <h3 class="block-title">Recommendations</h3>
      <div class="rec-list">
        ${recs.map(r => `
          <div class="rec-item rec-item--${r.priority}">
            <span class="rec-icon">${r.priority === 'success' ? '✓' : r.priority === 'high' ? '!' : '→'}</span>
            <span>${r.text}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── DOM / EVENT WIRING ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const $  = id => document.getElementById(id);

  const resumeUpload  = $('resume-upload');
  const resumeTextEl  = $('resume-text');
  const dropzone      = $('resume-dropzone');
  const fileStatus    = $('file-status');
  const jdTextEl      = $('job-description');
  const analyzeBtn    = $('analyze-btn');
  const clearBtn      = $('clear-btn');
  const tabUpload     = $('tab-upload');
  const tabPaste      = $('tab-paste');
  const uploadPanel   = $('upload-panel');
  const pastePanel    = $('paste-panel');
  const resumeCount   = $('resume-char-count');
  const jdCount       = $('jd-char-count');
  const resultsEl     = $('results-section');
  const errorEl       = $('error-msg');

  let uploadedText = '';
  let activeTab    = 'upload';

  // ── TABS ──
  tabUpload.addEventListener('click', () => {
    activeTab = 'upload';
    tabUpload.classList.add('active');
    tabPaste.classList.remove('active');
    uploadPanel.style.display = 'block';
    pastePanel.style.display  = 'none';
  });

  tabPaste.addEventListener('click', () => {
    activeTab = 'paste';
    tabPaste.classList.add('active');
    tabUpload.classList.remove('active');
    uploadPanel.style.display = 'none';
    pastePanel.style.display  = 'block';
  });

  // ── FILE UPLOAD ──
  resumeUpload.addEventListener('change', async e => {
    if (e.target.files[0]) await handleFile(e.target.files[0]);
  });

  dropzone.addEventListener('click', () => resumeUpload.click());

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

  dropzone.addEventListener('drop', async e => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) await handleFile(e.dataTransfer.files[0]);
  });

  async function handleFile(file) {
    setFileStatus('loading', `Reading ${file.name}…`);
    try {
      if (file.type === 'application/pdf') {
        uploadedText = await extractTextFromPDF(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        uploadedText = await file.text();
        uploadedText = normalizeText(uploadedText);
      } else {
        setFileStatus('error', 'Unsupported file. Please upload a PDF or TXT file.');
        return;
      }
      const wc = uploadedText.split(/\s+/).filter(w => w.length > 0).length;
      setFileStatus('success', `✓ ${file.name} — ${wc.toLocaleString()} words extracted`);
    } catch (err) {
      setFileStatus('error', 'Could not read the file. Try the "Paste Text" tab instead.');
      console.error('[ResumeAnalyzer] PDF parse error:', err);
    }
  }

  function setFileStatus(type, msg) {
    fileStatus.textContent = msg;
    fileStatus.className   = `file-status file-status--${type}`;
    fileStatus.style.display = 'block';
  }

  // ── CHAR COUNTS ──
  resumeTextEl.addEventListener('input', () => {
    resumeCount.textContent = `${resumeTextEl.value.length.toLocaleString()} characters`;
  });

  jdTextEl.addEventListener('input', () => {
    jdCount.textContent = `${jdTextEl.value.length.toLocaleString()} characters`;
  });

  // ── ANALYZE ──
  analyzeBtn.addEventListener('click', async () => {
    const resume = activeTab === 'upload' ? uploadedText : resumeTextEl.value.trim();
    const jd     = jdTextEl.value.trim();

    if (!resume)           return showError('Please upload your resume or paste it in the text tab.');
    if (resume.length < 80) return showError('Resume content is too short — please provide the full text.');
    if (!jd)               return showError('Please paste the job description.');
    if (jd.length < 50)    return showError('Job description is too short — paste the full posting for best results.');

    hideError();
    analyzeBtn.disabled    = true;
    analyzeBtn.textContent = 'Analyzing…';
    resultsEl.style.display = 'none';

    try {
      const results = await analyzeResume(resume, jd);
      resultsEl.innerHTML    = renderResults(results);
      resultsEl.style.display = 'block';
      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Animate score ring + sub-score bars after paint
      requestAnimationFrame(() => {
        setTimeout(() => {
          const ring = document.querySelector('.ring-progress');
          if (ring) ring.style.strokeDashoffset = ring.getAttribute('data-target');

          document.querySelectorAll('.ss-fill[data-w], .likelihood-bar-fill[data-w]').forEach(el => {
            el.style.width = el.getAttribute('data-w') + '%';
          });
        }, 80);
      });
    } catch (err) {
      showError('Analysis failed — please try again.');
      console.error('[ResumeAnalyzer] Analysis error:', err);
    } finally {
      analyzeBtn.disabled    = false;
      analyzeBtn.textContent = 'Analyze Resume';
    }
  });

  // ── CLEAR ──
  clearBtn.addEventListener('click', () => {
    uploadedText          = '';
    resumeTextEl.value    = '';
    jdTextEl.value        = '';
    resumeUpload.value    = '';
    resumeCount.textContent = '0 characters';
    jdCount.textContent     = '0 characters';
    fileStatus.style.display  = 'none';
    resultsEl.style.display   = 'none';
    resultsEl.innerHTML       = '';
    hideError();
  });

  function showError(msg) {
    errorEl.textContent   = msg;
    errorEl.style.display = 'block';
  }

  function hideError() {
    errorEl.style.display = 'none';
  }
});
