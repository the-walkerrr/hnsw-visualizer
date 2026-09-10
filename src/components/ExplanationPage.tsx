import { useEffect, type ReactNode } from 'react'
import { CONTROL_GUIDES, type ControlGuide } from '../lessons/controlGuides'
import { EfSearchVisual } from './EfSearchVisual'

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

function Visual({ title, children }: { title: string; children: ReactNode }) {
  return <figure className="lesson-visual">
    <div className="visual-label"><span aria-hidden="true">VISUAL</span>{title}</div>
    {children}
  </figure>
}

function VectorMapVisual() {
  return <Visual title="Meaning becomes position">
    <svg viewBox="0 0 720 250" role="img" aria-labelledby="vector-map-title vector-map-desc">
      <title id="vector-map-title">Items become points in a vector space</title>
      <desc id="vector-map-desc">Three example items are converted into numbered vectors and placed near similar items on a two-dimensional map.</desc>
      <g className="visual-card">
        <rect x="24" y="34" width="160" height="48" rx="7" /><text x="42" y="56">jazz playlist</text><text className="muted" x="42" y="71">audio</text>
        <rect x="24" y="101" width="160" height="48" rx="7" /><text x="42" y="123">saxophone solo</text><text className="muted" x="42" y="138">audio</text>
        <rect x="24" y="168" width="160" height="48" rx="7" /><text x="42" y="190">mountain photo</text><text className="muted" x="42" y="205">image</text>
      </g>
      <g className="visual-arrow"><path d="M205 58h82" /><path d="m277 51 10 7-10 7" /><path d="M205 125h82" /><path d="m277 118 10 7-10 7" /><path d="M205 192h82" /><path d="m277 185 10 7-10 7" /></g>
      <g className="vector-values"><text x="309" y="61">[0.82, 0.71, …]</text><text x="309" y="128">[0.79, 0.75, …]</text><text x="309" y="195">[0.13, 0.24, …]</text></g>
      <path className="visual-divider" d="M461 20v210" />
      <g className="visual-edge"><path d="M537 73 574 96 611 67M537 73l74-6M574 96l54 20M611 67l17 49" /><path d="M520 184 565 165 612 191M565 165l47 26" /></g>
      <g className="visual-node"><circle cx="537" cy="73" r="7" /><circle cx="574" cy="96" r="7" /><circle cx="611" cy="67" r="7" /><circle cx="628" cy="116" r="7" /></g>
      <g className="visual-node secondary"><circle cx="520" cy="184" r="7" /><circle cx="565" cy="165" r="7" /><circle cx="612" cy="191" r="7" /></g>
      <text className="visual-caption" x="546" y="35">similar audio</text><text className="visual-caption" x="546" y="225">images</text>
    </svg>
    <figcaption>The real vectors may have hundreds of dimensions. The playground uses two so you can see distance directly.</figcaption>
  </Visual>
}

function LayersVisual() {
  return <Visual title="Express lanes above, detail below">
    <svg viewBox="0 0 720 310" role="img" aria-labelledby="layers-title layers-desc">
      <title id="layers-title">Three HNSW graph layers</title>
      <desc id="layers-desc">A search makes one long jump on a sparse top layer, then descends through denser layers and finishes near the query.</desc>
      <g className="layer-plane"><path d="m90 38 525 0 48 45-525 0Z" /><path d="m70 126 545 0 48 45-545 0Z" /><path d="m50 220 565 0 48 45-565 0Z" /></g>
      <g className="layer-label"><text x="30" y="64">L2</text><text x="30" y="152">L1</text><text x="30" y="246">L0</text></g>
      <g className="visual-edge"><path d="M176 61h277M147 149l112-4 114 6 138-3M115 244l75-7 72 14 75-12 76 18 77-15 83 12" /></g>
      <g className="visual-node"><circle cx="176" cy="61" r="7" /><circle cx="453" cy="61" r="7" /><circle cx="147" cy="149" r="6" /><circle cx="259" cy="145" r="6" /><circle cx="373" cy="151" r="6" /><circle cx="511" cy="148" r="6" /><circle cx="115" cy="244" r="5" /><circle cx="190" cy="237" r="5" /><circle cx="262" cy="251" r="5" /><circle cx="337" cy="239" r="5" /><circle cx="413" cy="257" r="5" /><circle cx="490" cy="242" r="5" /><circle cx="573" cy="254" r="5" /></g>
      <g className="layer-vertical"><path d="M176 68 147 142M453 68l58 74M147 155l-32 83M259 151l3 94M373 157l40 94M511 154l62 94" /></g>
      <path className="search-route" d="M176 61h277l58 87-138 3 40 106 77-15" />
      <g className="route-points"><circle cx="176" cy="61" r="8" /><circle cx="453" cy="61" r="8" /><circle cx="511" cy="148" r="8" /><circle cx="373" cy="151" r="8" /><circle cx="413" cy="257" r="8" /><circle className="result" cx="490" cy="242" r="9" /></g>
      <g className="query-mark"><path d="m530 219 14 14m0-14-14 14" /></g>
      <text className="visual-caption" x="555" y="211">query</text>
    </svg>
    <figcaption>Every dot lives on layer 0. A few are promoted to upper layers, where their longer links cross the map quickly.</figcaption>
  </Visual>
}

function SearchVisual() {
  return <Visual title="A greedy walk on one layer">
    <svg viewBox="0 0 720 270" role="img" aria-labelledby="search-title search-desc">
      <title id="search-title">A greedy graph search moving toward a query</title>
      <desc id="search-desc">The blue route follows existing edges to progressively closer dots. It ends at a dot whose connected neighbors are farther from q. This demonstrates the greedy walk used on upper layers.</desc>
      <g className="visual-edge"><path d="M82 87 185 58 273 106 365 68 449 126 548 83M273 106l-8 60M273 106l176 20 43 84M365 68l84 58M265 166l111 34 73-74M376 200l116 10 56-127" /></g>
      <g className="visual-node"><circle cx="82" cy="87" r="8" /><circle cx="185" cy="58" r="7" /><circle cx="273" cy="106" r="7" /><circle cx="365" cy="68" r="7" /><circle cx="449" cy="126" r="7" /><circle cx="548" cy="83" r="7" /><circle cx="265" cy="166" r="7" /><circle cx="376" cy="200" r="7" /><circle cx="492" cy="210" r="7" /></g>
      <path className="search-route" d="M82 87 185 58 273 106 449 126 492 210" />
      <g className="route-points"><circle cx="82" cy="87" r="10" /><circle cx="185" cy="58" r="9" /><circle cx="273" cy="106" r="9" /><circle cx="449" cy="126" r="9" /><circle className="result" cx="492" cy="210" r="11" /></g>
      <g className="step-number"><circle cx="60" cy="56" r="13" /><text x="60" y="60">1</text><circle cx="251" cy="73" r="13" /><text x="251" y="77">2</text><circle cx="425" cy="94" r="13" /><text x="425" y="98">3</text><circle cx="514" cy="184" r="13" /><text x="514" y="188">4</text></g>
      <g className="query-mark"><path d="m552 200 16 16m0-16-16 16" /></g>
      <text className="visual-caption" x="579" y="213">q</text>
    </svg>
    <figcaption>On an upper layer, inspect connected neighbors and continue from the closest one if it improves the position. Once no neighbor is closer to <b>q</b>, descend from the best dot found. The wider bottom-layer search works differently; see the efSearch example below.</figcaption>
  </Visual>
}

function BuildVisual() {
  return <Visual title="How a new dot joins the graph">
    <svg viewBox="0 0 720 250" role="img" aria-labelledby="build-title build-desc">
      <title id="build-title">Three stages of inserting a node into HNSW</title>
      <desc id="build-desc">A random draw chooses the node height, an existing graph search finds candidates, and the new node keeps a small diverse set of connections.</desc>
      <g className="stage-divider"><path d="M240 20v205M480 20v205" /></g>
      <g className="stage-number"><text x="28" y="39">01</text><text x="268" y="39">02</text><text x="508" y="39">03</text></g>
      <g className="stage-title"><text x="28" y="64">Choose a height</text><text x="268" y="64">Search for neighbors</text><text x="508" y="64">Keep useful links</text></g>
      <g className="height-bars"><rect x="52" y="159" width="24" height="35" rx="3" /><rect x="91" y="125" width="24" height="69" rx="3" /><rect x="130" y="159" width="24" height="35" rx="3" /><rect className="chosen" x="169" y="90" width="24" height="104" rx="3" /></g>
      <g className="visual-edge"><path d="M280 157 327 105 378 153 434 112M327 105l107 7M378 153l56-41" /><path d="M520 159 577 108 632 151M577 108l73-27M577 108l55 43" /></g>
      <g className="visual-node"><circle cx="280" cy="157" r="7" /><circle cx="327" cy="105" r="7" /><circle cx="378" cy="153" r="7" /><circle cx="434" cy="112" r="7" /><circle cx="520" cy="159" r="7" /><circle cx="577" cy="108" r="7" /><circle cx="632" cy="151" r="7" /><circle cx="650" cy="81" r="7" /></g>
      <g className="new-node"><circle cx="390" cy="87" r="9" /><circle cx="592" cy="184" r="9" /></g>
      <g className="candidate-edge"><path d="M390 87 327 105M390 87l44 25M390 87l-12 66" /></g>
      <g className="kept-edge"><path d="M592 184 520 159M592 184l40-33M592 184l58-103" /></g>
      <text className="visual-caption" x="28" y="220">Most dots stay on L0</text><text className="visual-caption" x="268" y="220">efConstruction sets the pool</text><text className="visual-caption" x="508" y="220">M sets the target count</text>
    </svg>
  </Visual>
}

export function ExplanationPage({ onOpenPlayground, onStartFirstSearch }: { onOpenPlayground: () => void; onStartFirstSearch: () => void }) {
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
        <p className="section-kicker">A visual guide to HNSW</p>
        <h1>Find the nearest neighbors without checking everything.</h1>
        <p>HNSW turns vectors into a layered map. A query follows a small number of promising connections, making large jumps first and precise local moves last.</p>
        <div className="landing-actions">
          <button className="button primary" onClick={onStartFirstSearch}>Watch a search <span aria-hidden="true">→</span></button>
          <a className="button quiet" href="#chapter-map">Start reading</a>
        </div>
      </header>

      <div className="guide-layout">
        <nav className="guide-toc" aria-label="Learn HNSW contents">
          <span className="toc-label">In this guide</span>
          <a href="#chapter-map"><span>01</span>The map</a>
          <a href="#chapter-search"><span>02</span>The search</a>
          <a href="#chapter-quality"><span>03</span>Speed & accuracy</a>
          <a href="#lesson-4"><span>04</span>Building the index</a>
          <a href="#parameter-guide"><span>05</span>Control reference</a>
        </nav>

        <div className="guide-content">
          <section id="chapter-map" className="guide-chapter">
            <header className="chapter-heading"><span>01</span><div><p className="section-kicker">From data to graph</p><h2>First, turn similarity into a map.</h2><p>HNSW works because distance in vector space carries meaning: items with similar content land near one another.</p></div></header>

            <div className="lesson-block">
              <h3>1.1 · An item becomes a vector</h3>
              <p>A model converts each song, image, or paragraph into a list of numbers called an <b>embedding</b>. That list is its vector. Nearby vectors represent items the model considers similar.</p>
              <VectorMapVisual />
            </div>

            <div className="lesson-block">
              <h3>1.2 · Connections replace a full scan</h3>
              <p>The exact answer comes from measuring the query against every stored vector. HNSW takes a shortcut: each vector keeps links to a few useful neighbors, so the search can move through the data instead of scanning all of it.</p>
              <div className="comparison-strip"><div><span>Exact search</span><strong>Check every dot</strong><p>Perfect answer, work grows with the collection.</p></div><div><span>HNSW search</span><strong>Follow promising links</strong><p>Much less work, with a small chance of a miss.</p></div></div>
            </div>

            <div className="lesson-block">
              <h3>1.3 · Layers separate long jumps from local moves</h3>
              <p>Layer 0 contains every vector and detailed local links. Each layer above is sparser, so its links span greater distances. Think of upper layers as highways and the bottom layer as neighborhood streets.</p>
              <LayersVisual />
            </div>
          </section>

          <section id="chapter-search" className="guide-chapter">
            <header className="chapter-heading"><span>02</span><div><p className="section-kicker">Following a query</p><h2>A search repeatedly asks one question.</h2><p>“Which connected dot takes me closer to the query?” The answer guides the route from the entry point to the final neighborhood.</p></div></header>

            <div id="lesson-6" className="lesson-block">
              <h3>2.1 · Enter high, then walk downhill</h3>
              <ol className="explanation-steps">
                <li><b>Enter.</b><span>Start at the single entry point on the highest layer.</span></li>
                <li><b>Compare.</b><span>Measure the current dot’s connected neighbors against the query.</span></li>
                <li><b>Move.</b><span>Follow a closer neighbor; stop when none improves the position.</span></li>
                <li><b>Descend.</b><span>Use that best dot as the starting point one layer lower. On layer 0, switch to the wider search explained below.</span></li>
              </ol>
              <SearchVisual />
            </div>

            <div className="lesson-block">
              <h3>2.2 · The bottom layer keeps alternatives alive</h3>
              <p>A purely greedy walk can get trapped at a dot whose immediate neighbors all look worse. On layer 0, HNSW keeps a shortlist of the closest dots found so far and a separate queue of dots whose connections it may explore next.</p>
              <div className="term-pair"><div><code>to check · C</code><p>Discovered dots whose neighbors have not been explored yet. The nearest one is checked next.</p></div><div><code>best so far · W</code><p>The closest dots kept so far, including ones already explored. efSearch limits the size of this list.</p></div></div>
            </div>

            <div className="lesson-block" id="w-per-layer">
              <h3>2.3 · W on each layer—and why</h3>
              <p>During a query, W is a fresh best-so-far bucket for each layer. It starts with the entry dot; on lower layers, that is the best dot found on the layer above.</p>
              <div className="term-pair">
                <div><code>Upper layers · 1 slot</code><p>Keep just the closest dot found so far. These sparse layers quickly find a promising region, not the final matches. A one-slot search keeps this navigation cheap.</p></div>
                <div><code>Layer 0 · max(efSearch, k) slots</code><p>Keep alternatives because a useful route may first pass through a less-close dot. This can improve accuracy, at the cost of more checks. At least k slots are needed to hold k requested matches.</p></div>
              </div>
              <p>For <code>efSearch = 8</code> and <code>k = 5</code>, W’s capacity is <b>L2: 1 → L1: 1 → L0: 8</b>. Only the best dot is passed down, not the whole bucket. Finally, return the closest five eligible dots from W.</p>
            </div>

            <aside className="try-panel"><div><span>TRY IT IN THE PLAYGROUND</span><h3>Replay every decision</h3><p>The example is preloaded. Use the arrows beneath the graph to watch the route one step at a time.</p></div><button className="button primary" onClick={onStartFirstSearch}>Start with an example →</button></aside>
          </section>

          <section id="chapter-quality" className="guide-chapter">
            <header className="chapter-heading"><span>03</span><div><p className="section-kicker">The central trade-off</p><h2>Spend more work to miss less often.</h2><p>HNSW is approximate. Its main query-time setting controls how broadly it explores before returning an answer.</p></div></header>

            <div id="ef-search-explained" className="lesson-block">
              <h3>3.1 · efSearch is the number of “best so far” slots</h3>
              <p>Imagine keeping a shortlist while looking for a house. With one slot, you keep only your favorite house so far. With several slots, a less attractive house can stay on the list long enough for you to discover a better one nearby.</p>
              <p>In HNSW, these are dots instead of houses. <code>efSearch = 8</code> means the bottom-layer search keeps up to eight dots in its <b>best-so-far list (W)</b>. Each dot is ranked by its distance to the query. Those eight slots are reused as closer dots are discovered.</p>
              <div className="ef-key-point"><b>8 slots does not mean 8 distance checks.</b><p>The search may measure many more than eight dots as it updates the list. efSearch is also not a distance radius, a number of graph edges, or the number of results returned.</p></div>
              <h4 className="ef-subheading">Two lists do different jobs</h4>
              <div className="term-pair"><div><code>W · best so far</code><p>Keeps up to efSearch dots, sorted by distance. Removing the farthest dot makes room for a better one. Exploring a dot does not remove it from W.</p></div><div><code>C · to check next</code><p>Contains accepted dots waiting to have their neighbors explored. Take the nearest one next. C has no separate efSearch size cap; an evicted dot can remain queued until the stopping rule rules it out.</p></div></div>
              <h4 className="ef-subheading">What happens when a neighbor is discovered?</h4>
              <ol className="ef-rules">
                <li><b>Measure it once.</b> Compute its distance to q. Skip dots already measured on this layer.</li>
                <li><b>Decide whether to keep it.</b> If W has room, accept it. If W is full, accept it only if it is closer than the farthest dot in W.</li>
                <li><b>Update both lists.</b> Add an accepted dot to W and C. If W now exceeds its capacity, drop its farthest dot from W.</li>
                <li><b>Explore the next candidate.</b> Take the nearest dot from C and inspect its links, unless the stopping rule below applies.</li>
              </ol>
              <EfSearchVisual />
              <h4 className="ef-subheading">Why does the extra slot help?</h4>
              <p>After inspecting S, the one-slot search keeps A (distance 100) and rejects B (175). The two-slot search keeps both A and B. Once A’s links are exhausted, B still deserves a turn. Its link reveals T (44.7), a much better answer.</p>
              <p>B does not need to be closer than A. It only needs to fit within the best-so-far list when discovered. That is how a wider search can explore a useful detour.</p>
            </div>

            <div className="lesson-block">
              <h3>3.2 · k sets the result count; efSearch sets the shortlist size</h3>
              <div className="parameter-relationship"><div><code>k = 5</code><span>Return five neighbors</span></div><span aria-hidden="true">≠</span><div><code>efSearch = 24</code><span>Keep up to 24 promising candidates while looking</span></div></div>
              <p>For <code>k = 5</code> and <code>efSearch = 24</code>, the search maintains up to 24 best-so-far dots, then returns the nearest five eligible dots from that list. The other 19 are not extra results.</p>
              <p>This playground uses <code>effective ef = max(efSearch, k)</code>. If k is 5, setting efSearch to 1, 2, or 5 uses the same five-slot capacity. Set k to 1 to compare the one-slot and two-slot behavior shown above.</p>
            </div>

            <div className="lesson-block">
              <h3>3.3 · When does the search stop?</h3>
              <p>It stops when C is empty, or when the nearest queued dot is <b>farther than the farthest dot still in W</b>. All other queued dots are at least as far away, so the search saves work by not expanding them.</p>
              <div className="ef-stop-example"><code>W: [4, 7, 10]</code><code>Next in C: 12</code><p>12 &gt; 10 → stop exploring this layer.</p></div>
              <p>Those are distances to q. The stopping rule is a shortcut, not proof that no closer dot exists: the dot at distance 12 might have an unseen neighbor at distance 1. Skipping its links is one reason HNSW can miss the true nearest neighbor.</p>
              <p>Upper layers use a one-slot greedy search to reach a promising region. In this implementation, efSearch changes the wider search on layer 0 only. It does not add connections or rebuild the graph.</p>
            </div>

            <div className="lesson-block">
              <h3>3.4 · Recall measures what the shortcut missed</h3>
              <div className="recall-card"><div><span>TRUE TOP 5</span><div className="result-dots"><i /><i /><i /><i /><i /></div></div><div><span>FOUND BY HNSW</span><div className="result-dots"><i /><i /><i /><i /><i className="miss" /></div></div><strong>recall@5 = 4 / 5 = 80%</strong></div>
              <p>The playground computes the exact nearest neighbors as a teaching baseline, then compares the HNSW result with them. In a production system, recall is usually estimated on a representative sample because exact scans are expensive.</p>
              <p>To see the trade-off, keep the dots, query, and k fixed. Compare efSearch at k, 2 × k, and 4 × k. Look at both recall and distance checks. More effort often improves recall, but some queries already have the exact answer and gain nothing. A wider search also cannot create a missing connection.</p>
              <p className="ef-source">Further reading: <a href="https://github.com/nmslib/hnswlib/blob/master/ALGO_PARAMS.md">hnswlib’s search parameter definitions</a> and <a href="https://arxiv.org/abs/1603.09320">the HNSW paper, Algorithms 2 and 5</a>.</p>
            </div>
          </section>

          <section id="lesson-4" className="guide-chapter">
            <header className="chapter-heading"><span>04</span><div><p className="section-kicker">Building the index</p><h2>Every new vector finds its own place.</h2><p>Insertion uses the same layered search, then keeps a limited set of connections that make future searches useful.</p></div></header>

            <div className="lesson-block">
              <h3>4.1 · Choose a level, search, then connect</h3>
              <p>A random draw chooses the new vector’s highest layer. Starting from the entry point, it searches down to that layer, finds nearby candidates, and connects to a small selection on every layer where it appears.</p>
              <BuildVisual />
            </div>

            <div className="lesson-block">
              <h3>4.2 · M and efConstruction shape future quality</h3>
              <div className="term-pair"><div><code>M</code><p>The target number of connections a new vector chooses per layer. More links improve reachability but use more memory.</p></div><div><code>efConstruction</code><p>The candidate pool examined before choosing those links. More effort builds a stronger graph more slowly.</p></div></div>
              <p>These are build-time settings. Changing either one alters the graph itself, so the playground rebuilds the index. <code>efSearch</code>, by contrast, changes only the next query.</p>
            </div>
          </section>

          <section id="parameter-guide" className="guide-chapter control-chapter">
            <header className="chapter-heading"><span>05</span><div><p className="section-kicker">Optional reference</p><h2>Understand every playground control.</h2><p>You can learn the core idea without touching these. Open a control when you want its exact input range, effect, and rebuild behavior.</p></div></header>
            <div className="control-summary-grid"><div><span>QUERY TIME</span><b>k · efSearch</b><p>Change the next search without rebuilding.</p></div><div><span>BUILD TIME</span><b>M · efConstruction · mL</b><p>Change the graph and trigger a rebuild.</p></div><div><span>DATA & MEANING</span><b>Dataset · metric</b><p>Change the example or what “near” means.</p></div></div>
            <div className="reference-library">{Object.values(CONTROL_GUIDES).map((guide) => <ControlCard key={guide.id} guide={guide} />)}</div>
          </section>
        </div>
      </div>

      <footer className="guide-footer"><span>You now know the map, the route, and the trade-off.</span><button className="button secondary" onClick={onOpenPlayground}>Open an empty playground →</button></footer>
    </div>
  </main>
}
