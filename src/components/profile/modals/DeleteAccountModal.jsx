import { useEffect, useRef, useState } from 'react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import AppIcon from '../../common/AppIcon';
import { ArrowLeft, ArrowRight, Trash2, X, ICON_SIZES } from '../../../constants/icons';
import {
  ACCOUNT_DELETION_REASONS,
  accountDeletionReasonAllowsOther,
} from '../../../constants/accountDeletionReasons';

const STEPS = {
  INTRO: 0,
  REASON: 1,
  RATING: 2,
  IMPROVEMENT: 3,
  CONFIRM: 4,
};

const STEP_TITLES = {
  [STEPS.INTRO]: 'Eliminar cuenta',
  [STEPS.REASON]: 'Tu opinión',
  [STEPS.RATING]: 'Tu experiencia',
  [STEPS.IMPROVEMENT]: 'Mejoras',
  [STEPS.CONFIRM]: 'Confirmación',
};

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MAX_COMMENT = 500;
const TEXTAREA_MAX_HEIGHT = 120;

function StepDots({ step }) {
  return (
    <div className="mb-space-md flex items-center justify-center gap-1.5" aria-hidden>
      {Object.values(STEPS).map((s) => (
        <span
          key={s}
          className={[
            'rounded-radius-circular transition-all duration-fast ease-out',
            s === step ? 'h-1.5 w-5 bg-primary-600' : 'h-1.5 w-1.5 bg-app-border',
          ].join(' ')}
        />
      ))}
    </div>
  );
}

function AutoGrowTextarea({
  id,
  value,
  onChange,
  placeholder,
  maxLength = MAX_COMMENT,
  minRows = 2,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
  }, [value]);

  return (
    <div>
      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={onChange}
        rows={minRows}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full resize-none rounded-radius-lg border border-app-border bg-app-card px-space-md py-space-sm text-body text-app-text placeholder:text-app-subtle transition-colors duration-fast focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
      />
      <p className="mt-1 text-right text-caption text-app-subtle">
        {value.length}/{maxLength}
      </p>
    </div>
  );
}

function ReasonOption({ reason, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(reason.code)}
      aria-pressed={selected}
      className={[
        'w-full rounded-radius-lg border px-space-md py-space-sm text-left text-body-small font-medium transition-all duration-fast ease-out active:scale-[0.99]',
        selected
          ? 'border-primary-300 bg-app-primary-soft/70 text-primary-700 shadow-sm'
          : 'border-app-border bg-app-card text-app-text hover:border-primary-200 hover:bg-primary-50/40',
      ].join(' ')}
    >
      {reason.label}
    </button>
  );
}

/**
 * Multi-step account deletion wizard.
 * Collects exit feedback before the irreversible delete confirmation.
 */
export default function DeleteAccountModal({ isOpen, onClose, onConfirm, loading }) {
  const [step, setStep] = useState(STEPS.INTRO);
  const [reasonCode, setReasonCode] = useState('');
  const [reasonOther, setReasonOther] = useState('');
  const [rating, setRating] = useState(null);
  const [improvement, setImprovement] = useState('');

  const reset = () => {
    setStep(STEPS.INTRO);
    setReasonCode('');
    setReasonOther('');
    setRating(null);
    setImprovement('');
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose?.();
  };

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen]);

  const canContinueFromReason = Boolean(reasonCode);

  const goNext = () => {
    if (step === STEPS.REASON && !canContinueFromReason) return;
    setStep((s) => Math.min(s + 1, STEPS.CONFIRM));
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, STEPS.INTRO));
  };

  const handleConfirm = () => {
    onConfirm?.({
      reasonCode,
      reasonOther: accountDeletionReasonAllowsOther(reasonCode) ? reasonOther.trim() : '',
      rating,
      improvementComment: improvement.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={STEP_TITLES[step]}
      size="md"
      dismissible={!loading}
    >
      <StepDots step={step} />

      <div
        key={step}
        className="animate-[cardFadeIn_var(--motion-fast)_var(--ease-out)]"
      >
        {step === STEPS.INTRO && (
          <div className="space-y-space-md">
            <p className="text-body leading-relaxed text-app-text">
              Antes de eliminar tu cuenta, nos gustaría entender el motivo de tu decisión.
            </p>
            <p className="text-body-small leading-relaxed text-app-muted">
              Tu opinión nos ayuda a mejorar TrabaGE. El proceso es breve y puedes cancelar en
              cualquier momento.
            </p>
          </div>
        )}

        {step === STEPS.REASON && (
          <div className="space-y-space-md">
            <p className="text-body font-medium text-app-text">
              ¿Por qué deseas eliminar tu cuenta?
            </p>
            <div className="max-h-[min(42vh,320px)] space-y-2 overflow-y-auto overscroll-contain pr-0.5">
              {ACCOUNT_DELETION_REASONS.map((reason) => (
                <ReasonOption
                  key={reason.code}
                  reason={reason}
                  selected={reasonCode === reason.code}
                  onSelect={setReasonCode}
                />
              ))}
            </div>
            {accountDeletionReasonAllowsOther(reasonCode) ? (
              <div className="space-y-space-xs">
                <label htmlFor="deletion-reason-other" className="text-label font-medium text-app-muted">
                  Cuéntanos más <span className="font-normal">(opcional)</span>
                </label>
                <AutoGrowTextarea
                  id="deletion-reason-other"
                  value={reasonOther}
                  onChange={(e) => setReasonOther(e.target.value.slice(0, MAX_COMMENT))}
                  placeholder="Escribe tu motivo…"
                  minRows={2}
                />
              </div>
            ) : null}
          </div>
        )}

        {step === STEPS.RATING && (
          <div className="space-y-space-md">
            <p className="text-body font-medium text-app-text">
              ¿Cómo calificarías tu experiencia con TrabaGE?
            </p>
            <p className="text-caption text-app-subtle">Opcional · 1 = Muy mala · 10 = Excelente</p>
            <div className="flex flex-wrap justify-between gap-1.5">
              {RATINGS.map((n) => {
                const selected = rating === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating((prev) => (prev === n ? null : n))}
                    aria-pressed={selected}
                    className={[
                      'flex h-10 w-10 items-center justify-center rounded-radius-md text-body-small font-semibold transition-all duration-fast',
                      selected
                        ? 'scale-105 bg-primary-600 text-white shadow-sm ring-2 ring-primary-200'
                        : 'bg-app-surface text-app-text ring-1 ring-app-border hover:bg-primary-50 hover:text-primary-700',
                    ].join(' ')}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === STEPS.IMPROVEMENT && (
          <div className="space-y-space-md">
            <p className="text-body font-medium text-app-text">
              ¿Hay algo que podríamos mejorar?
            </p>
            <p className="text-caption text-app-subtle">Opcional</p>
            <AutoGrowTextarea
              id="deletion-improvement"
              value={improvement}
              onChange={(e) => setImprovement(e.target.value.slice(0, MAX_COMMENT))}
              placeholder="Tu sugerencia nos ayuda a mejorar…"
              minRows={3}
            />
          </div>
        )}

        {step === STEPS.CONFIRM && (
          <div className="space-y-space-md">
            <div className="rounded-radius-lg border border-error-200/80 bg-error-50/60 px-space-md py-space-md dark:border-error-500/25 dark:bg-error-50/10">
              <p className="text-body font-semibold text-error-700 dark:text-error-400">
                Esta acción es permanente.
              </p>
              <p className="mt-space-sm text-body-small leading-relaxed text-app-muted">
                Tu perfil, publicaciones, candidaturas, mensajes y demás información dejarán de
                estar disponibles para otros usuarios.
              </p>
            </div>
            <p className="text-body text-app-text">
              ¿Seguro que deseas eliminar tu cuenta?
            </p>
          </div>
        )}
      </div>

      <div className="mt-space-lg flex flex-col gap-space-sm">
        {step === STEPS.CONFIRM ? (
          <>
            <Button
              variant="danger"
              fullWidth
              loading={loading}
              onClick={handleConfirm}
              className="gap-2"
            >
              <AppIcon icon={Trash2} size={ICON_SIZES.default} className="text-white" />
              Eliminar cuenta
            </Button>
            <Button variant="secondary" fullWidth onClick={handleClose} disabled={loading} className="gap-2">
              <AppIcon icon={X} size={ICON_SIZES.default} />
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              fullWidth
              onClick={goNext}
              disabled={step === STEPS.REASON && !canContinueFromReason}
              className="gap-2"
            >
              Continuar
              <AppIcon icon={ArrowRight} size={ICON_SIZES.sm} />
            </Button>
            <div className="flex gap-space-sm">
              {step > STEPS.INTRO ? (
                <Button variant="ghost" fullWidth onClick={goBack} className="gap-2">
                  <AppIcon icon={ArrowLeft} size={ICON_SIZES.sm} />
                  Atrás
                </Button>
              ) : null}
              <Button
                variant="ghost"
                fullWidth
                onClick={handleClose}
                className="gap-2"
              >
                Cancelar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
