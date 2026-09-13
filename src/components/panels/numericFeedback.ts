export interface NumericFeedbackTarget { value: number; min: number; max: number; step: number }
export interface NumericFeedback { message: string; target: NumericFeedbackTarget }

export function numericFeedbackMatches(target: NumericFeedbackTarget, value: number, min: number, max: number, step: number): boolean {
  return target.value === value && target.min === min && target.max === max && target.step === step
}
