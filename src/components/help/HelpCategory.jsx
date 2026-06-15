import HelpQuestion from './HelpQuestion';

export default function HelpCategory({ category, openQuestionId, onToggleQuestion }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-primary-50 px-4 py-3 sm:px-5">
        <h2 className="text-base font-semibold text-slate-900">{category.title}</h2>
      </div>

      <div className="divide-y divide-slate-100">
        {category.questions.map((item, index) => {
          const questionId = `${category.id}-${index}`;
          return (
            <HelpQuestion
              key={questionId}
              id={questionId}
              question={item.question}
              answer={item.answer}
              isOpen={openQuestionId === questionId}
              onToggle={() => onToggleQuestion(questionId)}
            />
          );
        })}
      </div>
    </section>
  );
}
