import { useState } from 'react';
import { formatDuration, posterGradient } from '../utils/format';
import { Switch } from './ui';

const POSTERS = {
  'Iron Man': 'https://image.tmdb.org/t/p/w500/78lPtwv72eTNqFW9COBYI0dWDJa.jpg',
  'Captain America: The First Avenger': 'https://image.tmdb.org/t/p/w500/vSNxAJTlD0r02V9sPYpOjqDZXUK.jpg',
  'The Avengers': 'https://image.tmdb.org/t/p/w500/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg',
  'Captain America: Civil War': 'https://image.tmdb.org/t/p/w500/rAGiXaUfPzY7CDEyNKUofk3Kw2e.jpg',
  'Thor: Ragnarok': 'https://image.tmdb.org/t/p/w500/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg',
  'Avengers: Infinity War': 'https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg',
  'Avengers: Endgame': 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
};

export default function MovieCard({ movie, titleById, pending, onToggleWatched, onEdit, onDelete }) {
  const [imageFailed, setImageFailed] = useState(false);
  const prerequisiteTitles = movie.prerequisites.map((id) => titleById.get(id)).filter(Boolean);
  const posterUrl = POSTERS[movie.title];
  const showPoster = posterUrl && !imageFailed;

  return (
    <article
      className={`card group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-blue-500/50 ${
        movie.watched ? 'ring-1 ring-emerald-500/30' : ''
      }`}
    >
      <div className={`relative flex h-64 items-end overflow-hidden bg-gradient-to-br ${posterGradient(movie.title)} p-4`}>
        {showPoster && (
          <img
            src={posterUrl}
            alt={`${movie.title} movie poster`}
            className="absolute inset-0 mx-auto h-full max-w-full object-contain"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />
        <span className="absolute right-3 top-3 z-10 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white/90">
          {movie.releaseYear ?? 'Year n/a'}
        </span>
        <span
          className={`absolute left-3 top-3 z-10 rounded-md px-2 py-0.5 text-xs font-semibold ${
            movie.watched ? 'bg-emerald-500/90 text-emerald-950' : 'bg-black/60 text-amber-200'
          }`}
        >
          {movie.watched ? '✓ Watched' : 'To watch'}
        </span>
        <h3 className="relative z-10 line-clamp-2 text-lg font-bold leading-snug text-white drop-shadow">
          {movie.title}
        </h3>
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
