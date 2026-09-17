import { useMemo } from 'react'
import { connectivity, graphStats } from '../../hnsw/metrics'
import { useViewGraph } from '../../state/store'
import { followLearnReference } from '../../learnReferenceNavigation'

const int = (value: number) => Math.round(value).toLocaleString()

function size(bytes: number) {
  if (bytes < 1024) return `${int(bytes)} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function DetailsPanel() {
  const graph = useViewGraph()
  const { stats, layers, tombstones, dimensions, entry } = useMemo(() => {
    const nextStats = graphStats(graph)
    const nextLayers = graph.entry === null
      ? []
      : [...nextStats.layers].reverse().map((layer) => ({
          ...layer,
          tombstones: [...graph.nodes.values()].filter(
            (node) => node.deleted && node.level >= layer.layer,
          ).length,
          connectivity: connectivity(graph, layer.layer),
        }))
    const nextTombstones = [...graph.nodes.values()]
      .filter((node) => node.deleted)
      .sort((a, b) => a.seq - b.seq)
    const firstNode = graph.nodes.values().next().value

    return {
      stats: nextStats,
      layers: nextLayers,
      tombstones: nextTombstones,
      dimensions: firstNode?.vec.length ?? 0,
      entry: graph.entry === null ? null : graph.nodes.get(graph.entry) ?? null,
    }
  }, [graph])

  const unreachable = layers.filter((layer) => layer.connectivity.orphaned > 0)

  return (
    <div className="pane-scroll details-panel">
      <div className="panel-intro">
        <h2>Current graph</h2>
        <p>A quick summary of the graph on the canvas. It updates as the replay moves.</p>
      </div>

      <section className="graph-summary" aria-label="Graph summary">
        <div><span>Layers</span><strong>{layers.length}</strong></div>
        <div><span>Nodes</span><strong>{int(stats.total)}</strong></div>
        <div><span>Edges</span><strong>{int(stats.edges)}</strong><small>across all layers</small></div>
        <div className={stats.deleted ? 'has-warning' : undefined}><span>Tombstoned</span><strong>{int(stats.deleted)}</strong></div>
      </section>

      <section className="panel-disclosure details-section">
        <div className="details-section-heading"><span>Layer breakdown</span><small>{layers.length ? `${layers.length} layer${layers.length === 1 ? '' : 's'}` : 'Empty graph'}</small></div>
        <div className="panel-disclosure-body">
          <dl className="kv">
            <dt>live dots</dt><dd>{int(stats.live)}</dd>
            <dt>starting dot</dt><dd>{entry ? `${entry.label} · layer ${entry.level}${entry.deleted ? ' · tombstoned' : ''}` : 'none'}</dd>
            <dt>numbers per dot</dt><dd>{dimensions || '—'}</dd>
            <dt>approx. size</dt><dd>{size(stats.bytes)}</dd>
          </dl>
          {layers.length ? <>
          <table className="table graph-layer-table">
            <thead>
              <tr>
                <th>layer</th>
                <th>nodes</th>
                <th>edges</th>
                <th>avg links</th>
                <th>groups</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((layer) => (
                <tr key={layer.layer} className={layer.connectivity.orphaned ? 'has-warning' : undefined}>
                  <td>Layer {layer.layer}</td>
                  <td title={`${layer.tombstones} tombstoned on this layer`}>{int(layer.nodes)}</td>
                  <td>{int(layer.edges)}</td>
                  <td title={`Maximum degree: ${layer.maxDegree}`}>{layer.avgDegree.toFixed(1)}</td>
                  <td>{layer.connectivity.components.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">A dot appears on every layer up to its highest layer. Each connection is counted once.</p>
          {unreachable.length > 0 && (
            <div className="note warn" role="status">
              {unreachable.map((layer) => (
                <div key={layer.layer}>Layer {layer.layer}: {layer.connectivity.orphaned} node{layer.connectivity.orphaned === 1 ? '' : 's'} cannot be reached from the entry point.</div>
              ))}
            </div>
          )}</> : <div className="empty graph-empty"><b>No layers yet</b><span>Add dots or load a shape to build the graph.</span></div>}
        </div>
      </section>

      <section className="panel-disclosure details-section">
        <div className="details-section-heading"><span>Deleted dots</span><small>{tombstones.length}</small></div>
        <div className="panel-disclosure-body">
          <a className="control-deep-link" href="/learn#soft-delete" data-learn-reference onClick={followLearnReference}>What is a tombstone? <span aria-hidden="true">↗</span></a>
          {tombstones.length ? <ul className="tombstone-list">{tombstones.map((node) => <li key={node.id}><span><b>{node.label}</b><small>id {node.id}</small></span><span>{node.level ? `Layers 0–${node.level}` : 'Layer 0'}{node.id === graph.entry ? ' · starting dot' : ''}</span></li>)}</ul> : <p className="tombstone-empty">No deleted dots. A soft-deleted dot can still be used as a route, but it will not appear in results.</p>}
        </div>
      </section>
    </div>
  )
}
