/**
 * Premium chat bubble icon for the header messages action.
 * Stroke-based, sized to match Lucide icons via AppIcon conventions.
 */
export default function MessagesChatIcon({
  size = 18,
  strokeWidth = 1.85,
  className = '',
  ...props
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M5.25 5.25h13.5a2.25 2.25 0 0 1 2.25 2.25v6.75a2.25 2.25 0 0 1-2.25 2.25H10.75L6.5 19.25V16.5H5.25a2.25 2.25 0 0 1-2.25-2.25V7.5a2.25 2.25 0 0 1 2.25-2.25z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.75 9.75h6.5"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
      />
      <path
        d="M8.75 12.25h4.25"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
      />
    </svg>
  );
}
