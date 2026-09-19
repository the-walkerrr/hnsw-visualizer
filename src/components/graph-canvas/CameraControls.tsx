import { GRAPH_LABEL_SCALES, type GraphLabelScale } from '../../state/store'
import { DEFAULT_CAMERA, ZOOM_MAX, ZOOM_MIN, isFramed, type Camera } from '../camera'
import { TraceLegend } from '../canvas-toolbar/TraceLegend'

export function CameraControls({
  cam,
  stacked,
  onZoom,
  onReset,
  onYaw,
  onPitch,
  labelScale,
  onLabelScale,
  isFullscreen,
  onToggleFullscreen,
}: {
  cam: Camera
  stacked: boolean
  onZoom: (factor: number) => void
  onReset: () => void
  onYaw: (delta: number) => void
  onPitch: (delta: number) => void
  labelScale: GraphLabelScale
  onLabelScale: (scale: GraphLabelScale) => void
  isFullscreen: boolean
  onToggleFullscreen?: () => void
}) {
  const step = Math.PI / 12
  const labelIndex = GRAPH_LABEL_SCALES.indexOf(labelScale)
  return (
    <div className="canvas-footer">
      <TraceLegend />
      <div className="canvas-footer-actions">
        <details className="graph-settings">
          <summary aria-label="Graph display settings" title="Graph display settings">
            <svg className="gear-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>
          </summary>
          <div className="graph-settings-popover">
            {stacked && <div className="graph-settings-group">
              <span>Rotate and tilt</span>
              <div className="segmented" role="group" aria-label="Orientation">
                <button aria-label="Rotate left" title="Spin the stack left ( [ )" onClick={() => onYaw(-step)}>↺</button>
                <button aria-label="Rotate right" title="Spin the stack right ( ] )" onClick={() => onYaw(step)}>↻</button>
                <button aria-label="Tilt toward edge-on" title="Tilt towards edge-on ( , )" onClick={() => onPitch(-0.05)}>⌄</button>
                <button aria-label="Tilt toward top-down" title="Tilt towards top-down ( . )" onClick={() => onPitch(0.05)}>⌃</button>
              </div>
            </div>}
            <div className="graph-settings-group">
              <span>Text size</span>
              <div className="segmented" role="group" aria-label="Graph text size">
                <button aria-label="Decrease graph text size" title="Decrease graph text size" disabled={labelIndex === 0} onClick={() => onLabelScale(GRAPH_LABEL_SCALES[Math.max(0, labelIndex - 1)])}>A−</button>
                <button aria-label="Reset graph text size" title="Reset graph text size" disabled={labelScale === 1} onClick={() => onLabelScale(1)}>{Math.round(labelScale * 100)}%</button>
                <button aria-label="Increase graph text size" title="Increase graph text size" disabled={labelIndex === GRAPH_LABEL_SCALES.length - 1} onClick={() => onLabelScale(GRAPH_LABEL_SCALES[Math.min(GRAPH_LABEL_SCALES.length - 1, labelIndex + 1)])}>A+</button>
              </div>
            </div>
            <div className="graph-settings-group">
              <span>Zoom</span>
              <div className="segmented" role="group" aria-label="Zoom">
                <button aria-label="Zoom out" title="Zoom out ( − )" onClick={() => onZoom(1 / 1.3)} disabled={cam.z <= ZOOM_MIN}>−</button>
                <button aria-label="Zoom in" title="Zoom in ( + )" onClick={() => onZoom(1.3)} disabled={cam.z >= ZOOM_MAX}>+</button>
                <button aria-label="Reset view" title="Reset the view ( 0 )" onClick={onReset} disabled={isFramed(cam) && cam.yaw === DEFAULT_CAMERA.yaw && cam.pitch === DEFAULT_CAMERA.pitch}>{isFramed(cam) ? 'fit' : `${cam.z.toFixed(1)}×`}</button>
              </div>
            </div>
          </div>
        </details>
        <button className="graph-footer-button" aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={onToggleFullscreen}>
          <svg viewBox="0 0 20 20" aria-hidden="true">{isFullscreen ? <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5"/> : <path d="M8 3H3v5M12 3h5v5M8 17H3v-5M12 17h5v-5"/>}</svg>
        </button>
      </div>
    </div>
  )
}
