// Formats an ISO timestamp as "26 Aug 2026".
export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Turns a due date into "Due today" / "Due in 3 days" / "Overdue".
export function dueLabel(isoString) {
  const days = Math.ceil((new Date(isoString) - Date.now()) / 86_400_000);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

// "Ahmed Raza" -> "AR"
export function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
