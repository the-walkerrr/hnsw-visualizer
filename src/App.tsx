import { useCallback, useEffect, useState } from "react";
import { CanvasToolbar } from "./components/CanvasToolbar";
import { Explainer } from "./components/Explainer";
import { ExplanationPage } from "./components/ExplanationPage";
import { GraphCanvas } from "./components/GraphCanvas";
import { ThemeToggle } from "./components/ThemeToggle";
import { Transport } from "./components/Transport";
import { BuildPanel } from "./components/panels/BuildPanel";
import { CodePanel } from "./components/panels/CodePanel";
import { MetricsPanel } from "./components/panels/MetricsPanel";
import { graphStats } from "./hnsw/metrics";
import {
  useApp,
  useDispatch,
  useViewGraph,
  type RightTab,
} from "./state/store";

const TABS: Array<[RightTab, string, string]> = [
  ["build", "Setup", "Build the graph and run operations"],
  ["code", "Steps", "Follow the pseudocode step by step"],
  ["metrics", "Stats", "See search cost and recall"],
];

type Route = "home" | "learn" | "playground";

function routeFromLocation(): Route {
  if (typeof window === "undefined") return "home";
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/learn") return "learn";
  if (path === "/playground") return "playground";
  return "home";
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromLocation);
  const state = useApp();
  const dispatch = useDispatch();
  const graph = useViewGraph();
  const stats = graphStats(graph);

  const navigate = useCallback((next: Route) => {
    const path = next === "home" ? "/" : `/${next}`;
    window.history.pushState({}, "", path);
    setRoute(next);
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (route !== "playground") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      if (e.key === " ") {
        e.preventDefault();
        dispatch({ type: state.playing ? "pause" : "play" });
      } else if (e.key === "ArrowRight") {
        dispatch({ type: "stepBy", delta: 1 });
      } else if (e.key === "ArrowLeft") {
        dispatch({ type: "stepBy", delta: -1 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, route, state.playing]);

  const activeTab: RightTab =
    state.rightTab === "code" || state.rightTab === "metrics" ? state.rightTab : "build";
  const Panel = {
    build: BuildPanel,
    code: CodePanel,
    metrics: MetricsPanel,
  }[activeTab];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>HNSW Explorer</h1>
          <span>Learn how AI finds similar things</span>
        </div>
        <nav className="page-nav" aria-label="Main navigation">
          <a
            href="/learn"
            aria-current={route === "learn" ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate("learn");
            }}
          >
            Learn HNSW
          </a>
          <a
            href="/playground"
            aria-current={route === "playground" ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate("playground");
            }}
          >
            Playground
          </a>
        </nav>
        <div className="spacer" />
        {route === "playground" && (
          <div className="stat-strip">
            <div className="stat">
              <b>{stats.live}</b>
              <span>vectors</span>
            </div>
            <div className="stat">
              <b>{stats.total ? stats.topLayer + 1 : 0}</b>
              <span>layers</span>
            </div>
            <div className="stat">
              <b>{stats.edges}</b>
              <span>edges</span>
            </div>
            <div className="stat">
              <b>{state.params.M}</b>
              <span>M</span>
            </div>
            <div className="stat">
              <b>{state.params.efSearch}</b>
              <span>ef search</span>
            </div>
            {stats.deleted > 0 && (
              <div className="stat">
                <b>{stats.deleted}</b>
                <span>tombstoned</span>
              </div>
            )}
          </div>
        )}
        <ThemeToggle />
      </header>

      {route === "home" ? (
        <main className="landing-page">
          <div className="landing-hero">
            <span className="hero-badge">Free &amp; Open Source</span>
            <h2>
              Learn how AI finds<br />
              <span className="hero-gradient">similar things instantly</span>
            </h2>
            <p className="hero-sub">
              HNSW is the secret algorithm that powers fast AI search in apps like ChatGPT,
              Google, and Spotify. This is the only guide you'll ever need —
              with an interactive playground to see it work step by step.
            </p>
            <div className="landing-actions">
              <a
                className="iconbtn primary"
                href="/learn"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("learn");
                }}
              >
                Start Learning — it's free →
              </a>
              <a
                className="iconbtn"
                href="/playground"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("playground");
                }}
              >
                Open playground
              </a>
            </div>
          </div>
          <div className="landing-features">
            <div className="feature-card">
              <div className="feature-icon">📖</div>
              <h3>Plain English Guide</h3>
              <p>No math degree needed. We explain every concept from scratch with real-world analogies.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎮</div>
              <h3>Interactive Playground</h3>
              <p>Insert vectors, run searches, and watch the algorithm navigate layer by layer in real time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔬</div>
              <h3>See Every Step</h3>
              <p>Pause, rewind, and replay every decision the algorithm makes. Nothing is hidden.</p>
            </div>
          </div>
        </main>
      ) : route === "learn" ? (
        <ExplanationPage onOpenPlayground={() => navigate("playground")} />
      ) : (
        <div className="layout">
          <section className="pane pane-center">
            <div
              style={{
                position: "relative",
                display: "flex",
                flex: 1,
                minHeight: 0,
              }}
            >
              <GraphCanvas />
              <CanvasToolbar />
            </div>
            <Transport />
            <Explainer onOpenExplanation={() => navigate("learn")} />
          </section>

          <aside className="pane">
            <div className="tabs" role="tablist">
              {TABS.map(([id, label, title]) => (
                <button
                  key={id}
                  role="tab"
                  title={title}
                  aria-selected={activeTab === id}
                  onClick={() => dispatch({ type: "setRightTab", tab: id })}
                >
                  {label}
                </button>
              ))}
            </div>
            <Panel />
          </aside>
        </div>
      )}
      <div className="mobile-gate" role="alert">
        <div>
          <p className="eyebrow">Desktop experience</p>
          <h2>HNSW Explorer is best explored on a larger screen.</h2>
          <p>
            Its interactive graph and step-by-step controls need more room.
            Please reopen this site on a desktop or laptop.
          </p>
        </div>
      </div>
    </div>
  );
}
