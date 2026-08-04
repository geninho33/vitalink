/**
 * Logomarca VitaLink — uso no Login e na navegação pós-login.
 */
export default function BrandLogo({
  variant = 'full', // full | compact | mark
  className = '',
  inverted = false,
}) {
  if (variant === 'mark') {
    return (
      <img
        src="/vitalink-logo.png"
        alt="VitaLink"
        className={`h-9 w-9 object-contain ${className}`}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img
          src="/vitalink-logo.png"
          alt=""
          className="h-8 w-8 shrink-0 object-contain"
          aria-hidden
        />
        <span className="font-display text-base font-bold tracking-tight">
          <span className={inverted ? 'text-white' : 'text-vita'}>Vita</span>
          <span className={inverted ? 'text-white/90' : 'text-link'}>Link</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <img
        src="/vitalink-logo.png"
        alt="VitaLink — Prontuário Eletrônico"
        className="h-28 w-auto max-w-full object-contain sm:h-36"
      />
    </div>
  );
}
