import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { SEGMENT_RULE_OPTIONS } from '../domain/constants';

function makeRule(optionId) {
  const meta = SEGMENT_RULE_OPTIONS.find((o) => o.id === optionId);
  if (!meta) return null;
  return { id: meta.id, ...(meta.defaults || {}) };
}

/**
 * Combine dynamic segment filters (AND / OR) for smart audiences.
 */
export default function AudienceSegmentBuilder({ rules = [], ruleLogic = 'and', onChange }) {
  const addRule = (optionId) => {
    const next = makeRule(optionId);
    if (!next) return;
    onChange?.({ rules: [...rules, next], ruleLogic });
  };

  const updateRule = (index, patch) => {
    onChange?.({
      ruleLogic,
      rules: rules.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    });
  };

  const removeRule = (index) => {
    onChange?.({
      ruleLogic,
      rules: rules.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-app-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label font-semibold text-app-text">Audiencia dinámica</p>
        <label className="flex items-center gap-2 text-sm text-app-muted">
          Combinar con
          <select
            className="rounded-lg border border-app-border bg-app-card px-2 py-1 text-sm text-app-text"
            value={ruleLogic}
            onChange={(e) => onChange?.({ rules, ruleLogic: e.target.value })}
          >
            <option value="and">Y (todas)</option>
            <option value="or">O (cualquiera)</option>
          </select>
        </label>
      </div>

      <p className="text-caption text-app-subtle">
        Ejemplo: perfil &lt; 50% <strong>Y</strong> registrados hace más de 7 días.
      </p>

      {rules.length === 0 ? (
        <p className="text-sm text-app-muted">Sin filtros de segmento — se usa solo el público por tipo de cuenta.</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((rule, index) => {
            const meta = SEGMENT_RULE_OPTIONS.find((o) => o.id === rule.id);
            return (
              <li
                key={`${rule.id}-${index}`}
                className="flex flex-wrap items-end gap-2 rounded-lg bg-app-surface px-3 py-2"
              >
                <span className="min-w-[10rem] flex-1 text-sm font-medium text-app-text">
                  {meta?.label || rule.id}
                </span>
                {meta?.needsValue === 'number' ? (
                  <Input
                    label="%"
                    type="number"
                    min={0}
                    max={100}
                    value={rule.value ?? ''}
                    onChange={(e) => updateRule(index, { value: Number(e.target.value) })}
                    className="w-24"
                  />
                ) : null}
                {meta?.needsValue === 'days' ? (
                  <Input
                    label="Días"
                    type="number"
                    min={1}
                    value={rule.days ?? ''}
                    onChange={(e) => updateRule(index, { days: Number(e.target.value) })}
                    className="w-24"
                  />
                ) : null}
                {meta?.needsValue === 'range' ? (
                  <>
                    <Input
                      label="Min %"
                      type="number"
                      min={0}
                      max={100}
                      value={rule.min ?? 0}
                      onChange={(e) => updateRule(index, { min: Number(e.target.value) })}
                      className="w-24"
                    />
                    <Input
                      label="Max %"
                      type="number"
                      min={0}
                      max={100}
                      value={rule.max ?? 100}
                      onChange={(e) => updateRule(index, { max: Number(e.target.value) })}
                      className="w-24"
                    />
                  </>
                ) : null}
                <Button type="button" size="sm" variant="ghost" onClick={() => removeRule(index)}>
                  Quitar
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <label className="block text-sm font-medium text-app-text">
        Añadir condición
        <select
          className="mt-1 w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              addRule(e.target.value);
              e.target.value = '';
            }
          }}
        >
          <option value="">Selecciona un segmento…</option>
          {SEGMENT_RULE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              [{opt.group}] {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
