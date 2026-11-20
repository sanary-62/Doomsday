import { useEffect, useRef } from 'react';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-slate-400">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-ink-500 border-t-blue-400"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBanner({ error, onRetry, title = 'Something went wrong' }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm">
      <p className="font-semibold text-red-300">{title}</p>
      <p className="mt-1 text-red-200/80">{error.message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-3">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div aria-hidden="true" className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-700 text-2xl">
        🎬
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-400">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, label }) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        className="h-3 w-full overflow-hidden rounded-full bg-ink-700"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-300 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-right text-xs text-slate-400">{percent}%</p>
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-wait disabled:opacity-60 ${
        checked ? 'bg-emerald-500' : 'bg-ink-500'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

export function Modal({ title, onClose, children, size = 'md' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const widths = { md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${widths[size]} rounded-2xl border border-ink-500 bg-ink-800 p-0 text-slate-200 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between border-b border-ink-600 px-5 py-4">
        <h2 id="modal-title" className="text-lg font-semibold text-white">
          {title}
        </h2>
        <button type="button" onClick={onClose} className="btn-ghost" aria-label="Close dialog">
          ✕
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
    </dialog>
  );
}
