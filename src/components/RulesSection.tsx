import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Rule, RuleErrors } from '@/types';

type SectionKey = 'daily' | 'weekly';
type RuleField = Exclude<keyof Rule, 'id'>;

const SEGMENT_COLORS = [
  '#1a56db',
  '#057a55',
  '#b45309',
  '#7c3aed',
  '#be185d',
  '#0e7490',
  '#c2410c',
  '#4338ca',
];

interface Segment {
  from: number;
  to: number;
  color: string;
  label: string;
  valid: boolean;
}

function buildSegments(rules: Rule[], rangeMax: number): Segment[] {
  const parsed = rules
    .map(r => ({
      from: parseFloat(r.hourFrom),
      to: parseFloat(r.hourTo),
      label: r.label,
    }))
    .filter(r => !isNaN(r.from) && !isNaN(r.to) && r.from < r.to);

  return parsed.map((r, i) => ({
    from: Math.max(0, r.from),
    to: Math.min(rangeMax, r.to),
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    label: r.label || `Rule ${i + 1}`,
    valid: true,
  }));
}

function CoverageBar({ rules, rangeMax }: { rules: Rule[]; rangeMax: number }) {
  const segments = buildSegments(rules, rangeMax);
  const sorted = [...segments].sort((a, b) => a.from - b.from);

  // Build display blocks: covered segments + gap blocks
  const blocks: { from: number; to: number; color: string; gap: boolean; label: string }[] = [];
  let cursor = 0;

  for (const seg of sorted) {
    if (seg.from > cursor) {
      blocks.push({ from: cursor, to: seg.from, color: '#e5e7eb', gap: true, label: 'Gap' });
    }
    blocks.push({ from: seg.from, to: seg.to, color: seg.color, gap: false, label: seg.label });
    cursor = Math.max(cursor, seg.to);
  }

  if (cursor < rangeMax) {
    blocks.push({ from: cursor, to: rangeMax, color: '#e5e7eb', gap: true, label: 'Gap' });
  }

  const ticks = rangeMax === 24 ? [0, 6, 12, 18, 24] : [0, 24, 48, 72, 96, 120, 144, 168];

  const covered = segments.reduce((sum, s) => sum + (s.to - s.from), 0);
  const pct = Math.round((covered / rangeMax) * 100);

  return (
    <div className="coverage-bar-wrap">
      <div className="coverage-header">
        <span className="coverage-label">Coverage</span>
        <span className={`coverage-pct${pct === 100 ? ' coverage-pct--ok' : ''}`}>
          {pct}%
        </span>
      </div>
      <div className="coverage-bar">
        {blocks.map((block, i) => {
          const width = ((block.to - block.from) / rangeMax) * 100;
          const left = (block.from / rangeMax) * 100;
          return (
            <div
              key={i}
              className={`coverage-segment${block.gap ? ' coverage-segment--gap' : ''}`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: block.color,
              }}
              title={block.gap ? `Uncovered: ${block.from}–${block.to}` : `${block.label}: ${block.from}–${block.to}`}
            />
          );
        })}
      </div>
      <div className="coverage-ticks">
        {ticks.map(t => (
          <span key={t} className="coverage-tick" style={{ left: `${(t / rangeMax) * 100}%` }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

interface RuleRowProps {
  section: SectionKey;
  rule: Rule;
  errors: RuleErrors;
  onChange: (id: string, field: RuleField, value: string) => void;
  onTouch: (section: SectionKey, id: string, field: RuleField) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  rangeMax: number;
}

function RuleRow({ section, rule, errors, onChange, onTouch, onDelete, canDelete, rangeMax }: RuleRowProps) {
  const err = errors[rule.id];
  return (
    <div className="rule-row">
      {/* Label row */}
      <div className="field-group full">
        <label className="field-label">Label</label>
        <div className="input-wrap">
          <input
            className={`field-input${err?.label ? ' field-input--error' : ''}`}
            placeholder="Enter label"
            value={rule.label}
            onChange={e => onChange(rule.id, 'label', e.target.value)}
            onBlur={() => onTouch(section, rule.id, 'label')}
            data-field-path={`${section}:${rule.id}:label`}
          />
          {canDelete && (
            <button
              type="button"
              className="delete-btn"
              onClick={() => onDelete(rule.id)}
              aria-label="Remove rule"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        {err?.label && <p className="field-error">{err.label}</p>}
      </div>

      {/* Range row */}
      <div className="fields-row">
        <div className="field-group">
          <label className="field-label">Hours From</label>
          <input
            type="number"
            className={`field-input${err?.hourFrom || err?.range ? ' field-input--error' : ''}`}
            placeholder="e.g: 0"
            min={0}
            max={rangeMax}
            step={0.5}
            value={rule.hourFrom}
            onChange={e => onChange(rule.id, 'hourFrom', e.target.value)}
            onBlur={() => onTouch(section, rule.id, 'hourFrom')}
            data-field-path={`${section}:${rule.id}:hourFrom`}
          />
          {err?.hourFrom && <p className="field-error">{err.hourFrom}</p>}
        </div>

        <div className="field-group">
          <label className="field-label">Hours To</label>
          <input
            type="number"
            className={`field-input${err?.hourTo || err?.range ? ' field-input--error' : ''}`}
            placeholder="e.g: 8"
            min={0}
            max={rangeMax}
            step={0.5}
            value={rule.hourTo}
            onChange={e => onChange(rule.id, 'hourTo', e.target.value)}
            onBlur={() => onTouch(section, rule.id, 'hourTo')}
            data-field-path={`${section}:${rule.id}:hourTo`}
          />
          {err?.hourTo && <p className="field-error">{err.hourTo}</p>}
        </div>

        <div className="field-group">
          <label className="field-label">Multiplier</label>
          <input
            type="number"
            className={`field-input${err?.multiplier ? ' field-input--error' : ''}`}
            placeholder="e.g: 1"
            min={0}
            step={0.1}
            value={rule.multiplier}
            onChange={e => onChange(rule.id, 'multiplier', e.target.value)}
            onBlur={() => onTouch(section, rule.id, 'multiplier')}
            data-field-path={`${section}:${rule.id}:multiplier`}
          />
          {err?.multiplier && <p className="field-error">{err.multiplier}</p>}
        </div>
      </div>

      {/* Per-row range error */}
      {err?.range && (
        <p className="field-error range-error">{err.range}</p>
      )}
    </div>
  );
}

interface RulesSectionProps {
  title: string;
  section: SectionKey;
  rules: Rule[];
  errors: RuleErrors;
  hint?: string;
  open: boolean;
  rangeMax: number;
  onToggle: () => void;
  onChange: (id: string, field: RuleField, value: string) => void;
  onTouch: (section: SectionKey, id: string, field: RuleField) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function RulesSection({
  title,
  section,
  rules,
  errors,
  hint,
  open,
  rangeMax,
  onToggle,
  onChange,
  onTouch,
  onDelete,
  onAdd,
}: RulesSectionProps) {
  return (
    <section className="rules-section">
      <button type="button" className="section-header" onClick={onToggle}>
        <span className="section-title">{title}</span>
        <div className="section-header-right">
          <span className="rules-count">{rules.length} {rules.length === 1 ? 'rule' : 'rules'}</span>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {open && (
        <div className="section-body">
          <CoverageBar rules={rules} rangeMax={rangeMax} />

          {hint && <p className="coverage-hint">Hint: {hint}</p>}

          {rules.map(rule => (
            <RuleRow
              key={rule.id}
              section={section}
              rule={rule}
              errors={errors}
              onChange={onChange}
              onTouch={onTouch}
              onDelete={onDelete}
              canDelete={rules.length > 1}
              rangeMax={rangeMax}
            />
          ))}

          <button type="button" className="add-btn" onClick={onAdd}>
            <Plus size={16} />
            Add More
          </button>
        </div>
      )}
    </section>
  );
}
