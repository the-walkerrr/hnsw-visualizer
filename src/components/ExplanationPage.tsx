import { useEffect, useRef, useState } from "react";
import {
  LEARN_REFERENCE_EVENT,
  prepareLearnReturn,
  readLearnReturnPoint,
  type LearnReturnPoint,
} from "../learnReferenceNavigation";
import {
  SECTION_IDS,
  SECTION_NAV,
  sectionFor,
  type SectionId,
} from "./learn/sections";
import { SectionPager } from "./learn/SectionPager";
import { ProblemChapter } from "./learn/ProblemChapter";
import { SearchChapter } from "./learn/SearchChapter";
import { InsertChapter } from "./learn/InsertChapter";
import { DeleteChapter } from "./learn/DeleteChapter";
import { PracticeChapter } from "./learn/PracticeChapter";
import { AdvancedChapter } from "./learn/AdvancedChapter";

export function ExplanationPage({
  onOpenPlayground,
  onStartFirstSearch,
  initialSection,
}: {
  onOpenPlayground: () => void;
  onStartFirstSearch?: () => void;
  /** Only for tests/no-DOM rendering, where there is no `window.location` to read. */
  initialSection?: SectionId;
}) {
  const page = useRef<HTMLElement>(null);
  const [section, setSection] = useState<SectionId>(() => {
    if (initialSection) return initialSection;
    try {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      const fromHash = hash ? sectionFor(hash) : null;
      if (fromHash) return fromHash;
      const saved = sessionStorage.getItem("hnsw-learn-section");
      if (saved && SECTION_IDS.includes(saved)) return saved as SectionId;
    } catch {
      /* Storage/hash access is optional. */
    }
    return "chapter-problem";
  });
  const [returnPoint, setReturnPoint] = useState<LearnReturnPoint | null>(
    readLearnReturnPoint,
  );

  useEffect(() => {
    const element = page.current;
    if (!element) return;
    const reveal = () => {
      let hash: string;
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const target = hash ? sectionFor(hash) : null;
      if (target) {
        setSection(target);
        try {
          sessionStorage.setItem("hnsw-learn-section", target);
        } catch {
          /* Storage is optional. */
        }
      }
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => {
          const targetEl = hash ? document.getElementById(hash) : null;
          if (!targetEl) {
            element.scrollTop = 0;
            return;
          }
          let parent: HTMLElement | null = targetEl;
          while (parent) {
            if (parent instanceof HTMLDetailsElement) parent.open = true;
            parent = parent.parentElement;
          }
          targetEl.scrollIntoView({ block: "start" });
        }),
      );
    };
    const revealReference = () => {
      setReturnPoint(readLearnReturnPoint());
      reveal();
    };
    const frame = window.requestAnimationFrame(revealReference);
    window.addEventListener("hashchange", revealReference);
    window.addEventListener("popstate", revealReference);
    const showReturn = (event: Event) =>
      setReturnPoint((event as CustomEvent<LearnReturnPoint>).detail);
    window.addEventListener(LEARN_REFERENCE_EVENT, showReturn);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", revealReference);
      window.removeEventListener("popstate", revealReference);
      window.removeEventListener(LEARN_REFERENCE_EVENT, showReturn);
    };
  }, []);

  const continueReading = () => {
    if (!returnPoint) return;
    prepareLearnReturn(returnPoint);
    setReturnPoint(null);
    window.history.replaceState({}, "", returnPoint.href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <main
      ref={page}
      className="explanation-page beginner-guide simplified-learn"
    >
      {returnPoint && (
        <button
          type="button"
          className="continue-reading"
          onClick={continueReading}
        >
          <span aria-hidden="true">←</span> Continue where you left
        </button>
      )}
      <div className="guide-wrap">
        <header className="guide-hero">
          <h1>Find similar things without checking everything.</h1>
        </header>

        <div className="guide-layout">
          <nav className="guide-toc" aria-label="Learn HNSW contents">
            {SECTION_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={section === item.id ? "page" : undefined}
              >
                <span>{item.number}</span>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="guide-content">
            {section === "chapter-problem" && <ProblemChapter />}
            {section === "chapter-search" && (
              <SearchChapter onStartFirstSearch={onStartFirstSearch} />
            )}
            {section === "chapter-insert" && <InsertChapter />}
            {section === "chapter-delete" && <DeleteChapter />}
            {section === "chapter-practice" && (
              <PracticeChapter onOpenPlayground={onOpenPlayground} />
            )}
            {section === "advanced-learning" && <AdvancedChapter />}
            <SectionPager current={section} />
          </div>
        </div>
      </div>
    </main>
  );
}
