import { useState } from 'react';
import { ApiError, cinemasApi } from '../services/api';
import { fieldErrorsFrom } from '../utils/format';

const MAX_SIZES = 10;
const SIZE_MIN = 1;
const SIZE_MAX = 500;


const parseBundleSizes = (text) => {
  const tokens = text
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return { error: 'Enter at least one bundle size.' };
  if (tokens.some((token) => !/^\d+$/.test(token))) return { error: 'Bundle sizes must be whole numbers separated by commas.' };

  const sizes = tokens.map(Number);
  if (sizes.length > MAX_SIZES) return { error: `A cinema can have at most ${MAX_SIZES} bundle sizes.` };
  if (sizes.some((size) => size < SIZE_MIN || size > SIZE_MAX)) {
    return { error: `Each bundle size must be between ${SIZE_MIN} and ${SIZE_MAX}.` };
  }
  if (new Set(sizes).size !== sizes.length) return { error: 'Duplicate bundle sizes are not allowed.' };
  return { sizes };
};

export default function CinemaForm({ onSaved, onCancel }) {
  const [name, setName] = useState('');
  const [sizesText, setSizesText] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (name.trim() === '') nextErrors.name = 'Cinema name is required.';
    const parsed = parseBundleSizes(sizesText);
    if (parsed.error) nextErrors.bundleSizes = parsed.error;

    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const cinema = await cinemasApi.create({ name: name.trim(), bundleSizes: parsed.sizes });
      onSaved(cinema);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.code === 'DUPLICATE_NAME') {
        setErrors({ name: error.message });
      } else {
        const serverErrors = fieldErrorsFrom(error);
        if (Object.keys(serverErrors).length > 0) setErrors(serverErrors);
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
        <label htmlFor="cinema-name" className="field-label">
          Cinema name
        </label>
        <input
          id="cinema-name"
          className="field-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'cinema-name-error' : undefined}
          autoFocus
          maxLength={120}
        />
        {errors.name && (
          <p id="cinema-name-error" className="field-error">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="cinema-sizes" className="field-label">
          Bundle sizes
        </label>
        <input
          id="cinema-sizes"
          className="field-input"
          placeholder="e.g. 6, 9, 20"
          value={sizesText}
          onChange={(event) => setSizesText(event.target.value)}
          aria-invalid={Boolean(errors.bundleSizes)}
          aria-describedby="cinema-sizes-hint"
        />
        <p id="cinema-sizes-hint" className="mt-1.5 text-xs text-slate-500">
          1 to {MAX_SIZES} different whole numbers between {SIZE_MIN} and {SIZE_MAX}, separated by commas.
        </p>
        {errors.bundleSizes && (
          <p role="alert" className="field-error">
            {errors.bundleSizes}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Add cinema'}
        </button>
      </div>
    </form>
  );
}
