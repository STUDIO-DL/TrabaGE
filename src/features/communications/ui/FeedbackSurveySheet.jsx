import { useState } from 'react';
import BottomSheet from '../../../components/ui/BottomSheet';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';
import { DEFAULT_FEEDBACK_CONTENT } from '../domain/constants';

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * ~65% height bottom sheet for feedback / survey campaigns.
 */
export default function FeedbackSurveySheet({
  campaign,
  isOpen,
  onClose,
  onSubmit,
  submitting,
}) {
  const content = { ...DEFAULT_FEEDBACK_CONTENT, ...(campaign?.content || {}) };
  const [rating, setRating] = useState(null);
  const [improvement, setImprovement] = useState('');
  const [comment, setComment] = useState('');
  const [thanks, setThanks] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    const ok = await onSubmit?.({
      rating,
      improvementText: improvement,
      commentText: comment,
    });
    if (ok === false) return;
    setThanks(true);
    window.setTimeout(() => {
      setThanks(false);
      setRating(null);
      setImprovement('');
      setComment('');
      onClose?.();
    }, 1600);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={thanks ? '¡Gracias!' : content.sheetTitle}
      className="!max-h-[65dvh]"
    >
      {thanks ? (
        <p className="py-space-xl text-center text-body text-app-muted">
          {content.thanksMessage}
        </p>
      ) : (
        <div className="space-y-space-lg">
          <p className="text-body-small leading-relaxed text-app-muted">{content.sheetBody}</p>

          <div>
            <p className="mb-space-sm text-label font-semibold text-app-text">
              {content.ratingQuestion}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {RATINGS.map((n) => {
                const selected = rating === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={[
                      'flex h-10 w-10 items-center justify-center rounded-radius-md text-body-small font-semibold transition-all duration-fast',
                      selected
                        ? 'scale-105 bg-primary-600 text-white shadow-sm ring-2 ring-primary-200'
                        : 'bg-app-surface text-app-text ring-1 ring-app-border hover:bg-primary-50 hover:text-primary-700',
                    ].join(' ')}
                    aria-pressed={selected}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <Textarea
            label={content.improvementLabel}
            value={improvement}
            onChange={(e) => setImprovement(e.target.value)}
            rows={3}
            placeholder="Opcional"
          />

          <Textarea
            label={content.commentLabel}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Opcional"
          />

          <div className="flex flex-col-reverse gap-space-sm sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Más tarde
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!rating || submitting}
            >
              Enviar opinión
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
