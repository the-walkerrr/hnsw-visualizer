export interface RuleMeasurement { rule: string; recall: number; distCalls: number }

const percent = (value: number) => `${(value * 100).toFixed(1)}%`

export function selectionRuleSummary(heuristic: RuleMeasurement, simple: RuleMeasurement): string {
  const heuristicChecks = heuristic.distCalls.toFixed(1)
  const simpleChecks = simple.distCalls.toFixed(1)
  const lead = `Heuristic achieved ${percent(heuristic.recall)} recall with ${heuristicChecks} checks/query; Simple achieved ${percent(simple.recall)} recall with ${simpleChecks} checks/query.`
  if (Math.abs(heuristic.recall - simple.recall) >= 0.0001) {
    const winner = heuristic.recall > simple.recall ? 'Heuristic' : 'Simple'
    return `${lead} ${winner} found ${Math.abs((heuristic.recall - simple.recall) * 100).toFixed(1)} percentage points more true matches in this run.`
  }
  if (heuristicChecks === simpleChecks) return `${lead} Accuracy and work tie at the displayed precision.`
  const winner = heuristic.distCalls < simple.distCalls ? 'Heuristic' : 'Simple'
  return `${lead} Accuracy tied; ${winner} used ${Math.abs(heuristic.distCalls - simple.distCalls).toFixed(1)} fewer distance checks per query.`
}
