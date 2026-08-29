import { WORLD } from '../../hnsw/constants'
import { PRESETS, preset } from '../../hnsw/presets'
import type { PresetId } from '../../hnsw/presets'
import { makeRng } from '../../hnsw/rng'
import { useApp, useDispatch, useScript } from '../../state/store'

export function BuildPanel() {
  const state = useApp()
  const dispatch = useDispatch()
  const script = useScript()
  const { dataset, k, params } = state
  const toolLabel = state.tool === 'insert' ? 'Insert' : 'Search'
  const p = preset(dataset.id)
  const setParams = (patch: Partial<typeof params>) => dispatch({ type: 'setParams', patch })

  const randomPoint = () => {
    const rng = makeRng((Date.now() ^ state.graph.nextSeq) >>> 0)
    return [40 + rng() * (WORLD.width - 80), 40 + rng() * (WORLD.height - 80)] as const
  }

  return (
    <div className="pane-scroll">
      <div className="note accent">
        <strong>Quick start</strong>
        <div className="quickstart">
          <div className="quickstart-step">
            <span className="quickstart-num">1</span>
            <p>Pick <b>Search</b> to watch HNSW find neighbours, or <b>Insert</b> to watch the graph grow.</p>
          </div>
          <div className="quickstart-step">
            <span className="quickstart-num">2</span>
            <p>Click the canvas for an exact spot, or use the sample buttons below for a random example.</p>
          </div>
          <div className="quickstart-step">
            <span className="quickstart-num">3</span>
            <p>Use the replay bar to step through the trace, then open <b>Stats</b> to compare with brute force.</p>
          </div>
        </div>
        <div className="status-row">
          <span className="chip">tool: {toolLabel}</span>
          <span className="chip">{state.trace ? 'replay loaded' : 'click the canvas to begin'}</span>
        </div>
      </div>

      <div className="section-title">Graph</div>

      <div className="field">
        <div className="field-head">
          <label htmlFor="preset">Dataset shape</label>
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
          <label htmlFor="count">Number of vectors</label>
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
        <p className="hint">Smaller graphs make the hierarchy and neighbour choices easier to read.</p>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <button
          className="iconbtn"
          onClick={() => script([{ t: 'preset', id: dataset.id, n: dataset.n, seed: dataset.seed }])}
        >
          Reset graph
        </button>
      </div>

      <div className="section-title">Try It</div>
      <div className="row">
        <button
          className="iconbtn primary"
          onClick={() => script([{ t: 'tool', tool: 'search' }, { t: 'search', at: [...randomPoint()] }])}
        >
          Sample search
        </button>
        <button
          className="iconbtn"
          onClick={() => script([{ t: 'tool', tool: 'insert' }, { t: 'insert', at: [...randomPoint()] }])}
        >
          Sample insert
        </button>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        These run at a random spot. For a precise query or new vector, choose a tool and click on the canvas.
      </p>

      <div className="field" style={{ marginTop: 14 }}>
        <div className="field-head">
          <label htmlFor="k">Results, k</label>
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
        <p className="hint">How many nearest neighbours the search returns.</p>
      </div>

      <div className="section-title">Two Knobs</div>
      <div className="field">
        <div className="field-head">
          <label htmlFor="M">Connections, M</label>
          <span className="val">{params.M}</span>
        </div>
        <input
          id="M"
          type="range"
          min={2}
          max={24}
          value={params.M}
          onChange={(e) => {
            const M = Number(e.target.value)
            setParams({ M, Mmax: M, Mmax0: M * 2, mL: 1 / Math.log(Math.max(M, 2)) })
          }}
        />
        <p className="hint">More edges usually improve recall, but make the graph denser.</p>
      </div>

      <div className="field">
        <div className="field-head">
          <label htmlFor="efs">Search width, ef</label>
          <span className="val">{params.efSearch}</span>
        </div>
        <input
          id="efs"
          type="range"
          min={1}
          max={120}
          value={params.efSearch}
          onChange={(e) => setParams({ efSearch: Number(e.target.value) })}
        />
        <p className="hint">A wider beam checks more candidates and is less likely to miss neighbours.</p>
      </div>
    </div>
  )
}
