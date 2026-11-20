import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useApi from '../hooks/useApi';
import { ApiError, moviesApi } from '../services/api';
import { formatDuration } from '../utils/format';
import { EmptyState, ErrorBanner, ProgressBar, Spinner, Switch } from '../components/ui';
import { useToast } from '../components/ToastProvider';

function Stat({ label, value, tone = 'text-white' }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-900/60 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-xl font-semibold ${tone}`}>{value}</dd>
    </div>
  );
}

export default function RewatchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useToast();
  const [pendingId, setPendingId] = useState(null);

  const moviesState = useApi(moviesApi.list);
  const movies = moviesState.data;

  // Default to the most recently released movie: the one the fan is preparing for.
  const defaultTargetId = useMemo(() => {
    if (!movies || movies.length === 0) return '';
    return [...movies].sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0))[0].id;
  }, [movies]);

  const requestedId = searchParams.get('movie');
  const targetId = movies?.some((movie) => movie.id === requestedId) ? requestedId : defaultTargetId;

  const plan = useApi(() => (targetId ? moviesApi.rewatchOrder(targetId) : Promise.resolve(null)), [targetId]);

  const toggleWatched = async (movie, watched) => {
    setPendingId(movie.id);
    try {
      await moviesApi.update(movie.id, { watched });
      plan.reload();
    } catch (caught) {
      if (!(caught instanceof ApiError)) throw caught;
      notify(caught.message, 'error');
    } finally {
      setPendingId(null);
    }
  };

  const result = plan.data;
  const allWatched = result && result.totalMovies > 0 && result.watchedCount === result.totalMovies;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Rewatch Plan</h1>
        <p className="mt-1 text-sm text-slate-400">
          Pick a movie to see everything you need to watch first, in the right order.
        </p>
      </div>

      {moviesState.loading && !movies && <Spinner label="Loading movies…" />}
      {moviesState.error && <ErrorBanner error={moviesState.error} onRetry={moviesState.reload} title="Could not load movies" />}

      {movies && movies.length === 0 && (
        <EmptyState
          title="No movies to plan with"
          action={
            <Link to="/movies" className="btn-primary">
              Go to Movies
            </Link>
          }
        >
          Add some movies and prerequisites first, then come back to see your rewatch order.
        </EmptyState>
      )}

      {movies && movies.length > 0 && (
        <>
          <div className="card p-4 sm:p-5">
            <label htmlFor="target-movie" className="field-label">
              I want to watch
            </label>
            <select
              id="target-movie"
              className="field-input"
              value={targetId}
              onChange={(event) => setSearchParams({ movie: event.target.value })}
            >
              {movies.map((movie) => (
                <option key={movie.id} value={movie.id}>
                  {movie.title}
                  {movie.releaseYear ? ` (${movie.releaseYear})` : ''}
                </option>
              ))}
            </select>
          </div>

          {plan.loading && !result && <Spinner label="Calculating rewatch order…" />}
          {plan.error && <ErrorBanner error={plan.error} onRetry={plan.reload} title="Could not load the rewatch order" />}

          {result && !plan.error && (
            <section aria-label={`Rewatch order for ${result.targetMovie.title}`} className="space-y-5">
              <div className="card space-y-5 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold text-white">
                    Before <span className="text-blue-300">{result.targetMovie.title}</span>
                  </h2>
                  {result.totalMovies > 0 && (
                    <p className="text-sm font-medium text-slate-300">
                      {result.watchedCount} of {result.totalMovies} watched
                    </p>
                  )}
                </div>

                {result.totalMovies > 0 && (
                  <>
                    <ProgressBar
                      value={result.watchedCount}
                      max={result.totalMovies}
                      label={`${result.watchedCount} of ${result.totalMovies} prerequisite movies watched`}
                    />
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Stat label="Watched" value={`${result.watchedCount} / ${result.totalMovies}`} tone="text-emerald-300" />
                      <Stat label="Still to watch" value={result.totalMovies - result.watchedCount} tone="text-amber-300" />
                      <Stat label="Time remaining" value={formatDuration(result.remainingRuntime)} />
                    </dl>
                  </>
                )}
              </div>

              {result.totalMovies === 0 && (
                <EmptyState title="Nothing to watch first">
                  {result.targetMovie.title} has no prerequisites, so you can jump straight in.
                </EmptyState>
              )}

              {allWatched && (
                <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
                  You have watched every prerequisite. You are ready for {result.targetMovie.title}!
                </div>
              )}

              {result.totalMovies > 0 && (
                <ol className="space-y-3">
                  {result.movies.map((movie, index) => (
                    <li
                      key={movie.id}
                      className={`card flex items-center gap-4 p-4 transition ${
                        movie.watched ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-amber-500/30'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          movie.watched ? 'bg-emerald-500 text-emerald-950' : 'bg-ink-600 text-white'
                        }`}
                      >
                        {movie.watched ? '✓' : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-semibold ${movie.watched ? 'text-slate-400' : 'text-white'}`}>
                          <span className="sr-only">Step {index + 1}: </span>
                          {movie.title}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDuration(movie.runtime)}
                          {movie.releaseYear ? ` · ${movie.releaseYear}` : ''}
                        </p>
                      </div>
                      <span
                        className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${
                          movie.watched ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {movie.watched ? 'Watched' : 'To watch'}
                      </span>
                      <Switch
                        checked={movie.watched}
                        disabled={pendingId === movie.id}
                        label={`Mark ${movie.title} as watched`}
                        onChange={(next) => toggleWatched(movie, next)}
                      />
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
