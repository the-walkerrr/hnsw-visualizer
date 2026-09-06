import { useEffect } from 'react'
import { CONTROL_GUIDES, type ControlGuide } from '../lessons/controlGuides'

function ControlCard({ guide }: { guide: ControlGuide }) {
  return <details id={guide.id} className="learn-disclosure control-reference">
    <summary>{guide.label}</summary>
    <div className="disclosure-content">
      <p>{guide.plain}</p>
      <dl>{guide.inputs.map((input) => <div key={input.label}><dt>{input.label}</dt><dd>{input.explanation}</dd></div>)}</dl>
      <p className="hint">{guide.when}</p>
      {guide.learnMore && <a className="control-deep-link" href={guide.learnMore.href}>{guide.learnMore.label} →</a>}
    </div>
  </details>
}

export function ExplanationPage({ onOpenPlayground }: { onOpenPlayground: () => void }) {
  useEffect(() => {
    const reveal = () => {
      let id: string
      try { id = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
      const target = document.getElementById(id)
      if (!target) return
      let parent: HTMLElement | null = target
      while (parent) {
        if (parent instanceof HTMLDetailsElement) parent.open = true
        parent = parent.parentElement
      }
      target.scrollIntoView({ block: 'start' })
    }
    const frame = window.requestAnimationFrame(reveal)
    window.addEventListener('hashchange', reveal)
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('hashchange', reveal) }
  }, [])

  return <main className="explanation-page beginner-guide">
    <div className="guide-wrap">
      <header className="guide-hero">
        <p className="section-kicker">HNSW, in two minutes</p>
        <h1>Find nearby things.<br />Skip most of the work.</h1>
        <p>Imagine finding songs similar to one you love. HNSW uses a map of connections to find close matches quickly.</p>
        <nav className="guide-shortcuts" aria-label="Guide contents"><a href="#start-here">The idea ↓</a><a href="#first-search">Try it ↓</a><a href="#parameter-guide">Controls ↓</a></nav>
      </header>

      <section id="start-here" className="guide-section">
        <div className="guide-section-heading"><span>01</span><h2>It’s a map with shortcuts.</h2></div>
        <div className="concept-cards">
          <article><div className="concept-art" aria-hidden="true"><svg viewBox="0 0 240 100"><g className="concept-dots"><circle cx="55" cy="45" r="7"/><circle cx="80" cy="65" r="7"/><circle cx="91" cy="32" r="7"/><circle cx="167" cy="43" r="7"/><circle cx="188" cy="65" r="7"/><circle cx="199" cy="30" r="7"/></g></svg></div><h3>Dots are items</h3><p>Each dot is a song, photo, or piece of text. Similar items sit close together. These dots are called <b>vectors</b>.</p></article>
          <article><div className="concept-art" aria-hidden="true"><svg viewBox="0 0 240 100"><path className="concept-lines" d="m42 65 43-35 35 40 39-41 39 28M85 30l74-1M42 65l78 5 78-13"/><g className="concept-dots"><circle cx="42" cy="65" r="6"/><circle cx="85" cy="30" r="6"/><circle cx="120" cy="70" r="6"/><circle cx="159" cy="29" r="6"/><circle cx="198" cy="57" r="6"/></g></svg></div><h3>Lines are routes</h3><p>Lines connect dots. A search follows these routes toward your target instead of checking every item.</p></article>
          <article><div className="concept-art" aria-hidden="true"><svg viewBox="0 0 240 100"><path className="concept-lines" d="M35 75h170M65 25h110M65 25v50M175 25v50"/><path className="concept-route" d="M65 25h110v50h30"/><g className="concept-dots"><circle cx="65" cy="25" r="6"/><circle cx="175" cy="25" r="6"/><circle cx="35" cy="75" r="5"/><circle cx="65" cy="75" r="5"/><circle cx="100" cy="75" r="5"/><circle cx="140" cy="75" r="5"/><circle cx="175" cy="75" r="5"/><circle cx="205" cy="75" r="5"/></g></svg></div><h3>Layers add shortcuts</h3><p>Upper layers make big jumps. The bottom layer holds every dot and finishes the search nearby.</p></article>
        </div>
        <p className="guide-takeaway">The trade-off: searching fewer dots is faster, but it can miss a close match.</p>
      </section>

      <section id="first-search" className="guide-section guide-try">
        <div>
          <div className="guide-section-heading"><span>02</span><h2>Watch one search.</h2></div>
          <ol className="quick-steps"><li>Open the playground and click <b>Run a search</b>.</li><li>Press <b>Play</b>, or use the arrows to follow each step.</li><li>Open <b>Results</b> to see how many close matches it found.</li></ol>
          <div className="guide-colors"><span><i className="query-symbol">＋</i> Your search</span><span><i className="result-symbol" /> Matches found</span></div>
        </div>
        <button className="button primary" onClick={onOpenPlayground}>Open playground <span aria-hidden="true">→</span></button>
      </section>

      <section id="parameter-guide" className="guide-section">
        <div className="guide-section-heading"><span>03</span><h2>Change one thing at a time.</h2></div>
        <p className="guide-section-intro">Start with the defaults. When you’re curious, try these in the playground.</p>
        <div className="starter-settings">
          <div><b>Results requested · k</b><p>How many matches you want. Try 1, then 5.</p></div>
          <div><b>Search effort · efSearch</b><p>How many possible matches to keep. More effort can find better answers.</p></div>
          <div><b>Connections · M</b><p>How many routes a new dot chooses. More routes use more memory.</p></div>
        </div>
        <details className="learn-disclosure reference-library"><summary>All controls and their inputs <span>Optional reference</span></summary><div className="disclosure-content">{Object.values(CONTROL_GUIDES).map((guide) => <ControlCard key={guide.id} guide={guide} />)}</div></details>
      </section>

      <section className="guide-section guide-questions" aria-label="A little more detail">
        <h2>A little more detail</h2>
        <details id="lesson-4" className="learn-disclosure"><summary>How does a new dot join the map?</summary><div className="disclosure-content"><p>It gets a randomly chosen height, searches for nearby dots, and connects to a few of them. <b>efConstruction</b> controls how many possible neighbors it keeps while searching. <b>M</b> controls how many it connects to.</p><p>Changing these settings rebuilds the map. You can watch this happen with the <b>Insert</b> tool.</p></div></details>
        <details id="lesson-6" className="learn-disclosure"><summary>What happens during a search?</summary><div className="disclosure-content"><p>The search starts at the top, follows links toward your target, and moves down a layer at a time. At the bottom, it keeps several possible matches in play.</p><p><b>efSearch</b> sets that pool’s size; <b>k</b> is how many answers you ask for. A larger pool costs more work but can help find matches the search would otherwise miss.</p></div></details>
        <details className="learn-disclosure"><summary>What does “recall” mean?</summary><div className="disclosure-content"><p>It’s the share of the true closest matches the search found. If it finds 4 of the closest 5, recall is 80%. The Results tab compares the search with checking every dot.</p></div></details>
      </section>
      <footer className="guide-footer"><span>That’s enough to get started.</span><button className="button secondary" onClick={onOpenPlayground}>Try it yourself →</button></footer>
    </div>
  </main>
}
