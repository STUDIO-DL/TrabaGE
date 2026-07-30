export default function ApplicationsCounter({ count, label }) {
  const text =
    label ??
    (count == null
      ? null
      : count === 1
        ? '1 candidatura'
        : `${count} candidaturas`);

  if (!text) return null;

  return <p className="text-caption text-app-subtle">{text}</p>;
}
