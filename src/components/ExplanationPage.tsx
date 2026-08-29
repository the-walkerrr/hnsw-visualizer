import { LESSONS, type Block } from '../lessons/lessons'
import { useScript } from '../state/store'
import { RichText } from './RichText'

function BlockView({ block, onOpenPlayground }: { block: Block; onOpenPlayground: () => void }) {
  const script = useScript()
  if (block.t === 'p') return <p><RichText text={block.text} /></p>
  if (block.t === 'ul') return <ul>{block.items.map((item, i) => <li key={i}><RichText text={item} /></li>)}</ul>
  if (block.t === 'note') return <div className={`note${block.tone && block.tone !== 'plain' ? ` ${block.tone}` : ''}`}><RichText text={block.text} /></div>
  if (block.t === 'math') return <div className="math"><RichText text={block.text} /></div>
  if (block.t === 'kv') return <dl className="kv explain-kv">{block.pairs.map(([key, value]) => <div key={key}><dt>{key}</dt><dd><RichText text={value} /></dd></div>)}</dl>
  return <button className="try" onClick={() => { script(block.ops); onOpenPlayground() }}><span className="arrow">▸</span><span><RichText text={block.text} /></span></button>
}

export function ExplanationPage({ onOpenPlayground }: { onOpenPlayground: () => void }) {
  return <main className="explanation-page">
    <section className="learn-hero">
      <span className="eyebrow">The complete beginner's guide</span>
      <h2>How AI finds similar things — explained from scratch</h2>
      <p>No math background needed. We start from the very basics and build up to the full algorithm. Every section has an interactive example you can run yourself.</p>
      <button className="iconbtn primary" onClick={onOpenPlayground}>Open the playground →</button>
    </section>
    <div className="learn-layout">
      <nav className="learn-toc" aria-label="Guide contents">
        <span className="eyebrow">In this guide</span>
        {LESSONS.map((lesson, i) => <a key={lesson.title} href={`#lesson-${i + 1}`}>{i + 1}. {lesson.title}</a>)}
      </nav>
      <div className="learn-content">
        {LESSONS.map((lesson, lessonIndex) => <article id={`lesson-${lessonIndex + 1}`} className="learn-lesson" key={lesson.title}>
          <div className="eyebrow">Part {lessonIndex + 1}</div>
          <h2>{lesson.title}</h2>
          <p className="lesson-summary">{lesson.summary}</p>
          {lesson.steps.map((step, stepIndex) => <section className="learn-step" key={step.title}>
            <h3>{stepIndex + 1}. {step.title}</h3>
            {step.blocks.map((block, i) => <BlockView key={i} block={block} onOpenPlayground={onOpenPlayground} />)}
          </section>)}
        </article>)}
      </div>
    </div>
  </main>
}
