/** TrabaGE wordmark — matches src/assets/branding/logo.svg */
export default function TrabaGEWordmark({ className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 168 40"
      role="img"
      aria-label="TrabaGE"
      className={className}
      {...props}
    >
      <text
        x="50%"
        y="32"
        textAnchor="middle"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize="28"
        fontWeight="700"
        letterSpacing="-0.03em"
      >
        <tspan fill="#0F172A">Traba</tspan>
        <tspan fill="#2563EB">GE</tspan>
      </text>
    </svg>
  );
}
