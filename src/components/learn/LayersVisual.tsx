import { Visual } from "./Visual";

export function LayersVisual() {
  return (
    <Visual title="High layers make long jumps; the bottom layer finishes the search">
      <svg
        viewBox="0 0 720 300"
        role="img"
        aria-labelledby="layers-title layers-desc"
      >
        <title id="layers-title">A three-layer search route</title>
        <desc id="layers-desc">
          The search moves across a small overview layer, descends through a
          middle layer, and finishes among all dots on the bottom layer.
        </desc>
        <g className="layer-plane">
          <path d="m90 32 525 0 48 45-525 0Z" />
          <path d="m70 120 545 0 48 45-545 0Z" />
          <path d="m50 214 565 0 48 45-565 0Z" />
        </g>
        <g className="layer-label">
          <text x="15" y="58">
            Overview
          </text>
          <text x="15" y="146">
            Middle
          </text>
          <text x="15" y="240">
            All dots
          </text>
        </g>
        <g className="visual-edge">
          <path d="M176 55h277M147 143l112-4 114 6 138-3M115 238l75-7 72 14 75-12 76 18 77-15 83 12" />
        </g>
        <g className="visual-node">
          <circle cx="176" cy="55" r="7" />
          <circle cx="453" cy="55" r="7" />
          <circle cx="147" cy="143" r="6" />
          <circle cx="259" cy="139" r="6" />
          <circle cx="373" cy="145" r="6" />
          <circle cx="511" cy="142" r="6" />
          <circle cx="115" cy="238" r="5" />
          <circle cx="190" cy="231" r="5" />
          <circle cx="262" cy="245" r="5" />
          <circle cx="337" cy="233" r="5" />
          <circle cx="413" cy="251" r="5" />
          <circle cx="490" cy="236" r="5" />
          <circle cx="573" cy="248" r="5" />
        </g>
        <g className="layer-vertical">
          <path d="M176 62 147 136M453 62l58 74M147 149l-32 83M259 145l3 94M373 151l40 94M511 148l62 94" />
        </g>
        <path
          className="search-route"
          d="M176 55h277l58 87-138 3 40 106 77-15"
        />
        <g className="route-points">
          <circle cx="176" cy="55" r="8" />
          <circle cx="453" cy="55" r="8" />
          <circle cx="511" cy="142" r="8" />
          <circle cx="373" cy="145" r="8" />
          <circle cx="413" cy="251" r="8" />
          <circle className="result" cx="490" cy="236" r="9" />
        </g>
      </svg>
      <figcaption>
        Every dot lives on the bottom layer. A few also appear above it,
        creating shortcuts—like highways above neighborhood streets.
      </figcaption>
    </Visual>
  );
}
