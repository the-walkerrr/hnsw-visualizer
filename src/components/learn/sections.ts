import { LISTINGS } from "../../hnsw/pseudocode";
import { CONTROL_GUIDES } from "../../lessons/controlGuides";

export const SECTION_NAV = [
  { id: "chapter-problem", number: "01", label: "The need" },
  { id: "chapter-search", number: "02", label: "Search" },
  { id: "chapter-insert", number: "03", label: "Insert" },
  { id: "chapter-delete", number: "04", label: "Delete" },
  { id: "chapter-practice", number: "05", label: "Try it" },
  { id: "advanced-learning", number: "+", label: "Advanced" },
] as const;

export type SectionId = (typeof SECTION_NAV)[number]["id"];
export const SECTION_IDS: readonly string[] = SECTION_NAV.map((s) => s.id);

// Sub-anchors (deep links from Playground panels, ParameterLink, etc.) that
// live inside a section but aren't the section's own id.
const ANCHOR_SECTION: Record<string, SectionId> = {
  "chapter-connect": "chapter-problem",
  "chapter-layers": "chapter-search",
  "ef-search-explained": "chapter-search",
  "w-per-layer": "chapter-search",
  "c-admission-rule": "chapter-search",
  "keep-routes-exercise": "chapter-search",
  "lesson-4": "chapter-insert",
  "soft-delete": "chapter-delete",
  "hard-delete": "chapter-delete",
  "chapter-update": "advanced-learning",
  "update-reinsert": "advanced-learning",
  "update-in-place": "advanced-learning",
  "parameter-guide": "advanced-learning",
  "algorithm-steps": "advanced-learning",
};
for (const guide of Object.values(CONTROL_GUIDES))
  ANCHOR_SECTION[guide.id] = "advanced-learning";
for (const listing of LISTINGS)
  ANCHOR_SECTION[`algorithm-${listing.id}`] = "advanced-learning";

export function sectionFor(id: string): SectionId | null {
  if (SECTION_IDS.includes(id)) return id as SectionId;
  return ANCHOR_SECTION[id] ?? null;
}
