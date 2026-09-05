export interface ControlGuide {
  id: string
  label: string
  plain: string
  lower: string
  higher: string
  when: string
}

export const CONTROL_GUIDES = {
  dataset: {
    id: 'control-dataset',
    label: 'Dataset shape',
    plain: 'Changes where the example dots are placed. It is a teaching aid, not an HNSW setting.',
    lower: 'There is no low or high setting. Each shape creates a different search challenge.',
    higher: 'Clusters test whether separate groups stay reachable; curves test whether the graph follows a winding shape.',
    when: 'Changing it rebuilds the example index.',
  },
  vectors: {
    id: 'control-vectors',
    label: 'Number of vectors',
    plain: 'How many stored items appear as dots on the canvas.',
    lower: 'Fewer dots make individual edges and search steps easier to follow.',
    higher: 'More dots make the example more realistic, but the graph and traces become busier.',
    when: 'Changing it rebuilds the example index.',
  },
  k: {
    id: 'control-k',
    label: 'Results requested (k)',
    plain: 'How many nearest stored items a search should return.',
    lower: 'A smaller k asks for fewer answers and is easier to inspect.',
    higher: 'A larger k asks for more answers and may require a wider search beam to find all of them.',
    when: 'This affects the next search only; it does not rebuild the graph.',
  },
  M: {
    id: 'control-m',
    label: 'Connections per insertion (M)',
    plain: 'The target number of neighbors a new dot chooses on each layer it joins.',
    lower: 'Fewer edges use less memory and build faster, but the graph is easier to get stuck in.',
    higher: 'More edges usually improve reachability and recall, but use more memory and take longer to build and search.',
    when: 'Changing M rebuilds the graph. This playground also resets the degree caps and layer multiplier to matching defaults.',
  },
  efConstruction: {
    id: 'control-ef-construction',
    label: 'Construction beam (efConstruction)',
    plain: 'How many promising candidates insertion keeps while looking for a new dot’s neighbors.',
    lower: 'Builds faster, but can miss useful connections and permanently reduce search quality.',
    higher: 'Builds more slowly, but usually creates a better-connected index with better recall.',
    when: 'Build-time setting: changing it rebuilds the graph.',
  },
  mL: {
    id: 'control-ml',
    label: 'Layer multiplier (mL)',
    plain: 'Controls how likely a dot is to appear on the sparse upper “express-lane” layers.',
    lower: 'Creates fewer upper-layer dots and fewer layers; too low removes useful long jumps.',
    higher: 'Creates more upper-layer dots and often more layers; too high wastes work in nearly empty layers.',
    when: 'Build-time setting: changing it rebuilds the graph. The usual value is 1 / ln(M).',
  },
  metric: {
    id: 'control-metric',
    label: 'Distance metric',
    plain: 'Defines what “similar” means by choosing how the distance between two vectors is measured.',
    lower: 'This is a choice, not a low-to-high dial. Euclidean uses straight-line distance; Manhattan uses grid-like distance.',
    higher: 'Cosine compares direction rather than size. Use the metric that matches how your embeddings were trained and queried.',
    when: 'Changing the metric rebuilds the graph because every neighbor relationship may change.',
  },
  efSearch: {
    id: 'control-ef-search',
    label: 'Search beam (efSearch)',
    plain: 'How many promising candidates a query keeps in play on the bottom layer.',
    lower: 'Searches faster and checks fewer dots, but is more likely to miss a true nearest neighbor.',
    higher: 'Usually improves recall by exploring more alternatives, but increases distance calculations and latency.',
    when: 'Query-time setting: it changes searches immediately and does not rebuild the graph.',
  },
  Mmax: {
    id: 'control-mmax',
    label: 'Maximum degree above layer 0 (Mmax)',
    plain: 'The hard limit on how many edges one dot may keep on an upper layer.',
    lower: 'Uses less memory, but can remove useful express-lane routes.',
    higher: 'Keeps more alternate upper-layer routes, with extra memory and traversal work.',
    when: 'Build-time setting: changing it rebuilds the graph. It cannot be lower than M.',
  },
  Mmax0: {
    id: 'control-mmax0',
    label: 'Maximum degree on layer 0 (Mmax0)',
    plain: 'The hard limit on edges per dot on the bottom layer, where every dot lives.',
    lower: 'Makes the largest layer smaller, but increases the chance of weak or disconnected local routes.',
    higher: 'Keeps more local routes and can improve recall, but this is the most expensive place to add edges.',
    when: 'Build-time setting: changing it rebuilds the graph. A common default is 2 × M.',
  },
  seed: {
    id: 'control-seed',
    label: 'Level random seed',
    plain: 'Chooses a repeatable sequence of random layer assignments. It does not add randomness to search results.',
    lower: 'A smaller number is not better; it simply produces one repeatable hierarchy.',
    higher: 'A larger number produces a different repeatable hierarchy, useful for checking that a result is not luck.',
    when: 'Build-time setting: changing it rebuilds the same dots with different layer assignments.',
  },
  neighborRule: {
    id: 'control-neighbor-rule',
    label: 'Neighbor selection rule',
    plain: 'Chooses which candidate edges survive when a dot cannot keep all of them.',
    lower: 'Simple keeps only the nearest candidates. It is easy to understand but may point every edge into one cluster.',
    higher: 'Heuristic also values different directions, which usually preserves routes between regions and improves reachability.',
    when: 'Build-time setting: changing the rule rebuilds the graph.',
  },
  extendCandidates: {
    id: 'control-extend-candidates',
    label: 'Extend candidates',
    plain: 'Also considers the neighbors of each candidate before choosing final edges.',
    lower: 'Off builds faster and is the normal default.',
    higher: 'On searches a larger selection pool and can help difficult clustered data, at extra build cost.',
    when: 'Build-time switch: changing it rebuilds the graph.',
  },
  keepPrunedConnections: {
    id: 'control-keep-pruned',
    label: 'Keep pruned connections',
    plain: 'Fills unused edge slots with the closest rejected candidates when the diversity rule keeps too few.',
    lower: 'Off preserves only diverse edges, but some dots may become under-connected dead ends.',
    higher: 'On keeps dots better connected, using the available edge budget; this is the safer default.',
    when: 'Build-time switch: changing it rebuilds the graph.',
  },
} satisfies Record<string, ControlGuide>

export type ControlGuideKey = keyof typeof CONTROL_GUIDES
