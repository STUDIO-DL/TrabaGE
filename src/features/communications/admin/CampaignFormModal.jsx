import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import {
  AUDIENCE_ROLE_OPTIONS,
  BEHAVIOR_OPTIONS,
  CAMPAIGN_TYPE_OPTIONS,
  CONVERSION_GOAL_OPTIONS,
  CTA_PRESETS,
  LINK_TYPE_OPTIONS,
  LINK_TYPES,
  RESEND_INTERVAL_OPTIONS,
  applyCampaignTemplate,
  isFeedbackSurface,
} from '../domain/constants';
import AudienceSegmentBuilder from './AudienceSegmentBuilder';

function FieldLabel({ children }) {
  return <p className="mb-space-sm text-label font-semibold text-app-text">{children}</p>;
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block text-sm font-medium text-app-text">
      {label}
      <select
        className="mt-1 w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value ?? ''}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CampaignFormModal({
  isOpen,
  form,
  setForm,
  saving,
  onClose,
  onSave,
}) {
  if (!form) return null;

  const toggleRole = (role) => {
    setForm((prev) => {
      const has = prev.audienceRoles.includes(role);
      return {
        ...prev,
        audienceAll: false,
        audienceRoles: has
          ? prev.audienceRoles.filter((r) => r !== role)
          : [...prev.audienceRoles, role],
      };
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={form.id ? 'Editar campaña' : 'Crear campaña'}
      size="lg"
    >
      <form
        className="max-h-[70dvh] space-y-4 overflow-y-auto pr-1"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        {!form.id ? (
          <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-3">
            <p className="mb-2 text-caption font-medium text-primary-800">Plantilla rápida</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setForm(applyCampaignTemplate('completeProfile'))}
            >
              Completar perfil (inteligente)
            </Button>
          </div>
        ) : null}

        <Input
          label="Título"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          required
        />
        <Textarea
          label="Descripción"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          rows={5}
        />

        <Select
          label="Tipo"
          value={form.campaign_type}
          onChange={(v) => setForm((p) => ({ ...p, campaign_type: v }))}
          options={CAMPAIGN_TYPE_OPTIONS}
        />

        <div>
          <FieldLabel>Público objetivo</FieldLabel>
          <label className="mb-2 flex items-center gap-2 text-sm text-app-text">
            <input
              type="checkbox"
              checked={form.audienceAll}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  audienceAll: e.target.checked,
                  audienceRoles: e.target.checked ? [] : p.audienceRoles,
                }))
              }
            />
            Todos los tipos de cuenta
          </label>
          {!form.audienceAll ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {AUDIENCE_ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-app-border px-2.5 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.audienceRoles.includes(opt.value)}
                    onChange={() => toggleRole(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          ) : null}

          <AudienceSegmentBuilder
            rules={form.audienceRules || []}
            ruleLogic={form.ruleLogic || 'and'}
            onChange={({ rules, ruleLogic }) =>
              setForm((p) => ({
                ...p,
                audienceRules: rules,
                ruleLogic,
              }))
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Fecha inicio"
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))}
            required
          />
          <Input
            label="Fecha fin (opcional)"
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))}
          />
        </div>

        <Select
          label="Comportamiento"
          value={form.behavior}
          onChange={(v) => setForm((p) => ({ ...p, behavior: v }))}
          options={BEHAVIOR_OPTIONS}
        />

        <div>
          <FieldLabel>Permitir cerrar</FieldLabel>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.allow_dismiss === true}
                onChange={() => setForm((p) => ({ ...p, allow_dismiss: true }))}
              />
              Sí
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={form.allow_dismiss === false}
                onChange={() => setForm((p) => ({ ...p, allow_dismiss: false }))}
              />
              No (debe usar el botón principal)
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Input
              label="Botón principal"
              value={form.primary_cta_label}
              onChange={(e) => setForm((p) => ({ ...p, primary_cta_label: e.target.value }))}
              list="cta-presets"
            />
            <datalist id="cta-presets">
              {CTA_PRESETS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <Input
            label="Botón secundario (opcional)"
            value={form.secondary_cta_label}
            onChange={(e) => setForm((p) => ({ ...p, secondary_cta_label: e.target.value }))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Enlace"
            value={form.link_type}
            onChange={(v) => setForm((p) => ({ ...p, link_type: v }))}
            options={LINK_TYPE_OPTIONS}
          />
          {form.link_type !== LINK_TYPES.NONE ? (
            <Input
              label={form.link_type === LINK_TYPES.INTERNAL ? 'Ruta interna' : 'URL'}
              value={form.link_url}
              onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
              placeholder={form.link_type === LINK_TYPES.INTERNAL ? '/personal/feed' : 'https://'}
            />
          ) : (
            <div />
          )}
        </div>

        <Select
          label="Intervalo de reenvío automático"
          value={form.resend_interval_days}
          onChange={(v) =>
            setForm((p) => ({
              ...p,
              resend_interval_days: v === null || v === 'null' ? null : Number(v),
            }))
          }
          options={RESEND_INTERVAL_OPTIONS.map((o) => ({
            value: o.value === null ? '' : String(o.value),
            label: o.label,
          }))}
        />

        <Select
          label="Objetivo de conversión"
          value={form.conversion_goal || ''}
          onChange={(v) => setForm((p) => ({ ...p, conversion_goal: v || '' }))}
          options={CONVERSION_GOAL_OPTIONS}
        />

        <div className="space-y-2 rounded-xl border border-app-border p-3">
          <FieldLabel>Automatización</FieldLabel>
          <label className="flex items-center gap-2 text-sm text-app-text">
            <input
              type="checkbox"
              checked={Boolean(form.automationEnabled)}
              onChange={(e) => setForm((p) => ({ ...p, automationEnabled: e.target.checked }))}
            />
            Campaña automática (enrola usuarios que cumplan los segmentos)
          </label>
          {form.automationEnabled ? (
            <Select
              label="No reenviar antes de"
              value={String(form.automationMinIntervalDays ?? 15)}
              onChange={(v) =>
                setForm((p) => ({ ...p, automationMinIntervalDays: Number(v) || 15 }))
              }
              options={[
                { value: '7', label: '7 días' },
                { value: '15', label: '15 días' },
                { value: '30', label: '30 días' },
              ]}
            />
          ) : null}
          <p className="text-caption text-app-subtle">
            Evita molestar: nunca más de un recordatorio dentro del intervalo configurado.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-app-text">
          <input
            type="checkbox"
            checked={form.send_push}
            onChange={(e) => setForm((p) => ({ ...p, send_push: e.target.checked }))}
          />
          Enviar notificación push (OneSignal)
        </label>

        <label className="flex items-center gap-2 text-sm text-app-text">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
          />
          Campaña activa
        </label>

        {isFeedbackSurface(form.campaign_type) ? (
          <div className="space-y-3 rounded-xl border border-app-border p-3">
            <FieldLabel>Textos de feedback</FieldLabel>
            <Input
              label="Tarjeta — título"
              value={form.content.cardTitle || ''}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  content: { ...p.content, cardTitle: e.target.value },
                }))
              }
            />
            <Input
              label="Tarjeta — cuerpo"
              value={form.content.cardBody || ''}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  content: { ...p.content, cardBody: e.target.value },
                }))
              }
            />
            <Input
              label="Sheet — título"
              value={form.content.sheetTitle || ''}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  content: { ...p.content, sheetTitle: e.target.value },
                }))
              }
            />
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
