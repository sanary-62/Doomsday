import { useMemo, useState } from 'react';
import useApi from '../hooks/useApi';
import { ApiError, moviesApi } from '../services/api';
import { formatDuration } from '../utils/format';
import { EmptyState, ErrorBanner, Modal, Spinner } from '../components/ui';
import MovieCard from '../components/MovieCard';
import MovieForm from '../components/MovieForm';
import { useToast } from '../components/ToastProvider';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unwatched', label: 'To watch' },
  { value: 'watched', label: 'Watched' },
];

function DeleteDialog({ movie, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const remove = async (force) => {
    setBusy(true);
    setError(null);
    try {
      await moviesApi.remove(movie.id, { force });
      onDeleted(movie);
    } catch (caught) {
      if (!(caught instanceof ApiError)) throw caught;
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const hasDependents = error?.code === 'HAS_DEPENDENTS';

  return (
    <Modal title={`Delete "${movie.title}"?`} onClose={onClose}>
      <div className="space-y-4">
        {!error && <p className="text-sm text-slate-300">This permanently removes the movie. This cannot be undone.</p>}
        {error && (
          <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            {error.message}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {hasDependents ? (
            <button type="button" className="btn-danger" onClick={() => remove(true)} disabled={busy}>
              {busy ? 'Deleting…' : 'Remove from those movies and delete'}
            </button>
          ) : (
            <button type="button" className="btn-danger" onClick={() => remove(false)} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete movie'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function MoviesPage() {
  const { data: movies, loading, error, reload } = useApi(moviesApi.list);
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editor, setEditor] = useState(null); // { movie } where movie === null means "create"
  const [deleting, setDeleting] = useState(null);
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const titleById = useMemo(() => new Map((movies || []).map((movie) => [movie.id, movie.title])), [movies]);

  const visibleMovies = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (movies || []).filter((movie) => {
      if (filter === 'watched' && !movie.watched) return false;
      if (filter === 'unwatched' && movie.watched) return false;
      return term === '' || movie.title.toLowerCase().includes(term);
    });
  }, [movies, search, filter]);

  const stats = useMemo(() => {
    const list = movies || [];
    const watched = list.filter((movie) => movie.watched);
    const unwatchedMinutes = list.filter((movie) => !movie.watched).reduce((sum, movie) => sum + movie.runtime, 0);
    return { total: list.length, watched: watched.length, unwatchedMinutes };
  }, [movies]);

  const toggleWatched = async (movie, watched) => {
    setPendingIds((current) => new Set(current).add(movie.id));
    try {
      await moviesApi.update(movie.id, { watched });
      notify(watched ? `Marked "${movie.title}" as watched.` : `Marked "${movie.title}" as not watched.`);
      reload();
    } catch (caught) {
      if (!(caught instanceof ApiError)) throw caught;
      notify(caught.message, 'error');
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(movie.id);
        return next;
      });
    }
  };

  const handleSaved = (saved, wasEditing) => {
    setEditor(null);
    notify(wasEditing ? `Saved changes to "${saved.title}".` : `Added "${saved.title}".`);
    reload();
  };

  const handleDeleted = (movie) => {
    setDeleting(null);
    notify(`Deleted "${movie.title}".`);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Movies</h1>
          <p className="mt-1 text-sm text-slate-400">Everything you need to watch before Avengers: Doomsday.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEditor({ movie: null })}>
          + Add movie
        </button>
      </div>

      {movies && movies.length > 0 && (
        <dl className="grid grid-cols-3 gap-3">
          {[
            ['Movies', stats.total],
            ['Watched', `${stats.watched} / ${stats.total}`],
            ['Left to watch', formatDuration(stats.unwatchedMinutes)],
          ].map(([label, value]) => (
            <div key={label} className="card px-4 py-3">
              <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-white sm:text-xl">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          className="field-input min-w-[12rem] flex-1"
          placeholder="Search movies…"
          aria-label="Search movies"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div role="group" aria-label="Filter by watched status" className="flex rounded-lg border border-ink-500 bg-ink-900 p-1">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                filter === option.value ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !movies && <Spinner label="Loading movies…" />}
      {error && <ErrorBanner error={error} onRetry={reload} title="Could not load movies" />}

      {movies && movies.length === 0 && !error && (
        <EmptyState
          title="No movies yet"
          action={
            <button type="button" className="btn-primary" onClick={() => setEditor({ movie: null })}>
              + Add your first movie
            </button>
          }
        >
          Add the movies you plan to watch, then link prerequisites to build your rewatch order. You can also run the
          seed script to load the MCU example data.
        </EmptyState>
      )}

      {movies && movies.length > 0 && visibleMovies.length === 0 && (
        <EmptyState title="No matching movies">Try a different search or filter.</EmptyState>
      )}

      {visibleMovies.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMovies.map((movie) => (
            <li key={movie.id} className="flex">
              <div className="w-full">
                <MovieCard
                  movie={movie}
                  titleById={titleById}
                  pending={pendingIds.has(movie.id)}
                  onToggleWatched={toggleWatched}
                  onEdit={(target) => setEditor({ movie: target })}
                  onDelete={setDeleting}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {editor && (
        <Modal title={editor.movie ? `Edit "${editor.movie.title}"` : 'Add a movie'} onClose={() => setEditor(null)}>
          <MovieForm
            movie={editor.movie}
            allMovies={movies || []}
            onSaved={handleSaved}
            onCancel={() => setEditor(null)}
          />
        </Modal>
      )}

      {deleting && <DeleteDialog movie={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} />}
    </div>
  );
}
