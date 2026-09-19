import { SECTION_IDS, SECTION_NAV, type SectionId } from "./sections";

export function SectionPager({ current }: { current: SectionId }) {
  const index = SECTION_IDS.indexOf(current);
  const prev = index > 0 ? SECTION_NAV[index - 1] : null;
  const next = index < SECTION_NAV.length - 1 ? SECTION_NAV[index + 1] : null;
  return (
    <nav className="section-pager" aria-label="Section navigation">
      {prev ? (
        <a className="button quiet" href={`#${prev.id}`}>
          <span aria-hidden="true">←</span> {prev.label}
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a className="button primary" href={`#${next.id}`}>
          {next.label} <span aria-hidden="true">→</span>
        </a>
      ) : (
        <span />
      )}
    </nav>
  );
}
