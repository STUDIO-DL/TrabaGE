/**
 * Filled chat bubble with typing dots — matches the TrabaGE messages brand mark.
 * Uses currentColor; dots are cut out so the parent background shows through.
 */
export default function MessagesChatIcon({
  size = 18,
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
      {/* Pill bubble + bottom-left tail; dots punched out via evenodd */}
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.75 5.5C3.23 5.5 2 6.73 2 8.25v5c0 1.52 1.23 2.75 2.75 2.75H6.5v2.65c0 .55.64.85 1.07.5L11.1 16H19.25C20.77 16 22 14.77 22 13.25v-5C22 6.73 20.77 5.5 19.25 5.5H4.75ZM8 10.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm4 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm4 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
      />
    </svg>
  );
}
