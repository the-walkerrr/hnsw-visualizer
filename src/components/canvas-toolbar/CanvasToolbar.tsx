import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { editsLocked, useApp, useDispatch, useShownLayer, useViewGraph, type Tool } from '../../state/store'
import { ToolIcon } from './ToolIcon'

export function CanvasToolbar() {
  const state = useApp()
  const { viewMode, tool, trace } = state
  const locked = editsLocked(state)
  const graph = useViewGraph()
  const { layer } = useShownLayer()
  const dispatch = useDispatch()
  const top = graph.entry === null ? 0 : graph.topLayer
  const toolLabel = (item: Tool) => item === 'select' ? 'Update' : item[0].toUpperCase() + item.slice(1)

  return <>
    <div className="canvas-overlay tl">
      <div className="segmented" role="group" aria-label="Graph view">
        <button aria-pressed={viewMode === 'stack'} onClick={() => dispatch({ type: 'setViewMode', mode: 'stack' })}>All layers</button>
        <button aria-pressed={viewMode === 'layer'} onClick={() => dispatch({ type: 'setViewMode', mode: 'layer' })}>One layer</button>
      </div>
      {viewMode === 'layer' && <div className="segmented layer-picker" role="group" aria-label="Visible layer">
        {Array.from({ length: top + 1 }, (_, i) => top - i).map((l) => <button key={l} aria-pressed={layer === l} onClick={() => dispatch({ type: 'setLayer', layer: l })}>Layer {l}</button>)}
      </div>}
      {viewMode === 'layer' && trace && <span className="trace-lock">Trace controls layer</span>}
    </div>

    <div className="canvas-overlay tr">
      <AlertDialog.Root>
        <AlertDialog.Trigger asChild><button className="button compact danger clear-graph-button" disabled={locked || graph.nodes.size === 0} title={locked ? 'Finish or end the replay before clearing nodes' : graph.nodes.size === 0 ? 'The graph is already empty' : 'Remove every node'}>Clear nodes</button></AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          <AlertDialog.Content className="dialog-content">
            <AlertDialog.Title className="dialog-title">Clear every node?</AlertDialog.Title>
            <AlertDialog.Description className="dialog-description">This removes all nodes, edges, and the current replay. This cannot be undone.</AlertDialog.Description>
            <div className="dialog-actions"><AlertDialog.Cancel asChild><button className="button compact">Cancel</button></AlertDialog.Cancel><AlertDialog.Action asChild><button className="button compact danger" onClick={() => dispatch({ type: 'script', ops: [{ t: 'clear' }] })}>Clear nodes</button></AlertDialog.Action></div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <div className="tool-selector" role="group" aria-label="Canvas tool">
        {(['search', 'insert', 'select'] as const).map((item) => {
          const label = toolLabel(item)
          return <button key={item} className="tool-btn" disabled={locked || (item === 'search' && graph.nodes.size === 0)} aria-label={label} aria-pressed={tool === item} onClick={() => dispatch({ type: 'setTool', tool: item })} title={label}><ToolIcon tool={item}/></button>
        })}
      </div>
    </div>

  </>
}
