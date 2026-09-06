import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CanvasToolbar } from "./components/CanvasToolbar";
import { Explainer } from "./components/Explainer";
import { ExplanationPage } from "./components/ExplanationPage";
import { GraphCanvas } from "./components/GraphCanvas";
import { ThemeToggle } from "./components/ThemeToggle";
import { Transport } from "./components/Transport";
import { BuildPanel } from "./components/panels/BuildPanel";
import { CodePanel } from "./components/panels/CodePanel";
import { LabPanel } from "./components/panels/LabPanel";
import { MetricsPanel } from "./components/panels/MetricsPanel";
import { NodePanel } from "./components/panels/NodePanel";
import { ParamsPanel } from "./components/panels/ParamsPanel";
import { graphStats } from "./hnsw/metrics";
import { useApp, useDispatch, useViewGraph, type RightTab } from "./state/store";

const TABS: Array<[RightTab, string, string]> = [
  ["build", "Explore", "Choose dots and run a search"],
  ["params", "Tune", "Change graph and query parameters"],
  ["metrics", "Results", "Compare cost, recall, and graph structure"],
];

const PANELS: Record<RightTab, () => React.JSX.Element> = {
  build: BuildPanel, params: ParamsPanel, code: CodePanel,
  node: NodePanel, metrics: MetricsPanel, lab: LabPanel,
};

type Route = "home" | "learn" | "playground";

function routeFromLocation(): Route {
  if (typeof window === "undefined") return "home";
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/learn") return "learn";
  if (path === "/playground") return "playground";
  return "home";
}

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M5 20 10 7l8 4 5 10M5 20l13-9M10 7l13 14" />
      <circle cx="5" cy="20" r="2.3" /><circle cx="10" cy="7" r="2.3" />
      <circle cx="18" cy="11" r="2.3" /><circle cx="23" cy="21" r="2.3" />
    </svg>
  );
}

function Home({ navigate, onOpenPlayground }: { navigate: (route: Route) => void; onOpenPlayground: () => void }) {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">Visual guide to fast similarity search</p>
          <h2>Learn HNSW by watching it work.</h2>
          <p className="hero-sub">Start with dots connected by lines. Place a search point, watch the algorithm move toward nearby dots, and learn one idea at a time. No vector-database background needed.</p>
          <div className="landing-actions">
            <a className="button primary" href="/playground" onClick={(e) => { e.preventDefault(); onOpenPlayground(); }}>Open playground <span aria-hidden="true">→</span></a>
            <a className="button quiet" href="/learn" onClick={(e) => { e.preventDefault(); navigate("learn"); }}>Learn from the beginning</a>
          </div>
          <p className="hero-footnote">Beginner guide · step-by-step replay · real search results</p>
        </div>
        <div className="hero-figure" aria-label="A query descending through an HNSW graph">
          <div className="figure-head"><span>Search trace</span><code>ef = 8 · k = 3</code></div>
          <svg viewBox="0 0 620 400" role="img" aria-label="Three HNSW layers connected by a search path">
            <g className="figure-plane plane-2"><path d="m128 53 331 0 53 51-331 0Z" /><text x="92" y="73">L2</text><line x1="249" y1="76" x2="408" y2="78" /><circle cx="249" cy="76" r="7" /><circle className="entry" cx="408" cy="78" r="8" /></g>
            <g className="figure-plane plane-1"><path d="m91 151 385 0 61 59-385 0Z" /><text x="54" y="174">L1</text><path d="M206 179 324 182 442 181M324 182l78 19" /><circle cx="206" cy="179" r="6" /><circle className="path" cx="324" cy="182" r="8" /><circle cx="442" cy="181" r="6" /><circle cx="402" cy="201" r="6" /></g>
            <g className="figure-plane plane-0"><path d="m48 264 449 0 71 69-449 0Z" /><text x="12" y="287">L0</text><path d="M136 290 217 304 292 280 365 313 453 286M217 304l148 9M292 280l161 6M136 290l156-10" /><circle cx="136" cy="290" r="6" /><circle cx="217" cy="304" r="6" /><circle className="path" cx="292" cy="280" r="8" /><circle className="result" cx="365" cy="313" r="9" /><circle cx="453" cy="286" r="6" /><path className="query" d="m390 265 12 12m0-12-12 12" /></g>
            <path className="descent" d="M408 86 324 174M324 190l-32 82" />
          </svg>
          <div className="figure-legend"><span><i className="dot entry" /> entry point</span><span><i className="dot path" /> visited</span><span><i className="dot result" /> result</span></div>
        </div>
      </section>
      <section className="landing-index" aria-label="What you can explore">
        <div><span className="index-num">01</span><h3>Understand the map</h3><p>See why nearby dots are connected and why sparse upper layers act like express lanes.</p></div>
        <div><span className="index-num">02</span><h3>Follow one search</h3><p>Move forward and backward through every decision in plain language.</p></div>
        <div><span className="index-num">03</span><h3>Change one setting</h3><p>Open an explanation beside any control, then measure the speed and accuracy trade-off.</p></div>
      </section>
    </main>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromLocation);
  const state = useApp();
  const dispatch = useDispatch();
  const graph = useViewGraph();
  const stats = useMemo(() => graphStats(graph), [graph]);
  const initializedDirectRoute = useRef(false);
  const navigate = useCallback((next: Route) => {
    const path = next === "home" ? "/" : `/${next}`;
    window.history.pushState({}, "", path);
    setRoute(next);
  }, []);
  const openPlayground = useCallback(() => {
    if (state.graph.nodes.size === 0) dispatch({ type: "script", ops: [{ t: "preset", id: state.dataset.id, n: state.dataset.n, seed: state.dataset.seed }, { t: "tool", tool: "search" }] });
    dispatch({ type: "setRightTab", tab: "build" });
    dispatch({ type: "setTool", tool: "search" });
    navigate("playground");
  }, [dispatch, navigate, state.dataset, state.graph.nodes.size]);

  useEffect(() => {
    if (initializedDirectRoute.current) return;
    initializedDirectRoute.current = true;
    if (route === "playground" && state.graph.nodes.size === 0) {
      dispatch({ type: "script", ops: [{ t: "preset", id: state.dataset.id, n: state.dataset.n, seed: state.dataset.seed }, { t: "tool", tool: "search" }] });
    }
  }, [dispatch, route, state.dataset, state.graph.nodes.size]);

  useEffect(() => { const fn = () => setRoute(routeFromLocation()); window.addEventListener("popstate", fn); return () => window.removeEventListener("popstate", fn); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (route !== "playground") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(target.tagName)) return;
      if (e.key === " ") { e.preventDefault(); dispatch({ type: state.playing ? "pause" : "play" }); }
      else if (e.key === "ArrowRight") dispatch({ type: "stepBy", delta: 1 });
      else if (e.key === "ArrowLeft") dispatch({ type: "stepBy", delta: -1 });
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, route, state.playing]);

  const activeTab = state.rightTab;
  const Panel = PANELS[activeTab];
  return (
    <div className={`app route-${route}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="HNSW Explorer home" onClick={(e) => { e.preventDefault(); navigate("home"); }}><Mark /><span>HNSW</span><span className="brand-muted">Explorer</span></a>
        <nav className="page-nav" aria-label="Main navigation"><a href="/learn" aria-current={route === "learn" ? "page" : undefined} onClick={(e) => { e.preventDefault(); navigate("learn"); }}>Learn</a><a href="/playground" aria-current={route === "playground" ? "page" : undefined} onClick={(e) => { e.preventDefault(); openPlayground(); }}>Playground</a></nav>
        <div className="spacer" />
        {route === "playground" && <div className="stat-strip" aria-label="Graph summary"><span><b>{stats.live}</b> dots</span><span><b>{stats.total ? stats.topLayer + 1 : 0}</b> layers</span></div>}
        <ThemeToggle />
      </header>
      {route === "home" ? <Home navigate={navigate} onOpenPlayground={openPlayground} /> : route === "learn" ? <ExplanationPage onOpenPlayground={openPlayground} /> : (
        <main className="playground-layout">
          <section className="workbench" aria-label="Graph visualization and replay"><div className="canvas-stage"><GraphCanvas /><CanvasToolbar /></div><Transport /><Explainer onOpenExplanation={() => navigate("learn")} /></section>
          <aside className="inspector"><div className="inspector-head"><div className="panel-navigation"><div className="tabs" role="tablist" aria-label="Playground panels">{TABS.map(([id, label, title]) => <button key={id} id={`tab-${id}`} role="tab" title={title} aria-selected={activeTab === id} aria-controls="inspector-panel" onClick={() => dispatch({ type: "setRightTab", tab: id })}>{label}</button>)}</div><select className="more-tools" aria-label="More tools" value={TABS.some(([id]) => id === activeTab) ? '' : activeTab} onChange={(e) => dispatch({ type: "setRightTab", tab: e.target.value as RightTab })}><option value="" disabled>More</option><option value="node">Inspect a dot</option><option value="code">Algorithm steps</option><option value="lab">Experiments</option></select></div></div><div id="inspector-panel" className="inspector-panel" role={TABS.some(([id]) => id === activeTab) ? "tabpanel" : "region"} aria-label={TABS.find(([id]) => id === activeTab)?.[1] ?? "More tools"}><Panel /></div></aside>
        </main>
      )}
      <div className="mobile-gate" role="alert"><div><Mark /><p className="eyebrow">Desktop instrument</p><h2>The graph needs more room.</h2><p>Open the interactive playground on a desktop or laptop with a viewport at least 900 px wide.</p><a className="button secondary" href="/learn" onClick={(e) => { e.preventDefault(); navigate("learn"); }}>Read the mobile-friendly guide</a></div></div>
    </div>
  );
}
