import { useMemo, useState } from 'react';
import { ApiError, moviesApi } from '../services/api';
import { fieldErrorsFrom } from '../utils/format';

const YEAR_MIN = 1888;
const YEAR_MAX = 2100;
const RUNTIME_MIN = 1;
const RUNTIME_MAX = 300;

const validate = ({ title, releaseYear, runtime }) => {
  const errors = {};
  if (title.trim() === '') errors.title = 'Title is required.';
  if (releaseYear !== '') {
    const year = Number(releaseYear);
    if (!Number.isInteger(year) || year < YEAR_MIN || year > YEAR_MAX) {
      errors.releaseYear = `Release year must be a whole number between ${YEAR_MIN} and ${YEAR_MAX}.`;
    }
  }
  const minutes = Number(runtime);
  if (runtime === '' || !Number.isInteger(minutes) || minutes < RUNTIME_MIN || minutes > RUNTIME_MAX) {
    errors.runtime = `Runtime must be a whole number of minutes between ${RUNTIME_MIN} and ${RUNTIME_MAX}.`;
  }
  return errors;
};

export default function MovieForm({ movie, allMovies, onSaved, onCancel }) {
  const isEditing = Boolean(movie);
  const [values, setValues] = useState({
    title: movie?.title ?? '',
    releaseYear: movie?.releaseYear ?? '',
    runtime: movie?.runtime ?? '',
  });
  const [prerequisites, setPrerequisites] = useState(movie?.prerequisites ?? []);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(
    () =>
      allMovies
        .filter((candidate) => candidate.id !== movie?.id)
        .filter((candidate) => candidate.title.toLowerCase().includes(search.trim().toLowerCase())),
    [allMovies, movie, search]
  );

  const setValue = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const togglePrerequisite = (id) => {
    setPrerequisites((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setErrors((current) => ({ ...current, prerequisites: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validate(values);
    setErrors(clientErrors);
    setFormError('');
    if (Object.keys(clientErrors).length > 0) return;

    const payload = {
      title: values.title.trim(),
      releaseYear: values.releaseYear === '' ? null : Number(values.releaseYear),
      runtime: Number(values.runtime),
      prerequisites,
    };

    setSaving(true);
    try {
      const saved = isEditing ? await moviesApi.update(movie.id, payload) : await moviesApi.create(payload);
      onSaved(saved, isEditing);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.code === 'CIRCULAR_DEPENDENCY') {
        setErrors({ prerequisites: error.message });
      } else if (error.code === 'DUPLICATE_TITLE') {
        setErrors({ title: error.message });
      } else {
        const serverFieldErrors = fieldErrorsFrom(error);
        if (Object.keys(serverFieldErrors).length > 0) setErrors(serverFieldErrors);
        else setFormError(error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {formError}
        </div>
      )}

      <div>
        <label htmlFor="movie-title" className="field-label">
          Title
        </label>
        <input
          id="movie-title"
          className="field-input"
          value={values.title}
          onChange={setValue('title')}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'movie-title-error' : undefined}
          autoFocus
          maxLength={200}
        />
        {errors.title && (
          <p id="movie-title-error" className="field-error">
            {errors.title}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="movie-year" className="field-label">
            Release year <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="movie-year"
            type="number"
            inputMode="numeric"
            className="field-input"
            value={values.releaseYear}
            onChange={setValue('releaseYear')}
            aria-invalid={Boolean(errors.releaseYear)}
            aria-describedby={errors.releaseYear ? 'movie-year-error' : undefined}
          />
          {errors.releaseYear && (
            <p id="movie-year-error" className="field-error">
              {errors.releaseYear}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="movie-runtime" className="field-label">
            Runtime (minutes)
          </label>
          <input
            id="movie-runtime"
            type="number"
            inputMode="numeric"
            className="field-input"
            value={values.runtime}
            onChange={setValue('runtime')}
            aria-invalid={Boolean(errors.runtime)}
            aria-describedby={errors.runtime ? 'movie-runtime-error' : undefined}
          />
          {errors.runtime && (
            <p id="movie-runtime-error" className="field-error">
              {errors.runtime}
            </p>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="field-label">
          Watch these first <span className="font-normal text-slate-500">(prerequisites)</span>
        </legend>

        {allMovies.filter((candidate) => candidate.id !== movie?.id).length === 0 ? (
          <p className="rounded-lg border border-dashed border-ink-500 px-3 py-4 text-sm text-slate-400">
            No other movies yet. Add more movies to link prerequisites.
          </p>
        ) : (
          <>
            <input
              type="search"
              className="field-input mb-2"
              placeholder="Search movies…"
              aria-label="Search prerequisite movies"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <ul className="max-h-48 divide-y divide-ink-700 overflow-y-auto rounded-lg border border-ink-500 bg-ink-900">
              {candidates.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">No movies match your search.</li>}
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-ink-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-500"
                      checked={prerequisites.includes(candidate.id)}
                      onChange={() => togglePrerequisite(candidate.id)}
                    />
                    <span className="flex-1 text-slate-200">{candidate.title}</span>
                    {candidate.releaseYear && <span className="text-xs text-slate-500">{candidate.releaseYear}</span>}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
        {errors.prerequisites && (
          <p role="alert" className="field-error">
            {errors.prerequisites}
          </p>
        )}
        <p className="mt-1.5 text-xs text-slate-500">{prerequisites.length} selected</p>
      </fieldset>

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add movie'}
        </button>
      </div>
    </form>
  );
}
