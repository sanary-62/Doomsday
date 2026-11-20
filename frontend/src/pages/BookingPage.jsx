import { useState } from 'react';
import useApi from '../hooks/useApi';
import { ApiError, cinemasApi } from '../services/api';
import { EmptyState, ErrorBanner, Modal, Spinner } from '../components/ui';
import CinemaForm from '../components/CinemaForm';
import { useToast } from '../components/ToastProvider';

const GROUP_MIN = 1;
const GROUP_MAX = 10000;

const validateGroupSize = (text) => {
  if (!/^\d+$/.test(text.trim())) return `Enter a whole number between ${GROUP_MIN} and ${GROUP_MAX.toLocaleString()}.`;
  const value = Number(text);
  if (value < GROUP_MIN || value > GROUP_MAX) {
    return `Group size must be between ${GROUP_MIN} and ${GROUP_MAX.toLocaleString()}.`;
  }
  return '';
};

function QuoteResult({ quote }) {
  if (!quote.possible) {
    return (
      <div role="status" className="rounded-2xl border border-red-500/40 bg-red-950/30 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-red-300">Not possible</p>
        <p className="mt-2 text-lg font-semibold text-white">No exact bundle combination for {quote.groupSize.toLocaleString()} seats</p>
        <p className="mt-2 text-sm text-red-200/80">
          {quote.message} Try a different group size, or pick a cinema with other bundle sizes.
        </p>
      </div>
    );
  }

  const rows = Object.entries(quote.bundles)
    .map(([size, count]) => ({ size: Number(size), count }))
    .sort((a, b) => b.size - a.size);

  return (
    <div role="status" className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Exact match found</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-5xl font-bold text-white">{quote.totalBundles}</span>
        <span className="text-slate-300">{quote.totalBundles === 1 ? 'bundle' : 'bundles'} (the minimum)</span>
      </p>
      <p className="mt-1 text-sm text-slate-400">
        for {quote.groupSize.toLocaleString()} seats at {quote.cinema.name}
      </p>

      <table className="mt-5 w-full text-left text-sm">
        <caption className="sr-only">Bundles to buy</caption>
        <thead>
          <tr className="border-b border-ink-600 text-xs uppercase tracking-wider text-slate-500">
            <th scope="col" className="pb-2 font-medium">Bundle</th>
            <th scope="col" className="pb-2 text-right font-medium">Quantity</th>
            <th scope="col" className="pb-2 text-right font-medium">Seats</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.size} className="border-b border-ink-700 last:border-0">
              <th scope="row" className="py-2.5 font-medium text-slate-200">{row.size}-seat bundle</th>
              <td className="py-2.5 text-right text-slate-200">× {row.count}</td>
              <td className="py-2.5 text-right text-slate-400">{(row.size * row.count).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-ink-500 font-semibold text-white">
            <th scope="row" className="pt-3">Total</th>
            <td className="pt-3 text-right">{quote.totalBundles}</td>
            <td className="pt-3 text-right">{quote.groupSize.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function BookingPage() {
  const { data: cinemas, loading, error, reload } = useApi(cinemasApi.list);
  const { notify } = useToast();
  const [selectedId, setSelectedId] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [groupError, setGroupError] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [addingCinema, setAddingCinema] = useState(false);

  const cinemaId = cinemas?.some((cinema) => cinema.id === selectedId) ? selectedId : cinemas?.[0]?.id || '';
  const selectedCinema = cinemas?.find((cinema) => cinema.id === cinemaId);

  const resetResult = () => {
    setQuote(null);
    setQuoteError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const message = validateGroupSize(groupSize);
    setGroupError(message);
    resetResult();
    if (message || !cinemaId) return;

    setQuoting(true);
    try {
      setQuote(await cinemasApi.quote(cinemaId, groupSize.trim()));
    } catch (caught) {
      if (!(caught instanceof ApiError)) throw caught;
      setQuoteError(caught);
    } finally {
      setQuoting(false);
    }
  };

  const handleCinemaSaved = (cinema) => {
    setAddingCinema(false);
    setSelectedId(cinema.id);
    resetResult();
    notify(`Added "${cinema.name}".`);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Booking</h1>
          <p className="mt-1 text-sm text-slate-400">
            Opening-night seats are sold in fixed bundles. Find the fewest bundles that fit your group exactly.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setAddingCinema(true)}>
          + Add cinema
        </button>
      </div>

      {loading && !cinemas && <Spinner label="Loading cinemas…" />}
      {error && <ErrorBanner error={error} onRetry={reload} title="Could not load cinemas" />}

      {cinemas && cinemas.length === 0 && !error && (
        <EmptyState
          title="No cinemas yet"
          action={
            <button type="button" className="btn-primary" onClick={() => setAddingCinema(true)}>
              + Add a cinema
            </button>
          }
        >
          Add a cinema and its available bundle sizes to start calculating quotes.
        </EmptyState>
      )}

      {cinemas && cinemas.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <form onSubmit={handleSubmit} noValidate className="card h-fit space-y-5 p-5">
            <div>
              <label htmlFor="cinema" className="field-label">
                Cinema
              </label>
              <select
                id="cinema"
                className="field-input"
                value={cinemaId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  resetResult();
                }}
              >
                {cinemas.map((cinema) => (
                  <option key={cinema.id} value={cinema.id}>
                    {cinema.name}
                  </option>
                ))}
              </select>
              {selectedCinema && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs uppercase tracking-wider text-slate-500">Available bundles</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {selectedCinema.bundleSizes.map((size) => (
                      <li key={size} className="chip">
                        {size} seats
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="group-size" className="field-label">
                Group size
              </label>
              <input
                id="group-size"
                type="number"
                inputMode="numeric"
                min={GROUP_MIN}
                max={GROUP_MAX}
                className="field-input"
                placeholder={`${GROUP_MIN} – ${GROUP_MAX.toLocaleString()}`}
                value={groupSize}
                onChange={(event) => {
                  setGroupSize(event.target.value);
                  setGroupError('');
                  resetResult();
                }}
                aria-invalid={Boolean(groupError)}
                aria-describedby={groupError ? 'group-size-error' : undefined}
              />
              {groupError && (
                <p id="group-size-error" role="alert" className="field-error">
                  {groupError}
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={quoting}>
              {quoting ? 'Calculating…' : 'Get booking quote'}
            </button>
          </form>

          <div aria-live="polite">
            {quoting && <Spinner label="Calculating the best bundle mix…" />}
            {quoteError && <ErrorBanner error={quoteError} title="Could not calculate the quote" />}
            {quote && !quoting && <QuoteResult quote={quote} />}
            {!quote && !quoting && !quoteError && (
              <div className="card flex h-full min-h-[12rem] flex-col items-center justify-center px-6 py-12 text-center">
                <p className="text-lg font-semibold text-white">Your quote will appear here</p>
                <p className="mt-1 max-w-sm text-sm text-slate-400">
                  Choose a cinema, enter how many people are coming, and we will find the minimum number of bundles that
                  fills every seat with none left over.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {addingCinema && (
        <Modal title="Add a cinema" onClose={() => setAddingCinema(false)}>
          <CinemaForm onSaved={handleCinemaSaved} onCancel={() => setAddingCinema(false)} />
        </Modal>
      )}
    </div>
  );
}
