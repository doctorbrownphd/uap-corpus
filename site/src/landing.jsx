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

      {/* Footer */}
      <LandingFooter />
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
            <FooterLink href="https://atmosphere.onehundredyears.report" highlight>04 · The Atmosphere · NEW</FooterLink>
            <FooterLink muted>05 · American Homicide</FooterLink>
            <FooterLink muted>06 · Disaster Declarations</FooterLink>
          </FooterColumn>
          <FooterColumn title="The project">
            <FooterLink muted>Methodology</FooterLink>
            <FooterLink muted>Sources</FooterLink>
            <FooterLink muted>About</FooterLink>
            <FooterLink muted>Press</FooterLink>
          </FooterColumn>
          <FooterColumn title="Open">
            <FooterLink href="https://github.com/doctorbrownphd">GitHub ↗</FooterLink>
            <FooterLink muted>MIT License</FooterLink>
            <FooterLink muted>Raw data</FooterLink>
            <FooterLink muted>How to cite</FooterLink>
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
