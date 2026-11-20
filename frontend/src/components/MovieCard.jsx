import { formatDuration, posterGradient } from '../utils/format';
import { Switch } from './ui';

export default function MovieCard({ movie, titleById, pending, onToggleWatched, onEdit, onDelete }) {
  const prerequisiteTitles = movie.prerequisites.map((id) => titleById.get(id)).filter(Boolean);

  return (
    <article
      className={`card group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-blue-500/50 ${
        movie.watched ? 'ring-1 ring-emerald-500/30' : ''
      }`}
    >
      <div className={`relative flex h-28 items-end bg-gradient-to-br ${posterGradient(movie.title)} p-4`}>
        <span className="absolute right-3 top-3 rounded-md bg-black/40 px-2 py-0.5 text-xs font-semibold text-white/90">
          {movie.releaseYear ?? 'Year n/a'}
        </span>
        <span
          className={`absolute left-3 top-3 rounded-md px-2 py-0.5 text-xs font-semibold ${
            movie.watched ? 'bg-emerald-500/90 text-emerald-950' : 'bg-black/40 text-amber-200'
          }`}
        >
          {movie.watched ? '✓ Watched' : 'To watch'}
        </span>
        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-white drop-shadow">{movie.title}</h3>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-sm text-slate-400">
          <span className="font-medium text-slate-200">{formatDuration(movie.runtime)}</span>
          <span aria-hidden="true"> · </span>
          {movie.runtime} min
        </p>

        <div className="min-h-[2.25rem]">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Watch these first</p>
          {prerequisiteTitles.length === 0 ? (
            <p className="text-sm text-slate-500">None</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {prerequisiteTitles.map((title) => (
                <li key={title} className="chip">
                  {title}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-ink-600 pt-3">
          <label className="flex items-center gap-2.5 text-sm text-slate-300">
            <Switch
              checked={movie.watched}
              disabled={pending}
              label={`Mark ${movie.title} as watched`}
              onChange={(next) => onToggleWatched(movie, next)}
            />
            Watched
          </label>
          <div className="flex gap-1">
            <button type="button" className="btn-ghost" onClick={() => onEdit(movie)} aria-label={`Edit ${movie.title}`}>
              Edit
            </button>
            <button
              type="button"
              className="btn-ghost hover:!text-red-400"
              onClick={() => onDelete(movie)}
              aria-label={`Delete ${movie.title}`}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
