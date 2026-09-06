export interface ControlGuide {
  id: string
  label: string
  plain: string
  inputs: Array<{ label: string; explanation: string }>
  lower: string
  higher: string
  when: string
  learnMore?: { href: string; label: string }
}

export const CONTROL_GUIDES = {
  dataset: {
    id: 'control-dataset',
    label: 'Dataset shape',
    plain: 'Changes where the example dots are placed. It is a teaching aid, not an HNSW setting.',
    inputs: [
      { label: 'Clusters', explanation: 'Four dense groups separated by empty space; useful for seeing searches get trapped in one region.' },
      { label: 'Uniform', explanation: 'Dots spread evenly across the canvas; the friendliest shape for a graph index.' },
      { label: 'Ring', explanation: 'Dots arranged around a thin circle, where long-range edges become especially important.' },
      { label: 'Two moons', explanation: 'Two interleaved curves that make nearby-looking dots harder to connect correctly.' },
      { label: 'Grid', explanation: 'A regular lattice with repeated local neighborhoods, useful for inspecting edge selection.' },
      { label: 'Spiral', explanation: 'A winding curve where canvas distance and distance along the curve can disagree.' },
    ],
    lower: 'There is no low or high setting. Each shape creates a different search challenge.',
    higher: 'Clusters test whether separate groups stay reachable; curves test whether the graph follows a winding shape.',
    when: 'Changing it rebuilds the example index.',
  },
  vectors: {
    id: 'control-vectors',
    label: 'Number of vectors',
    plain: 'How many stored items appear as dots on the canvas.',
    inputs: [
      { label: 'Input: 0–400', explanation: 'Enter a whole number to set the exact number of stored dots. A value of 0 clears the graph.' },
      { label: 'Learning range: 24–80', explanation: 'This range usually keeps individual edges and search steps readable. Larger values make the example busier and more realistic.' },
    ],
    lower: 'Fewer dots make individual edges and search steps easier to follow.',
    higher: 'More dots make the example more realistic, but the graph and traces become busier.',
    when: 'Changing it rebuilds the example index.',
  },
  k: {
    id: 'control-k',
    label: 'Results requested (k)',
    plain: 'How many nearest stored items a search should return.',
    inputs: [
      { label: 'Input: 1–20', explanation: 'Enter a whole number. The value is the exact maximum number of nearest dots returned by the next search.' },
      { label: 'How to choose', explanation: 'Use 1 to inspect the single nearest result, or a larger value when you want a broader result set. Larger requests may need a wider search beam.' },
    ],
    lower: 'A smaller k asks for fewer answers and is easier to inspect.',
    higher: 'A larger k asks for more answers and may require a wider search beam to find all of them.',
    when: 'This affects the next search only; it does not rebuild the graph.',
  },
  M: {
    id: 'control-m',
    label: 'Connections (M)',
    plain: 'How many nearby dots a new dot tries to connect to on each layer.',
    inputs: [
      { label: 'Input: 2–24', explanation: 'Enter a whole number for the target neighbors chosen per layer.' },
      { label: 'What the value means', explanation: 'Values near 2 create a sparse, fast, memory-light graph. Values near 24 create more routes and usually improve recall, with more build and search work.' },
    ],
    lower: 'Fewer edges use less memory and build faster, but the graph is easier to get stuck in.',
    higher: 'More edges usually improve reachability and recall, but use more memory and take longer to build and search.',
    when: 'Changing M rebuilds the graph. This playground also resets the degree caps and layer multiplier to matching defaults.',
  },
  efConstruction: {
    id: 'control-ef-construction',
    label: 'Build effort (efConstruction)',
    plain: 'How many possible neighbors are kept while adding a dot.',
    inputs: [
      { label: 'Input: 1–200', explanation: 'Enter a whole number for the maximum candidate pool kept during insertion.' },
      { label: 'What the value means', explanation: 'Small values build quickly but can miss useful connections. Large values inspect more candidates and usually build a higher-recall graph more slowly.' },
    ],
    lower: 'Builds faster, but can miss useful connections and permanently reduce search quality.',
    higher: 'Builds more slowly, but usually creates a better-connected index with better recall.',
    when: 'Build-time setting: changing it rebuilds the graph.',
    learnMore: { href: '#lesson-4', label: 'See how efConstruction is used during insertion' },
  },
  mL: {
    id: 'control-ml',
    label: 'Layer multiplier (mL)',
    plain: 'Controls how likely a dot is to appear on the sparse upper “express-lane” layers.',
    inputs: [
      { label: 'Input: 0.10–2.00', explanation: 'Enter a decimal in steps of 0.01. The usual starting value is 1 / ln(M).' },
      { label: 'What the value means', explanation: 'Values near 0.10 produce fewer upper-layer dots and layers. Values near 2.00 produce more of both, which can add shortcuts but also wasted work.' },
    ],
    lower: 'Creates fewer upper-layer dots and fewer layers; too low removes useful long jumps.',
    higher: 'Creates more upper-layer dots and often more layers; too high wastes work in nearly empty layers.',
    when: 'Build-time setting: changing it rebuilds the graph. The usual value is 1 / ln(M).',
  },
  metric: {
    id: 'control-metric',
    label: 'Distance metric',
    plain: 'Defines what “similar” means by choosing how the distance between two vectors is measured.',
    inputs: [
      { label: 'Euclidean (L2)', explanation: 'Uses straight-line distance, matching what your eye measures between dots on the canvas.' },
      { label: 'Manhattan (L1)', explanation: 'Adds the horizontal and vertical gaps, producing diamond-shaped neighborhoods.' },
      { label: 'Cosine', explanation: 'Compares direction from the canvas center rather than size; points on the same ray are treated as similar.' },
    ],
    lower: 'This is a choice, not a low-to-high dial. Euclidean uses straight-line distance; Manhattan uses grid-like distance.',
    higher: 'Cosine compares direction rather than size. Use the metric that matches how your embeddings were trained and queried.',
    when: 'Changing the metric rebuilds the graph because every neighbor relationship may change.',
  },
  efSearch: {
    id: 'control-ef-search',
    label: 'Search effort (efSearch)',
    plain: 'How many possible matches the search keeps on the bottom layer.',
    inputs: [
      { label: 'Input: 1–200', explanation: 'Enter a whole number for the size of the possible-match list. The search always keeps room for at least k results.' },
      { label: 'What the value means', explanation: 'Small values check fewer dots and return faster. Large values explore more alternatives and usually improve recall, with more distance calculations.' },
    ],
    lower: 'Searches faster and checks fewer dots, but is more likely to miss a true nearest neighbor.',
    higher: 'Usually improves recall by exploring more alternatives, but increases distance calculations and latency.',
    when: 'Query-time setting: it changes searches immediately and does not rebuild the graph.',
    learnMore: { href: '#lesson-6', label: 'See how efSearch controls a query' },
  },
  Mmax: {
    id: 'control-mmax',
    label: 'Maximum degree above layer 0 (Mmax)',
    plain: 'The hard limit on how many edges one dot may keep on an upper layer.',
    inputs: [
      { label: 'Input: M–32', explanation: 'Enter a whole number from the current M value through 32; Mmax cannot be lower than M.' },
      { label: 'What the value means', explanation: 'Values close to M keep upper layers sparse. Larger values preserve more alternate express-lane routes, using more memory and traversal work.' },
    ],
    lower: 'Uses less memory, but can remove useful express-lane routes.',
    higher: 'Keeps more alternate upper-layer routes, with extra memory and traversal work.',
    when: 'Build-time setting: changing it rebuilds the graph. It cannot be lower than M.',
  },
  Mmax0: {
    id: 'control-mmax0',
    label: 'Maximum degree on layer 0 (Mmax0)',
    plain: 'The hard limit on edges per dot on the bottom layer, where every dot lives.',
    inputs: [
      { label: 'Input: M–64', explanation: 'Enter a whole number from the current M value through 64. A common starting point is 2 × M.' },
      { label: 'What the value means', explanation: 'Values close to M keep the largest layer compact. Larger values retain more local routes and can improve recall, but add edges at the most expensive layer.' },
    ],
    lower: 'Makes the largest layer smaller, but increases the chance of weak or disconnected local routes.',
    higher: 'Keeps more local routes and can improve recall, but this is the most expensive place to add edges.',
    when: 'Build-time setting: changing it rebuilds the graph. A common default is 2 × M.',
  },
  seed: {
    id: 'control-seed',
    label: 'Level random seed',
    plain: 'Chooses a repeatable sequence of random layer assignments. It does not add randomness to search results.',
    inputs: [
      { label: 'Input: 1–200', explanation: 'Enter any whole number in the range. Reusing it reproduces the same sequence of layer assignments.' },
      { label: 'What the value means', explanation: 'The number has no quality ranking: 200 is not better than 1. A different number simply generates a different repeatable hierarchy.' },
    ],
    lower: 'A smaller number is not better; it simply produces one repeatable hierarchy.',
    higher: 'A larger number produces a different repeatable hierarchy, useful for checking that a result is not luck.',
    when: 'Build-time setting: changing it rebuilds the same dots with different layer assignments.',
  },
  neighborRule: {
    id: 'control-neighbor-rule',
    label: 'Neighbor selection rule',
    plain: 'Chooses which candidate edges survive when a dot cannot keep all of them.',
    inputs: [
      { label: 'Heuristic', explanation: 'Keeps candidates in different directions, which usually preserves routes between regions and improves reachability.' },
      { label: 'Simple', explanation: 'Keeps only the nearest candidates. It is easy to follow, but its edges may all point into one cluster.' },
    ],
    lower: 'Simple keeps only the nearest candidates. It is easy to understand but may point every edge into one cluster.',
    higher: 'Heuristic also values different directions, which usually preserves routes between regions and improves reachability.',
    when: 'Build-time setting: changing the rule rebuilds the graph.',
  },
  extendCandidates: {
    id: 'control-extend-candidates',
    label: 'Extend candidates',
    plain: 'Also considers the neighbors of each candidate before choosing final edges.',
    inputs: [
      { label: 'Off', explanation: 'Chooses from the original candidate pool. This builds faster and is the normal default.' },
      { label: 'On', explanation: 'Adds each candidate’s neighbors to the pool, which can help difficult clustered data at extra build cost.' },
    ],
    lower: 'Off builds faster and is the normal default.',
    higher: 'On searches a larger selection pool and can help difficult clustered data, at extra build cost.',
    when: 'Build-time switch: changing it rebuilds the graph.',
  },
  keepPrunedConnections: {
    id: 'control-keep-pruned',
    label: 'Keep pruned connections',
    plain: 'Fills unused edge slots with the closest rejected candidates when the diversity rule keeps too few.',
    inputs: [
      { label: 'Off', explanation: 'Keeps only diverse edges, even when that leaves unused edge slots and some dots under-connected.' },
      { label: 'On', explanation: 'Uses the closest rejected candidates to fill open slots, keeping dots better connected within the edge budget.' },
    ],
    lower: 'Off preserves only diverse edges, but some dots may become under-connected dead ends.',
    higher: 'On keeps dots better connected, using the available edge budget; this is the safer default.',
    when: 'Build-time switch: changing it rebuilds the graph.',
  },
} satisfies Record<string, ControlGuide>

export type ControlGuideKey = keyof typeof CONTROL_GUIDES
