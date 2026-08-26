import { useEffect, useRef } from 'react'
import { LESSONS, type Block } from '../lessons/lessons'
import { useApp, useDispatch, useScript } from '../state/store'
import { RichText } from './RichText'

function BlockView({ block }: { block: Block }) {
  const script = useScript()
  switch (block.t) {
    case 'p':
      return (
        <p>
          <RichText text={block.text} />
        </p>
      )
    case 'ul':
      return (
        <ul>
          {block.items.map((it, i) => (
            <li key={i}>
              <RichText text={it} />
            </li>
          ))}
        </ul>
      )
    case 'note':
      return (
        <div className={`note${block.tone && block.tone !== 'plain' ? ` ${block.tone}` : ''}`}>
          <RichText text={block.text} />
        </div>
      )
    case 'math':
      return <div className="math">{block.text}</div>
    case 'try':
      return (
        <button className="try" onClick={() => script(block.ops)}>
          <span className="arrow">▸</span>
          <span>
            <RichText text={block.text} />
          </span>
        </button>
      )
    case 'kv':
      return (
        <dl className="kv" style={{ gridTemplateColumns: 'auto 1fr', textAlign: 'left', margin: '10px 0' }}>
          {block.pairs.map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt style={{ fontFamily: 'var(--mono)', paddingRight: 8, whiteSpace: 'nowrap' }}>{k}</dt>
              <dd style={{ fontFamily: 'inherit', textAlign: 'left', color: 'var(--text-2)' }}>
                <RichText text={v} />
              </dd>
            </div>
          ))}
        </dl>
      )
  }
}

export function LessonPanel() {
  const { lesson, lessonStep, lessonEpoch } = useApp()
  const dispatch = useDispatch()
  const script = useScript()
  const current = LESSONS[lesson]
  const step = current.steps[Math.min(lessonStep, current.steps.length - 1)]

  // Put the canvas into the state this step is talking about. Moving *within* a
  // lesson deliberately continues from where the previous step left off; opening
  // a *different* lesson starts clean, so a half-played trace from lesson 8
  // cannot still be sitting on the canvas while you read the glossary.
  const lastLesson = useRef(lesson)
  useEffect(() => {
    const changedLesson = lastLesson.current !== lesson
    lastLesson.current = lesson
    const ops = LESSONS[lesson]?.steps[lessonStep]?.ops ?? []
    script(changedLesson ? [{ t: 'closeTrace' }, ...ops] : ops)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, lessonStep, lessonEpoch])

  const last = lessonStep >= current.steps.length - 1
  const first = lessonStep === 0

  return (
    <div className="pane pane-left">
      <div className="lesson-nav">
        <select
          aria-label="Lesson"
          value={lesson}
          onChange={(e) => dispatch({ type: 'setLesson', lesson: Number(e.target.value) })}
        >
          {LESSONS.map((l, i) => (
            <option key={l.title} value={i}>
              {i + 1}. {l.title}
            </option>
          ))}
        </select>
        <button
          className="iconbtn"
          title="Hide the lesson panel and give the canvas more room"
          onClick={() => dispatch({ type: 'toggleLessonPanel' })}
        >
          ✕
        </button>
      </div>

      <div className="pane-scroll lesson">
        <div className="eyebrow">
          Lesson {lesson + 1} · step {lessonStep + 1} of {current.steps.length}
        </div>
        <h2>{step.title}</h2>
        <p style={{ marginTop: 2, color: 'var(--text-3)', fontSize: 12.5 }}>{current.summary}</p>
        {step.blocks.map((b, i) => (
          <BlockView key={i} block={b} />
        ))}
      </div>

      <div className="lesson-foot">
        <button
          className="iconbtn"
          disabled={first && lesson === 0}
          onClick={() =>
            first
              ? dispatch({
                  type: 'setLesson',
                  lesson: lesson - 1,
                  step: LESSONS[lesson - 1].steps.length - 1,
                })
              : dispatch({ type: 'lessonStep', delta: -1 })
          }
        >
          ← back
        </button>
        <div className="progress-dots">
          {current.steps.map((s, i) => (
            <button
              key={i}
              aria-current={i === lessonStep}
              aria-label={s.title}
              title={s.title}
              onClick={() => dispatch({ type: 'setLesson', lesson, step: i })}
            />
          ))}
        </div>
        <button
          className="iconbtn primary"
          disabled={last && lesson === LESSONS.length - 1}
          onClick={() =>
            last
              ? dispatch({ type: 'setLesson', lesson: lesson + 1, step: 0 })
              : dispatch({ type: 'lessonStep', delta: 1 })
          }
        >
          {last ? 'next lesson →' : 'next →'}
        </button>
      </div>
    </div>
  )
}
