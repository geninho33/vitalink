export default function PageHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm text-slate-health">{description}</p>
      ) : null}
    </div>
  );
}

export function PlaceholderCard({ children }) {
  return (
    <div className="rounded-2xl border border-[#d7e8e7] bg-white p-5 shadow-sm sm:p-6">
      {children}
    </div>
  );
}
