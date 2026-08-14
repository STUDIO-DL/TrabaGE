import React from 'react';

export default function ChoiceCard({ title, description, selected, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel || title}
      onClick={onClick}
      className={`w-full text-left rounded-radius-md border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 p-4 flex items-center gap-3 ${
        selected
          ? 'border-primary-600 bg-primary-50 scale-100'
          : 'border-app-border bg-app-surface hover:border-primary-200'
      }`}
    >
      <div className="flex-1">
        <div className="text-base font-semibold text-app-text">{title}</div>
        {description ? (
          <div className="mt-1 text-body-small text-app-muted">{description}</div>
        ) : null}
      </div>

      <div className="flex-none">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
            selected ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-app-border text-app-muted'
          }`}
          aria-hidden
        >
          {selected ? (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 5L4 8L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          )}
        </span>
      </div>
    </button>
  );
}
