import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LISTINGS, type Listing } from '../hnsw/pseudocode'
import { CONTROL_GUIDES, type ControlGuide } from '../lessons/controlGuides'
import { followLearnReference, LEARN_REFERENCE_EVENT, prepareLearnReturn, readLearnReturnPoint, type LearnReturnPoint } from '../learnReferenceNavigation'
import { EfSearchVisual } from './EfSearchVisual'
import { ParameterLink } from './ParameterLink'

function ControlCard({ guide }: { guide: ControlGuide }) {
  return <details id={guide.id} className="learn-disclosure control-reference">
    <summary>{guide.label}</summary>
    <div className="disclosure-content">
      <p>{guide.plain}</p>
      <dl>{guide.inputs.map((input) => <div key={input.label}><dt>{input.label}</dt><dd>{input.explanation}</dd></div>)}</dl>
      <p className="hint">{guide.when}</p>
      {guide.learnMore && <a className="control-deep-link" href={guide.learnMore.href} data-learn-reference onClick={followLearnReference}>{guide.learnMore.label} →</a>}
    </div>
  </details>
}

function AlgorithmListing({ listing }: { listing: Listing }) {
  return <section id={`algorithm-${listing.id}`} className="algorithm-listing">
    <header className="algorithm-listing-heading"><code>{listing.title}</code><span>{listing.subtitle}</span></header>
    <div className="algorithm-listing-content">
      <div className="code">
        {listing.lines.map((line) => <span key={line.key} className={`ln${line.indent === 0 ? ' head' : ''}`} title={line.note}>
          {'  '.repeat(line.indent)}{line.text}
        </span>)}
      </div>
      {listing.lines.some(line => line.note) && <dl className="algorithm-notes">
        {listing.lines.filter(line => line.note).map(line => <div key={line.key}><dt>{line.key}</dt><dd>{line.note}</dd></div>)}
      </dl>}
    </div>
  </section>
}

const LEARN_LISTINGS = LISTINGS

function Visual({ title, children }: { title: string; children: ReactNode }) {
  return <figure className="lesson-visual">
    <div className="visual-label"><span aria-hidden="true">VISUAL</span>{title}</div>
    {children}
  </figure>
}

function KnowledgeCheck({ question, choices, correct, explanation }: { question: string; choices: string[]; correct: number; explanation: string }) {
  const [answer, setAnswer] = useState<number | null>(() => {
    try { const saved = sessionStorage.getItem(`hnsw-check-${question}`); return saved === null ? null : Number(saved) } catch { return null }
  })
  useEffect(() => { try { if (answer !== null) sessionStorage.setItem(`hnsw-check-${question}`, String(answer)) } catch { /* Storage is optional. */ } }, [answer, question])
  return <div className="knowledge-check"><b>{question}</b><div className="row">{choices.map((choice, i) => <button className="button compact" key={choice} aria-pressed={answer === i} onClick={() => setAnswer(i)}>{choice}</button>)}</div>{answer !== null && <p role="status">{answer === correct ? 'Yes. ' : 'Try that idea again: '}{explanation}</p>}</div>
}

function BruteForceVisual() {
  const points = [
    { x: 84, y: 66, d: '5.8' }, { x: 168, y: 184, d: '4.1' }, { x: 270, y: 84, d: '2.7' },
    { x: 442, y: 72, d: '1.9' }, { x: 548, y: 186, d: '3.4' }, { x: 640, y: 92, d: '4.9' },
  ]
  return <Visual title="Exact search checks every stored vector">
    <svg viewBox="0 0 720 250" role="img" aria-labelledby="brute-title brute-desc">
      <title id="brute-title">A query compared with all six stored vectors</title>
      <desc id="brute-desc">Six lines connect query q to six stored dots, showing that brute force computes one distance for every stored vector.</desc>
      <g className="brute-lines">{points.map((p, i) => <line key={i} x1="360" y1="132" x2={p.x} y2={p.y}/>)}</g>
      <g className="visual-node">{points.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r="9"/><text x={p.x} y={p.y - 18} textAnchor="middle">d = {p.d}</text></g>)}</g>
      <g className="query-mark"><path d="M351 123l18 18m0-18-18 18"/></g><text className="visual-caption" x="376" y="128">query q</text>
      <text className="visual-caption" x="360" y="230" textAnchor="middle">6 stored vectors → 6 distance calculations → sort → return k</text>
    </svg>
    <figcaption>Every line in the picture is work. With one million stored vectors, one query needs one million distance calculations before sorting the answers.</figcaption>
  </Visual>
}

function ConnectionVisual() {
  return <Visual title="Useful links form a searchable map">
    <svg viewBox="0 0 720 270" role="img" aria-labelledby="connect-title connect-desc">
      <title id="connect-title">Nearby vectors connected into two neighborhoods with a bridge</title>
      <desc id="connect-desc">Blue nodes form one neighborhood, violet nodes form another, and one longer green link keeps the two groups reachable.</desc>
      <g className="cluster-halo"><ellipse cx="215" cy="137" rx="146" ry="88"/><ellipse cx="520" cy="137" rx="132" ry="88"/></g>
      <g className="visual-edge"><path d="M105 128 164 82 226 117 279 73 327 135 250 188 175 192 105 128M164 82l62 35 24 71M226 117l101 18M175 192l75-4M421 104l69-42 73 44 69-20M421 104l38 76 84 24 89-118M459 180l84 24 20-98M490 62l73 44"/></g>
      <path className="kept-edge" d="M327 135 421 104"/>
      <g className="visual-node"><circle cx="105" cy="128" r="8"/><circle cx="164" cy="82" r="8"/><circle cx="226" cy="117" r="8"/><circle cx="279" cy="73" r="8"/><circle cx="327" cy="135" r="8"/><circle cx="250" cy="188" r="8"/><circle cx="175" cy="192" r="8"/></g>
      <g className="visual-node secondary"><circle cx="421" cy="104" r="8"/><circle cx="490" cy="62" r="8"/><circle cx="563" cy="106" r="8"/><circle cx="632" cy="86" r="8"/><circle cx="459" cy="180" r="8"/><circle cx="543" cy="204" r="8"/></g>
      <text className="visual-caption" x="168" y="245">similar songs</text><text className="visual-caption" x="495" y="245">another neighborhood</text><text className="visual-caption" x="342" y="103">bridge</text>
    </svg>
    <figcaption>Short links make local movement easy. The green bridge is longer, but it prevents the search from being trapped in one neighborhood. HNSW therefore values a small set of nearby links that also point in useful directions.</figcaption>
  </Visual>
}

function LayersVisual() {
  return <Visual title="Upper layers are express lanes">
    <svg viewBox="0 0 720 310" role="img" aria-labelledby="layers-title layers-desc">
      <title id="layers-title">Three HNSW graph layers</title>
      <desc id="layers-desc">A search makes one long jump on a sparse top layer, descends through a middle layer, and finishes with detailed links on layer zero.</desc>
      <g className="layer-plane"><path d="m90 38 525 0 48 45-525 0Z"/><path d="m70 126 545 0 48 45-545 0Z"/><path d="m50 220 565 0 48 45-565 0Z"/></g>
      <g className="layer-label"><text x="30" y="64">L2</text><text x="30" y="152">L1</text><text x="30" y="246">L0</text></g>
      <g className="visual-edge"><path d="M176 61h277M147 149l112-4 114 6 138-3M115 244l75-7 72 14 75-12 76 18 77-15 83 12"/></g>
      <g className="visual-node"><circle cx="176" cy="61" r="7"/><circle cx="453" cy="61" r="7"/><circle cx="147" cy="149" r="6"/><circle cx="259" cy="145" r="6"/><circle cx="373" cy="151" r="6"/><circle cx="511" cy="148" r="6"/><circle cx="115" cy="244" r="5"/><circle cx="190" cy="237" r="5"/><circle cx="262" cy="251" r="5"/><circle cx="337" cy="239" r="5"/><circle cx="413" cy="257" r="5"/><circle cx="490" cy="242" r="5"/><circle cx="573" cy="254" r="5"/></g>
      <g className="layer-vertical"><path d="M176 68 147 142M453 68l58 74M147 155l-32 83M259 151l3 94M373 157l40 94M511 154l62 94"/></g>
      <g className="visual-caption"><text x="176" y="46">A</text><text x="453" y="46">D</text><text x="147" y="134">A</text><text x="511" y="133">D</text><text x="115" y="229">A</text><text x="573" y="239">D</text></g>
      <path className="search-route" d="M176 61h277l58 87-138 3 40 106 77-15"/>
      <g className="route-points"><circle cx="176" cy="61" r="8"/><circle cx="453" cy="61" r="8"/><circle cx="511" cy="148" r="8"/><circle cx="373" cy="151" r="8"/><circle cx="413" cy="257" r="8"/><circle className="result" cx="490" cy="242" r="9"/></g>
      <g className="query-mark"><path d="m530 219 14 14m0-14-14 14"/></g><text className="visual-caption" x="555" y="211">query</text>
    </svg>
    <figcaption>Read the blue route from top to bottom. The same item can appear on several layers—labels A and D show those copies. Every item is on L0; only a random few are promoted to L1 and L2.</figcaption>
  </Visual>
}

function SearchVisual() {
  return <Visual title="Move closer on one layer, then descend">
    <svg viewBox="0 0 720 270" role="img" aria-labelledby="search-title search-desc">
      <title id="search-title">Four stages of greedy search across two layers</title>
      <desc id="search-desc">Every node on layer one has a corresponding copy on layer zero. Step 1 starts on layer one, step 2 moves to a closer neighbor, step 3 stops at the local best node, and step 4 descends to that node's layer-zero copy.</desc>
      <g className="layer-plane"><path d="m75 38 525 0 42 74-525 0Z"/><path d="m75 158 525 0 42 74-525 0Z"/></g>
      <g className="layer-label"><text x="35" y="80">L1</text><text x="35" y="201">L0</text></g>
      <g className="layer-vertical"><path d="M135 87v92M275 78v92M366 68v92M445 96v92"/></g>
      <g className="visual-edge"><path d="M135 73 275 64 445 82M275 64l91-10M135 193l140-9 91-10 79 28 75-12 80 20M275 184l55 36M366 174l79 28M445 202l105 13M520 190l80 20"/></g>
      <g className="visual-node"><circle cx="366" cy="54" r="7"/><circle cx="135" cy="193" r="7"/><circle cx="275" cy="184" r="7"/><circle cx="366" cy="174" r="7"/><circle cx="330" cy="220" r="7"/><circle cx="520" cy="190" r="7"/><circle cx="550" cy="215" r="7"/><circle cx="600" cy="210" r="7"/></g>
      <path className="search-route" d="M135 73 275 64 445 82"/>
      <path className="layer-descent" d="M445 98v90"/>
      <g className="route-step"><circle cx="135" cy="73" r="14"/><text x="135" y="77">1</text><circle cx="275" cy="64" r="14"/><text x="275" y="68">2</text><circle className="local-best" cx="445" cy="82" r="14"/><text x="445" y="86">3</text><circle cx="445" cy="202" r="14"/><text x="445" y="206">4</text></g>
      <g className="route-step-label"><text x="135" y="102">start</text><text x="275" y="102">closer</text><text className="side" x="465" y="105">local best</text><text className="side" x="465" y="231">continue on L0</text></g>
      <g className="query-mark"><path d="m620 143 16 16m0-16-16 16"/></g><text className="visual-caption" x="645" y="157">q</text>
    </svg>
    <figcaption>Every L1 node also appears on L0; gray dotted lines pair those copies. <b>1</b> starts on L1, <b>2</b> moves closer, <b>3</b> is the layer’s local best, and <b>4</b> is that same node on L0.</figcaption>
  </Visual>
}

function BuildVisual() {
  return <Visual title="Insert = choose a layer, search, then connect">
    <svg viewBox="0 0 720 250" role="img" aria-labelledby="build-title build-desc">
      <title id="build-title">Three stages of inserting a node into HNSW</title>
      <desc id="build-desc">A random draw chooses node height, an existing graph search finds candidates, and the new node keeps a small diverse set of links.</desc>
      <g className="stage-divider"><path d="M240 20v205M480 20v205"/></g>
      <g className="stage-number"><text x="28" y="39">01</text><text x="268" y="39">02</text><text x="508" y="39">03</text></g>
      <g className="stage-title"><text x="28" y="64">Choose a height</text><text x="268" y="64">Find candidates</text><text x="508" y="64">Keep useful links</text></g>
      <g className="height-bars"><rect x="52" y="159" width="24" height="35" rx="3"/><rect x="91" y="125" width="24" height="69" rx="3"/><rect x="130" y="159" width="24" height="35" rx="3"/><rect className="chosen" x="169" y="90" width="24" height="104" rx="3"/></g>
      <g className="visual-edge"><path d="M280 157 327 105 378 153 434 112M327 105l107 7M378 153l56-41"/><path d="M520 159 577 108 632 151M577 108l73-27M577 108l55 43"/></g>
      <g className="visual-node"><circle cx="280" cy="157" r="7"/><circle cx="327" cy="105" r="7"/><circle cx="378" cy="153" r="7"/><circle cx="434" cy="112" r="7"/><circle cx="520" cy="159" r="7"/><circle cx="577" cy="108" r="7"/><circle cx="632" cy="151" r="7"/><circle cx="650" cy="81" r="7"/></g>
      <g className="new-node"><circle cx="390" cy="87" r="9"/><circle cx="592" cy="184" r="9"/></g>
      <g className="candidate-edge"><path d="M390 87 327 105M390 87l44 25M390 87l-12 66"/></g>
      <g className="kept-edge"><path d="M592 184 520 159M592 184l40-33M592 184l58-103"/></g>
      <text className="visual-caption" x="28" y="220">most nodes stay on L0</text><text className="visual-caption" x="268" y="220">search the existing map</text><text className="visual-caption" x="508" y="220">links work both ways</text>
    </svg>
    <figcaption>The new blue dot first acts like a query. Orange lines are possible links; green lines are the small, diverse set it finally keeps.</figcaption>
  </Visual>
}

function NeighborChoiceVisual() {
  return <figure className="neighbor-choice-visual">
    <svg viewBox="0 0 720 188" role="img" aria-labelledby="neighbor-choice-title neighbor-choice-desc">
      <title id="neighbor-choice-title">Closest links compared with diverse links</title>
      <desc id="neighbor-choice-desc">With M equal to two, the closest-only rule connects N to P and R on its right. The diversity heuristic connects N to P on its right and L on its left, pruning the redundant link to R.</desc>
      <path className="choice-divider" d="M360 8v162"/>
      <g className="choice-heading"><text x="24" y="22">Choose the nearest two</text><text x="384" y="22">Choose two useful directions</text></g>
      <g className="choice-link nearest"><path d="M180 106Q210 48 240 106M180 106Q225 27 270 106"/></g>
      <g className="choice-link diverse"><path d="M540 106Q570 48 600 106M540 106Q480 31 420 106"/></g>
      <g className="choice-link pruned"><path d="M540 106Q585 27 630 106"/></g>
      <g className="choice-axis"><path d="M42 106h252M402 106h252"/></g>
      <g className="choice-node"><circle cx="60" cy="106" r="8"/><circle className="base" cx="180" cy="106" r="10"/><circle cx="240" cy="106" r="8"/><circle cx="270" cy="106" r="8"/><circle cx="420" cy="106" r="8"/><circle className="base" cx="540" cy="106" r="10"/><circle cx="600" cy="106" r="8"/><circle className="pruned-node" cx="630" cy="106" r="8"/></g>
      <g className="choice-node-label"><text x="60" y="133">L · −4</text><text x="180" y="133">N · 0</text><text x="240" y="133">P · 2</text><text x="270" y="133">R · 3</text><text x="420" y="133">L · −4</text><text x="540" y="133">N · 0</text><text x="600" y="133">P · 2</text><text x="630" y="133">R · 3</text></g>
      <g className="choice-result"><text x="180" y="176">keeps P + R → both point right</text><text x="540" y="176">keeps P + L → reaches both ways</text></g>
      <g className="choice-pruned-mark"><path d="m650 58 10 10m0-10-10 10"/><text x="645" y="48">R pruned</text></g>
    </svg>
    <figcaption>Both sides obey <ParameterLink name="M"/> = 2. The heuristic keeps P, rejects R because P already covers the right side, then keeps L to open a route to the left.</figcaption>
  </figure>
}

function DeleteVisual() {
  return <Visual title="Same graph, two deletion strategies">
    <svg viewBox="0 0 720 280" role="img" aria-labelledby="delete-title delete-desc">
      <title id="delete-title">Soft and hard deletion compared</title>
      <desc id="delete-desc">Both panels begin with the same center node and four neighbors. Soft delete crosses out the center but keeps all four original spokes. Hard delete removes the center and its spokes, then adds two selected replacement links between former neighbors.</desc>
      <g className="stage-divider"><path d="M360 20v235"/></g>
      <g className="stage-title"><text x="28" y="40">SOFT DELETE</text><text x="388" y="40">HARD DELETE</text></g>
      <g className="visual-edge">
        <path d="M180 75 275 145M180 215 85 145M180 145 180 75M180 145 275 145M180 145 180 215M180 145 85 145"/>
        <path d="M540 75 635 145M540 215 445 145"/>
      </g>
      <g className="repair-edge"><path d="M540 75 445 145M635 145 540 215"/></g>
      <g className="visual-node">
        <circle cx="180" cy="75" r="8"/><circle cx="275" cy="145" r="8"/><circle cx="180" cy="215" r="8"/><circle cx="85" cy="145" r="8"/>
        <circle cx="540" cy="75" r="8"/><circle cx="635" cy="145" r="8"/><circle cx="540" cy="215" r="8"/><circle cx="445" cy="145" r="8"/>
      </g>
      <g className="deleted-node"><circle cx="180" cy="145" r="14"/><path d="m170 135 20 20m0-20-20 20"/></g>
      <g className="missing-node"><circle cx="540" cy="145" r="14"/></g>
      <text className="visual-caption" x="180" y="252" textAnchor="middle">tombstoned · all 4 old spokes remain</text>
      <text className="visual-caption" x="540" y="252" textAnchor="middle">removed · 2 selected repair links added</text>
    </svg>
    <figcaption>Both sides start from the same graph. Gray lines are original edges. Soft delete keeps the tombstoned node and all four spokes. Hard delete removes the node and those spokes; the two green links are selected best-effort repairs.</figcaption>
  </Visual>
}

export function ExplanationPage({ onOpenPlayground, onStartFirstSearch }: { onOpenPlayground: () => void; onStartFirstSearch: () => void }) {
  const page = useRef<HTMLElement>(null)
  const [chapter, setChapter] = useState('01')
  const [returnPoint, setReturnPoint] = useState<LearnReturnPoint | null>(readLearnReturnPoint)
  useEffect(() => {
    const element = page.current
    if (!element) return
    const record = () => {
      const chapters = Array.from(element.querySelectorAll<HTMLElement>('.guide-chapter'))
      const active = chapters.filter(c => c.getBoundingClientRect().top < 180).at(-1)
      setChapter(String(Math.max(0, chapters.indexOf(active!)) + 1).padStart(2, '0'))
      try { sessionStorage.setItem('hnsw-learn-scroll', String(element.scrollTop)) } catch { /* Storage is optional. */ }
    }
    element.addEventListener('scroll', record, { passive: true })
    const reveal = () => {
      let id: string
      try { id = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
      const target = document.getElementById(id)
      if (!target) {
        try { element.scrollTop = Number(sessionStorage.getItem('hnsw-learn-scroll') || 0) } catch { /* Storage is optional. */ }
        return
      }
      let parent: HTMLElement | null = target
      while (parent) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement }
      target.scrollIntoView({ block: 'start' })
    }
    const revealReference = () => { setReturnPoint(readLearnReturnPoint()); reveal() }
    const frame = window.requestAnimationFrame(revealReference)
    window.addEventListener('hashchange', revealReference)
    window.addEventListener('popstate', revealReference)
    const showReturn = (event: Event) => setReturnPoint((event as CustomEvent<LearnReturnPoint>).detail)
    window.addEventListener(LEARN_REFERENCE_EVENT, showReturn)
    return () => {
      element.removeEventListener('scroll', record)
      window.cancelAnimationFrame(frame)
      window.removeEventListener('hashchange', revealReference)
      window.removeEventListener('popstate', revealReference)
      window.removeEventListener(LEARN_REFERENCE_EVENT, showReturn)
    }
  }, [])

  const continueReading = () => {
    if (!returnPoint) return
    prepareLearnReturn(returnPoint)
    setReturnPoint(null)
    window.history.replaceState({}, '', returnPoint.href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return <main ref={page} className="explanation-page beginner-guide">
    {returnPoint && <button type="button" className="continue-reading" onClick={continueReading}><span aria-hidden="true">←</span> Continue where you left</button>}
    <div className="guide-wrap">
      <header className="guide-hero">
        <p className="section-kicker">HNSW, from the first problem to the last edge</p>
        <h1>Learn fast vector search one picture at a time.</h1>
        <p>Start with the slow, exact solution. Then build the graph, add express-lane layers, search it, and safely change it. Each new symbol is explained before it is used.</p>
        <div className="landing-actions"><a className="button primary" href="#chapter-problem">Start with the problem →</a><a className="button quiet" href="#parameter-guide">Parameter reference</a></div>
      </header>

      <div className="guide-layout">
        <nav className="guide-toc" aria-label="Learn HNSW contents">
          <span className="toc-label">Chapter {chapter} of 08 · place saved</span>
          <a href="#chapter-problem"><span>01</span>The problem</a>
          <a href="#chapter-connect"><span>02</span>Connect vectors</a>
          <a href="#chapter-layers"><span>03</span>Why layers</a>
          <a href="#chapter-search"><span>04</span>Search</a>
          <a href="#chapter-insert"><span>05</span>Insert</a>
          <a href="#chapter-delete"><span>06</span>Delete</a>
          <a href="#parameter-guide"><span>07</span>Parameters</a>
          <a href="#algorithm-steps"><span>08</span>Algorithm steps</a>
        </nav>

        <div className="guide-content">
          <section id="chapter-problem" className="guide-chapter">
            <header className="chapter-heading"><span>01</span><div><p className="section-kicker">The problem</p><h2>Find similar items without checking everything.</h2><p>A music app may need songs like a sample track; a search engine may need passages like a question. Both become the same problem once each item is represented by numbers.</p></div></header>
            <div className="lesson-block">
              <h3>Four words before the first example</h3>
              <dl className="term-grid compact-terms">
                <div><dt>Vector (embedding)</dt><dd>A list of numbers describing one stored item.</dd></div>
                <div><dt>Query · q</dt><dd>The new vector we want matches for.</dd></div>
                <div><dt>Distance</dt><dd>How far a stored vector is from q. Smaller means more similar.</dd></div>
                <div><dt><ParameterLink name="k"/></dt><dd>The number of matches to return.</dd></div>
              </dl>
              <h3 className="lesson-subheading">Brute force is simple and exact</h3>
              <ol className="explanation-steps">
                <li><b>Measure.</b><span>Calculate the query’s distance to every stored vector.</span></li>
                <li><b>Sort.</b><span>Put all stored vectors in nearest-to-farthest order.</span></li>
                <li><b>Return.</b><span>Take the first <ParameterLink name="k"/> items.</span></li>
                <li><b>Repeat.</b><span>Do all that work again for the next query.</span></li>
              </ol>
              <p>The visual below makes the cost visible: one line is one distance calculation.</p>
              <BruteForceVisual />
              <div className="comparison-strip"><div><span>GOOD</span><strong>Always exact</strong><p>If the distance rule is correct, brute force cannot miss the nearest item.</p></div><div><span>THE DOWNSIDE</span><strong>Work grows with every item</strong><p>Double the collection and each query performs roughly twice as many distance calculations.</p></div></div>
              <p className="chapter-takeaway"><b>HNSW’s idea:</b> spend time building a navigable map once, then follow a small number of promising links for each query.</p>
            </div>
          </section>

          <section id="chapter-connect" className="guide-chapter">
            <header className="chapter-heading"><span>02</span><div><p className="section-kicker">From vectors to a graph</p><h2>Connect similar vectors into neighborhoods.</h2><p>A node is one stored vector. An edge is a link between two nodes. Together, the nodes and links form the graph—the searchable index.</p></div></header>
            <div className="lesson-block">
              <h3>Nearby is useful; reachable is essential</h3>
              <p>The <ParameterLink name="metric" label="distance metric"/> decides what “near” means. For each node, HNSW keeps a small set of useful neighbors. The <ParameterLink name="neighborRule" label="neighbor selection rule"/> can prefer links in different directions instead of choosing only a tight clump of the closest nodes.</p>
              <p>In the visual below, notice the green bridge. It is not the shortest possible link, but it gives searches a route between neighborhoods.</p>
              <ConnectionVisual />
              <div className="example-card"><span>EXAMPLE</span><p>If every jazz song links only to almost-identical jazz songs, a search that starts there may never discover nearby brass music. One well-placed bridge keeps both groups reachable.</p></div>
              <p className="chapter-takeaway"><b>The graph is approximate:</b> we keep enough routes to search well, not every possible connection.</p>
            </div>
          </section>

          <section id="chapter-layers" className="guide-chapter">
            <header className="chapter-heading"><span>03</span><div><p className="section-kicker">Why HNSW is hierarchical</p><h2>Layers turn a long walk into a few big jumps.</h2><p>A single graph still forces the search to cross many local links. HNSW stacks sparse copies above the full graph so it can move across the map quickly before examining local detail.</p></div></header>
            <div className="lesson-block">
              <dl className="term-grid compact-terms">
                <div><dt>Layer 0 · L0</dt><dd>The full graph. Every stored vector lives here.</dd></div>
                <div><dt>Upper layers · L1, L2…</dt><dd>Smaller maps containing a random subset of the same nodes.</dd></div>
                <div><dt>Entry point</dt><dd>The saved node where every search begins, on the highest layer.</dd></div>
                <div><dt><ParameterLink name="mL"/></dt><dd>Controls how often nodes are promoted to upper layers.</dd></div>
              </dl>
              <p>Follow the blue route in the visual: make long moves on L2, refine the region on L1, then finish among all vectors on L0.</p>
              <LayersVisual />
              <div className="comparison-strip"><div><span>UPPER LAYERS</span><strong>Highways</strong><p>Few nodes, long links, cheap navigation toward the right region.</p></div><div><span>LAYER 0</span><strong>Neighborhood streets</strong><p>Every node, detailed links, enough alternatives to choose the final matches.</p></div></div>
              <p className="chapter-takeaway"><b>Nothing is duplicated semantically:</b> A on L2 and A on L0 are the same stored vector shown at two navigation levels.</p>
            </div>
          </section>

          <section id="chapter-search" className="guide-chapter">
            <span id="ef-search-explained" className="anchor-alias"/>
            <header className="chapter-heading"><span>04</span><div><p className="section-kicker">Assume the graph already exists</p><h2>Search from coarse layers to fine ones.</h2><p>Upper layers greedily find a promising region. Layer 0 keeps several possible routes alive so one unlucky turn does not end the search.</p></div></header>
            <div className="lesson-block">
              <h3>Search notation, before the example</h3>
              <dl className="term-grid search-terms">
                <div><dt><code>W</code> · best so far</dt><dd>The closest candidates discovered so far. A node stays in W even after its links are explored.</dd></div>
                <div><dt><code>C</code> · to check</dt><dd>A waiting list of candidates whose links may still reveal something better. Check the nearest one next.</dd></div>
                <div><dt><ParameterLink name="efSearch"/></dt><dd>How many best-so-far slots W gets on L0. More room keeps more possible routes open; it does not set the result count.</dd></div>
                <div><dt><ParameterLink name="k"/></dt><dd>How many final matches to return from W. This visualizer gives W whichever is larger: <ParameterLink name="efSearch"/> or <ParameterLink name="k"/>.</dd></div>
                <div><dt>Candidate</dt><dd>A discovered node being considered for admission to both W and C.</dd></div>
                <div><dt>Expand</dt><dd>Remove the nearest node from C and inspect its links. Expansion does not remove it from W.</dd></div>
              </dl>
              <p className="term-memory"><b>Remember:</b> W remembers possible answers. C remembers where to look next. <ParameterLink name="efSearch"/> controls W’s room length.</p>

              <h3 className="lesson-subheading">Step 1: navigate the upper layers</h3>
              <ol className="explanation-steps">
                <li><b>Enter high.</b><span>Start at the entry point on the top layer.</span></li>
                <li><b>Move closer.</b><span>Follow a connected neighbor only when it is closer to q.</span></li>
                <li><b>Stop locally.</b><span>When no link improves the position, keep the best node found.</span></li>
                <li><b>Descend.</b><span>Use that node as the starting point on the next layer.</span></li>
              </ol>
              <SearchVisual />

              <div id="w-per-layer" className="term-pair"><div><code>Upper layers · W has 1 slot</code><p>Navigation is greedy and cheap. Only the best node found is passed down.</p></div><div><b>Layer 0 · W uses the larger of <ParameterLink name="efSearch"/> and <ParameterLink name="k"/></b><p>The full graph keeps alternate routes long enough to find the final matches.</p></div></div>

              <h3 className="lesson-subheading">Step 2: search wider on layer 0</h3>
              <div id="c-admission-rule" className="example-card queue-admission">
                <span>C ADMISSION + STOPPING RULE</span>
                <h4>When do we add a node to C, and when do we stop?</h4>
                <ul>
                  <li><b>Start:</b> put the entry point in both C and W.</li>
                  <li><b>Discover a neighbor:</b> add it to both C and W when W has an empty slot, or when the neighbor is closer to q than W’s farthest node. Otherwise, add it to neither list.</li>
                  <li><b>Expand or stop:</b> inspect C’s nearest node next. If C is empty, or its nearest node is farther from q than W’s farthest node, end this layer. Otherwise, remove that nearest node from C and inspect its neighbors; it can remain in W.</li>
                  <li><b>Finish:</b> after an upper layer ends, take W’s best node down to the next layer. After L0 ends, return the closest <ParameterLink name="k"/> nodes from W.</li>
                </ul>
              </div>
              <p>The interactive example below holds the graph, query, and <ParameterLink name="k"/> fixed. Only <ParameterLink name="efSearch"/> changes, so you can see why one extra W slot matters.</p>
              <div id="four-dot-search"><EfSearchVisual /></div>
              <p>This stopping rule saves work but can miss an unseen shortcut. <b>Recall</b> measures the share of true nearest matches found. Raising <ParameterLink name="efSearch"/> often improves recall by doing more distance checks, but it cannot repair a badly connected graph.</p>
              <KnowledgeCheck question="Does efSearch change how many results are returned?" choices={['Yes', 'No—that is k']} correct={1} explanation="efSearch changes how broadly layer 0 is explored. k sets the result count."/>
              <a className="algorithm-reference-link" href="#algorithm-knn-search" data-learn-reference onClick={followLearnReference}>Read the search pseudocode →</a>
            </div>
            <aside className="try-panel"><div><span>TRY THE SAME SEARCH</span><h3>Replay every decision</h3><p>Load the fixed four-dot graph with k = 1 and efSearch = 1, then compare it with efSearch = 2.</p></div><button className="button primary desktop-lesson-action" onClick={onStartFirstSearch}>Open guided search →</button><a className="button primary mobile-lesson-action" href="#four-dot-search">Replay inline →</a></aside>
          </section>

          <section id="chapter-insert" className="guide-chapter">
            <span id="lesson-4" className="anchor-alias"/>
            <header className="chapter-heading"><span>05</span><div><p className="section-kicker">Changing the graph</p><h2>An insert searches first, then makes links.</h2><p>The new vector temporarily acts like a query. It uses the existing index to find good neighbors, connects on every layer where it lives, and may become the new entry point.</p></div></header>
            <div className="lesson-block">
              <h3>Parameters used by insertion</h3>
              <dl className="term-grid search-terms">
                <div><dt><ParameterLink name="mL"/></dt><dd>Controls the random height assigned to the new node. The data itself does not choose the layer.</dd></div>
                <div><dt><ParameterLink name="efConstruction"/></dt><dd>The size of the candidate pool kept while searching for possible links. More candidates cost more build time.</dd></div>
                <div><dt><ParameterLink name="M"/></dt><dd>The target number of links the new node chooses on each layer.</dd></div>
                <div><dt><ParameterLink name="neighborRule" label="neighbor selection rule"/></dt><dd>Chooses either the nearest candidates or a more diverse set of directions.</dd></div>
                <div><dt><ParameterLink name="Mmax"/></dt><dd>The hard edge limit for an existing node above L0.</dd></div>
                <div><dt><ParameterLink name="Mmax0"/></dt><dd>The hard edge limit for an existing node on the larger bottom layer.</dd></div>
              </dl>
              <p className="advanced-switch-note">Two advanced switches refine neighbor selection: <ParameterLink name="extendCandidates" label="extend candidates"/> widens the pool, while <ParameterLink name="keepPrunedConnections" label="keep pruned connections"/> uses close rejects to fill unused link slots.</p>
              <ol className="explanation-steps">
                <li><b>Choose a height.</b><span>A repeatable random draw decides the highest layer for the new node.</span></li>
                <li><b>Navigate.</b><span>From the current entry point, greedily descend to the first layer where the new node exists.</span></li>
                <li><b>Find candidates.</b><span>Search each remaining layer with the insertion candidate pool.</span></li>
                <li><b>Connect and trim.</b><span>Choose useful links in both directions, then enforce each node’s edge cap.</span></li>
              </ol>
              <p className="stage-visual-intro">The three panels below show those stages from left to right.</p>
              <BuildVisual />
              <div className="example-card"><span>SMALL EXAMPLE</span><h4>Why not always choose the two closest links?</h4><p>Place new node N at 0 on a number line. P is at 2, R at 3, and L at −4. With <ParameterLink name="M"/> = 2, choose N–P first. R is close, but P already reaches that direction. N–L can be more useful because it opens the other direction. The heuristic trades one very close link for a more navigable graph.</p><NeighborChoiceVisual /></div>
              <p className="chapter-takeaway"><b>Insertion changes future searches:</b> <ParameterLink name="efConstruction"/> and <ParameterLink name="M"/> cost build time or memory now to create better routes later.</p>
              <a className="algorithm-reference-link" href="#algorithm-insert" data-learn-reference onClick={followLearnReference}>Read the insertion pseudocode →</a>
            </div>
          </section>

          <section id="chapter-delete" className="guide-chapter">
            <header className="chapter-heading"><span>06</span><div><p className="section-kicker">Removing a vector</p><h2>Delete cheaply, or remove and repair.</h2><p>The original HNSW paper does not define deletion. This visualizer shows the two common strategies: a reversible tombstone and a physical removal with best-effort link repair.</p></div></header>
            <div className="lesson-block">
              <div className="term-pair"><div id="soft-delete"><code>Soft delete · tombstone</code><p>Mark the node unavailable for results but keep it and every edge for routing. Fast and reversible; memory is reclaimed later by rebuilding or compacting.</p></div><div id="hard-delete"><code>Hard delete · remove + repair</code><p>Remove the node and all of its edges, then offer its former neighbors to one another as replacement links. Reclaims memory but can weaken the graph.</p></div></div>
              <p className="delete-visual-intro">Compare the same starting graph on both sides. The crossed-out node on the left still carries routes. The dashed space on the right marks the removed node; only selected repair links reconnect its former neighbors.</p>
              <DeleteVisual />
              <h3 className="lesson-subheading">What each mode does</h3>
              <ol className="explanation-steps">
                <li><b>Soft: mark.</b><span>Set the tombstone flag; do not touch edges.</span></li>
                <li><b>Soft: filter.</b><span>Search may travel through the node, but it cannot return it as an answer.</span></li>
                <li><b>Hard: unlink and repair.</b><span>On each layer, remove the node and reselect links among affected neighbors.</span></li>
                <li><b>Hard: replace entry.</b><span>If it was the entry point, choose the highest surviving node as the new start.</span></li>
              </ol>
              <div className="example-card"><span>PARAMETERS USED</span><p>Delete mode is the only choice specific to deletion. Soft delete has no tuning knobs. Hard repair reuses the <ParameterLink name="neighborRule" label="neighbor selection rule"/> and the <ParameterLink name="Mmax"/> / <ParameterLink name="Mmax0"/> edge caps. Repeated hard repairs are approximate, so periodic rebuilds may still be needed.</p></div>
              <p className="chapter-takeaway"><b>Practical rule:</b> prefer soft delete when fast, safe updates matter; use hard delete when reclaiming memory now is worth repair cost and possible recall loss.</p>
              <a className="algorithm-reference-link" href="#algorithm-delete" data-learn-reference onClick={followLearnReference}>Read the delete and repair pseudocode →</a>
            </div>
          </section>

          <section id="parameter-guide" className="guide-chapter control-chapter">
            <header className="chapter-heading"><span>07</span><div><p className="section-kicker">One reference, linked everywhere</p><h2>Parameter reference.</h2><p>The chapters explain why a setting appears. This section is the single place for exact ranges, trade-offs, and whether a change rebuilds the graph.</p></div></header>
            <div className="control-summary-grid"><div><span>QUERY TIME</span><b>k · efSearch</b><p>Change the next search without rebuilding.</p></div><div><span>BUILD TIME</span><b>M · efConstruction · mL · caps</b><p>Change the graph and trigger a rebuild.</p></div><div><span>DATA & SELECTION</span><b>Dataset · metric · neighbor rule</b><p>Change the example or what links mean.</p></div></div>
            <div className="reference-library">{Object.values(CONTROL_GUIDES).map((guide) => <ControlCard key={guide.id} guide={guide}/>)}</div>
            <p className="ef-source">Algorithm references: <a href="https://arxiv.org/abs/1603.09320">the original HNSW paper</a> and <a href="https://github.com/nmslib/hnswlib/blob/master/ALGO_PARAMS.md">hnswlib’s parameter guide</a>. Deletion is implementation-specific and is not defined by the paper.</p>
          </section>

          <section id="algorithm-steps" className="guide-chapter algorithm-chapter">
            <header className="chapter-heading"><span>08</span><div><p className="section-kicker">The complete reference</p><h2>Read the algorithm one operation at a time.</h2><p>The earlier chapters explain the ideas with pictures. This final section collects the same operations as compact pseudocode, after the symbols and behavior are familiar.</p></div></header>
            <div className="lesson-block">
              <h3>How to read the listings</h3>
              <dl className="term-grid compact-terms algorithm-terms">
                <div><dt><code>q</code></dt><dd>The query vector, or the new vector during insertion.</dd></div>
                <div><dt><code>ep</code></dt><dd>The entry point or starting node for this search.</dd></div>
                <div><dt><code>lc</code></dt><dd>The current layer number.</dd></div>
                <div><dt><code>ef</code></dt><dd>The number of best candidates kept while searching a layer.</dd></div>
              </dl>
              <p>Read from top to bottom. Algorithms 1–5 appear in order: insertion, one-layer search, neighbor selection, then the complete nearest-neighbor search. Delete and Update follow as implementation-specific operations.</p>
              <div className="reference-library algorithm-library">{LEARN_LISTINGS.map(listing => <AlgorithmListing key={listing.id} listing={listing}/>)}</div>
              <p className="algorithm-caveat"><b>Paper boundary:</b> INSERT, SEARCH-LAYER, SELECT-NEIGHBORS, and K-NN-SEARCH are the teaching version of Algorithms 1–5. DELETE and UPDATE show the implementation conventions used by this visualizer because the original paper does not define them.</p>
            </div>
          </section>
        </div>
      </div>

      <footer className="guide-footer"><span>You now have the whole path: exact scan → graph → layers → search → insert → delete → pseudocode.</span><button className="button secondary desktop-lesson-action" onClick={onOpenPlayground}>Open or resume Playground →</button><a className="button secondary mobile-lesson-action" href="#four-dot-search">Practice the inline search →</a></footer>
    </div>
  </main>
}
