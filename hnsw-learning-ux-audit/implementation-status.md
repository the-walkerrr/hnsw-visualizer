# Implementation and Retest Status

The [README](README.md) is the pre-implementation audit: **26 findings and ten baseline screenshots**. Its required sections, finding fields, summary rows, and evidence links were verified before the first application edit. The source was not used to fill gaps during the beginner journey. This file records subsequent changes without rewriting the original observations as if the defects never existed.

## What changed

The beginner path now uses four named songs to connect items, two-number vectors, a query, distances, and a returned answer. The same four IDs and query continue into the existing small search and a paused Playground exercise. The small example appears before the per-layer queue formulas. New prediction questions provide corrective feedback.

The Playground now distinguishes a new random target from rerunning the current target. Rerunning after an efSearch change preserves the graph, query, and k, and presents before/after match counts and distance checks. Structural edits invalidate that comparison. The Learn entry loads the known four-dot example, uses every replay step, and frames the graph at a readable size. Ordinary entry is honestly labeled as opening or resuming the Playground.

Other changes clarify empty states, numerical corrections, M's coupled settings, insertion decisions, update consequences, legends, table headings, mobile destinations, and lesson persistence. No new dependency was added.

## Root causes and fix choices

- **Unstarted guided entry:** the old entry helper only seeded a dataset. It now starts a deterministic query against the existing four-dot lesson graph and pauses at the first frame.
- **Invalid tuning comparison:** the setup button generated a new random target every time. A separate rerun action retains the previous target and records comparable outcomes. Changing the graph invalidates the retained target/baseline; changing k suppresses the before/after comparison.
- **Misleading acceptance narration:** prose inspected W after adding the dot, so filling the last free slot could be described as beating the farthest dot. It now records whether a slot was available before insertion into W. The main explainer uses this concrete trace narration.
- **Conflicting insertion transfer prose:** the shared layer-search caption assumed query semantics. It now receives explicit connection-phase context and distinguishes the whole candidate list from ordinary query descent. Bottom-layer text does not suggest a further descent.
- **Numeric friction:** number fields clamped on each keystroke, and coordinate fields required a 0.1 step despite more precise stored coordinates. Parameter fields now commit on blur/Enter with visible correction feedback; coordinate edits accept the stored precision. Merely focusing and leaving a formatted parameter does not rebuild it.
- **Unexpected drag consequences:** re-insertion legitimately redraws the random level in this demo. The existing immediate visual update is preserved so dragging does not look like snapping back. A before/after caption explains the coordinates and level, with a button to inspect the level decision. This is a deliberate alternative to always jumping back to the operation's first frame.
- **Lesson state loss:** local component state disappeared on navigation. Reading offset, comparison steps, query visibility, and check answers now use optional session storage. Explicit anchor navigation still takes precedence over saved scroll position.

## Finding-by-finding disposition

“Implemented” means a concrete mitigation is present. It does not certify that recruited beginners now understand the concept. Validation is identified separately; source inspection and rendering tests are not presented as equivalent to browser interaction.

| Audit ID | Disposition / implemented mitigation | Validation |
| --- | --- | --- |
| EDU-01 | Named song → toy vector → query → exact returned song, with a prediction and feedback; same IDs continue into search | Browser: revealed query; wrong A and correct T choices produced appropriate feedback; small search returned the expected IDs |
| EXP-01 | New-target and same-target actions; before/after comparison; invalidate on structural changes | Browser and regression test: ef=1 returns A, 0/1 true matches, 3 checks; ef=2 returns T, 1/1, 4 checks, identical query and exact distances |
| EDU-02 | One labeled point per stored item; no graph links in the vector diagram; explicit separate index-building explanation | Rendered guide inspected; query interaction exercised |
| EDU-03 | Persistent A/D labels and explicit same-item/descent explanation in the layer illustration | Rendered guide and source inspected; not a recruited-learner identity test |
| EDU-04 | Saved, query-independent entry point explained before the search picture; first-item/replacement rules stated | Rendered guide inspected |
| EDU-05 | Small complete search moved before W/C per-layer formulas; queue, candidate, k, and efSearch defined locally | Browser: new reading order and four-dot controls; existing example tests |
| EDU-06 | Worked link-selection example with real distances, redundant-direction explanation, and a check; initial insertion math optional | Browser: shortened insertion caption and math disclosure; worked-example content inspected. A fully animated construction lesson remains a larger enhancement |
| EDU-07 | Three prediction/check opportunities with corrective feedback; completion no longer declares mastery | Browser: wrong/correct song choices; other check content inspected |
| PLAY-01 | M control immediately discloses degree-cap and mL resets, including possible layer changes | Rendered control/source inspected; existing structural-parameter tests pass |
| PLAY-02 | Whole-value editing with blur/Enter commit, range/step messages, accessible status feedback | Browser: ef=-10 → 1 with message; k=999 → 20 with message; zero vectors commit correctly |
| PLAY-03 | Clearing/rebuilding to zero selects Insert; Search disabled with reason; empty search guard and actionable Queues state | Browser: zero graph selects Insert and cannot start empty search; one-dot recovery; reducer regression |
| PLAY-04 | Actual spare-slot or distance/eviction reason replaces the generic “or there is room” caption | Browser: four-dot decisions; regression for filling the last spare slot |
| PLAY-05 | Connection-phase return caption distinguishes candidate links, full-list transfer, and bottom-layer completion | Dedicated regression covers efConstruction=1 on two layers and compares ordinary query descent |
| PLAY-06 | Coordinate fields use step=any and keep full stored precision | Browser: X=200 accepted with untouched Y=317.33890146017075 |
| PLAY-07 | Plain-language experiment onboarding, definitions and disabled-state guidance; reference defaults collapsed | Browser: ran all three experiments; beginner text and optional reference visible |
| PLAY-08 | Flat-result-aware M recap at displayed precision; no generic knee recommendation; correct Explore navigation | Browser: all displayed recalls 100%; recap acknowledges no visible improvement and rounding; selection recap names Explore → Change the dots |
| PLAY-09 | Requested-vs-available live-dot message; singular match grammar | Browser: k=20 with four dots shows availability; completed k=1 search says “Found 1 match” |
| PLAY-10 | Pre-edit re-insertion warning; immediate coordinate/level recap; inspect-level decision action | Browser: untouched-coordinate move succeeds and shows level 0 → 0; inspect action returns to level frame. Baseline separately captured a move that changed level 2 → 1 |
| FLOW-01 | Same four-dot graph/query; paused first frame; Every step; readable framing; explicit next experiment | Browser: Learn opens 4 dots, 1 layer, frame 1/9; next enabled; ef=2 rerun finishes at 14/14; state tests |
| FLOW-02 | Final CTA says “Open or resume Playground”; seeded replacement is explicitly described | Browser: ordinary header navigation resumes graph; guide button wording inspected |
| FLOW-03 | Reading position and example/check state retained within the session; current chapter shown | Browser: comparison step 2/6 survives reload; header Learn returns to saved reading area. Explicit #four-dot-search reload aligns to the anchor, rather than exact prior pixels |
| FLOW-04 | Hero and narrow-screen exercise CTAs target the inline replay; desktop requirement disclosed | Browser at 390×844: inline action stays at /learn#four-dot-search; Next works; no horizontal overflow |
| VIS-01 | Replay controls directly below diagrams; compact side-by-side lists; excess fixed caption height removed | Browser at desktop and mobile: graph, buttons, and current decision visible together when stepping |
| VIS-02 | Home target key; static graph key; operation-specific insertion legend; rejection key; IDs and dashed distance circle explained | Browser: search/insertion legend changes and graph labels; remaining diagram text inspected |
| VIS-03 | Short insertion caption; expandable formula; flexible explanation space; narrow-desktop panel navigation wraps | Browser at 900×700: full beginner caption visible, expanded formula reachable, replay remains visible |
| VIS-04 | Descriptive camera accessible names; semantic table headers | Browser: named zoom/reset controls and efSearch/Recall table; camera/table component changes inspected |

## Validation evidence

- **101 tests passed across seven files.** Existing algorithm, state, persistence, projection, queue, example, and rendering tests ran. Added focused regressions cover fixed-query comparison/invalidation and the two misleading narration cases. Existing assertions were updated for intentionally changed labels and guided-entry behavior.
- **Production build passed.** TypeScript and Vite compilation succeeded.
- **Lint passed without warnings.** Whitespace/diff checks passed.
- Browser checks covered the revised Learn-to-Playground flow, fixed-target experiment, invalid fields, empty-state recovery, precise-coordinate movement, replaying the new level decision, all three experiment actions, numerical chart headings, saved lesson step, mobile inline replay, and the minimum supported desktop caption layout.
- Temporary browser viewport overrides were reset.

Post-change screenshots are separate from the baseline evidence:

- [Same-target comparison](evidence/retest/same-target-comparison.png)
- [Mobile inline search, graph and controls together](evidence/retest/mobile-inline-search.png)
- [Compact insertion explanation at 900×700](evidence/retest/compact-insertion.png)
- [Experiment table](evidence/retest/experiments.png) — captured during the retest; the later flat-result wording was additionally verified from the rendered text.

## Remaining limits and larger enhancements

The interrupted practical checks have been resumed to the available capability/permission boundary, as documented in the README. Hard-delete execution still lacks explicit action-time confirmation; only its dialog/cancel/focus was tested in the browser. No profile-isolation guarantee, VoiceOver session, formal contrast measurement, reduced-motion emulation, network-failure simulation, or production load measurement is claimed. The new reduced-motion CSS respects the preference, but its emulated browser behavior was not tested.

The targeted fixes above are implemented. The broader proposed redesign remains a roadmap: an animated construction lesson, a single identity-preserving layered example spanning every chapter, synchronized side-by-side replay, a formal lesson-completion model, and testing with recruited first-time students. The general desktop Playground still requires 900 px; the beginner search and comparison are available inline on mobile. These boundaries should remain visible when deciding whether to teach without an instructor.
