import { WORLD } from '../../hnsw/constants'
import { PRESETS, preset } from '../../hnsw/presets'
import type { PresetId } from '../../hnsw/presets'
import { makeRng } from '../../hnsw/rng'
import { useApp, useDispatch, useScript } from '../../state/store'

export function BuildPanel() {
  const state = useApp()
  const dispatch = useDispatch()
  const script = useScript()
  const { dataset, k, animate, deleteMode, updateMode } = state
  const p = preset(dataset.id)

  const randomPoint = () => {
    const rng = makeRng((Date.now() ^ state.graph.nextSeq) >>> 0)
    return [40 + rng() * (WORLD.width - 80), 40 + rng() * (WORLD.height - 80)] as const
  }

  return (
    <div className="pane-scroll">
      <div className="section-title">Dataset</div>
      <div className="field">
        <div className="field-head">
          <label htmlFor="preset">shape</label>
        </div>
        <select
          id="preset"
          value={dataset.id}
          onChange={(e) =>
            script([{ t: 'preset', id: e.target.value as PresetId, n: dataset.n, seed: dataset.seed }])
          }
        >
          {PRESETS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <p className="hint">{p.blurb}</p>
      </div>

      <div className="field">
        <div className="field-head">
          <label htmlFor="count">vectors</label>
          <span className="val">{dataset.n}</span>
        </div>
        <input
          id="count"
          type="range"
          min={4}
          max={400}
          step={4}
          value={dataset.n}
          onChange={(e) =>
            script([{ t: 'preset', id: dataset.id, n: Number(e.target.value), seed: dataset.seed }])
          }
        />
        <p className="hint">
          Small graphs (under ~60) are the ones you can actually read. Push it to 400 to see the
          cost curves behave like a real index.
        </p>
      </div>

      <div className="field">
        <div className="field-head">
          <label htmlFor="seed">dataset seed</label>
          <span className="val">{dataset.seed}</span>
        </div>
        <div className="row tight">
          <input
            id="seed"
            type="number"
            value={dataset.seed}
            onChange={(e) =>
              script([{ t: 'preset', id: dataset.id, n: dataset.n, seed: Number(e.target.value) }])
            }
          />
          <button
            className="iconbtn"
            onClick={() =>
              script([
                { t: 'preset', id: dataset.id, n: dataset.n, seed: (dataset.seed + 1) % 10000 },
              ])
            }
          >
            reroll
          </button>
        </div>
      </div>

      <div className="row">
        <button
          className="iconbtn"
          onClick={() => script([{ t: 'preset', id: dataset.id, n: dataset.n, seed: dataset.seed }])}
        >
          rebuild
        </button>
        <button
          className="iconbtn"
          title="Add the same shape again on top of the existing graph"
          onClick={() =>
            script([
              { t: 'preset', id: dataset.id, n: dataset.n, seed: dataset.seed + 500, append: true },
            ])
          }
        >
          append
        </button>
        <button className="iconbtn danger" onClick={() => script([{ t: 'clear' }])}>
          clear
        </button>
      </div>

      <div className="section-title">Operations</div>
      <div className="row">
        <button
          className="iconbtn"
          onClick={() => script([{ t: 'tool', tool: 'search' }, { t: 'search', at: [...randomPoint()] }])}
        >
          random search
        </button>
        <button
          className="iconbtn"
          onClick={() => script([{ t: 'tool', tool: 'insert' }, { t: 'insert', at: [...randomPoint()] }])}
        >
          random insert
        </button>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <div className="field-head">
          <label htmlFor="k">k — how many neighbours to return</label>
          <span className="val">{k}</span>
        </div>
        <input
          id="k"
          type="range"
          min={1}
          max={20}
          value={k}
          onChange={(e) => dispatch({ type: 'setK', k: Number(e.target.value) })}
        />
        <p className="hint">
          The search always uses ef ≥ k — asking for more results than the beam is wide would be
          self-defeating.
        </p>
      </div>

      <div className="field">
        <div className="field-head">
          <span>delete mode</span>
        </div>
        <div className="segmented" role="group">
          {(['soft', 'hard'] as const).map((m) => (
            <button
              key={m}
              aria-pressed={deleteMode === m}
              onClick={() => dispatch({ type: 'setDeleteMode', mode: m })}
            >
              {m === 'soft' ? 'soft (tombstone)' : 'hard (repair)'}
            </button>
          ))}
        </div>
        <p className="hint">
          {deleteMode === 'soft'
            ? 'What every production library does by default: flag it, keep the edges, filter it out of results.'
            : 'Actually remove the node and repair its orphaned neighbours. Reclaims memory, slowly degrades the graph.'}
        </p>
      </div>

      <div className="field">
        <div className="field-head">
          <span>update mode (drag a node with the select tool)</span>
        </div>
        <div className="segmented" role="group">
          {(['reinsert', 'in-place'] as const).map((m) => (
            <button
              key={m}
              aria-pressed={updateMode === m}
              onClick={() => dispatch({ type: 'setUpdateMode', mode: m })}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="hint">
          {updateMode === 'reinsert'
            ? 'Hard-delete then insert again: the node gets a fresh, globally-searched neighbourhood.'
            : 'Overwrite the vector and re-link from the 2-hop neighbourhood only. Cheap, and wrong if the vector moved far.'}
        </p>
      </div>

      <div className="checkline">
        <input
          id="animate"
          type="checkbox"
          checked={animate}
          onChange={() => dispatch({ type: 'toggleAnimate' })}
        />
        <label htmlFor="animate">
          Step through operations
          <span className="hint" style={{ display: 'block' }}>
            Off = apply instantly. Useful when you just want to build a graph quickly.
          </span>
        </label>
      </div>

      <div className="section-title">History</div>
      {state.log.length === 0 ? (
        <div className="empty">Nothing yet.</div>
      ) : (
        <ul className="log">
          {state.log.map((l) => (
            <li key={l.id}>
              <span>{l.label}</span>
              <span>{l.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
