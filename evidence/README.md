# Product QA evidence index

The browser automation runtime displayed screenshots inline during the audit but did not expose a supported filesystem export for those captures. This index records the exact evidenced states and their reproducible locations.

| Evidence | State observed | Supports |
|---|---|---|
| E-01 | Fresh landing page at desktop width with clear hero, two CTAs, and graph preview | Cold-start result, first-run score |
| E-02 | Playground after random search: query mark, 1/89 trace, Play/Next enabled | Critical search journey |
| E-03 | Completed search: 89/89, five returned IDs, 32 distances vs 48 exact scan | Core functionality and Results journey |
| E-04 | Completed insertion: count changed 48 to 49 and trace reached 324/324 | Insert journey |
| E-05 | Refresh after insertion: vector count reset to 48, M reset to 5, trace cleared | STATE-001 |
| E-06 | Learn and Lab text naming nonexistent Params/Metrics/Code tabs while tab bar shows Tune/Results/Trace | CONTENT-001 |
| E-07 | Inspect empty state, pointer-selected node details, and successful drag-generated update trace | Inspect/update journey and A11Y-001 |
| E-08 | Hard-delete alert dialog with explicit consequence, Cancel initially focused, Escape restoring focus | Trust/destructive-action strength |
| E-09 | Visible blue focus ring on the primary landing CTA and keyboard-only random search activation | Accessibility keyboard coverage |
| E-10 | Computed #888a82 text on #fbfbf9 background, approximately 3.38:1 | A11Y-002 |
| E-11 | 390x844 desktop-only gate; 900x800 and 900x600 functional layouts; 1440x900 wide layout | Responsive coverage and RESP-001 |
| E-12 | Local timing: 85ms reload-to-DOMContentLoaded wall clock, 870ms random-search-to-trace, Lab sweep approximately 3s; no console warnings/errors | Performance/reliability |

No credentials or personal information were used. No hard delete, soft delete, clear-all action, external communication, payment, upload, or other external side effect was executed.
