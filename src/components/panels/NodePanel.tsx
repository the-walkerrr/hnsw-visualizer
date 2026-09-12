import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useState } from 'react'
import { WORLD } from '../../hnsw/constants'
import { distance } from '../../hnsw/metric'
import { followLearnReference } from '../../learnReferenceNavigation'
import { editsLocked, useApp, useDispatch, useViewGraph } from '../../state/store'

export function NodePanel() {
  const state = useApp()
  const graph = useViewGraph()
  const dispatch = useDispatch()
  const committedNode = state.selected !== null ? state.graph.nodes.get(state.selected) : undefined
  const node = state.selected !== null ? graph.nodes.get(state.selected) ?? committedNode : undefined
  const nodes = [...state.graph.nodes.values()].sort((a, b) => a.seq - b.seq)
  const [pendingMove, setPendingMove] = useState<[number, number] | null>(null)
  const updateLocked = editsLocked(state)

  const picker = (
    <div className="field node-picker">
      <label htmlFor="node-picker">Node</label>
      <select
        id="node-picker"
        value={state.selected ?? ''}
        disabled={nodes.length === 0}
        onChange={(event) =>
          dispatch({ type: 'select', id: event.target.value ? Number(event.target.value) : null })
        }
      >
        <option value="">Select a node…</option>
        {nodes.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.label} · id {candidate.id}{candidate.deleted ? ' · tombstoned' : ''}
          </option>
        ))}
      </select>
      <p className="hint">Keyboard alternative to selecting a node on the graph.</p>
    </div>
  )

  const updateStrategy = (
    <div className="field update-strategy">
      <span className="field-label">Update strategy</span>
      <div className="segmented full" role="group" aria-label="Update strategy">
        <button disabled={updateLocked} aria-pressed={state.updateMode === 'reinsert'} onClick={() => dispatch({ type: 'setUpdateMode', mode: 'reinsert' })}>Reinsert</button>
        <button disabled={updateLocked} aria-pressed={state.updateMode === 'in-place'} onClick={() => dispatch({ type: 'setUpdateMode', mode: 'in-place' })}>In place</button>
      </div>
      <p className="hint">{state.updateMode === 'reinsert' ? 'Rebuilds this dot’s links and redraws its random highest layer. Safer, with more work.' : 'Replaces the vector and repairs nearby links. Faster, but repeated updates can weaken the graph.'}</p>
      <a className="control-deep-link" href="/learn#algorithm-update" data-learn-reference onClick={followLearnReference}>How updates work <span aria-hidden="true">↗</span></a>
    </div>
  )

  if (!node) {
    return (
      <div className="pane-scroll">
        <div className="panel-intro"><p className="section-kicker">Update</p><h2>Change a dot.</h2><p>Choose how updates behave, then select a dot to move, restore, or delete.</p></div>
        {updateStrategy}
        {picker}
        <div className="empty"><span className="empty-glyph">◎</span><b>No node selected</b><span>Node level, neighbors, distance, and update actions will appear here.</span></div>
      </div>
    )
  }

  const q = state.trace?.steps[state.step]?.vis.query
  return (
    <div className="pane-scroll">
      <div className="panel-intro"><p className="section-kicker">Update</p><h2>Change a dot.</h2><p>Choose a dot and an update strategy before moving or deleting it.</p></div>
      {updateStrategy}
      {picker}
      <div className="section-title">Node {node.label}</div>
      <dl className="kv">
        <dt>id</dt>
        <dd>{node.id}</dd>
        <dt>vector</dt>
        <dd>
          [{node.vec[0].toFixed(1)}, {node.vec[1].toFixed(1)}]
        </dd>
        <dt>top layer</dt>
        <dd>{node.level}</dd>
        <dt>insertion order</dt>
        <dd>#{node.seq}</dd>
        <dt>state</dt>
        <dd>{node.deleted ? 'tombstoned' : 'live'}</dd>
        <dt>entry point</dt>
        <dd>{graph.entry === node.id ? 'yes' : 'no'}</dd>
        {q && (
          <>
            <dt>distance to q</dt>
            <dd>{distance(q, node.vec, state.params.metric).toFixed(1)}</dd>
          </>
        )}
      </dl>

      <div className="section-title">Edges</div>
      {node.neighbors.map((ns, lc) => (
        <div className="field" key={lc}>
          <div className="field-head">
            <span>
              layer {lc}
              {lc === 0 ? ' (every node lives here)' : ''}
            </span>
            <span className="val">
              {ns.length}/{lc === 0 ? state.params.Mmax0 : state.params.Mmax}
            </span>
          </div>
          {ns.length === 0 ? (
            <p className="hint">
              No edges — nothing can reach this node on this layer.
            </p>
          ) : (
            <div className="neighbor-pills">
              {ns
                .map((id) => ({ id, n: graph.nodes.get(id) }))
                .sort(
                  (a, b) =>
                    (a.n ? distance(node.vec, a.n.vec, state.params.metric) : 0) -
                    (b.n ? distance(node.vec, b.n.vec, state.params.metric) : 0),
                )
                .map(({ id, n }) => (
                  <button
                    key={id}
                    className="pill"
                    title={
                      n ? `distance ${distance(node.vec, n.vec, state.params.metric).toFixed(1)}` : ''
                    }
                    onClick={() => dispatch({ type: 'select', id })}
                  >
                    {n?.label ?? id}
                  </button>
                ))}
            </div>
          )}
        </div>
      ))}

      <fieldset className="node-actions panel-fields" disabled={editsLocked(state) || !committedNode}>
      <legend className="section-title">Actions</legend>
      <div className="node-delete-actions">
        <div className="row">
          {node.deleted ? (
            <button className="iconbtn" onClick={() => dispatch({ type: 'restoreNode', id: node.id })}>
              restore
            </button>
          ) : (
            <button
              className="iconbtn"
              title="Flag it as deleted but leave the graph untouched"
              onClick={() => dispatch({ type: 'deleteNode', id: node.id, mode: 'soft' })}
            >
              soft delete
            </button>
          )}
          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <button
                className="iconbtn danger"
                title="Remove it and repair its neighbours"
                aria-label="Hard delete this node"
              >
                hard delete
              </button>
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className="dialog-overlay" />
              <AlertDialog.Content className="dialog-content">
                <AlertDialog.Title className="dialog-title">
                  Remove node {node.label}?
                </AlertDialog.Title>
                <AlertDialog.Description className="dialog-description">
                  This permanently removes the vector and repairs its neighbours. This cannot be undone.
                </AlertDialog.Description>
                <div className="dialog-actions">
                  <AlertDialog.Cancel asChild>
                    <button className="iconbtn">Cancel</button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <button
                      className="iconbtn danger"
                      onClick={() => dispatch({ type: 'deleteNode', id: node.id, mode: 'hard' })}
                    >
                      Hard delete
                    </button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </div>
        <nav className="delete-reference-links" aria-label="Delete explanations">
          <a href="/learn#soft-delete" data-learn-reference onClick={followLearnReference}>
            Soft delete explained <span aria-hidden="true">↗</span>
          </a>
          <a href="/learn#hard-delete" data-learn-reference onClick={followLearnReference}>
            Hard delete explained <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </div>
      <form
        key={`${committedNode?.id}:${committedNode?.vec.join(',')}`}
        className="coordinate-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!committedNode) return
          const data = new FormData(event.currentTarget)
          const rawX = data.get('x')
          const rawY = data.get('y')
          if (typeof rawX !== 'string' || typeof rawY !== 'string' || !rawX || !rawY) return
          const nextX = Number(rawX)
          const nextY = Number(rawY)
          if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return
          setPendingMove([
            Math.min(WORLD.width, Math.max(0, nextX)),
            Math.min(WORLD.height, Math.max(0, nextY)),
          ])
        }}
      >
        <div className="coordinate-grid">
          <label htmlFor="node-x">X coordinate</label>
          <input
            id="node-x"
            type="number"
            min="0"
            max={WORLD.width}
            step="any"
            name="x"
            required
            defaultValue={committedNode?.vec[0]}
          />
          <label htmlFor="node-y">Y coordinate</label>
          <input
            id="node-y"
            type="number"
            min="0"
            max={WORLD.height}
            step="any"
            name="y"
            required
            defaultValue={committedNode?.vec[1]}
          />
        </div>
        <button className="iconbtn" type="submit">Move node</button>
      </form>
      <p className="hint">
        Enter coordinates above or drag this node on the canvas with the Update tool. Either method
        runs an update in <b>{state.updateMode}</b> mode. {state.updateMode === 'reinsert' && 'This redraws its random highest layer as well as its links; layer membership does not depend on where you drag.'}
      </p>
      </fieldset>
      <AlertDialog.Root open={pendingMove !== null} onOpenChange={(open) => { if (!open) setPendingMove(null) }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          <AlertDialog.Content className="dialog-content">
            <AlertDialog.Title className="dialog-title">Move node {node.label}?</AlertDialog.Title>
            <AlertDialog.Description className="dialog-description">
              Moving this node to [{pendingMove?.[0].toFixed(1)}, {pendingMove?.[1].toFixed(1)}] will update its links using <b>{state.updateMode}</b> mode.
            </AlertDialog.Description>
            <div className="dialog-actions">
              <AlertDialog.Cancel asChild><button className="iconbtn">Cancel</button></AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button className="iconbtn" onClick={() => {
                  if (pendingMove && committedNode) dispatch({ type: 'moveNode', id: committedNode.id, to: pendingMove })
                  setPendingMove(null)
                }}>Move node</button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
