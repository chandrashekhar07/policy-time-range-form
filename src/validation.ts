import { Rule, RuleErrors, SectionErrors } from '@/types';

interface ValidateOptions {
  rangeMax: number;
  rangeLabel: string;
  rangeContext: string;
}

function formatHour(h: number): string {
  return Number.isInteger(h) ? `${h}` : `${h}`;
}

function validateRules(
  rules: Rule[],
  { rangeMax, rangeLabel, rangeContext }: ValidateOptions
): { errors: RuleErrors; globalError?: string } {
  const errors: RuleErrors = {};

  // Per-rule field validation
  for (const rule of rules) {
    const err: Record<string, string> = {};

    if (rule.label.trim() === '') err.label = 'Please enter a label for this rule.';

    const from = parseFloat(rule.hourFrom);
    const to = parseFloat(rule.hourTo);

    if (rule.hourFrom.trim() === '') {
      err.hourFrom = 'Please enter a starting hour.';
    } else if (isNaN(from) || from < 0 || from > rangeMax) {
      err.hourFrom = `Please enter a value between 0 and ${rangeMax}.`;
    }

    if (rule.hourTo.trim() === '') {
      err.hourTo = 'Please enter an ending hour.';
    } else if (isNaN(to) || to < 0 || to > rangeMax) {
      err.hourTo = `Please enter a value between 0 and ${rangeMax}.`;
    }

    if (!err.hourFrom && !err.hourTo) {
      if (from >= to) {
        err.range = `"Hours From" (${formatHour(from)}) must be earlier than "Hours To" (${formatHour(to)}).`;
      }
    }

    if (rule.multiplier.trim() === '') {
      err.multiplier = 'Please enter a multiplier.';
    } else if (isNaN(parseFloat(rule.multiplier)) || parseFloat(rule.multiplier) <= 0) {
      err.multiplier = 'Multiplier must be a number greater than 0.';
    }

    if (Object.keys(err).length) errors[rule.id] = err;
  }

  // Only check coverage / overlaps / holes when every row has a valid, ordered range
  const parsed = rules
    .map(r => ({
      id: r.id,
      from: parseFloat(r.hourFrom),
      to: parseFloat(r.hourTo),
    }))
    .filter(r => !isNaN(r.from) && !isNaN(r.to) && r.from < r.to);

  if (parsed.length !== rules.length || rules.length === 0) {
    return { errors };
  }

  const sorted = [...parsed].sort((a, b) => a.from - b.from);

  let globalError: string | undefined;

  // 1. Overlaps
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].to > sorted[i + 1].from) {
      globalError =
        `Two rules overlap. The rule ending at ${formatHour(sorted[i].to)} ` +
        `conflicts with the next rule starting at ${formatHour(sorted[i + 1].from)}. ` +
        `Please adjust the hours so they don't cover the same period.`;
      break;
    }
  }

  // 2. Holes (gaps between consecutive ranges)
  if (!globalError) {
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].to < sorted[i + 1].from) {
        globalError =
          `There's a gap between ${formatHour(sorted[i].to)} and ${formatHour(sorted[i + 1].from)}. ` +
          `${rangeLabel} rules must cover every hour with no missing periods — ` +
          `please add or adjust a rule to fill the gap.`;
        break;
      }
    }
  }

  // 3. Full coverage — must start at 0 and end at rangeMax
  if (!globalError) {
    if (sorted[0].from !== 0) {
      globalError =
        `${rangeLabel} rules must start from hour 0. ` +
        `Your first rule currently starts at ${formatHour(sorted[0].from)}. ` +
        `Please adjust it so the coverage begins at 0.`;
    } else if (sorted[sorted.length - 1].to !== rangeMax) {
      globalError =
        `${rangeLabel} rules must cover the full ${rangeContext} (up to hour ${rangeMax}). ` +
        `Your last rule currently ends at ${formatHour(sorted[sorted.length - 1].to)}. ` +
        `Please add or adjust a rule so the coverage reaches ${rangeMax}.`;
    }
  }

  return { errors, globalError };
}

export function validateAll(
  dailyRules: Rule[],
  weeklyRules: Rule[]
): SectionErrors {
  const { errors: daily, globalError: dailyGlobal } = validateRules(dailyRules, {
    rangeMax: 24,
    rangeLabel: 'Daily',
    rangeContext: 'day',
  });
  const { errors: weekly, globalError: weeklyGlobal } = validateRules(weeklyRules, {
    rangeMax: 168,
    rangeLabel: 'Weekly',
    rangeContext: 'week',
  });
  return { daily, weekly, dailyGlobal, weeklyGlobal };
}

export function hasErrors(errors: SectionErrors): boolean {
  return (
    Object.keys(errors.daily).length > 0 ||
    Object.keys(errors.weekly).length > 0 ||
    !!errors.dailyGlobal ||
    !!errors.weeklyGlobal
  );
}
