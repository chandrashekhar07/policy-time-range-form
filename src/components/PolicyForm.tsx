import { useCallback, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Rule, PolicyFormData, SectionErrors } from '@/types';
import { RulesSection } from '@/components/RulesSection';
import { validateAll, hasErrors } from '@/validation';

function uid() {
  return Math.random().toString(36).slice(2);
}

function emptyRule(startHour?: string): Rule {
  return { id: uid(), hourFrom: startHour ?? '', hourTo: '', multiplier: '', label: '' };
}

interface PolicyFormProps {
  onClose: () => void;
  onSave: (data: PolicyFormData) => void;
}

type SectionKey = 'daily' | 'weekly';
type RuleField = Exclude<keyof Rule, 'id'>;

const FIELD_ORDER: RuleField[] = ['label', 'hourFrom', 'hourTo', 'multiplier'];

function touchedKey(section: SectionKey, ruleId: string, field: RuleField): string {
  return `${section}:${ruleId}:${field}`;
}

function buildSectionHint(rules: Rule[], rangeMax: number, hasGlobalError: boolean): string | undefined {
  if (!hasGlobalError) return undefined;

  const parsed = rules
    .map(r => ({ from: parseFloat(r.hourFrom), to: parseFloat(r.hourTo) }))
    .filter(r => !isNaN(r.from) && !isNaN(r.to) && r.from < r.to)
    .sort((a, b) => a.from - b.from);

  if (parsed.length === 0) {
    return `Add valid ranges, then cover 0-${rangeMax} with no gaps.`;
  }

  for (let i = 0; i < parsed.length - 1; i++) {
    if (parsed[i].to > parsed[i + 1].from) {
      return `Fix overlap: set the next start to at least ${parsed[i].to}.`;
    }
    if (parsed[i].to < parsed[i + 1].from) {
      return `Fill gap: add a rule from ${parsed[i].to} to ${parsed[i + 1].from}.`;
    }
  }

  if (parsed[0].from !== 0) {
    return 'Set the first rule to start at 0.';
  }

  if (parsed[parsed.length - 1].to !== rangeMax) {
    return `Set the last rule to end at ${rangeMax}.`;
  }

  return undefined;
}

function pickTouchedErrors(
  section: SectionKey,
  source: SectionErrors[SectionKey],
  touched: Set<string>
): SectionErrors[SectionKey] {
  const filtered: SectionErrors[SectionKey] = {};

  for (const [ruleId, err] of Object.entries(source)) {
    const next: NonNullable<typeof err> = {};

    if (err.label && touched.has(touchedKey(section, ruleId, 'label'))) next.label = err.label;
    if (err.hourFrom && touched.has(touchedKey(section, ruleId, 'hourFrom'))) next.hourFrom = err.hourFrom;
    if (err.hourTo && touched.has(touchedKey(section, ruleId, 'hourTo'))) next.hourTo = err.hourTo;
    if (err.multiplier && touched.has(touchedKey(section, ruleId, 'multiplier'))) {
      next.multiplier = err.multiplier;
    }
    if (
      err.range &&
      (touched.has(touchedKey(section, ruleId, 'hourFrom')) ||
        touched.has(touchedKey(section, ruleId, 'hourTo')))
    ) {
      next.range = err.range;
    }

    if (Object.keys(next).length > 0) {
      filtered[ruleId] = next;
    }
  }

  return filtered;
}

function getFirstInvalidTarget(
  validation: SectionErrors,
  dailyRules: Rule[],
  weeklyRules: Rule[]
): { section: SectionKey; ruleId: string; field: RuleField } | null {
  const candidates: Array<{ section: SectionKey; rules: Rule[]; errors: SectionErrors[SectionKey] }> = [
    { section: 'daily', rules: dailyRules, errors: validation.daily },
    { section: 'weekly', rules: weeklyRules, errors: validation.weekly },
  ];

  for (const candidate of candidates) {
    for (const rule of candidate.rules) {
      const err = candidate.errors[rule.id];
      if (!err) continue;

      for (const field of FIELD_ORDER) {
        if (err[field]) return { section: candidate.section, ruleId: rule.id, field };
      }

      if (err.range) return { section: candidate.section, ruleId: rule.id, field: 'hourFrom' };
    }
  }

  return null;
}

function getFieldLabel(field: RuleField): string {
  if (field === 'hourFrom') return 'Hours From';
  if (field === 'hourTo') return 'Hours To';
  if (field === 'multiplier') return 'Multiplier';
  return 'Label';
}

export function PolicyForm({ onClose, onSave }: PolicyFormProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [dailyRules, setDailyRules] = useState<Rule[]>([emptyRule('0')]);
  const [weeklyRules, setWeeklyRules] = useState<Rule[]>([emptyRule('0')]);
  const [dailyOpen, setDailyOpen] = useState(true);
  const [weeklyOpen, setWeeklyOpen] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const liveValidation = useMemo(
    () => validateAll(dailyRules, weeklyRules),
    [dailyRules, weeklyRules]
  );

  const touchedValidation = useMemo(
    () => ({
      daily: pickTouchedErrors('daily', liveValidation.daily, touchedFields),
      weekly: pickTouchedErrors('weekly', liveValidation.weekly, touchedFields),
      dailyGlobal: liveValidation.dailyGlobal,
      weeklyGlobal: liveValidation.weeklyGlobal,
    }),
    [liveValidation, touchedFields]
  );

  // Global section errors are live. Field errors appear after touch or submit.
  const errors: SectionErrors = submitted
    ? liveValidation
    : touchedValidation;

  const persistentError = errors.dailyGlobal
    ? `Daily: ${errors.dailyGlobal}`
    : errors.weeklyGlobal
      ? `Weekly: ${errors.weeklyGlobal}`
      : undefined;

  const isInvalid = hasErrors(liveValidation);
  const firstInvalidTarget = useMemo(
    () => getFirstInvalidTarget(liveValidation, dailyRules, weeklyRules),
    [liveValidation, dailyRules, weeklyRules]
  );

  const saveDisabledReason = isInvalid
    ? persistentError
      ? 'Fix the error above to enable Save.'
      : firstInvalidTarget
        ? `Complete ${getFieldLabel(firstInvalidTarget.field)} in ${firstInvalidTarget.section === 'daily' ? 'Daily' : 'Weekly'} Rules to enable Save.`
        : 'Complete required fields to enable Save.'
    : undefined;

  const dailyHint = buildSectionHint(dailyRules, 24, !!errors.dailyGlobal);
  const weeklyHint = buildSectionHint(weeklyRules, 168, !!errors.weeklyGlobal);

  const updateRule = useCallback(
    (section: SectionKey) =>
      (id: string, field: RuleField, value: string) => {
        const setter = section === 'daily' ? setDailyRules : setWeeklyRules;
        setter(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
      },
    []
  );

  const deleteRule = useCallback(
    (section: SectionKey) => (id: string) => {
      const setter = section === 'daily' ? setDailyRules : setWeeklyRules;
      setter(prev => prev.filter(r => r.id !== id));

      setTouchedFields(prev => {
        const next = new Set(prev);
        for (const field of FIELD_ORDER) {
          next.delete(touchedKey(section, id, field));
        }
        return next;
      });
    },
    []
  );

  const addRule = useCallback((section: SectionKey) => () => {
    const setter = section === 'daily' ? setDailyRules : setWeeklyRules;
    setter(prev => {
      const lastRule = prev[prev.length - 1];
      const startHour = lastRule?.hourTo !== '' ? lastRule.hourTo : '';
      return [...prev, emptyRule(startHour)];
    });
  }, []);

  const markTouched = useCallback((section: SectionKey, id: string, field: RuleField) => {
    const key = touchedKey(section, id, field);
    setTouchedFields(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const focusInvalidField = useCallback((target: { section: SectionKey; ruleId: string; field: RuleField }) => {
    const selector = `[data-field-path="${target.section}:${target.ruleId}:${target.field}"]`;

    requestAnimationFrame(() => {
      const input = modalRef.current?.querySelector<HTMLInputElement>(selector);
      if (!input) return;
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus({ preventScroll: true });
    });
  }, []);

  function handleSave() {
    setSubmitted(true);
    if (hasErrors(liveValidation)) {
      if (firstInvalidTarget) {
        if (firstInvalidTarget.section === 'daily') setDailyOpen(true);
        if (firstInvalidTarget.section === 'weekly') setWeeklyOpen(true);
        focusInvalidField(firstInvalidTarget);
      }
      return;
    }

    const toOutput = (rules: Rule[]) =>
      rules.map(({ hourFrom, hourTo, multiplier, label }) => ({
        hourFrom,
        hourTo,
        multiplier,
        label,
      }));

    onSave({ dailyRules: toOutput(dailyRules), weeklyRules: toOutput(weeklyRules) });
  }

  return (
    <div className="form-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="form-modal" ref={modalRef}>
        {/* Header */}
        <div className="form-header">
          <div>
            <h2 className="form-title">Create New Policy</h2>
            <p className="form-subtitle">Enter the details of the policy</p>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Sections */}
        <div className="form-sections">
          <RulesSection
            title="Daily Rules"
            section="daily"
            rules={dailyRules}
            errors={errors.daily}
            hint={dailyHint}
            open={dailyOpen}
            rangeMax={24}
            onToggle={() => setDailyOpen(o => !o)}
            onChange={updateRule('daily')}
            onTouch={markTouched}
            onDelete={deleteRule('daily')}
            onAdd={addRule('daily')}
          />

          <RulesSection
            title="Weekly Rules"
            section="weekly"
            rules={weeklyRules}
            errors={errors.weekly}
            hint={weeklyHint}
            open={weeklyOpen}
            rangeMax={168}
            onToggle={() => setWeeklyOpen(o => !o)}
            onChange={updateRule('weekly')}
            onTouch={markTouched}
            onDelete={deleteRule('weekly')}
            onAdd={addRule('weekly')}
          />
        </div>

        <div className="form-actions-zone">
          {persistentError && (
            <div className="form-error-strip" role="alert" aria-live="polite">
              {persistentError}
            </div>
          )}

          {saveDisabledReason && isInvalid && (
            <p className="save-reason" aria-live="polite">
              {saveDisabledReason}
            </p>
          )}

          {/* Footer */}
          <div className="form-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-save"
              onClick={handleSave}
              disabled={isInvalid}
              title={saveDisabledReason}
            >
              Save Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
