export function PageTitle({ eyebrow, title, description }) {
  return (
    <div className="mb-5">
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-wider text-aqua">{eyebrow}</p>
      ) : null}
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm text-slate-health">{description}</p>
      ) : null}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-[#d7e8e7] bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-[#cfe0df] bg-[#f8fcfc] px-4 py-8 text-center text-sm text-slate-health">
      {children}
    </div>
  );
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-aqua px-5 text-sm font-semibold text-white transition hover:bg-aqua-deep disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold text-ink transition hover:bg-[#f4fbfa] disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
