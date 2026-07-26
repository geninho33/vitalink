import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { storageGet } from '../localStore';
import { PageTitle, Panel } from '../ui';

const BODY_AREAS = [
  { match: /neurolog|neurocirurg|psiquiatr/, className: 'top-[8%]', label: 'cabeça e sistema nervoso' },
  { match: /oftalm|otorrino|cabeça e pescoço/, className: 'top-[12%]', label: 'cabeça e sentidos' },
  { match: /cardi|vascular|angiologia/, className: 'top-[28%]', label: 'coração e circulação' },
  { match: /pneum|torácica/, className: 'top-[32%]', label: 'pulmões e tórax' },
  { match: /gastro|digestivo|coloprocto|endoscopia/, className: 'top-[48%]', label: 'abdômen' },
  { match: /uro|nefrolog|ginecologia/, className: 'top-[58%]', label: 'região pélvica' },
  { match: /ortopedia|reumatologia|esportiva/, className: 'top-[72%]', label: 'articulações' },
];

function getBodyArea(specialty) {
  const normalized = specialty.toLocaleLowerCase('pt-BR');
  return BODY_AREAS.find((area) => area.match.test(normalized));
}

export default function CorpoView() {
  const profile = storageGet('profile', {});
  const male = profile.gender === 'Masculino';
  const bodySrc = male
    ? `${import.meta.env.BASE_URL}Sexo%20Masculino.png`
    : `${import.meta.env.BASE_URL}Sexo%20Feminino.png`;
  const specialties = Array.isArray(profile.specialties) ? profile.specialties : [];

  const mapped = useMemo(
    () => specialties.map((name) => ({ name, area: getBodyArea(name) })),
    [specialties]
  );

  const anatomical = mapped.filter((m) => m.area).length;

  return (
    <div>
      <PageTitle
        eyebrow="Visão geral"
        title="Mapa corporal"
        description="Os marcadores refletem as especialidades do perfil do paciente."
      />

      <Panel>
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-[220px] overflow-hidden rounded-2xl border border-[#cfe0df] bg-white">
              <img
                src={bodySrc}
                alt={
                  male
                    ? 'Mapa frontal do corpo masculino'
                    : 'Mapa frontal do corpo feminino'
                }
                className="mx-auto block h-auto w-full object-contain object-top"
              />
              {mapped
                .filter((item) => item.area)
                .map((item, index) => (
                  <span
                    key={item.name}
                    title={`${item.name} — ${item.area.label}`}
                    className={`absolute left-1/2 z-10 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border-2 border-white bg-aqua text-[10px] font-bold text-white shadow ${item.area.className}`}
                    style={{ marginLeft: `${(index % 3) * 10 - 10}px` }}
                  >
                    ●
                  </span>
                ))}
            </div>
            <span className="mt-2 text-xs text-slate-health">
              Mapa {male ? 'masculino' : 'feminino'} · vista frontal
            </span>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {mapped.length === 0 ? (
                <span className="text-sm text-slate-health">
                  Nenhuma especialidade cadastrada no perfil.
                </span>
              ) : (
                mapped.map((item) => (
                  <span
                    key={item.name}
                    className="rounded-full bg-[#f4fbfa] px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    {item.area ? '●' : '○'} {item.name}
                    {!item.area ? ' · acompanhamento geral' : ''}
                  </span>
                ))
              )}
            </div>
            <p className="mb-4 text-sm text-slate-health">
              {anatomical
                ? `${anatomical} especialidade(s) com correspondência anatômica destacada(s).`
                : specialties.length
                  ? 'As especialidades cadastradas são de acompanhamento geral e não correspondem a um ponto anatômico específico.'
                  : 'Inclua especialidades na Ficha do Paciente para atualizar o mapa.'}
            </p>
            <Link
              to="/inicio/perfil"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold text-ink transition hover:bg-[#f4fbfa]"
            >
              Editar especialidades no perfil
            </Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
