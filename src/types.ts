export interface Rule {
  id: string;
  hourFrom: string;
  hourTo: string;
  multiplier: string;
  label: string;
}

export interface RuleOutput {
  hourFrom: string;
  hourTo: string;
  multiplier: string;
  label: string;
}

export interface PolicyFormData {
  dailyRules: RuleOutput[];
  weeklyRules: RuleOutput[];
}

export interface RuleError {
  hourFrom?: string;
  hourTo?: string;
  multiplier?: string;
  label?: string;
  range?: string;
}

export type RuleErrors = Record<string, RuleError>;

export interface SectionErrors {
  daily: RuleErrors;
  weekly: RuleErrors;
  dailyGlobal?: string;
  weeklyGlobal?: string;
}
