# HNSW Beginner Learning Experience Audit

## Executive Summary

**The website can communicate the broad idea of searching through connected dots, but it does not yet reliably teach HNSW to someone with zero prerequisite knowledge.** A patient reader can learn that similar items sit near one another, upper layers provide shortcuts, and keeping more possible answers can prevent a miss. The four-dot efSearch comparison is especially effective. The difficulty is connecting those ideas into an independently usable mental model.

The largest gaps are the jump from lists of numbers to a connected, layered map; introducing queue mechanics before a small complete search; and the mismatch between Learn’s promises and the Playground’s actual starting state. The suggested tuning loop also changes the query when the learner presses “Run a search,” undermining a comparison that is supposed to change only one setting. Insertion becomes substantially more technical than the lessons preparing the reader for it.

**Highest priorities:** teach one concrete item-to-query example; make Learn open a small, paused, fully explained search; and provide a same-query comparison that holds everything except efSearch fixed.

**Readiness:** NOT READY for an unassisted, zero-background student demo. The existing material could support a teacher-led demonstration. Production readiness is INCOMPLETE: this was an educational UX audit, and formal assistive-technology, reduced-motion, isolated-profile, network-failure, and production-performance checks remain unverified. No Critical-severity issue was confirmed under the requested definition; High findings materially impede independent learning, but desktop learners have ways to continue.

Audit scope and evidence:

- Tested the local site at `http://localhost:5173/` on September 11, 2026, using its rendered screens, accessibility text, and actual interactions. Application source code and product README explanations were not used to understand HNSW or discover features. Only launch/package information was read for operational setup.
- Entered through the homepage in a newly created browser tab, followed “Learn from the beginning,” read the map and search sections, took the early Playground invitation, returned to finish Learn, then systematically exercised the Playground.
- A new tab was used, but a fully storage-isolated browser profile was not verified. The first Playground visit showed 48 dots, three layers, and no active search. Treat that as the observed initial state, not a guarantee about every fresh installation.
- Visually inspected desktop layouts at the available approximately 1280×720 and 1087×814 sizes, explicitly tested 900×700, and tested mobile at 390×844. The Playground explicitly requires at least 900 px; its mobile gate was tested rather than bypassed.
- All five Learn chapters, all 14 control-reference disclosures, both four-dot examples, all six dataset shapes, the main Playground tabs, all three More destinations, and all three experiment actions were visited and exercised as described below. Representative replay transitions were tested; this does not mean every frame of every generated trace or every parameter combination was examined.
- Saved ten screenshots in `evidence/`. Other evidence is reproducible action sequences and quoted visible UI text. Beginner reactions are persona-based interpretations, not claims from a study of recruited students.
- Resumed the interrupted checks before reading application source or implementing changes. The control-help link visibly opens the expanded `/learn#control-ef-search` explanation; browser Back retains the 24-dot graph, efSearch=8, and completed 254-frame update trace, while collapsing the help disclosure. The temporary viewport override was reset. Both optional reading destinations were subsequently verified: the GitHub parameter document and arXiv abstract load. Their contents were not used to fill gaps in the beginner journey.
- This document is the **pre-implementation baseline**. Findings describe the audited behavior, even after a fix is made. Implementation and retest outcomes will be recorded separately in `implementation-status.md`.

Coverage calibration:

| Area | What was exercised | Result / limit |
| --- | --- | --- |
| Homepage | Hero, diagram, legend, both destination labels; followed Learn | Clear invitation, but technical diagram and stronger Playground CTA precede prerequisites |
| Learn 1 | Item/vector diagram, exact-vs-HNSW explanation, layered diagram | Read and visually inspected; no inline step controls found for these diagrams |
| Learn 2 | Greedy route, C/W descriptions, per-layer capacities, example CTA | Read and inspected; followed CTA before finishing Learn |
| Learn 3 | All prose sections; every step of ef=1 and ef=2 examples; Back, Show result, Restart | Examples explain individual decisions well; controls and diagrams require scrolling |
| Learn 4 | Random level, search/connect illustration, M and efConstruction | Read and inspected; tested corresponding insertion in Playground |
| Learn 5 | All 14 disclosures and final empty-Playground CTA | Definitions/ranges useful; final CTA retained prior search |
| Search replay | Run, canvas placement, Previous/Next, Main/Every step, Play/Pause, replay slider Home/End, Finish, Clear trace, End replay, all five speeds | Functional in tested states; Main steps omits decisions by default |
| Camera/layers | All layers, One layer, L2 selection, rotate/spin/tilt buttons, zoom in/out, blank-canvas pan, node drag, and fit | Functional; replay overrides chosen layer while active and says so |
| Explore/data | k=1, 5, 20, out-of-range 999; vectors 0, 1, 24, 48, 400; all shapes; Add one dot; Clear dots and recovery | Values/graph updated; empty-state contradiction found |
| Tune | All numeric parameters, all three metrics, both neighbor rules, both switches, Reset, keyboard slider increment | Tested representative values, including invalid values; M changes additional settings |
| Queues/results | Lists, bucket changes, completion, recall, work chart/table, individual matches, graph details | Useful explanations; insertion uses terminology beyond Learn’s preparation |
| Insert/inspect/update/delete | First-dot insertion; insertion into 24 dots; node picker, coordinate move, soft-delete/restore, hard-delete dialog and Escape; drag update | Prefilled coordinate validation defect found; hard deletion deliberately cancelled |
| More → Experiments | ef sweep, M sweep, selection-rule comparison, chart/table | Repeatable experiments exist, but their language and interpretation are advanced |
| Navigation/persistence | Learn → Playground → Learn, mobile Back, Learn reload, return to Playground | Learn comparison reset on reload; earlier Playground state survived tested navigation/reload |
| Accessibility screen | Keyboard-only Home → Learn → stepped example → Playground → 24-dot search → Results; named controls, slider Home/End, node picker, native validation, dialog Escape/focus | Partial screen only; no VoiceOver session or formal contrast measurements |

Resumed coverage and observations:

| Remaining check | Expectation → action → observed result | Conclusion |
| --- | --- | --- |
| Maximum dataset | Set Vectors to 400, run a search, move trace slider to End → 400 dots / five layers, 126 frames, five matches, 41 checks versus 400 exact, 100% recall | Completed locally without an observed crash; this is not a load test |
| Clear dots / recover | Clear the generated graph → immediately zero dots and zero layers, no confirmation; Search remains selected. Add one dot → usable first insertion | Clear works; reproduces PLAY-03’s incorrect empty-state instructions |
| Keyboard journey | Tab/Enter from home to Learn; advance ef=1 through all six steps; open the empty Playground; set 24 vectors; run and finish a 90-frame search; open Results → five matches, 21 checks | Representative complete journey works without pointer actions; visible focus observed. Does not establish screen-reader conformance |
| Playback speeds | Select 1×, 2×, 3×, 5×, 8×; press Play then Pause → each selection and state transition works | All speed choices exercised; precise timing ratios were not measured |
| End replay | End a query replay → keep 24 dots, clear trace and results, unlock editing. Add dot 25, then End replay at frame 1/208 → keep 25 dots and its committed connections, clear trace and unlock | Functional; the visible help correctly says graph changes are retained. [Evidence](evidence/ended-insertion-keeps-dot.png) |
| Camera | Zoom out → 0.8×; pan blank canvas → layers move together; Fit → restores view | Representative operations work; exhaustive combinations of gestures/shortcuts were not fuzzed |
| Drag update | Drag dot 20 from its visible layer-2 position → completed 254-frame “Update 20 by delete + re-insert”; hover information now says top layer 1 | New learning issue PLAY-10 below; not merely a camera move |
| Theme | Cycle System → Light → Dark → System → graph and controls render; active highlights remain distinguishable in the captured dark state | Visual theme check completed; no measured contrast claim. [Evidence](evidence/dark-playground.png) |
| Long insertion caption | At 900×700, scroll the formula paragraph → the final sentence becomes visible; its 37px-high region has 67px of content and reaches scrollTop 30 | Text is reachable. VIS-03 concerns cramped, initially hidden explanation, not inaccessible content |
| Help round trip | Tune → first “What does this change?” → full Learn explanation → browser Back | Correct expanded landing; graph/trace/parameter retained, disclosure collapsed |
| Optional reading | Open the exact links shown by Learn | GitHub parameter document and arXiv abstract both load; external teaching quality was not used to rescue missing local explanations |

**Remaining capability/permission boundaries:** no fully isolated profile, VoiceOver session, formal contrast measurement, reduced-motion emulation, offline/network-failure emulation, or production performance measurement was available/performed. Native control descriptions and a dot hover tooltip were observed; every hover timing and gesture combination was not exhaustively tested. Hard-delete confirmation/cancel/focus were tested; permanent execution remains unverified because action-time confirmation was requested and no explicit answer was received. The disposable test tab subsequently closed. These are explicit limits, not claimed passes or website defects. No account/authentication UI was encountered; authentication testing is not applicable to the discovered learning experience.

Strengths to preserve: the highways/street analogy; a real miss in the four-dot example; separate W and C lists; explicit “8 slots does not mean 8 distance checks”; the explanation that efSearch does not rebuild the graph; per-layer replay narration; numerical recall and exact-scan comparison; a keyboard node picker; and clear Cancel/Hard delete choices.

## Beginner Journey

1. **Arrival — I expect to learn by watching.** The homepage says “Learn HNSW by watching it work” and promises no vector-database background. “Open playground” is the filled primary button; “Learn from the beginning” is secondary. I choose the latter because I do not know what HNSW means. The hero diagram already contains `ef = 8 · k = 3`, layers, an entry point, and a pink cross absent from its three-item legend. I cannot yet interpret that picture.
2. **The map — I understand that similar items should be nearby.** The song/image examples and the definition of a vector as a list of numbers help. I still cannot explain how `[0.82, 0.71, …]` becomes a location, what a dimension is, or which plotted dot is the saxophone. Three example items lead to two groups containing more than three dots, already connected by lines. I do not know whether the model produces those lines too.
3. **Connections — I understand the shortcut’s purpose, but not its setup.** “Check every dot” versus “Follow promising links” explains why a shortcut is useful and that it can miss. “Query” has already appeared without a concrete example of what I submit. I need to know whether the query is one of the stored dots, a new item, or the moving search itself.
4. **Layers — the highway analogy helps.** The text says every dot lives on layer 0 and some are promoted. The stacked drawing still makes me work to recognize that a dot on different sheets is the same stored item. There are no persistent item names in this illustration. I also do not know why the particular start dot was chosen.
5. **Search — the one-question explanation is approachable.** The four actions Enter, Compare, Move, Descend explain the broad route. The illustration is a finished path, so I cannot choose a next neighbor and check my prediction. Immediately afterward I meet C, W, queue, bucket, efSearch, k, and `max(efSearch, k)`. I am trying to remember notation before I have watched one complete small search.
6. **Early Playground detour — I follow the invitation.** Learn says “Replay every decision,” “The example is preloaded,” and to use the arrows. The destination has 48 dots and three layers, but shows “Run a search to begin,” `0 / 0`, and disabled arrows. “Run a search” starts a 96-frame trace and switches the side panel from Explore to Queues. The prose tells me what to do next, but this is a much larger task than the invitation suggested.
7. **Stepping — explanations help, but decisions disappear.** I move through frames 1, 2, and 3. Next jumps from 3 to 6, changing the active dot from 18 to 41. Opening Settings reveals that Main steps skips individual neighbor decisions; Every step is available. I return to Learn to finish the material I had skipped. The header Learn link opens the top of the guide rather than my previous reading position.
8. **The four-dot comparison — I finally see why keeping alternatives matters.** In the one-slot example, A replaces S, B is rejected, and T is never discovered. In the two-slot example, B remains worth checking and exposes T. Each decision names the dot and uses actual distances. I exercise every step, Back, Show result, and Restart. This is the first point where I can explain a miss from what the site itself shows. However, the controls are below the diagrams, so stepping often leaves the changing graph offscreen.
9. **Stopping and recall — I get a usable success measure.** The `12 > 10` example explains stopping without claiming that no closer unseen dot exists. The five-match recall illustration and text explain what an approximate search missed. The suggested experiment correctly says to keep query, dots, and k fixed.
10. **Building — I receive an overview, not a practiced skill.** I read that a random draw picks a highest layer and that the new item searches and connects. M and efConstruction are separated from query settings. I still have not seen a candidate rejected for being a redundant connection. The optional reference is detailed and useful, but introduces additional mathematical and graph vocabulary.
11. **Completion — the next screen contradicts its button.** I press “Open an empty playground.” The earlier 48-dot trace returns at frame 6/96 with editing locked. I expected a blank map or a new beginner exercise. I expand the replay lock banner, find Finish, and complete the search. Results reports five of five true matches and 35 checks versus 48 for an exact scan.
12. **Tuning — I make an invalid comparison without being warned.** I set efSearch from 8 to 1 and follow the invitation to run another search. The result reports 25 checks and still 100% recall, but the target has changed: dot 3’s distance changes from 127.13 to 50.46 and the returned set changes. I cannot attribute the improvement to efSearch. The screen does not preserve my earlier result beside the new one.
13. **Free exploration — controls work, but attribution gets harder.** I change M from 5 to 2 and see the layer count rise from three to six. Advanced values reveal that mL and both degree caps changed too. I test other parameters, all metrics, shapes, and Reset. Invalid k=999 becomes 20, and efSearch=-10 becomes 1 without an explanation of the correction. Keyboard range adjustment works.
14. **Empty graph — instructions disagree.** With zero vectors, the graph says “click to add vectors from scratch,” while Search stays selected. Clicking the canvas performs a one-frame empty search and switches to Queues. That panel says “Press Next or Play to initialize the lists,” although Next is disabled. I recover through Explore → Add one dot.
15. **Insertion and inspection — the difficulty rises sharply.** Adding the first dot explains that it becomes the entry point, which answers an earlier question much later than needed. Adding dot 24 to a 24-dot graph produces 169 frames. The first is a logarithm formula; later steps use SELECT-NEIGHBORS-HEURISTIC, R, and pruning. Every step does explain a concrete pruning decision, but the short Learn insertion lesson has not prepared me for this vocabulary. The final frame is a connection action, not a recap.
16. **Mistake and recovery — a valid edit is blocked by an untouched value.** I select dot 24 through the node picker. A negative X correctly raises validation. After setting X to 200, Move node rejects the prefilled Y value `528.367064632504` because the allowed step requires 528.3 or 528.4. Rounding Y to 528.4 permits the update. Soft deletion and restore work; I open the hard-delete dialog and cancel with Escape.
17. **Experiments — a better comparison mechanism appears late.** Under More, ef sweep runs fixed queries and produces charts. On my 25-dot spiral example all ef values have 100% recall; the explanation acknowledges this, then uses unfamiliar high-dimensional terminology. The M sweep also has 100% recall throughout, yet its recap tells me to find a knee. The selection-rule recap tells me to use a “Build tab,” but the visible tab is Explore.
18. **Mobile and returning — part of the journey stops.** At 390×844, Playground becomes a desktop-only notice. Its Learn return link works, but Learn still prominently offers “Watch a search,” sending me back to the same gate. The inline comparison works on mobile as vertically stacked cards. Reloading Learn resets its comparison to the first step. Returning to Playground after the reload preserves my 25-dot graph and last operation, while its panel/camera state resets.

19. **Resumed checks — I can operate the controls, but moving an item changes more than expected.** The keyboard path, all playback speeds, theme switching, 400 dots, and help round trip worked. Scrolling reveals the long insertion paragraph, although only a few lines fit at once. Dragging dot 20 changes its top layer from 2 to 1 and finishes a 254-frame update immediately. I expected its position and nearby links to change; I was not prepared for it to disappear from the top layer. Ending a new insertion at its first frame preserves the inserted dot, consistent with the recovery control’s help text.

## Critical Issues

No issue is assigned **Critical**. The following two High issues are highlighted here because they undermine the core learning journey across multiple screens. Their severities are intentionally not inflated to match the section title.

### EDU-01 — The reader never practices the complete item → numbers → query → answer chain

**Severity:** High  
**Location:** `/`, `/learn` hero and sections 1.1–1.2; first Playground search.  
**What I saw:** The homepage promises no background. Learn defines an embedding as a list of numbers, then uses vector space, query, distance, and neighbors. The Playground uses anonymous numerical dots and a pink target. No exercised lesson follows one named search request through its numerical representation to named returned items.  
**What I thought as a beginner:** “If I want another song like this one, what do I actually give this system? Which dot is my song, and what comes back?”  
**Why this is confusing:** The interface assumes the reader can connect data representation with a search request. Knowing that a vector is a list does not explain its placement, the query’s role, or why a returned point is useful.  
**Learning impact:** I can describe moving through dots without understanding the practical problem HNSW solves.  
**Suggested improvement:** Begin with “Find songs similar to this song.” Give three stored items simple two-number toy descriptions, plot each with a persistent name, then introduce a separate query and return one named match. Explicitly say these are simplified teaching numbers and HNSW uses supplied vectors rather than deciding musical meaning.  
**Retest:** A learner can identify stored data, query, distance comparison, and returned answer in the same example before layers appear.  
**Evidence/confidence:** Confirmed content gap across the audited guide and first-search flow; learning consequence is persona-based.

### EXP-01 — “Run another search” changes the target during the one-setting exercise

**Severity:** High  
**Location:** `/learn` §3.4; `/playground` Tune → Explore → Run a search.  
**What I saw:** Learn explicitly says to hold dots, query, and k fixed. With the observed 48-dot graph and k=5, the first generated query at efSearch=8 returned dots 3, 31, 41, 39, 47 with 35 checks. After setting efSearch=1 and pressing Run a search, the result was 3, 47, 19, 39, 43 with 25 checks. Dot 3’s displayed distance changed from 127.13 to 50.46, demonstrating that the target changed. Both runs reported 100% recall.  
**What I thought as a beginner:** “Lowering effort made the same search cheaper and changed its answers. Is that what this setting does?”  
**Why this is confusing:** “Try one small change” and “Run another search to see the difference” invite a causal comparison, but the button also chooses a new query. The learner must recognize that the experiment is no longer controlled.  
**Learning impact:** A student can attribute target-dependent differences to efSearch and learn an unsupported relationship.  
**Suggested improvement:** Provide distinct “Rerun this target” and “Choose a new target” actions. The tuning lesson should pin dataset, target, k, and build settings, store the baseline, and show the one changed value next to both results.  
**Retest:** Changing only efSearch and rerunning preserves each stored dot’s distance to the query, displays both check counts and recall values, and identifies the changed setting.  
**Evidence/confidence:** Confirmed interaction; the reported numbers describe this audit session, not a reproducible random-seed guarantee.

## Learn Page Issues

### EDU-02 — The first vector picture mixes representation with graph construction

**Severity:** High  
**Location:** `/learn#chapter-map`, §1.1 “Meaning becomes position.”  
**What I saw:** Three named example items point to three number lists. The right side contains an audio group and an image group with more than three dots and connecting lines. The individual dots do not retain the item labels, and the first lines appear before §1.2 explains links.  
**What I thought as a beginner:** “Did each item become several dots? Did the model also draw the connections?”  
**Why this is confusing:** The diagram compresses item conversion, placement, clustering, and graph links into one picture. It assumes the reader already separates these stages.  
**Learning impact:** It is easy to conflate creating embeddings with building the HNSW graph.  
**Suggested improvement:** Initially show exactly one labeled dot per item, with no edges. Animate each pair of toy numbers to its axis position. Add links only in the next subsection and name that a separate indexing step.  
**Retest:** Each source item can be matched to exactly one plotted point; the first edge appears only after its role is explained.  
**Evidence/confidence:** Confirmed visual observation.

### EDU-03 — Layer copies are not explicitly identified in the first layered illustration

**Severity:** Medium  
**Location:** `/learn#chapter-map`, §1.3.  
**What I saw:** L2, L1, and L0 are stacked with unlabeled dots, dotted cross-layer guides, a blue route, and a green endpoint. The text does helpfully say all dots live on L0 and some are promoted, but it does not label a particular repeated item or explain the dotted guides beside the picture.  
**What I thought as a beginner:** “Are these three maps of different data? Is moving downward traveling along another connection?”  
**Why this is confusing:** I must infer that a repeated dot represents the same item and that a layer change is different from following an edge within a layer.  
**Learning impact:** The reason upper-layer progress can be reused below is less concrete than the highway analogy.  
**Suggested improvement:** Label one item A on every layer where it appears. Highlight all copies together and caption a descent: “This is still A. We now use A’s connections on the next layer.” Give dotted guides a distinct legend entry.  
**Retest:** A reader can distinguish a same-item layer transition from a within-layer neighbor hop.  
**Evidence/confidence:** Confirmed diagram; this is not a claim that the guide entirely omits layer explanations.

### EDU-04 — The starting point’s selection is explained too late

**Severity:** Medium  
**Location:** `/learn` §2.1; `/playground` first-dot insertion.  
**What I saw:** Search begins at “the single entry point on the highest layer.” Search narration later says every search starts at the same dot. Only when I cleared the graph and inserted its first dot did the site explain that the first item becomes the entry point. The advanced algorithm panel contains further entry-point update logic.  
**What I thought as a beginner:** “Why start at dot 18? Is it already known to be close to my query?”  
**Why this is confusing:** A designated starting item can be mistaken for a preliminary search result. The basic lesson says where to start without making its relationship to this particular query clear.  
**Learning impact:** The learner may misunderstand what the search already knows before its first distance check.  
**Suggested improvement:** Add “The graph has a saved starting dot; it is chosen while building the graph, not because it is close to this query.” In the build lesson, show how that saved dot can change when a new highest layer appears.  
**Retest:** Before starting a search, the learner can explain why the start is independent of the current target.  
**Evidence/confidence:** Confirmed teaching order.

### EDU-05 — Queue notation arrives before the learner has completed a small search

**Severity:** High  
**Location:** `/learn#chapter-search`, §§2.2–2.3, before the §3.1 interactive comparison.  
**What I saw:** C, W, queue, shortlist, efSearch, k, `max(efSearch, k)`, and per-layer capacities appear in successive blocks. k receives its dedicated result-count explanation later in §3.2. The first small decision-by-decision interaction is also later.  
**What I thought as a beginner:** “Am I supposed to memorize two lists, two parameters, and a formula before I know what one complete search looks like?”  
**Why this is confusing:** The order assumes comfort with stateful algorithms and mathematical notation. The surrounding prose explains the terms, but too many dependencies arrive together.  
**Learning impact:** The learner can keep reading without building a stable model of the two lists’ different jobs.  
**Suggested improvement:** First complete a four-dot search with “best found” and “still worth checking.” Introduce k when requesting the answer count. Add W/C notation as optional aliases only after the learner has manipulated the lists. Introduce the capacity formula after comparing k with efSearch.  
**Retest:** The first interactive search can be understood without knowing C, W, or max notation; these are mapped back to familiar objects afterward.  
**Evidence/confidence:** Confirmed content order.

### EDU-06 — The insertion overview does not prepare the reader for the insertion exercise

**Severity:** High  
**Location:** `/learn#lesson-4` and `/playground` insertion replay.  
**What I saw:** Learn offers a static three-stage illustration: choose height, search, keep useful links. The tested insertion of dot 24 then opens a 169-frame trace beginning with `l = ⌊−ln(U(0,1)) · mL⌋`. Later frames introduce SELECT-NEIGHBORS-HEURISTIC, R, pruning, refilling, and bidirectional connections.  
**What I thought as a beginner:** “I thought adding a dot meant connecting it to nearby dots. Why am I suddenly expected to read this formula and these capitalized instructions?”  
**Why this is confusing:** The overview omits the small worked neighbor-selection example needed to understand the detailed trace. Search narration is mostly plain language; insertion changes register sharply.  
**Learning impact:** A learner can finish the reading and still be unable to explain why insertion accepts one link and rejects another.  
**Suggested improvement:** Add a tiny insertion exercise to Learn: identify the new item, reveal a random level in words, find three candidate neighbors, compare two redundant routes, and show the final links. Make the random-level formula and algorithm names optional.  
**Retest:** A student can predict one accepted and one rejected connection before opening free-form insertion.  
**Evidence/confidence:** Confirmed content and replay. See [insertion screenshot](evidence/insertion-formula.png).

### EDU-07 — The guide declares understanding without asking the learner to demonstrate it

**Severity:** Medium  
**Location:** `/learn`, all chapters and final “You now know the map, the route, and the trade-off.”  
**What I saw:** The guide provides explanations and reveal/step controls, but no exercised section asks for a prediction or a comprehension answer. The last statement asserts that I now know the material.  
**What I thought as a beginner:** “I followed the sentences, but how do I know whether I can apply them?”  
**Why this is confusing:** Progress through content is treated as understanding. Show result also permits the central example to be bypassed immediately.  
**Learning impact:** Misconceptions about k, efSearch, layers, or returned results can survive into Playground experimentation.  
**Suggested improvement:** Add three short checks: identify the query; predict whether B fits in a one-slot versus two-slot shortlist; decide whether changing efSearch changes graph edges. Explain incorrect choices and let learners retry.  
**Retest:** Completion feedback reflects demonstrated understanding or explicitly says “You have reached the end,” rather than assuming mastery.  
**Evidence/confidence:** Confirmed absence of checks in the audited guide.

## Playground Issues

### PLAY-01 — M changes more than the control’s immediate description suggests

**Severity:** High  
**Location:** `/playground` Tune → Connections (M).  
**What I saw:** With 48 dots, M=5, and three layers, changing M to 2 produced six layers. Advanced settings also changed mL from approximately 0.62 to 1.44, the upper degree limit from 5 to 2, and the bottom limit from 10 to 4. The visible short description is “Routes each new dot chooses. More routes use more memory.” The full reference does disclose the additional resets.  
**What I thought as a beginner:** “I asked for fewer connections. Why did I get more layers?”  
**Why this is confusing:** The effect spans multiple hidden settings. A learner following “Try one small change” is unlikely to predict the hierarchy change from the short label.  
**Learning impact:** M can be mistaken for a direct layer-count control, and before/after experiments have hidden dependencies.  
**Suggested improvement:** Before applying M, show its coupled changes inline: “M 5→2; layer multiplier 0.62→1.44; limits 5/10→2/4.” Explain why the defaults are coupled and summarize what changed after rebuilding.  
**Retest:** The layer-count change is attributable from the immediate screen without opening the optional reference.  
**Evidence/confidence:** Confirmed parameter interaction.

### PLAY-02 — Invalid parameter inputs are silently corrected

**Severity:** Medium  
**Location:** `/playground` Explore k; Tune efSearch and degree limit.  
**What I saw:** Entering k=999 and leaving the field produced 20. Entering efSearch=-10 produced 1. With M=2, entering an upper degree limit of 1 left it at 2. No accompanying correction message appeared in the observed states.  
**What I thought as a beginner:** “Did I enter it wrong, did the search change it, or is the control broken?”  
**Why this is confusing:** The field’s final value alone does not explain a rejected experiment or its allowed range. The ranges exist in disclosures, but the attempted mistake receives no explanation.  
**Learning impact:** A learner can run an experiment with a different setting than intended.  
**Suggested improvement:** Show a brief inline correction: “Changed to 20; k must be 1–20,” or “This limit must be at least M=2.” Keep focus and the message associated with the field.  
**Retest:** Each invalid value produces an understandable explanation of the accepted value and constraint.  
**Evidence/confidence:** Confirmed tested boundary values, not exhaustive validation coverage.

### PLAY-03 — Empty-canvas instructions invoke the wrong operation

**Severity:** Medium  
**Location:** `/playground`, vectors=0 with Search selected.  
**What I saw:** The canvas says “The index is empty — click to add vectors from scratch.” Search remains selected and Explore’s Run a search is disabled. Clicking the empty canvas instead creates “Search k = 20,” frame 1/1, and “No dots to search yet.” It switches to Queues, which says “Press Next or Play to initialize the lists,” while Next is disabled.  
**What I thought as a beginner:** “I did what the empty screen asked. Why did it search, and what am I supposed to press now?”  
**Why this is confusing:** Canvas guidance, selected tool, and queue recovery text describe different states.  
**Learning impact:** The first attempt to build from scratch sends the user away from the controls that can recover the graph.  
**Suggested improvement:** Make the empty-state primary action explicitly “Add your first dot” and switch to Insert, or change the canvas instruction to match Search mode. An empty-search panel should link directly to adding dots and omit initialization guidance.  
**Retest:** Following the exact empty-state instruction adds a dot or opens a clear insertion path; no disabled-next loop appears.  
**Evidence/confidence:** Confirmed. [Screenshot](evidence/empty-search-contradiction.png).

### PLAY-04 — Accepted-dot narration does not identify the reason for this particular decision

**Severity:** Medium  
**Location:** `/playground`, Every step → accepted neighbor.  
**What I saw:** A frame says “Keep dot 41 as a possible match” and “It is close enough to join the best matches so far, or there is still room.” Rejection frames are more specific: they provide actual distances, occupancy, and the comparison with W’s farthest member. The Learn four-dot example also distinguishes spare-room acceptance from replacement.  
**What I thought as a beginner:** “Which reason happened here? Did it replace another dot or use an empty space?”  
**Why this is confusing:** The animation changes state, but its primary explanation offers two possible causes. I must reconstruct the actual cause from the separate lists or bucket history.  
**Learning impact:** Acceptance and eviction rules remain harder to learn than rejection rules.  
**Suggested improvement:** Use the same concrete narration as Learn: “W is full. Dot 41 at 185.46 replaces dot 18 at 291.21,” or “W has an empty slot, so we keep this dot.”  
**Retest:** Every accepted frame names which rule applied and identifies any displaced dot.  
**Evidence/confidence:** Confirmed narration; exact values shown here are from the first audited search’s bucket history.

### PLAY-05 — Insertion gives conflicting explanations of what is passed down

**Severity:** High  
**Location:** `/playground` insertion trace, “Layer 1 returns 4 elements”; More → Algorithm steps → INSERT.  
**What I saw:** For the insertion of dot 24, the trace shows `W = {3, 6, 20, 18}` and says “The nearest of these becomes the entry point one layer down.” The INSERT panel displays `ep ← W` with the explanation “The whole beam is carried down, not just the best.” The basic query lesson separately says only the best dot is passed down.  
**What I thought as a beginner:** “Does insertion carry one dot or all four? Is it different from searching?”  
**Why this is confusing:** Two visible explanations of insertion disagree. The learner cannot resolve this using the website’s prose alone. This finding does not require determining which internal implementation is correct.  
**Learning impact:** It obstructs the relationship between ordinary queries and the search performed while adding a vector.  
**Suggested improvement:** Align the trace and algorithm panel with the demonstrated behavior. Explicitly distinguish navigation above the new item’s level, connection-building layers, and ordinary query descent. Visually show the exact item or set handed down.  
**Retest:** Trace narration, starting bucket on the next layer, and algorithm-panel commentary identify the same transferred items.  
**Evidence/confidence:** Confirmed textual contradiction; internal algorithm correctness was not audited.

### PLAY-06 — Move node rejects an untouched coordinate supplied by the application

**Severity:** Medium  
**Location:** `/playground` More → Inspect a dot → node 24 → Move node.  
**What I saw:** The inserted dot’s prefilled Y was `528.367064632504`. After correcting a deliberately invalid X to 200, Move node rejected Y with “Please enter a valid value. The two nearest valid values are 528.3 and 528.4.” I had not edited Y. Entering 528.4 allowed the update.  
**What I thought as a beginner:** “Why is the coordinate you gave me invalid? Does moving horizontally require changing the vertical position too?”  
**Why this is confusing:** The application’s displayed value violates its own form constraint. This is distinct from the correctly rejected negative X input.  
**Learning impact:** A straightforward experiment about moving an item is blocked by unrelated numeric cleanup.  
**Suggested improvement:** Ensure prefilled values satisfy the control’s precision/step constraint, or accept the actual stored precision. Do not require editing an unchanged coordinate.  
**Retest:** Select an arbitrarily inserted dot, change only X to a valid value, and move it successfully without modifying Y.  
**Evidence/confidence:** Confirmed, including successful recovery. [Screenshot](evidence/move-prefilled-validation.png).

### PLAY-07 — Experiments assume a second set of unexplained concepts

**Severity:** High  
**Location:** `/playground` More → Experiments.  
**What I saw:** Controls say “run ef sweep” and “run M sweep.” Results discuss beam width, a curve’s knee, high dimensions, distances concentrating, a manifold, brute force, and memory scaling. Reference defaults show production values far above the main controls’ teaching defaults.  
**What I thought as a beginner:** “What is a sweep? What shape am I supposed to look for, and why are these numbers different from the ones I learned with?”  
**Why this is confusing:** The panel offers the right kind of repeatable experiment but explains it in language for a reader already familiar with benchmarking and high-dimensional search.  
**Learning impact:** The best tool for validating a setting’s effect is difficult to use as a first lesson.  
**Suggested improvement:** Rename the first action “Compare search effort values.” State what remains fixed, ask a prediction, then highlight one pair of rows with a plain-language conclusion. Put high-dimensional caveats and production defaults in optional advanced notes.  
**Retest:** A reader can describe the experiment, its fixed inputs, and one result without knowing sweep, beam, knee, or manifold.  
**Evidence/confidence:** Confirmed results text. [Screenshot](evidence/experiments-jargon.png).

### PLAY-08 — Experiment recaps do not consistently match the result or current navigation

**Severity:** Medium  
**Location:** `/playground` More → Experiments → M sweep and selection comparison.  
**What I saw:** The tested 25-dot spiral example had 100% recall at every displayed M value: 2, 4, 6, 8, 12, 16, 24. The recap nevertheless says recall flattens out and tells the reader to reason about a knee. The selection comparison says “switch the dataset in the Build tab,” while the visible destination is Explore → Change the dots. The ef sweep does better by explicitly acknowledging its already-flat 100% result.  
**What I thought as a beginner:** “I cannot find the bend you are describing, and I cannot find Build.”  
**Why this is confusing:** A generic conclusion looks like an interpretation of this particular experiment. A stale navigation name impedes the suggested follow-up.  
**Learning impact:** The learner may search for a nonexistent pattern or think their run failed.  
**Suggested improvement:** Make the M recap conditional on actual results, matching the ef sweep’s flat-result handling. Replace Build with a direct “Change dataset” action to Explore.  
**Retest:** Flat data receives a flat-data explanation; all follow-up instructions use reachable, current labels.  
**Evidence/confidence:** Confirmed result table and wording.

### PLAY-09 — Requested result count is not reconciled with a smaller dataset

**Severity:** Low  
**Location:** `/playground`, one live dot with k=20.  
**What I saw:** The trace remains labeled “Search k = 20,” concludes “Found 1 matches,” and Results shows “1 of 1” and 100% recall. This is coherent as a result, but no nearby sentence explains why only one of the requested twenty could be returned.  
**What I thought as a beginner:** “Did the search fail to find nineteen matches, or is one the right answer?”  
**Why this is confusing:** The interface assumes the reader infers that the collection limits the result count.  
**Learning impact:** The meaning of k and recall can briefly appear inconsistent.  
**Suggested improvement:** Say “Requested up to 20; only 1 live dot is available,” and use singular grammar.  
**Retest:** Searching fewer than k items explains the smaller result set beside the result count.  
**Evidence/confidence:** Confirmed one-dot test.

### PLAY-10 — Moving a dot also changes its layer without preparing the learner

**Severity:** Medium  
**Location:** `/playground`, Inspect tool → drag a dot.  
**What I saw:** On the 24-dot, three-layer graph, dot 20 was visible on layer 2. I dragged it to another position. The interface immediately showed the final frame of a 254-frame “Update 20 by delete + re-insert” operation, with 140 distance checks. The dot’s hover information now reported top layer 1. The final caption described its layer-0 connections, without explaining why it disappeared from layer 2.  
**What I thought as a beginner:** “I moved the same item. Why did it lose an upper-layer copy? Did dragging downward move it between layers?”  
**Why this is confusing:** The action looks like changing coordinates but also repeats a construction decision. Knowing the words “re-insert” is insufficient unless the learner remembers that insertion randomly chooses a highest layer. The final-frame jump hides that decision.  
**Learning impact:** Learners may attribute layer membership to the direction or location of a drag, undermining the explanation that levels are independent of the data.  
**Suggested improvement:** Before the edit, say that this demo rebuilds the moved dot’s links and draws its layer again. Start the update replay paused at the first relevant decision and show a concise before/after summary of coordinates and highest layer.  
**Retest:** Move a top-layer dot; the interface explicitly accounts for whether its layer changed and lets the learner inspect the decision before proceeding.  
**Evidence/confidence:** Confirmed visible before/after state and operation caption. [Screenshot](evidence/update-changes-layer.png).

## Learn → Playground Transition Issues

Learn does prepare the reader for some Playground concepts: it explains k versus efSearch, separates query-time and build-time parameters, introduces C/W, and links the query process to insertion. The Playground has parameter disclosures and links back to Learn. The handoff still fails at the level of task setup: the learner is not given a consistent starting trace, a controlled comparison, or a remembered place to resume reading.

### FLOW-01 — “Replay every decision” opens an unstarted, large example with decisions hidden by default

**Severity:** High  
**Location:** `/learn#chapter-search` → “Start with an example →” → `/playground`.  
**What I saw:** Learn says “The example is preloaded. Use the arrows beneath the graph.” The initial destination has 48 dots and three layers, no trace, `0 / 0`, and disabled arrows. Run a search creates 96 frames and switches to Queues. With default Main steps, Next jumps from 3 to 6, bypassing the rejection of 20 and acceptance of 41. Every step is available inside Settings.  
**What I thought as a beginner:** “The lesson said the arrows would work. After starting the search, why did two decisions disappear?”  
**Why this is confusing:** The invitation promises an immediately inspectable decision sequence. Actual behavior requires launching a random query, learning a denser graph, noticing the detail setting, and interpreting a tab switch.  
**Learning impact:** A beginner can miss exactly the comparisons that explain why the highlighted dot changed.  
**Suggested improvement:** Have the lesson CTA open a small fixed graph with the query already placed, frame 1 paused, and Every step selected. State a goal such as “Follow why B is kept.” Offer the 48-dot example afterward.  
**Retest:** The CTA’s first Next action works immediately and no decision promised by the lesson is omitted.  
**Evidence/confidence:** Confirmed first-use sequence.

### FLOW-02 — “Open an empty playground” resumes the prior locked trace

**Severity:** Medium  
**Location:** End of `/learn`, “Open an empty playground →.”  
**What I saw:** After the early Playground detour and finishing Learn, clicking this button returned to 48 dots, three layers, frame 6/96, and “Replay paused · editing locked.” It did not clear the example or its trace.  
**What I thought as a beginner:** “Did I click the wrong button? How can this be empty if my old search is still running?”  
**Why this is confusing:** The action label promises a particular starting state but behaves like resume navigation. Persistence is useful when explicitly requested; here it contradicts the instruction.  
**Learning impact:** The reader finishes the guide without a reliable next exercise or a clean starting point.  
**Suggested improvement:** Either rename it “Continue in the Playground,” or deliberately open a blank state with an insertion-oriented first step. If preserving previous work is necessary, offer clear Resume / Start fresh choices.  
**Retest:** The destination matches the selected action whether or not an earlier replay exists.  
**Evidence/confidence:** Confirmed stateful-navigation case. [Screenshot](evidence/transition-empty-retains-search.png).

### FLOW-03 — Reading progress and interaction state have different persistence rules

**Severity:** Medium  
**Location:** Header Learn link, Learn examples, return to Playground, reload.  
**What I saw:** Leaving a partial Playground search through Learn returned me to the top of the guide, with no “Continue reading” action. Later the completed one-slot Learn example returned to its starting state after leaving/revisiting; a direct Learn reload also reset a tested frame 2 to frame 1. Playground graph/last operation survived the tested navigation and reload, while its panel and camera reset.  
**What I thought as a beginner:** “Which parts of my progress are saved? Where was I before I tried the example?”  
**Why this is confusing:** The guide looks like chapters but does not distinguish visited, completed, and in-progress content. State preservation differs across surfaces without a stated rule.  
**Learning impact:** Detours encourage rereading and make it easier to abandon an unfinished explanation.  
**Suggested improvement:** Save the last Learn chapter and local example step. Give the Playground a contextual “Return to your lesson” action. Label any deliberate lesson restart explicitly.  
**Retest:** Leaving a lesson for its exercise and returning restores the relevant chapter and step, or clearly offers to resume them.  
**Evidence/confidence:** Confirmed tested transitions; not a claim about all history/deep-link combinations.

### FLOW-04 — Mobile Learn advertises a search experience that mobile users cannot open

**Severity:** High  
**Location:** `/learn` “Watch a search”; `/playground` at 390×844.  
**What I saw:** The prominent mobile Learn action navigates to a notice requiring a desktop/laptop viewport at least 900 px wide. “Read the mobile-friendly guide” returns to Learn, which offers the same Watch a search action.  
**What I thought as a beginner:** “You invited me to watch; why is the next step unavailable on my phone?”  
**Why this is confusing:** The device requirement is disclosed after the action, and the recovery path returns to the same invitation. The static/inline guide is usable, but the complete advertised learning path is not.  
**Learning impact:** Phone-only learners cannot complete the Playground portion, even if they have understood the reading.  
**Suggested improvement:** On narrow screens, route Watch a search to a compact inline replay or clearly label it “Desktop Playground.” Offer a mobile-compatible guided example and an explicit way to resume the full Playground on a larger device.  
**Retest:** Every prominent mobile learning CTA leads to something usable at that viewport or states the requirement before navigation.  
**Evidence/confidence:** Confirmed mobile interaction. [Screenshot](evidence/mobile-playground-gate.png).

## Terminology and Missing Prerequisites

This inventory distinguishes absent foundations from terms that are explained, but only later or in optional material. It does not claim that every technical word must be removed.

| Term / concept | First observed appearance | What the site provides | What should come first or change |
| --- | --- | --- | --- |
| HNSW | Homepage title | Repeated name and map/search intuition | Expand the acronym once, then explain its purpose in ordinary language; the expansion is not itself a lesson |
| Similarity search | Homepage eyebrow | Later says nearby items have similar content | A named request and examples of useful returned items |
| Vector / embedding | Learn hero; definition in §1.1 | A list of numbers created by a model | One simplified number list mapped to one labeled dot; distinguish the supplied representation from the graph |
| Model | §1.1 | Converts items into number lists | One sentence describing its role and that this site is visualizing search over its outputs |
| Dimension / vector space | §1.1 and its introduction | “Hundreds of dimensions”; playground uses two | Explain two coordinates as two axes before referring to additional dimensions |
| Query / q | Learn hero; q in search diagrams | Playground later identifies a pink target | A search request represented by its own point; distinguish it from stored items and the moving current dot |
| Distance / nearest neighbor | Learn headline and map chapter | Later straight-line distances and metric reference | Show two measured distances and choose the smaller; explain that neighbor in a result and connected graph neighbor are not always the same set |
| Graph / node / edge | Map headings and diagrams; later inspect/algorithm panels | Dots, connections, links used informally | Add “dot = stored item/node; line = link/edge; together = graph” beside the first graph |
| Layer / level | Homepage L2/L1/L0; Learn §1.3 | Highway analogy, all dots on L0 | Label the same item on two layers; show that layer height is not another content coordinate |
| Entry point | Homepage legend; Learn §2.1 | Start on highest layer; first insertion explains initial entry | Clarify that the saved start is chosen during construction, independently of this query |
| Greedy | Learn “A greedy walk on one layer” | Says follow a closer neighbor until none improves | Explicitly define “take the locally best available next move” using one choice and one counterexample |
| Candidate / queue / expand | Learn §2.2 and later Playground | To-check list and neighbor-inspection descriptions | A small visual waiting list and “expand = inspect this dot’s connections”; avoid assuming familiarity with queues |
| W / C | Learn §2.2 | Best-so-far and to-check labels | Practice the two roles before requiring letter notation |
| k / max(efSearch, k) | Homepage k; Learn §2.3 formula | Dedicated comparison in §3.2 | Request a result count first; explain “use whichever number is larger” alongside max |
| ef / efSearch | Homepage ef; Learn §2.2 onward | Strong detailed slot explanation in §3.1 | Connect the short `ef` label to context, particularly insertion versus queries |
| Recall / recall@k | Learn §3.4 | Exact-baseline fraction and five-match picture | Mostly sufficient; retain the concrete fraction and use “true matches found” near charts |
| Index / rebuild | Learn chapter 4; controls | Build-time settings alter the graph | “Index = the stored map of links used to find items; rebuild = make those links again” |
| M / degree / Mmax / Mmax0 | Learn §4.2 and reference | Target connections and hard limits explained | Show a node with numbered connection slots; distinguish chosen outgoing links from its final total connections |
| mL / ln / random seed | Optional reference; insertion first frame | Ranges, probability description, repeatability | A small random-level draw before the formula; present the calculated usual value without requiring logarithms |
| Heuristic / prune / diversity / R | Reference and insertion replay | Different-direction intuition; detailed trace | One illustrated redundant link, one retained alternative, and labels for candidate versus selected lists |
| Tombstone / compaction / O(1) | Inspect soft-delete narration | Long implementation-oriented explanation | Begin with “Hide this item from results while preserving its links”; keep complexity/library discussion optional |
| Sweep / beam / knee / manifold | More → Experiments | Explanatory prose still relies on these terms | “Try these values,” “possible routes,” “where extra work stops helping”; omit manifold from beginner results |
| Build tab | Selection-rule experiment recap | No current tab by that name | Use Explore → Change the dots, preferably as a direct action |

The Playground’s number scale also changes abruptly from Learn’s decimal vector examples to coordinates and distances in the hundreds. No exercised introductory screen explicitly connects those as different teaching examples rather than meaningful units such as meters. Address this in EDU-01’s coordinate exercise.

## UI / Visualization Issues

### VIS-01 — Comparison controls and the changing graph do not stay visible together

**Severity:** Medium  
**Location:** `/learn` §3.1, both efSearch example cards; desktop around 1087×814 and mobile 390×844.  
**What I saw:** Each card stacks a graph, W, C, explanatory paragraph, count, and controls. Activating Next brings the lower controls into view while the graph is above the viewport. Scrolling up to inspect the changed graph puts the controls below the viewport. On mobile the two examples are vertically stacked, further separating the comparison.  
**What I thought as a beginner:** “Something changed, but the dot I was meant to notice is no longer on screen.”  
**Why this is confusing:** The interaction requires remembering the previous visual state while moving between controls and the diagram. It weakens an otherwise strong example.  
**Learning impact:** The causal link between the explanation, list update, and highlighted dot is easy to miss.  
**Suggested improvement:** Place step controls above the diagram or keep a compact control row sticky within the example. Offer a synchronized compare mode so both searches advance through the same event, while preserving independent stepping as an option.  
**Retest:** At the tested desktop and phone heights, a learner can advance one decision and see the affected graph/list without manual scroll recovery.  
**Evidence/confidence:** Confirmed screenshots and interaction. [Mobile screenshot](evidence/mobile-comparison-scroll.png).

### VIS-02 — The visual vocabulary changes between diagrams and operations

**Severity:** Medium  
**Location:** Homepage illustration; Learn map/greedy pictures; Playground graph and insertion trace.  
**What I saw:** The homepage legend lists entry point, visited, and result, but omits its pink cross. Learn’s layer and greedy diagrams lack a complete local key. Playground later provides a useful six-state legend, but insertion shows additional rings/crosses and the new dot while retaining search-oriented labels such as target and matches. Some dense default clusters have overlapping dot labels and outlines; One layer makes them more readable.  
**What I thought as a beginner:** “Is this ring a result, a kept candidate, or the dot being added? Does the number mean distance or just its name?”  
**Why this is confusing:** It requires recognition across changing color/state conventions. Numbers beside dots and numbers in the lists have different purposes.  
**Learning impact:** Learners can misread a state change even when the accompanying text is accurate.  
**Suggested improvement:** Use a consistent persistent key, with operation-specific additions: query, new dot, current dot, checked, kept, returned, rejected link. Explain “numbers beside dots are IDs” once, and pair important color changes with a short text label or distinct shape. Start beginner replay in a less crowded view.  
**Retest:** Every highlighted state in the beginner trace has an immediately visible meaning, including the query and new item.  
**Evidence/confidence:** Confirmed visual gaps; no formal color-contrast or color-vision simulation was performed.

### VIS-03 — Long insertion explanations compete with the graph for limited vertical space

**Severity:** Medium  
**Location:** `/playground` insertion frame 1 at approximately 1087×814.  
**What I saw:** The graph, camera controls, replay bar, and side panel occupy most of the screen. The formula-heavy insertion paragraph runs past the lower edge of the captured viewport. Most of the graph area is reserved for the three layers while a necessary explanation is only partly visible.  
**What I thought as a beginner:** “Do I watch the graph, read the formula, or scroll? I cannot take in this first step as one unit.”  
**Why this is confusing:** The learner must divide attention between a dense new explanation and multiple graph copies. The resumed 900×700 check confirmed that this paragraph scrolls internally and its final sentence is reachable. The initially visible region is only 37px high for 67px of text, so this remains a visibility/cognitive-load finding, not lost content.  
**Learning impact:** The hardest new material is poorly prioritized in the initial frame of the operation.  
**Suggested improvement:** Make the initial caption one or two sentences. Put the formula in “How the random level is calculated.” Provide a clearly expandable explanation panel that can use more space while the graph is paused.  
**Retest:** The full beginner explanation and its relevant graph change fit together at the minimum supported desktop size.  
**Evidence/confidence:** Confirmed initial visibility and successful internal scrolling at 900×700. [Screenshot](evidence/insertion-formula.png).

### VIS-04 — Camera buttons and numeric chart tables require interpretation from symbols

**Severity:** Low  
**Location:** `/playground` Rotate view; Results and Experiments table toggles.  
**What I saw:** Rotation buttons expose arrow/symbol names such as `↻` and `⌃`; the native accessibility output showed unnamed buttons for these. Experiment tables use generic column labels `x` and `value`; Work done uses `bin` and `value`. Fit changes its visible label to a zoom factor after zooming.  
**What I thought as a beginner:** “Am I turning the graph, moving the search, or changing the data? What does x mean in this table?”  
**Why this is confusing:** Meaning depends on nearby context and visual convention. This is especially unnecessary in a tool aimed at people unfamiliar with graphs.  
**Learning impact:** Minor control friction and avoidable ambiguity in the accessible numerical view.  
**Suggested improvement:** Give camera buttons explicit accessible names such as Rotate clockwise and Tilt up; keep “Reset view” named consistently. Use semantic columns such as efSearch/Recall or Method/Distance checks.  
**Retest:** Controls and table columns remain understandable when read without their surrounding graphic.  
**Evidence/confidence:** Confirmed exposed names and table labels; not a full screen-reader audit.

Layout and control behaviors that did work: mobile prose reflowed, Learn navigation remained available, the Playground disclosed its desktop restriction, replay offered a visible paused/locked status and expandable recovery options, active trace layers were emphasized, One layer provided a clearer planar view, and the hard-delete dialog focused Cancel and closed with Escape. These should not be reported as absent features.

## Suggested Beginner Learning Flow

1. **Start with a useful request.** “I like this song; find another similar one.” Show the result in ordinary language before any terminology. Introduce HNSW as one way to find likely matches without comparing every item.
2. **Give each item a simple numerical description.** Use two explicitly artificial teaching attributes and three named items. Plot each number pair on labeled axes. Define vector, coordinate, and dimension only as they become necessary.
3. **Separate the query from stored items.** Plot the requested item with a different shape. Show distances to all three stored items, ask which is nearest, then request either one or two matches to introduce k.
4. **Show the cost of checking everything.** Add a small visible comparison counter. Explain that exact comparison is the teaching baseline and that shortcuts may miss.
5. **Create the first graph.** Add lines to already-understood points. Name dot/node and link/edge. Ask the learner to follow only available links, including an example where the visually closest point is not directly connected.
6. **Complete a small single-layer walk.** Use one measured comparison per step. Let the student predict the next move. Introduce the saved starting point and explain why it does not depend on the current query.
7. **Demonstrate a miss, then keep alternatives.** Reuse the strongest existing S/A/B/T example. Begin with plain-language lists; add W/C aliases afterward. Explain the difference between discovering a dot, measuring it, keeping it, and inspecting its links.
8. **Introduce efSearch after the learner needs more space.** Change one slot to two, hold everything else fixed, and compare the actual returned item and work. Then distinguish k from the shortlist capacity and explain the larger-of-two rule.
9. **Add layers to the same familiar graph.** Preserve item labels across layers. Demonstrate a long jump, pause at the transition, carry the same item down, and finish with the broader bottom-layer search. Explain that layers organize navigation, not item meaning.
10. **Build one new item’s connections.** Show a random level without requiring a formula. Search for candidates, select useful links, illustrate one redundant direction, and explain reciprocal links. Introduce M and efConstruction by their distinct decisions.
11. **Check understanding and recap.** Ask the learner to explain what changes when k, efSearch, or M changes. Give corrective feedback. Display a compact concept map and “Ready for guided Playground” action.
12. **Open a guided Playground with preserved context.** Bring the same example, labels, target, and learned settings across. Run a controlled comparison, then unlock the larger dataset and optional experiments.
13. **Offer advanced investigation separately.** Place random seeds, other metrics, degree caps, update/delete, pseudocode, and production-oriented experimentation after the core path. Keep direct links back to the prerequisite lesson.

## Suggested Playground Onboarding

This is a proposed onboarding design, not a claim that these presets or actions already exist.

1. **Orientation — identify the objects.** Load a small named graph, a fixed query, k=1, Euclidean distance, and no ongoing animation. Ask the learner to point out the target and a stored item. Explain that labels are item IDs, not distances. Keep the graph and target fixed for the session.
2. **Predict one comparison.** Highlight only the current item and its two connected neighbors. Ask “Which neighbor is closer to the pink target?” Reveal their distances, then let the learner press Compare. Explain why the chosen item becomes current.
3. **Complete one route.** Pause before stopping and ask whether any connected dot improves the current position. Finish with “This is the closest item we found, not proof that it is the closest item anywhere.” Show the exact baseline beside it.
4. **Use the existing four-dot detour as a controlled preset.** Use S–A, S–B, B–T, k=1, and the same query as the Learn example. Start at efSearch=1. Predict whether B will remain available after A is found. Step to the result: three measured dots and A returned.
5. **Change exactly one parameter.** Pin query, graph, metric, k, and all construction settings. Increase efSearch to 2. Show “Only shortlist capacity changed.” Replay the corresponding decision and observe B staying in the list.
6. **Compare the result.** Display A versus T, three versus four checks, and the true nearest item. Ask “Did the graph gain a new edge?” Explain that a wider search used an existing route; it did not change construction.
7. **Apply layers to the same identities.** Add a small upper layer, point out the same named item on both layers, and pause before descent. Ask where the next layer begins. Keep the transferred dot highlighted until the learner continues.
8. **Try a readable generated example.** Offer 24 dots, Clusters, k=1, M=5, efConstruction=12, Euclidean, level seed 42, and the calculated default mL. Label these as teaching settings. Pin a query; compare efSearch=1, 2, and 4 using “Rerun this target.” Do not promise a miss: if every run is exact, explain that the extra effort did not help this query and offer the known detour preset.
9. **Show a build-time change.** Restore the baseline, then preview changing M and all coupled defaults. Compare edge and layer counts, with a plain-language summary. Do not call this an isolated edge-count experiment if mL changes too.
10. **Add one item.** Ask where its vector should appear, draw its random level, and reveal one connection decision at a time. End with “Item added: these links are new; these links changed.” Provide an explicit restart of this exercise.
11. **Release into free exploration.** Offer “Try your own target,” “Compare settings,” and “Return to your lesson.” Keep the last successful guided state available as a one-click recovery point. Advanced options remain available through a clearly labeled expansion.

For mobile, steps 1–7 should work as compact inline teaching interactions. The larger desktop Playground can remain a separate instrument if the interface sets that expectation before the user enters it.

## Quick Wins

- Change “Run a search” to “Choose a random target and search,” and add “Rerun this target” beside Tune.
- Make “Start with an example” open an already-started paused trace with Every step selected.
- Rename “Open an empty playground” to describe its current resume behavior until a true fresh-state action exists.
- Add a one-sentence definition of query and a dot/node/edge key before the first graph.
- Label the query cross in the homepage legend and identify repeated items in the first layer picture.
- Move k’s plain-language definition before `max(efSearch, k)` and write “whichever is larger” next to the formula.
- Use actual occupancy and distance comparisons in accepted-dot narration, matching the existing rejection explanations.
- Disclose M’s coupled mL/degree-limit changes next to the control.
- Show inline messages when input is clamped; ensure coordinate fields accept their own prefilled values.
- Correct the empty-canvas instruction and remove impossible queue-init guidance for empty searches.
- Replace “Build tab” with Explore → Change the dots.
- Detect flat M-sweep results and explain them rather than referring to a nonexistent knee.
- Shorten insertion’s first caption and collapse the formula into optional details.
- Label the mobile Watch a search destination honestly or route it to the inline example.
- Use meaningful chart-table column labels and explicit camera-button accessible names.

## Larger UX Improvements

- Create one continuous, named example that persists from item representation through search, layers, construction, and Playground experimentation.
- Add an explicitly guided mode with prediction questions, corrective feedback, small graphs, and an end-of-exercise recap.
- Introduce a comparison state that pins inputs, stores a baseline, highlights the one intentional change, and explains results from actual data.
- Redesign the comparison cards so controls, current explanation, and graph can be inspected together; support synchronized event comparison.
- Add lesson-position and example-step persistence, plus contextual return navigation from each Playground exercise.
- Create a beginner insertion replay with phase summaries and operation-specific lists/legends; keep pseudocode and detailed maintenance operations optional.
- Make results explain what changed, what stayed fixed, and whether the experiment supports the learner’s prediction. Avoid generic conclusions when data is flat or atypical.
- Provide a mobile teaching route that reaches a complete search and parameter experiment without requiring a desktop handoff.

## Issue Summary

Sorted by severity. Findings are listed once; cross-section discussion does not represent additional defects.

| # | Issue | Location | Severity | Beginner impact | Recommended fix |
| - | ----- | -------- | -------- | --------------- | --------------- |
| EDU-01 | Missing complete item-to-query-to-answer exercise | Home, Learn 1, first search | High | Learns dot motion without the practical search model | Carry one named example through representation and result |
| EXP-01 | New random target confounds the tuning comparison | Tune → Explore → Run a search | High | Attributes query changes to efSearch | Pin target and provide baseline/rerun comparison |
| EDU-02 | First vector diagram already includes unexplained graph links | Learn 1.1 | High | Conflates embeddings, points, and graph construction | One item per labeled point; add edges later |
| EDU-05 | Queue notation and capacity formula arrive too early | Learn 2.2–2.3 | High | Memorizes mechanics before experiencing a full search | Start with small plain-language interaction; introduce notation later |
| EDU-06 | Insertion preparation is much simpler than the exercise | Learn 4 → Insert replay | High | Cannot explain level assignment or link selection | Add a small worked insertion and optional math |
| PLAY-01 | M also resets hierarchy and degree settings | Tune → M | High | Misattributes layer changes to an edge-count setting | Preview and explain coupled changes |
| PLAY-05 | Insertion transfer narration contradicts algorithm-panel explanation | Insertion / Algorithm steps | High | Cannot tell whether one or several dots pass down | Align prose and visibly show transferred items |
| PLAY-07 | Experiments require unexplained benchmarking vocabulary | More → Experiments | High | Cannot interpret the most useful comparison tool | Guided plain-language experiment and optional advanced notes |
| FLOW-01 | Promised replay is unstarted and skips decisions by default | Learn 2 → example | High | Misses why the search moved | Small fixed query, paused first frame, Every step |
| FLOW-04 | Mobile Watch a search leads to a desktop-only gate | Mobile Learn → Playground | High | Cannot complete the advertised interactive path | Mobile inline replay or requirement before CTA |
| EDU-03 | Same-item identity across layers is implicit | Learn 1.3 | Medium | May read layers as different datasets | Persistent labels and explicit descent caption |
| EDU-04 | Starting-point choice is explained late | Learn 2.1 / first insertion | Medium | May assume start was selected for this query | Explain saved, query-independent start |
| EDU-07 | No comprehension checks before asserting understanding | Learn completion | Medium | Misconceptions survive into experiments | Short predictions and corrective feedback |
| PLAY-02 | Invalid numeric inputs silently change | Explore / Tune | Medium | Experiments use unintended values | Inline correction and constraint messages |
| PLAY-03 | Empty-state click instruction runs an empty search | Empty Playground | Medium | Recovery instructions disagree with available actions | Mode-aware first-dot action and empty-search guidance |
| PLAY-04 | Acceptance caption gives alternative reasons rather than actual cause | Every-step search | Medium | Cannot explain kept/replaced state | Specific occupancy and distance explanation |
| PLAY-06 | Prefilled Y violates Move node step validation | Inspect → Move node | Medium | Valid horizontal edit requires unrelated repair | Valid prefill precision or accept stored precision |
| PLAY-10 | Moving a dot unexpectedly changes its highest layer | Inspect → drag update | Medium | May infer that drag direction controls layer membership | Explain re-insertion and show layer before/after in paused replay |
| PLAY-08 | Generic experiment recap and nonexistent Build tab | Experiments | Medium | Looks for nonexistent knee/navigation | Data-aware recap and current destination link |
| FLOW-02 | Empty Playground CTA resumes a locked old trace | Learn completion CTA | Medium | No dependable fresh start | Honest resume label or explicit blank-state action |
| FLOW-03 | Learn progress resets while Playground state persists | Learn/Playground navigation | Medium | Loses place after encouraged detours | Save chapter/step and provide contextual return |
| VIS-01 | Step controls and changing diagrams separate vertically | Learn 3.1 desktop/mobile | Medium | Misses the visual consequence of Next | Keep controls/diagram together; synchronized compare |
| VIS-02 | Legends and state vocabulary vary by surface/operation | Home, Learn diagrams, Playground | Medium | Misreads highlights and item numbers | Consistent keys, IDs explained, insertion-specific states |
| VIS-03 | Dense insertion caption extends beyond initial viewport | Insertion first frame | Medium | Hardest explanation gets least readable space | Short caption and expandable math/detail |
| PLAY-09 | k above dataset size is not explicitly reconciled | One-dot search | Low | Unsure whether missing requested matches are an error | Explain available live-item limit |
| VIS-04 | Camera names and table headers are overly symbolic | Rotate view / chart tables | Low | Extra interpretation and accessibility friction | Descriptive control names and semantic columns |

## Final Assessment

1. **Can someone who knows absolutely nothing about HNSW understand the core idea using only this website?** Partially. The site can teach “use a layered network of connections to find likely nearby items with less checking,” and the four-dot example can teach why retaining an alternative helps. It does not yet reliably connect that intuition to vectors, a real query, construction, and independent experimentation. A patient reader may infer the missing bridges, but that inference is exactly what a zero-background audit should not assume.
2. **At what point is a beginner most likely to become lost?** The strongest early risk is §2.3’s W/C capacity mechanics followed by the 48-dot Playground handoff, before the small four-dot example has been completed. The second major break is insertion’s formula-heavy first frame.
3. **What is the single biggest learning-flow issue?** The course does not carry one small concrete example from data and query through a complete search into the Playground. It asks learners to transfer understanding between conceptual diagrams, dense notation, and a much larger anonymous graph on their own.
4. **What are the three highest-priority fixes?** Add the named item/vector/query example; make the Learn exercise open a small paused decision-complete trace; and add a same-target, one-setting comparison with a preserved baseline. Align the contradictory insertion transfer explanations alongside these changes.
5. **Does the Playground reinforce learning or currently require knowledge the learner has not yet gained?** Both. Its search captions, lists, and exact-results comparison reinforce the search lesson. Its default scale, insertion language, hidden coupled parameter changes, and experiment recaps require knowledge or experimental discipline that the beginner path has not sufficiently developed.
6. **What should change before showing this website to students or first-time HNSW learners?** Fix the misleading CTA states and comparison loop, resolve contradictory insertion narration, introduce the prerequisites in a concrete order, and include at least a few comprehension checks. Provide a reliable way back to the lesson and make mobile limitations explicit before inviting an unavailable action. Until then, use the existing four-dot exercise with a teacher guiding the transition to the larger Playground.

The interrupted browser checks have been resumed and documented above, including passes and the additional drag-update finding. This baseline contains 26 deduplicated issues. The explicitly listed capability/permission boundaries remain necessary before any claim of full release or accessibility certification. Application fixes begin only after this baseline and its evidence links have been verified.
