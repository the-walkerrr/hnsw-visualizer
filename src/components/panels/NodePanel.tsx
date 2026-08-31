import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { distance } from '../../hnsw/metric'
import { useApp, useDispatch, useViewGraph } from '../../state/store'

export function NodePanel() {
  const state = useApp()
  const graph = useViewGraph()
  const dispatch = useDispatch()
  const node = state.selected !== null ? graph.nodes.get(state.selected) : undefined

  if (!node) {
    return (
      <div className="pane-scroll">
        <div className="panel-intro"><h2>Inspect a node</h2><p>Choose <b>Inspect</b> above the graph, then select a node. Dragging it updates its vector and graph connections.</p></div>
        <div className="empty"><span className="empty-glyph">◎</span><b>No node selected</b><span>Node level, neighbors, distance, and update actions will appear here.</span></div>
      </div>
    )
  }

  const q = state.trace?.steps[state.step]?.vis.query
  return (
    <div className="pane-scroll">
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

      <div className="section-title">Actions</div>
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
      <p className="hint">
        Drag this node on the canvas (with the Inspect tool) to change its vector — that runs an
        update in <b>{state.updateMode}</b> mode.
      </p>
    </div>
  )
}
