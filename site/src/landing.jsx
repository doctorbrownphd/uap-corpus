// Landing page — assembled.

function Landing() {
  const onPickEvidence = (slug) => {
    const issue = window.ISSUES_LIVE.find(i => i.slug === slug);
    if (issue && issue.href) window.location.href = issue.href;
  };

  const live = window.ISSUES_LIVE;
  const hero = live.find(i => i.hero);
  const others = live.filter(i => !i.hero);

  const gridAreas = `
    "hero hero hero hero hero hero la la la lb lb lb"
    "hero hero hero hero hero hero lc lc lc lc lc lc"
    "c1 c1 c1 c2 c2 c2 c3 c3 c3 c4 c4 c4"
    "c5 c5 c5 c5 c6 c6 c6 c6 man man man man"
  `;

  return (
    <div style={{ minHeight: '100vh' }}>
      <LandingHero onPickEvidence={onPickEvidence} />

      {/* Index header */}
      <div id="archive" style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '48px 56px 24px', borderTop: '1px solid #1B2740', marginTop: 4,
      }}>
        <div>
          <div className="mono" style={{
            color: '#C9A84C', fontSize: 11, letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 700,
          }}>
            ▌ The archive · ten issues
          </div>
          <div className="serif" style={{
            color: '#E6ECF2', fontSize: 38, marginTop: 8, fontWeight: 300, letterSpacing: -0.8, fontStyle: 'italic',
          }}>
            What the historical record can finally answer.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <FilterPill active>All</FilterPill>
          <FilterPill>Live</FilterPill>
          <FilterPill>In progress</FilterPill>
        </div>
      </div>

      {/* Bento grid */}
      <div style={{
        padding: '0 56px 64px',
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridTemplateRows: '300px 240px 240px 240px',
        gridTemplateAreas: gridAreas,
        gap: 12,
      }}>
        <HeroIssueCard issue={hero} />

        {/* 3 other LIVE */}
        <LiveIssueCard issue={others[0]} area="la / la / la / la" />
        <LiveIssueCard issue={others[1]} area="lb / lb / lb / lb" />
        <LiveIssueCard issue={others[2]} area="lc / lc / lc / lc" />

        {/* 6 COMING */}
        {window.ISSUES_COMING.map((c, i) => (
          <ComingIssueCard key={c.n} issue={c} area={`c${i + 1}`} />
        ))}

        <ManifestoCard area="man" />
      </div>

      {/* Content sections */}
      <LandingSections />

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}

// ===================== Content sections =====================

function SectionHeader({ id, label, title }) {
  return (
    <div id={id} style={{ marginBottom: 28 }}>
      <div className="mono" style={{
        color: '#C9A84C', fontSize: 11, letterSpacing: 0.3,
        textTransform: 'uppercase', fontWeight: 700,
      }}>
        ▌ {label}
      </div>
      {title && (
        <div className="serif" style={{
          color: '#E6ECF2', fontSize: 32, marginTop: 8, fontWeight: 300,
          letterSpacing: -0.6, fontStyle: 'italic',
        }}>
          {title}
        </div>
      )}
    </div>
  );
}

function SectionBlock({ children, border = true }) {
  return (
    <div style={{
      padding: '48px 56px',
      borderTop: border ? '1px solid #1B2740' : 'none',
    }}>
      {children}
    </div>
  );
}

function LandingSections() {
  return (
    <React.Fragment>
      {/* ── About ── */}
      <SectionBlock>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
          <div>
            <SectionHeader id="about" label="About the project" title="Why this exists." />
            <div className="serif" style={{ color: '#8BAFC7', fontSize: 15, lineHeight: 1.7, maxWidth: 560 }}>
              One Hundred Years is an independent research and visualization project.
              Each issue takes a single dataset — one that spans at least a century of
              American life — and asks what patterns become visible only at that scale.
            </div>
            <div className="serif" style={{ color: '#8BAFC7', fontSize: 15, lineHeight: 1.7, marginTop: 16, maxWidth: 560 }}>
              The project is built by one person. There is no newsroom, no institution,
              no funding. The work is its own justification. Every dataset is public.
              Every methodology is published. Every line of code is open.
            </div>
            <div className="serif" style={{ color: '#8BAFC7', fontSize: 15, lineHeight: 1.7, marginTop: 16, maxWidth: 560 }}>
              The name comes from the conviction that a century of data is enough to
              see things that are invisible at shorter timescales — and that most of
              these datasets have never been visualized with the care they deserve.
            </div>
          </div>
          <div>
            <SectionHeader id="press" label="Press & contact" />
            <div className="serif" style={{ color: '#8BAFC7', fontSize: 15, lineHeight: 1.7, maxWidth: 520 }}>
              For press inquiries, interviews, or collaboration proposals:
            </div>
            <div className="mono" style={{
              color: '#E6ECF2', fontSize: 13, marginTop: 16,
              padding: '16px 20px', border: '1px solid #1B2740',
              background: 'rgba(15,20,33,0.5)',
            }}>
              hello@onehundredyears.report
            </div>
            <div className="serif" style={{ color: '#4E6A82', fontSize: 13, lineHeight: 1.6, marginTop: 16 }}>
              You are free to excerpt, quote, and embed any visualization from this
              project with attribution. Formal citation format is below.
            </div>
          </div>
        </div>
      </SectionBlock>

      {/* ── Methodology ── */}
      <SectionBlock>
        <SectionHeader id="methodology" label="Methodology" title="How the analysis works." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 8 }}>
          <MethodCard
            code="M1"
            name="Station Anomaly Engine"
            desc="Per-station daily anomalies computed against a 1901–2000 baseline. Each station's record is cleaned, gap-filled where coverage allows, and scored against its own historical distribution. No interpolation between stations."
            issues="The Atmosphere"
          />
          <MethodCard
            code="M2"
            name="Corpus Linguistics Pipeline"
            desc="TF-IDF temporal windowing, UMAP dimensionality reduction, HDBSCAN clustering. Vocabulary tracked per-decade. Semantic similarity scored via sentence embeddings. Archetype discovery via narrative structure templates."
            issues="UFO Witness Reports"
          />
          <MethodCard
            code="M3"
            name="Cultural Signal Detection"
            desc="Name frequency time series modeled as rise-peak-decay curves. Half-life extraction, contagion modeling, and cross-name correlation. Trigger event detection via changepoint analysis on first-derivative signals."
            issues="American Names"
          />
        </div>
        <div className="serif" style={{
          color: '#4E6A82', fontSize: 13, lineHeight: 1.6, marginTop: 24,
          maxWidth: 700, fontStyle: 'italic',
        }}>
          Each issue publishes its own methodology tab with full technical detail,
          known limitations, and confidence ratings. The methods listed here are summaries.
        </div>
      </SectionBlock>

      {/* ── Sources ── */}
      <SectionBlock>
        <SectionHeader id="sources" label="Data sources" title="Where the data comes from." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: 8 }}>
          <SourceRow name="GHCN-Daily" provider="NOAA / NCEI" records="~12,847 stations" issue="04 · The Atmosphere" />
          <SourceRow name="NUFORC Narrative Archive" provider="National UFO Reporting Center" records="111,961 reports" issue="01 · UFO Witness Reports" />
          <SourceRow name="SSA Baby Names" provider="Social Security Administration" records="104,819 names" issue="02 · American Names" />
          <SourceRow name="Negro Leagues Database" provider="Seamheads / Baseball Reference" records="2,300+ careers" issue="03 · The Color Line" />
          <SourceRow name="FBI UCR / SHR" provider="FBI / BJS" records="1900–2024" issue="05 · American Homicide" coming />
          <SourceRow name="FEMA Declarations" provider="FEMA / OpenFEMA" records="1953–2025" issue="06 · Disaster Declarations" coming />
          <SourceRow name="INS / DHS Yearbooks" provider="DHS / Census" records="1820–2024" issue="07 · Immigration" coming />
          <SourceRow name="BJS Prisoners Series" provider="Bureau of Justice Statistics" records="1925–2024" issue="08 · American Prisons" coming />
          <SourceRow name="NTSB Aviation Database" provider="NTSB" records="1926–2024" issue="09 · Aviation Incidents" coming />
          <SourceRow name="WHO / CDC MMWR" provider="WHO / CDC" records="1918–2025" issue="10 · Epidemics" coming />
        </div>
      </SectionBlock>

      {/* ── Open / License / Data / Cite ── */}
      <SectionBlock>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 48 }}>
          <div>
            <SectionHeader id="license" label="License" />
            <div className="serif" style={{ color: '#8BAFC7', fontSize: 15, lineHeight: 1.7 }}>
              All source code is released under the <strong style={{ color: '#E6ECF2' }}>MIT License</strong>.
              Original datasets and derived data files are released under <strong style={{ color: '#E6ECF2' }}>CC0 1.0</strong> (public domain).
            </div>
            <div className="serif" style={{ color: '#4E6A82', fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
              You may use, modify, and redistribute any part of this project
              for any purpose, including commercial use, without asking permission.
            </div>
          </div>
          <div>
            <SectionHeader id="data" label="Raw data" />
            <div className="serif" style={{ color: '#8BAFC7', fontSize: 15, lineHeight: 1.7 }}>
              Cleaned datasets for each live issue are available in the project's
              GitHub repository under <code className="mono" style={{
                color: '#E6ECF2', fontSize: 12, background: 'rgba(36,51,83,0.5)',
                padding: '2px 6px',
              }}>data/</code>.
            </div>
            <a href="https://github.com/doctorbrownphd" target="_blank" rel="noopener" className="mono" style={{
              display: 'inline-block', marginTop: 16,
              color: '#C9A84C', fontSize: 11, letterSpacing: 0.2,
              textTransform: 'uppercase', fontWeight: 700,
              textDecoration: 'none', borderBottom: '1px solid #C9A84C',
              paddingBottom: 1,
            }}>
              Browse on GitHub →
            </a>
          </div>
          <div>
            <SectionHeader id="cite" label="How to cite" />
            <div style={{
              padding: '16px 20px', border: '1px solid #1B2740',
              background: 'rgba(15,20,33,0.5)', marginTop: 4,
            }}>
              <div className="mono" style={{ color: '#E6ECF2', fontSize: 11.5, lineHeight: 1.7, wordBreak: 'break-word' }}>
                Haynes, J. (2026). <em style={{ color: '#C9A84C' }}>One Hundred Years: [Issue Title]</em>.
                onehundredyears.report. Retrieved [date].
              </div>
            </div>
            <div className="serif" style={{ color: '#4E6A82', fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
              Replace [Issue Title] with the specific issue name and [date]
              with your access date. BibTeX available in each issue's methodology tab.
            </div>
          </div>
        </div>
      </SectionBlock>

      {/* ── Newsletter ── */}
      <SectionBlock>
        <div id="newsletter" style={{
          border: '1px solid #C9A84C66',
          background: 'linear-gradient(135deg, rgba(201,168,76,0.04), rgba(11,16,25,0.4))',
          padding: '40px 48px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 48,
        }}>
          <div style={{ maxWidth: 560 }}>
            <div className="mono" style={{
              color: '#C9A84C', fontSize: 11, letterSpacing: 0.3,
              textTransform: 'uppercase', fontWeight: 700, marginBottom: 12,
            }}>
              ▌ Dispatches
            </div>
            <div className="serif" style={{
              color: '#E6ECF2', fontSize: 26, fontWeight: 300,
              letterSpacing: -0.4, fontStyle: 'italic', lineHeight: 1.3,
            }}>
              Get notified when a new issue goes live.
            </div>
            <div className="serif" style={{ color: '#8BAFC7', fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
              No spam. No tracking pixels. One email per issue — roughly every
              few months. Unsubscribe anytime.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
            <input type="email" placeholder="you@example.com" className="mono" style={{
              background: 'rgba(11,16,25,0.8)', border: '1px solid #243353',
              borderRight: 'none', color: '#E6ECF2', padding: '14px 20px',
              fontSize: 12, letterSpacing: 0.1, width: 280,
              fontFamily: "'Space Mono', monospace",
              outline: 'none',
            }} />
            <button className="mono" style={{
              background: '#C9A84C', color: '#0B1019', border: '1px solid #C9A84C',
              padding: '14px 24px', fontSize: 11, letterSpacing: 0.25,
              textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Space Mono', monospace",
            }}>
              Subscribe
            </button>
          </div>
        </div>
      </SectionBlock>
    </React.Fragment>
  );
}

function MethodCard({ code, name, desc, issues }) {
  return (
    <div style={{
      border: '1px solid #1B2740', padding: '24px',
      background: 'rgba(15,20,33,0.5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <span className="mono" style={{
          color: '#C9A84C', fontSize: 18, fontWeight: 700, letterSpacing: -0.3,
        }}>{code}</span>
        <span className="mono" style={{
          color: '#E6ECF2', fontSize: 12, fontWeight: 700, letterSpacing: 0.1,
          textTransform: 'uppercase',
        }}>{name}</span>
      </div>
      <div className="serif" style={{ color: '#8BAFC7', fontSize: 13.5, lineHeight: 1.6 }}>
        {desc}
      </div>
      <div className="mono" style={{
        color: '#4E6A82', fontSize: 10, letterSpacing: 0.15, textTransform: 'uppercase',
        marginTop: 14, paddingTop: 12, borderTop: '1px solid #1B2740',
      }}>
        Used in · {issues}
      </div>
    </div>
  );
}

function SourceRow({ name, provider, records, issue, coming }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 18px', border: '1px solid ' + (coming ? '#243353' : '#1B2740'),
      borderStyle: coming ? 'dashed' : 'solid',
      background: 'rgba(15,20,33,0.4)',
    }}>
      <div style={{ flex: 1 }}>
        <div className="mono" style={{
          color: coming ? '#8BAFC7' : '#E6ECF2', fontSize: 12, fontWeight: 700,
          letterSpacing: 0.05,
        }}>{name}</div>
        <div className="mono" style={{
          color: '#4E6A82', fontSize: 10, letterSpacing: 0.12, marginTop: 3,
        }}>{provider}</div>
      </div>
      <div className="mono" style={{
        color: '#8BAFC7', fontSize: 11, letterSpacing: 0.05, textAlign: 'right',
        minWidth: 100,
      }}>{records}</div>
      <div className="mono" style={{
        color: coming ? '#4E6A82' : '#C9A84C', fontSize: 10, letterSpacing: 0.15,
        textTransform: 'uppercase', textAlign: 'right', minWidth: 160,
      }}>{issue}</div>
    </div>
  );
}

function FilterPill({ active, children }) {
  return (
    <button className="mono" style={{
      background: active ? '#C9A84C' : 'transparent',
      color: active ? '#0B1019' : '#8BAFC7',
      border: '1px solid ' + (active ? '#C9A84C' : '#243353'),
      padding: '7px 14px', fontSize: 10, letterSpacing: 0.2, textTransform: 'uppercase',
      cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontWeight: active ? 700 : 400,
    }}>{children}</button>
  );
}

function LandingFooter() {
  return (
    <footer style={{
      padding: '36px 56px 60px', borderTop: '1px solid #1B2740',
      background: 'rgba(11,16,25,0.6)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 40 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>
          <Wordmark size={0.5} />
          <div style={{ borderLeft: '1px solid #1B2740', paddingLeft: 22, paddingTop: 4 }}>
            <div className="serif" style={{ color: '#E6ECF2', fontSize: 14, lineHeight: 1.5, maxWidth: 420, fontStyle: 'italic' }}>
              An independent research project. No ads, no tracking, no paywall.
              Data and code under MIT.
            </div>
            <div className="mono" style={{ color: '#4E6A82', fontSize: 10, marginTop: 14, letterSpacing: 0.18, textTransform: 'uppercase' }}>
              Reach · hello@onehundredyears.report
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 40 }}>
          <FooterColumn title="Issues">
            <FooterLink href="https://ufo.onehundredyears.report">01 · UFO Witness Reports</FooterLink>
            <FooterLink href="https://names.onehundredyears.report">02 · American Names</FooterLink>
            <FooterLink href="https://colorline.onehundredyears.report">03 · The Color Line</FooterLink>
            <FooterLink href="https://uap-corpus.pages.dev" highlight>04 · The Atmosphere · NEW</FooterLink>
            <FooterLink muted>05 · American Homicide</FooterLink>
            <FooterLink muted>06 · Disaster Declarations</FooterLink>
          </FooterColumn>
          <FooterColumn title="The project">
            <FooterLink href="#methodology">Methodology</FooterLink>
            <FooterLink href="#sources">Sources</FooterLink>
            <FooterLink href="#about">About</FooterLink>
            <FooterLink href="#press">Press</FooterLink>
          </FooterColumn>
          <FooterColumn title="Open">
            <FooterLink href="https://github.com/doctorbrownphd">GitHub ↗</FooterLink>
            <FooterLink href="#license">MIT License</FooterLink>
            <FooterLink href="#data">Raw data</FooterLink>
            <FooterLink href="#cite">How to cite</FooterLink>
          </FooterColumn>
        </div>
      </div>

      <div style={{
        marginTop: 36, paddingTop: 16, borderTop: '1px solid #1B2740',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span className="mono" style={{ color: '#4E6A82', fontSize: 10, letterSpacing: 0.2, textTransform: 'uppercase' }}>
          © 2024–2026 · One Hundred Years · Vol. III
        </span>
        <span className="mono" style={{ color: '#4E6A82', fontSize: 10, letterSpacing: 0.2, textTransform: 'uppercase' }}>
          Built honestly · Set in Source Serif 4 &amp; Space Mono
        </span>
        <span className="mono" style={{ color: '#4E6A82', fontSize: 10, letterSpacing: 0.2, textTransform: 'uppercase' }}>
          Last commit · {window.VOL_META.updated}
        </span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }) {
  return (
    <div>
      <div className="mono" style={{ color: '#C9A84C', fontSize: 10, letterSpacing: 0.25, textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
    </div>
  );
}

function FooterLink({ href, children, muted, highlight }) {
  const style = {
    color: muted ? '#4E6A82' : highlight ? '#C9A84C' : '#8BAFC7',
    fontSize: 11, letterSpacing: 0.08,
    textDecoration: 'none', fontWeight: highlight ? 700 : 400,
  };
  if (!href) return <span className="mono" style={style}>{children}</span>;
  const external = href.startsWith('http');
  return (
    <a href={href} className="mono" style={style}
       {...(external ? { target: '_blank', rel: 'noopener' } : {})}>
      {children}
    </a>
  );
}

const landingRoot = ReactDOM.createRoot(document.getElementById('root'));
landingRoot.render(<Landing />);
