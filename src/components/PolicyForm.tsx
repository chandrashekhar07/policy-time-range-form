import { useCallback, useEffect, useState } from 'react';
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

export function PolicyForm({ onClose, onSave }: PolicyFormProps) {
  const [dailyRules, setDailyRules] = useState<Rule[]>([emptyRule('0')]);
  const [weeklyRules, setWeeklyRules] = useState<Rule[]>([emptyRule('0')]);
  const [dailyOpen, setDailyOpen] = useState(true);
  const [weeklyOpen, setWeeklyOpen] = useState(true);
  const [errors, setErrors] = useState<SectionErrors>({ daily: {}, weekly: {} });
  const [submitted, setSubmitted] = useState(false);

  // Live validation whenever rules change (after first submit attempt)
  useEffect(() => {
    if (submitted) {
      setErrors(validateAll(dailyRules, weeklyRules));
    }
  }, [dailyRules, weeklyRules, submitted]);

  const updateRule = useCallback(
    (section: 'daily' | 'weekly') =>
      (id: string, field: keyof Rule, value: string) => {
        const setter = section === 'daily' ? setDailyRules : setWeeklyRules;
        setter(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
      },
    []
  );

  const deleteRule = useCallback(
    (section: 'daily' | 'weekly') => (id: string) => {
      const setter = section === 'daily' ? setDailyRules : setWeeklyRules;
      setter(prev => prev.filter(r => r.id !== id));
    },
    []
  );

  const addRule = useCallback((section: 'daily' | 'weekly') => () => {
    const setter = section === 'daily' ? setDailyRules : setWeeklyRules;
    setter(prev => {
      const lastRule = prev[prev.length - 1];
      const startHour = lastRule?.hourTo !== '' ? lastRule.hourTo : '';
      return [...prev, emptyRule(startHour)];
    });
  }, []);

  function handleSave() {
    setSubmitted(true);
    const validation = validateAll(dailyRules, weeklyRules);
    setErrors(validation);
    if (hasErrors(validation)) return;

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
      <div className="form-modal">
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
            rules={dailyRules}
            errors={errors.daily}
            globalError={errors.dailyGlobal}
            open={dailyOpen}
            rangeMax={24}
            onToggle={() => setDailyOpen(o => !o)}
            onChange={updateRule('daily')}
            onDelete={deleteRule('daily')}
            onAdd={addRule('daily')}
          />

          <RulesSection
            title="Weekly Rules"
            rules={weeklyRules}
            errors={errors.weekly}
            globalError={errors.weeklyGlobal}
            open={weeklyOpen}
            rangeMax={168}
            onToggle={() => setWeeklyOpen(o => !o)}
            onChange={updateRule('weekly')}
            onDelete={deleteRule('weekly')}
            onAdd={addRule('weekly')}
          />
        </div>

        {/* Footer */}
        <div className="form-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-save" onClick={handleSave}>
            Save Policy
          </button>
        </div>
      </div>
    </div>
  );
}
