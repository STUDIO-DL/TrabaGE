/** Minimal TrabaGE mark — single “T” for quick startup transitions. */
export default function TrabaGEIconMark({ className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      role="img"
      aria-label="TrabaGE"
      className={className}
      {...props}
    >
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize="28"
        fontWeight="700"
        className="fill-app-text"
      >
        T
      </text>
    </svg>
  );
}
