import Card from '../ui/Card';
import HelpQuestion from './HelpQuestion';

export default function HelpCategory({ category, openQuestionId, onToggleQuestion }) {
  return (
    <Card padding="none" elevation={2} className="overflow-hidden">
      <div className="border-b border-app-border bg-app-primary-soft px-space-base py-space-md sm:px-space-lg">
        <h2 className="text-title text-app-text">{category.title}</h2>
      </div>

      <div className="divide-y divide-app-divider">
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
    </Card>
  );
}
