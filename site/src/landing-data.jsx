// Series-wide data for the landing page.

// Note: "The Atmosphere" was COMING (#04 Extreme Weather) until 22 May 2026.
// It just shipped — it's now the new LIVE hero in the bento.
const ISSUES_LIVE = [
  {
    n: '04', slug: 'atmosphere',
    title: 'The Atmosphere',
    eyebrow: 'Newly live · May 22, 2026',
    quote: '\u201CWe built communities on about 100 years of past weather and assumed that was a good guide going forward. That assumption is starting to break.\u201D',
    blurb: '125 years of daily station data from across the continent. The strangest day for any place you can name. Whether \u201Conce a century\u201D still means once a century.',
    stats: [
      ['12,847', 'STATIONS'],
      ['125', 'YEARS'],
      ['+2.34\u00B0F', 'TODAY VS BASELINE'],
      ['7.9\u03C3', 'PORTLAND, 06/2021'],
    ],
    href: 'https://uap-corpus.pages.dev',
    viz: 'anomaly-bars',
    discovery: 'Portland, OR \u00B7 116\u00B0F \u00B7 nine degrees beyond any prior record',
    refreshed: '14 days ago',
    hero: true,
  },
  {
    n: '01', slug: 'ufo',
    title: 'UFO Witness Reports',
    blurb: '112,000 NUFORC narratives treated as a sociolinguistic corpus. Vocabulary tracks culture. Independent witnesses converge. 30 archetypes emerge.',
    stats: [['111,961', 'REPORTS'], ['118', 'YEARS'], ['10/10', 'VALIDATION']],
    viz: 'cluster-dots',
    discovery: 'Phoenix Lights \u00B7 Mar 13 1997 \u00B7 7-state simultaneous report',
    refreshed: '6 weeks ago',
    href: 'https://ufo.onehundredyears.report',
  },
  {
    n: '02', slug: 'names',
    title: 'American Names',
    blurb: 'Every name is a cultural wave. 104,000 names across 144 years. Rise, peak, decay \u2014 a shape that encodes cultural information invisible to people living through it.',
    stats: [['104,819', 'NAMES'], ['144', 'YEARS'], ['12/18', 'TRIGGERS']],
    viz: 'name-waves',
    discovery: 'Mildred \u00B7 peaked 1912 at 4,200/yr \u00B7 zero by 1988',
    refreshed: '11 weeks ago',
    href: 'https://hundred-years-names.pages.dev',
  },
  {
    n: '03', slug: 'color-line',
    title: 'The Color Line',
    blurb: 'The barrier held for forty-seven years. 2,300+ Negro Leagues careers, finally counted. A civil rights document written in statistics.',
    stats: [['2,300+', 'CAREERS'], ['47', 'YEARS'], ['1947', 'THE BREACH']],
    viz: 'breach-line',
    discovery: 'Robinson \u00B7 Ebbets Field \u00B7 Apr 15 1947 \u00B7 the line moves',
    refreshed: '7 months ago',
    href: 'https://colorline.onehundredyears.report',
  },
];

const ISSUES_COMING = [
  {
    n: '05', title: 'American Homicide',
    blurb: 'The 1990s crime drop is one of the most dramatic shifts in any dataset. Almost nobody knows what the 1970s actually looked like.',
    teaser: 'Per-capita rate, 1900\u20132024 \u00B7 3,144 counties',
    stage: 'modeling',
    viz: 'declining',
  },
  {
    n: '06', title: 'Disaster Declarations',
    blurb: 'Some counties have been declared disaster areas 40+ times. The map of repeat exposure is not the map most people carry in their heads.',
    teaser: 'FEMA declaration density \u00B7 1953\u20132025',
    stage: 'modeling',
    viz: 'rising-bars',
  },
  {
    n: '07', title: 'Immigration',
    blurb: 'The 1924 cutoff shows up as a hard wall in the data. The 1965 act shows up as a detonation.',
    teaser: 'Country-of-origin flows \u00B7 1820\u20132024',
    stage: 'research',
    viz: 'cliffs',
  },
  {
    n: '08', title: 'American Prisons',
    blurb: 'The 1980s show up as a vertical line. Some states look like different countries. State trajectory clustering reveals divergent paths.',
    teaser: 'Incarceration rate by state \u00B7 1925\u20132024',
    stage: 'build',
    viz: 'rising-line',
  },
  {
    n: '09', title: 'Aviation Incidents',
    blurb: 'The fatality rate in 1938 vs. today barely fits on the same chart. The remaining risks cluster in patterns that are immediately visible.',
    teaser: 'NTSB \u00B7 per-million-flights \u00B7 1926\u20132024',
    stage: 'research',
    viz: 'falling',
  },
  {
    n: '10', title: 'Epidemics & Outbreaks',
    blurb: 'From the 1918 flu to COVID. How fast institutions respond \u2014 and how that response lag changed over a century.',
    teaser: 'Reporting lag \u00B7 pathogen \u00B7 response curve',
    stage: 'research',
    viz: 'spikes',
  },
];

// Rotating evidence moments — one per LIVE issue.
const EVIDENCE = [
  {
    date: 'March 13, 1997',
    place: 'Phoenix, AZ + seven states',
    quote: 'Witnesses in seven states, separated by hundreds of miles, independently described the same V-shaped craft passing overhead in silence.',
    source: 'NUFORC narrative archive \u00B7 archetype-clustered',
    issue: 'UFO Witness Reports',
    n: '01',
    slug: 'ufo',
  },
  {
    date: 'April 15, 1947',
    place: 'Ebbets Field, Brooklyn',
    quote: 'Jackie Robinson took the field. A line drawn forty-seven years earlier began to move. By 1959, every team had integrated. The data records the moment, and the speed.',
    source: 'Negro Leagues career database \u00B7 2,300+ careers',
    issue: 'The Color Line',
    n: '03',
    slug: 'color-line',
  },
  {
    date: 'June 28, 2021',
    place: 'Portland International Airport',
    quote: 'The temperature reached 116\u00B0F \u2014 nine degrees beyond any prior all-time record. The fitted distribution assigns this observation a probability that rounds to zero.',
    source: 'GHCN-Daily \u00B7 M1 station anomaly engine',
    issue: 'The Atmosphere',
    n: '04',
    slug: 'atmosphere',
  },
  {
    date: 'October 1912',
    place: 'United States \u00B7 Social Security cohorts',
    quote: 'The name Mildred peaked at 4,200 newborn girls. By 1988, there were none. The decay curve fits the same shape as a radioactive isotope.',
    source: 'SSA name records \u00B7 1880 onward',
    issue: 'American Names',
    n: '02',
    slug: 'names',
  },
];

// Build date / volume meta
const VOL_META = {
  total: 10,
  live: 4,
  inProgress: 6,
  updated: '22 MAY 2026 \u00B7 18:42Z',
  version: 'VOL. III',
};

const STAGES = ['RESEARCH', 'MODELING', 'BUILD', 'LIVE'];
function stageIndex(s) {
  return ({ research: 0, modeling: 1, build: 2, live: 3 })[s] ?? 0;
}

Object.assign(window, { ISSUES_LIVE, ISSUES_COMING, EVIDENCE, VOL_META, STAGES, stageIndex });
