import { useMemo } from 'react';

const SPECIALTY_HOTSPOTS = {
  cardiolog: { top: '32%', left: '50%' },
  pneumo: { top: '30%', left: '38%' },
  pulm: { top: '30%', left: '62%' },
  neuro: { top: '10%', left: '50%' },
  ortop: { top: '58%', left: '28%' },
  urolog: { top: '58%', left: '50%' },
  ginec: { top: '58%', left: '50%' },
  gastro: { top: '48%', left: '50%' },
  endocri: { top: '42%', left: '50%' },
  oftalmo: { top: '14%', left: '42%' },
  otorrino: { top: '16%', left: '58%' },
  dermato: { top: '28%', left: '50%' },
};

function normalizeSpecialty(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Silhueta do paciente conforme o sexo informado (masculino/feminino). */
export default function SexoBoneco({ sexo, medicos, medicoIds, label = 'Silhueta conforme o sexo' }) {
  const src = sexo === 'masculino' ? '/sexo-masculino.png' : sexo === 'feminino' ? '/sexo-feminino.png' : null;
  const alt = sexo === 'masculino' ? 'Silhueta masculina' : sexo === 'feminino' ? 'Silhueta feminina' : '';
  const hotspots = useMemo(() => {
    if (sexo !== 'masculino' && sexo !== 'feminino') return [];
    const seen = new Set();
    return (medicos || [])
      .filter((m) => (medicoIds || []).includes(m.id))
      .map((m) => {
        const key = Object.keys(SPECIALTY_HOTSPOTS).find((k) =>
          normalizeSpecialty(m.especialidade).includes(k)
        );
        if (!key || seen.has(key)) return null;
        seen.add(key);
        return { key, label: m.especialidade, pos: SPECIALTY_HOTSPOTS[key] };
      })
      .filter(Boolean);
  }, [sexo, medicos, medicoIds]);

  if (!src) return null;

  return (
    <div className="sm:col-span-2">
      {label ? <p className="mb-1 text-sm font-semibold text-ink">{label}</p> : null}
      <div className="relative mx-auto max-w-[220px]">
        <img src={src} alt={alt} className="w-full rounded-xl border border-[#d7e8e7] bg-white" />
        {hotspots.map((h) => (
          <span
            key={h.key}
            title={h.label}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-aqua shadow-md"
            style={{ top: h.pos.top, left: h.pos.left }}
          />
        ))}
      </div>
    </div>
  );
}
