import Input from '../ui/Input';
import Card from '../ui/Card';

export default function ApplyCustomQuestions({ questions, answers, onChange }) {
  if (!questions?.length) return null;

  const requiredCount = questions.filter((q) => q.required).length;
  const summary =
    questions.length === 1
      ? '1 pregunta adicional'
      : `${questions.length} preguntas adicionales`;

  const content = (
    <div className="space-y-space-md pt-space-md">
      {questions.map((q) => (
        <Input
          key={q.id}
          id={`apply-question-${q.id}`}
          label={q.question}
          value={answers[q.id] || ''}
          onChange={(e) => onChange({ ...answers, [q.id]: e.target.value })}
          required={q.required}
        />
      ))}
    </div>
  );

  if (questions.length <= 2) {
    return (
      <Card padding="md">
        <h3 className="text-button font-semibold text-app-text">Preguntas del empleo</h3>
        {content}
      </Card>
    );
  }

  return (
    <Card padding="md">
      <details className="group">
        <summary className="cursor-pointer list-none text-button font-semibold text-app-text marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-space-sm">
            <span>Preguntas del empleo</span>
            <span className="text-caption font-normal text-app-muted">
              {summary}
              {requiredCount > 0 ? ` · ${requiredCount} obligatoria${requiredCount > 1 ? 's' : ''}` : ''}
            </span>
          </span>
        </summary>
        {content}
      </details>
    </Card>
  );
}
