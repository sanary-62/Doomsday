
export const formatDuration = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const POSTER_GRADIENTS = [
  'from-blue-700 via-indigo-800 to-ink-900',
  'from-red-700 via-rose-900 to-ink-900',
  'from-sky-600 via-blue-900 to-ink-900',
  'from-fuchsia-700 via-purple-900 to-ink-900',
  'from-amber-600 via-red-900 to-ink-900',
  'from-emerald-600 via-teal-900 to-ink-900',
];

export const posterGradient = (title) => {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return POSTER_GRADIENTS[hash % POSTER_GRADIENTS.length];
};

export const fieldErrorsFrom = (error) => {
  const errors = {};
  (error?.details || []).forEach((detail) => {
    if (detail.field && !errors[detail.field]) errors[detail.field] = detail.message;
  });
  return errors;
};
