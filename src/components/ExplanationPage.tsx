import { useEffect } from 'react'
import { LESSONS, type Block } from '../lessons/lessons'
import { CONTROL_GUIDES, type ControlGuide, type ControlGuideKey } from '../lessons/controlGuides'
import { useScript } from '../state/store'
import { RichText } from './RichText'

function BlockView({ block, onOpenPlayground }: { block: Block; onOpenPlayground: () => void }) {
  const script = useScript()
  if (block.t === 'p') return <p><RichText text={block.text} /></p>
  if (block.t === 'ul') return <ul>{block.items.map((item, i) => <li key={i}><RichText text={item} /></li>)}</ul>
  if (block.t === 'note') return <aside className={`note${block.tone && block.tone !== 'plain' ? ` ${block.tone}` : ''}`}><RichText text={block.text} /></aside>
  if (block.t === 'math') return <div className="math"><RichText text={block.text} /></div>
  if (block.t === 'kv') return <dl className="kv explain-kv">{block.pairs.map(([key, value]) => <div key={key}><dt>{key}</dt><dd><RichText text={value} /></dd></div>)}</dl>
  return <button className="try" onClick={() => { script(block.ops); onOpenPlayground() }}><span className="try-label">Run in playground</span><span><RichText text={block.text} /></span><span className="arrow" aria-hidden="true">→</span></button>
}

const CONTROL_GROUPS: Array<{ title: string; keys: ControlGuideKey[] }> = [
  { title: 'Set up the example', keys: ['dataset', 'vectors', 'k'] },
  { title: 'The three settings to learn first', keys: ['M', 'efConstruction', 'efSearch'] },
  { title: 'Distance and layers', keys: ['metric', 'mL', 'seed'] },
  { title: 'Advanced edge rules', keys: ['Mmax', 'Mmax0', 'neighborRule', 'extendCandidates', 'keepPrunedConnections'] },
]

function ControlCard({ guide }: { guide: ControlGuide }) {
  return <article id={guide.id} className="control-card">
    <h3>{guide.label}</h3>
    <p>{guide.plain}</p>
    <div className="direction-grid">
      <div><span>Decrease / off</span><p>{guide.lower}</p></div>
      <div><span>Increase / on</span><p>{guide.higher}</p></div>
    </div>
    <p className="control-when">{guide.when}</p>
  </article>
}

export function ExplanationPage({ onOpenPlayground }: { onOpenPlayground: () => void }) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    const frame = window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return <main className="explanation-page">
    <header className="learn-hero">
      <div><p className="eyebrow">Learn HNSW from zero</p><h1>A fast search made from dots and shortcuts.</h1></div>
      <div><p>No prior knowledge of vector databases is needed. Start with the five-minute picture, try one search, and only then move into the optional deeper chapters.</p><button className="button primary" onClick={onOpenPlayground}>Try the playground <span aria-hidden="true">→</span></button></div>
    </header>
    <div className="learn-layout">
      <nav className="learn-toc" aria-label="Guide contents"><span className="toc-label">Start here</span><a href="#start-here"><span>01</span>The five-minute picture</a><a href="#parameter-guide"><span>02</span>Every playground control</a><span className="toc-label toc-group">Go deeper</span>{LESSONS.map((lesson, i) => <a key={lesson.title} href={`#lesson-${i + 1}`}><span>{String(i + 1).padStart(2, '0')}</span>{lesson.title}</a>)}</nav>
      <div className="learn-content">
        <section id="start-here" className="beginner-start">
          <p className="section-kicker">The five-minute picture</p>
          <h2>First, what problem are we solving?</h2>
          <p className="beginner-lead">Imagine a music app with millions of songs. A new song arrives, and you want the five songs that sound most similar. Checking every song would work, but it gets slow. <strong>HNSW builds a map of shortcuts so the search can inspect only a small part of the collection.</strong></p>

          <div className="idea-steps" aria-label="HNSW in four steps">
            <div><span>1</span><h3>Turn items into dots</h3><p>A vector is just a list of numbers that describes an item. Similar items become nearby dots.</p></div>
            <div><span>2</span><h3>Connect nearby dots</h3><p>Each dot stores links to a few useful neighbors. Together the links form a graph, like roads between towns.</p></div>
            <div><span>3</span><h3>Add express lanes</h3><p>Sparse upper layers make long jumps. The bottom layer contains every dot and handles the final, precise search.</p></div>
            <div><span>4</span><h3>Walk toward the query</h3><p>Start high, follow links that get closer, drop a layer, and repeat. Return the nearest dots found.</p></div>
          </div>

          <aside className="analogy-card">
            <span>One useful analogy</span>
            <p>Think of finding a café in an unfamiliar city. A highway gets you into the right neighborhood; main roads get you closer; local streets finish the trip. HNSW’s layers do the same job for similar items.</p>
          </aside>

          <h3 className="mini-title">Only four words matter at first</h3>
          <dl className="beginner-terms">
            <div><dt>vector</dt><dd>One stored item, represented as numbers. On this site it is drawn as a dot.</dd></div>
            <div><dt>distance</dt><dd>A score for how different two vectors are. Smaller distance means more similar.</dd></div>
            <div><dt>k</dt><dd>How many nearest items you want back.</dd></div>
            <div><dt>recall</dt><dd>How many of the truly nearest items the fast search actually found.</dd></div>
          </dl>

          <div className="first-experiment">
            <div><span>Try this first</span><h3>Run one search before changing settings</h3><p>Open the playground, choose <b>Search</b>, click near a group of dots, then use the step buttons below the graph. Green rings are returned results; the query is the pink cross.</p></div>
            <button className="button primary" onClick={onOpenPlayground}>Run a first search <span aria-hidden="true">→</span></button>
          </div>
        </section>

        <section id="parameter-guide" className="parameter-guide">
          <p className="section-kicker">Playground control guide</p>
          <h2>What every control changes</h2>
          <p className="section-intro">You do not need to tune everything. Start with <b>M</b>, <b>efConstruction</b>, and <b>efSearch</b>. Every control below explains the low/high trade-off and whether it rebuilds the graph.</p>
          {CONTROL_GROUPS.map((group) => <section className="control-group" key={group.title}><h3>{group.title}</h3><div className="control-card-grid">{group.keys.map((key) => <ControlCard key={key} guide={CONTROL_GUIDES[key]}/>)}</div></section>)}
        </section>

        <div className="deep-dive-heading"><p className="section-kicker">Optional deep dive</p><h2>See the algorithm step by step</h2><p>The chapters below add detail in small pieces. Use each “Run in playground” example when the words feel abstract.</p></div>
        {LESSONS.map((lesson, lessonIndex) => <article id={`lesson-${lessonIndex + 1}`} className="learn-lesson" key={lesson.title}>
          <header><span className="chapter-num">{String(lessonIndex + 1).padStart(2, '0')}</span><div><h2>{lesson.title}</h2><p className="lesson-summary">{lesson.summary}</p></div></header>
          {lesson.steps.map((step, stepIndex) => <section className="learn-step" key={step.title}><h3><span>{stepIndex + 1}</span>{step.title}</h3>{step.blocks.map((block, i) => <BlockView key={i} block={block} onOpenPlayground={onOpenPlayground} />)}</section>)}
        </article>)}
      </div>
    </div>
  </main>
}
