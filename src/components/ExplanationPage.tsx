import { LESSONS, type Block } from '../lessons/lessons'
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

export function ExplanationPage({ onOpenPlayground }: { onOpenPlayground: () => void }) {
  return <main className="explanation-page">
    <header className="learn-hero">
      <div><p className="eyebrow">HNSW field guide</p><h1>From vectors to a navigable small world.</h1></div>
      <div><p>Ten concise chapters explain the index from first principles. Each example can open the playground in the exact state being discussed.</p><button className="button primary" onClick={onOpenPlayground}>Open playground <span aria-hidden="true">→</span></button></div>
    </header>
    <div className="learn-layout">
      <nav className="learn-toc" aria-label="Guide contents"><span className="toc-label">Contents</span>{LESSONS.map((lesson, i) => <a key={lesson.title} href={`#lesson-${i + 1}`}><span>{String(i + 1).padStart(2, '0')}</span>{lesson.title}</a>)}</nav>
      <div className="learn-content">
        {LESSONS.map((lesson, lessonIndex) => <article id={`lesson-${lessonIndex + 1}`} className="learn-lesson" key={lesson.title}>
          <header><span className="chapter-num">{String(lessonIndex + 1).padStart(2, '0')}</span><div><h2>{lesson.title}</h2><p className="lesson-summary">{lesson.summary}</p></div></header>
          {lesson.steps.map((step, stepIndex) => <section className="learn-step" key={step.title}><h3><span>{stepIndex + 1}</span>{step.title}</h3>{step.blocks.map((block, i) => <BlockView key={i} block={block} onOpenPlayground={onOpenPlayground} />)}</section>)}
        </article>)}
      </div>
    </div>
  </main>
}
