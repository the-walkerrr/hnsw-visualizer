# Product QA Report — HNSW Explorer

**Audit date:** 2026-09-05
**Target/build:** `http://localhost:5173/`, local Vite development build
**Auditor/runtime:** Codex desktop, isolated in-app Chromium browser; black-box first-user pass followed by source-assisted diagnosis
**Original score:** 81.5 / 100
**Post-fix score:** 88.3 / 100
**Confidence:** Medium

## Fix and retest update — 2026-09-06

All five findings are resolved. The revised verdicts are **MVP / Investor Demo: READY** and **Production: READY** at medium confidence.

| Finding | Result | Retest evidence |
|---|---|---|
| A11Y-001 | RESOLVED | Selected node 0 from the labelled Node control, entered X=400 and Y=200, and generated the update trace without using the canvas or drag. |
| A11Y-002 | RESOLVED | Browser-computed muted-text contrast is 4.70:1 in light mode and 5.04:1 in dark mode. |
| CONTENT-001 | RESOLVED | Rendered Learn content and source search contain no Params, Code, or Metrics tab instructions; a regression assertion covers rendered copy. |
| STATE-001 | RESOLVED | Reload restored the selected node, its X=400 coordinate, graph, active Inspect panel, and trace-capable state. Versioned Map serialization has dedicated tests. |
| RESP-001 | RESOLVED | The width gate is now Playground-only; Home and Learn have mobile reflow rules and the gate links to Learn. Route/render and production CSS were verified. The browser runtime blocked viewport emulation for a second visual capture, which limits confidence but not the implemented scope. |

Post-fix verification: **84 tests passed**, lint passed with no warnings, production build passed, and the live browser console contained no application errors.

## 1. Release verdicts

| Gate | Verdict | Why |
|---|---|---|
| MVP / Investor Demo | **READY** | The desktop first-value path is clear, all discovered critical demo flows worked, and no P0/P1 issue was found. |
| Production | **READY after fix/retest** | The post-fix score is 88.3, accessibility is above the 3.5 gate, and all five findings are resolved. |

## 2. Executive summary

HNSW Explorer makes an unusually difficult algorithm approachable. A new user can understand the proposition from the landing page, open the playground, run a search, replay its decisions, and see both the returned neighbors and computation cost without reading external documentation. Search, insert, node movement, parameter tuning, guided examples, Results, and Lab all worked in the tested desktop session. The interface is visually coherent, fast locally, and unusually strong at explaining system state.

The five concentrated production gaps found in the initial audit are now fixed. Keyboard users can select and move nodes from labelled controls, muted text passes 4.5:1 in both themes, instructions match the current tab labels, experiments survive refresh, and the narrow-width gate applies only to the graph playground.

### Resolved release blockers

1. **A11Y-001:** Added keyboard-operable node selection and coordinate movement.
2. **A11Y-002:** Raised muted-text contrast above the normal-text threshold.
3. **RESP-001:** Made landing and Learn responsive and scoped the gate to Playground.
4. **STATE-001:** Added versioned per-session experiment restoration.
5. **CONTENT-001:** Updated obsolete tab names and added regression coverage.

### Implemented fixes

1. Added a labelled node chooser plus bounded X/Y movement controls.
2. Darkened the muted text tokens to reach 4.70:1 light and 5.04:1 dark contrast.
3. Added single-column Home/Learn layouts and a guide link from the Playground gate.
4. Persisted graph Maps, settings, selection, active panel, and trace data in `sessionStorage`.
5. Replaced all obsolete copy and added rendered-copy test coverage.

## 3. Cold-start / first-user result

**Inferred product purpose before docs:** An interactive visual guide for learning how HNSW similarity search traverses a layered graph.
**Inferred audience:** Developers, technical learners, and vector-database users, including complete beginners.
**Obvious first action:** Open playground.
**First meaningful value reached:** Yes.
**Cold-start contamination:** None. The existing Chrome tabs were not used; the test began in a new isolated in-app browser session.

| Step | Expectation | Action | Observed result | Friction |
|---|---|---|---|---|
| 1 | Understand the product before committing | Read the landing hero and preview | Purpose, audience, and value were immediately clear | None |
| 2 | Enter an interactive example | Activate Open playground | A populated layered graph and a concise three-step setup appeared | None |
| 3 | Ask for nearest neighbors | Activate Search / Place a random query | A query marker and an 89-step trace appeared immediately | None |
| 4 | See how the result was produced | Set 8x and play the trace | Replay completed at 89/89 with an answer and cost explanation | Default 3x would take roughly 30 seconds, but speed and scrubbing were available |
| 5 | Validate the benefit | Open Results | Recall, exact-scan comparison, neighbor table, and graph structure were visible | None |

## 4. Critical journey results

| Journey | Signed out/in | Result | Severity if failed | Evidence |
|---|---|---|---|---|
| Landing → Playground → random search → replay → Results | No auth | PASS | P1 | E-01, E-02, E-03 |
| Learn → configured example → Playground | No auth | PASS | P1 | The example set efSearch to 16 and generated its trace |
| Tune graph/query parameters → run search | No auth | PASS | P1 | M clamped to minimum 2; generated graph reflected six layers; search ran |
| Insert vector → complete trace | No auth | PASS | P1 | E-04 |
| Inspect node → move vector → complete update trace | No auth | PASS with pointer and keyboard controls | P2 | E-07, A11Y-001 retest |
| Lab ef sweep → rendered recall/cost output | No auth | PASS | P2 | Completed after approximately 3 seconds |
| Refresh/reopen persistence | No auth | PASS after fix | P2 | STATE-001 retest restored node 0 at X=400 |
| Hard-delete safeguard and cancel | No auth | PASS to confirmation | P1 | E-08; destructive final action intentionally not executed |

Authentication is not present and therefore not applicable. The site requested no personal data, permissions, payment, email, account creation, or external side effect.

## 5. Dimension scorecard

| Dimension | Score / 5 | Evidence summary |
|---|---:|---|
| First-run | 4.5 | Clear promise, audience, next action, and first value |
| Navigation | 4.2 | Small route map, strong tabs, and matching instructional names |
| Core functionality | 4.5 | Search, replay, Results, insert, move, guided examples, and Lab worked |
| Forms/input | 4.4 | Inputs are labelled and invalid M values clamp/recover safely |
| Feedback/recovery | 4.0 | Excellent traces, empty states, delete dialog, and automatic session restoration |
| State coverage | 4.5 | Empty Inspect, success, invalid input, repeated search, back, and restored refresh state tested |
| Content clarity | 4.5 | Explanations are exceptional and current tab names are consistent |
| Visual consistency | 4.5 | Strong hierarchy, spacing, component language, and focus treatment |
| Responsive/platform | 4.2 | Desktop layouts work; Home/Learn reflow below 900px and only Playground is gated |
| Accessibility | 4.2 | Keyboard graph editing, modal focus, labels, and passing muted-text contrast verified |
| Performance/reliability | 4.2 | Fast local build and actions, no console errors; no field/Core Web Vitals evidence |
| Trust/privacy | 4.8 | No data collection or dark patterns; hard delete is explicit and cancel-first |

## 6. Findings

### A11Y-001 — Node inspection and vector movement are pointer-only

- **Status:** Resolved 2026-09-06
- **Severity:** P2 Major
- **Confidence:** Confirmed
- **Critical path:** No; important learning flow
- **Location:** Playground graph canvas, Inspect flow
- **Preconditions:** Populated graph; Inspect mode selected
- **Steps to reproduce:**
  1. Navigate to Playground using keyboard only.
  2. Select Inspect.
  3. Attempt to select a graph node or change its vector without clicking or dragging.
- **Expected (WCAG 2.2 AA-informed user expectation):** A keyboard and non-drag single-pointer alternative should allow node selection and movement.
- **Observed:** The entire SVG is one image named “HNSW graph.” Nodes are not focusable controls, and the only movement instruction is to drag a node.
- **Evidence:** Keyboard-only search succeeded, while selecting node 18 required a coordinate click and updating it required a drag. Source diagnosis: `src/components/GraphCanvas.tsx:301-315` attaches pointer handlers to a `role="img"` SVG.
- **User impact:** Keyboard-only users and users who cannot perform precise dragging cannot complete inspect/update lessons.
- **Fix direction:** Add a keyboard-operable node browser or focusable nodes, plus coordinate fields or directional move buttons.
- **Retest:** Select and move a node, then verify its update trace, using keyboard only and no drag.

### A11Y-002 — Small muted text does not meet normal-text contrast

- **Status:** Resolved 2026-09-06
- **Severity:** P2 Major
- **Confidence:** Confirmed
- **Critical path:** No
- **Location:** Landing eyebrow/footnote and repeated muted labels, hints, legends, and metadata
- **Preconditions:** Light/system theme
- **Steps to reproduce:**
  1. Open the landing page.
  2. Inspect the rendered colors of the 10-10.5px muted text.
  3. Calculate contrast for `#888a82` on `#fbfbf9`.
- **Expected:** Normal text should reach at least 4.5:1.
- **Observed:** The contrast ratio is approximately 3.38:1.
- **Evidence:** Computed styles were `rgb(136,138,130)` on `rgb(251,251,249)`. `src/styles.css:12` defines the shared token.
- **User impact:** Low-vision users and users in glare may miss guidance and status metadata.
- **Fix direction:** Darken the text token or separate decorative and text-muted tokens.
- **Retest:** All normal-size muted text measures at least 4.5:1 in each theme.

### CONTENT-001 — Learning content refers to old tab names

- **Status:** Resolved 2026-09-06
- **Severity:** P2 Major
- **Confidence:** Confirmed
- **Critical path:** No
- **Location:** Learn chapters and Lab result copy
- **Preconditions:** User follows tutorial instructions
- **Steps to reproduce:**
  1. Open Learn.
  2. Read the local-minimum, layers, pruning, or production chapters.
  3. Compare their named tabs with Playground.
- **Expected (user expectation):** Instructions use Tune, Trace, and Results.
- **Observed:** Several passages use Params, Code, or Metrics. Lab output also recommends the nonexistent Params tab.
- **Evidence:** `src/App.tsx:17-23` defines current names; stale references appear at `src/lessons/lessons.ts:157,258,374,770` and `src/components/panels/LabPanel.tsx:91`.
- **User impact:** Learners search for controls that do not exist and lose trust in the guide.
- **Fix direction:** Update copy and add an obsolete-label regression test.
- **Retest:** Rendered content and repository search contain no stale tab-name instructions.

### STATE-001 — Refreshing silently discards the entire experiment

- **Status:** Resolved 2026-09-06
- **Severity:** P2 Major
- **Confidence:** Confirmed
- **Critical path:** No
- **Location:** Playground refresh/reopen
- **Preconditions:** Changed settings, graph, selection, or trace
- **Steps to reproduce:**
  1. Set M from 5 to 2.
  2. Insert a vector so count changes from 48 to 49.
  3. Refresh.
- **Expected (user expectation):** Restore the session or warn clearly that it is temporary.
- **Observed:** Graph, settings, selection, vector count, and trace return to defaults without warning. Theme preference does persist.
- **Evidence:** E-04/E-05; `src/state/StoreProvider.tsx:5` recreates the reducer from `initialState` with no restoration path.
- **User impact:** A multi-step experiment or teaching setup can be lost instantly.
- **Fix direction:** Persist serializable state per session, or provide explicit save/share/reset and an ephemeral-state warning.
- **Retest:** Refresh restores the exact experiment or only resets after an explicit user-approved action.

### RESP-001 — The narrow-width gate blocks non-graph content too

- **Status:** Resolved 2026-09-06
- **Severity:** P2 Major
- **Confidence:** Confirmed
- **Critical path:** No for the declared desktop instrument
- **Location:** All routes below 900px
- **Preconditions:** Viewport width 899px or narrower
- **Steps to reproduce:**
  1. Open the site at 390x844.
  2. Attempt to reach landing or Learn.
- **Expected (user expectation):** The graph may require desktop width, but text-first landing and Learn pages should reflow.
- **Observed:** Every route is replaced by “The graph needs more room,” with no limited-mode or guide link.
- **Evidence:** E-11; `src/styles.css:328-331` hides all app children except the gate.
- **User impact:** Narrow-window and mobile visitors cannot evaluate the product or read its educational material.
- **Fix direction:** Scope the gate to Playground and keep landing/Learn responsive.
- **Retest:** Landing and Learn work at 390px; Playground alone presents a focused desktop limitation.

## 7. Accessibility screen

**Scope actually tested:** Keyboard route through landing and the full random-search activation; visible focus ring; tab/combobox/button/table semantics; AX tree naming; modal initial focus, Escape dismissal, and focus restoration; computed text contrast; representative target sizes; pointer-versus-keyboard alternatives. Top controls measured at 26x26.7px or larger. Source inspection also found a reduced-motion media query.

**Not tested:** A real screen reader session; browser text zoom/reflow at 200% because the in-app browser did not expose a reliable zoom control; Windows High Contrast/forced colors; OS-level reduced-motion behavior; cognitive/authentication criteria (no auth exists).

**Formal WCAG conformance claimed:** No.

## 8. Responsive/platform coverage

| Form factor/platform | Critical flow exercised? | Result | Notes |
|---|---|---|---|
| 390x844 narrow/mobile | Route and stylesheet retest | PASS with medium confidence | Home/Learn reflow; Playground alone shows the desktop gate and a Learn link. Runtime viewport emulation blocked a second visual capture. |
| 900x800 minimum supported width | Yes | PASS | Search action and trace creation completed |
| 900x600 compact laptop | Controls inspected | PASS | Workbench compacts; right panel scrolls independently |
| 1080x800 desktop | Yes | PASS | Primary audit viewport |
| 1440x900 wide desktop | Representative layout | PASS | Graph and inspector expand coherently |

The interactive graph remains intentionally desktop-only below 900px. The product introduction and learning guide now remain available on narrow screens.

## 9. Performance/reliability

**Measured evidence available:** Limited local lab evidence only; no field data.

| Signal | Result | Context |
|---|---|---|
| Local reload to DOMContentLoaded | 85ms | Wall-clock around in-app browser reload on Vite dev server |
| Random search to visible trace | 870ms | Button activation through updated rendered state |
| Lab ef sweep | ~3s | 48 vectors, 24 fixed queries |
| Console warnings/errors | 0 | After representative navigation and interactions |
| LCP / INP / CLS | Not measured | Browser runtime did not expose reliable performance entries |
| Production build | PASS | 102 modules; JS 377.54kB / 120.56kB gzip; CSS 31.12kB / 7.23kB gzip |
| Automated tests | PASS | 84 tests across 5 files |
| Lint | PASS | `oxlint` exited 0 |

No offline/slow-network mode, production host, CDN behavior, field Core Web Vitals, or load testing was exercised.

## 10. Strengths to preserve

- The landing page explains a specialized algorithm without jargon or prior knowledge.
- The graph, transport, explainer, Trace, Results, and Lab panels form a coherent cause-and-effect learning loop.
- Search results expose recall and exact-scan cost instead of presenting an opaque animation.
- Empty Inspect state, disabled transport state, playback state, and running Lab state are all intentionally designed.
- The hard-delete dialog clearly states irreversibility, focuses Cancel first, closes on Escape, and restores focus to the trigger.
- Theme changes are immediately announced in the accessible name and persist across refresh.
- Tabs, tables, forms, and toolbar groups have generally strong semantics and labels.
- Local interactions were responsive and repeated search activation produced one stable trace rather than duplicate records.

## 11. Coverage and limitations

| Area | Complete? | Limitation / remaining risk |
|---|---|---|
| Cold-start | Yes | Isolated browser, no docs/source before first value |
| Signed-out | N/A | No authentication or account surface exists |
| Signed-in | N/A | No authenticated experience exists |
| Critical flows | Yes | Hard/soft delete execution and clear-all were not performed because they are destructive |
| Mobile/narrow | Implementation verified | Home/Learn reflow and Playground-only gate verified; no second phone-width visual capture |
| Desktop/wide | Yes | 900, 1080, and 1440 widths exercised |
| Accessibility | Capability ceiling | No real screen reader or reliable 200% zoom test |
| Performance | Partial | Local lab only; no Web Vitals or production network evidence |
| Reliability | Partial | No offline, slow network, or long-duration stress run |
| Cross-browser | No | In-app Chromium only |

## 12. Retest plan

The five P2 findings have been retested and closed. Remaining confidence work is broader release validation rather than a known defect: verify with a real screen reader and 200% text zoom, add Safari/Firefox and a physical narrow-device pass, and measure production-host Core Web Vitals.
