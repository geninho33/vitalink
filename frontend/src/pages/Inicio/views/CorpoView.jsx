import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Field, TextSelect } from '../../../components/forms/FormControls';
import { apiRequest } from '../../../services/api';
import { storageGet } from '../localStore';
import { PageTitle, Panel } from '../ui';

/** Posições anatômicas (vista frontal). left/top em % do container. */
const BODY_AREAS = [
  {
    match: /neurolog|neurocirurg|psiquiatr/,
    top: '8%',
    left: '50%',
    label: 'cabeça e sistema nervoso',
  },
  {
    match: /oftalm|otorrino|cabeça e pescoço/,
    top: '12%',
    left: '50%',
    label: 'cabeça e sentidos',
  },
  {
    match: /cardi|vascular|angiologia/,
    top: '28%',
    left: '38%',
    label: 'coração e circulação (lado esquerdo)',
  },
  {
    match: /pneum|torácica|toracica/,
    top: '30%',
    left: '58%',
    label: 'pulmões e tórax',
  },
  {
    match: /gastro|digestivo|coloprocto|endoscopia|hepat/,
    top: '46%',
    left: '50%',
    label: 'abdômen',
  },
  {
    match: /uro|nefrolog|ginecologia/,
    top: '58%',
    left: '50%',
    label: 'região pélvica',
  },
  {
    match: /ortopedia|reumatologia|esportiva|traumatolog/,
    top: '72%',
    left: '32%',
    label: 'articulações',
  },
  {
    match: /dermatolog/,
    top: '40%',
    left: '68%',
    label: 'pele',
  },
];

function getBodyArea(specialty) {
  const normalized = String(specialty || '').toLocaleLowerCase('pt-BR');
  return BODY_AREAS.find((area) => area.match.test(normalized));
}

export default function CorpoView() {
  const profile = storageGet('profile', {});
  const [pacientes, setPacientes] = useState([]);
  const [pacienteId, setPacienteId] = useState('');
  const [specialties, setSpecialties] = useState(
    Array.isArray(profile.specialties) ? profile.specialties : []
  );
  const [sexo, setSexo] = useState(profile.gender || 'Feminino');

  useEffect(() => {
    apiRequest('/pacientes', { query: { pageSize: 200, status: 'ativo' } })
      .then((res) => setPacientes(res.data || []))
      .catch(() => setPacientes([]));
  }, []);

  useEffect(() => {
    if (!pacienteId) return;
    let cancelled = false;
    (async () => {
      try {
        const [pacRes, medRes] = await Promise.all([
          apiRequest(`/pacientes/${pacienteId}`),
          apiRequest('/medicos', { query: { pageSize: 200, status: 'ativo' } }),
        ]);
        if (cancelled) return;
        const pac = pacRes.data || pacRes;
        if (pac.sexo) {
          setSexo(pac.sexo === 'M' || pac.sexo === 'Masculino' ? 'Masculino' : 'Feminino');
        }
        let medicoIds = pac.medico_ids;
        if (typeof medicoIds === 'string') {
          try {
            medicoIds = JSON.parse(medicoIds);
          } catch {
            medicoIds = [];
          }
        }
        const ids = new Set((Array.isArray(medicoIds) ? medicoIds : []).map(Number));
        const meds = (medRes.data || []).filter((m) => ids.has(Number(m.id)));
        const esps = [
          ...new Set(meds.map((m) => m.especialidade).filter(Boolean)),
        ];
        if (esps.length) setSpecialties(esps);
      } catch {
        /* mantém specialties locais */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pacienteId]);

  const male = sexo === 'Masculino';
  const bodySrc = male
    ? `${import.meta.env.BASE_URL}Sexo%20Masculino.png`
    : `${import.meta.env.BASE_URL}Sexo%20Feminino.png`;

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
        description="Os marcadores refletem as especialidades do paciente. Passe o mouse para ver o nome e abra a pasta de exames."
      />

      <Panel className="mb-4">
        <Field label="Paciente (opcional — carrega especialidades da ficha)">
          <TextSelect value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
            <option value="">Usar perfil local / todas</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </TextSelect>
        </Field>
      </Panel>

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
                .map((item) => (
                  <Link
                    key={item.name}
                    to={`/exames-receitas?especialidade=${encodeURIComponent(item.name)}${
                      pacienteId ? `&paciente_id=${pacienteId}` : ''
                    }`}
                    title={`${item.name} — ${item.area.label}`}
                    className="absolute z-10 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-aqua text-[10px] font-bold text-white shadow transition hover:scale-110 hover:bg-vita"
                    style={{ top: item.area.top, left: item.area.left }}
                  >
                    ●
                  </Link>
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
                  Nenhuma especialidade cadastrada. Vincule profissionais na ficha do paciente.
                </span>
              ) : (
                mapped.map((item) => (
                  <Link
                    key={item.name}
                    to={`/exames-receitas?especialidade=${encodeURIComponent(item.name)}${
                      pacienteId ? `&paciente_id=${pacienteId}` : ''
                    }`}
                    className="rounded-full border border-aqua/40 bg-aqua-soft px-3 py-1 text-xs font-semibold text-aqua-deep hover:bg-aqua hover:text-white"
                    title={item.area?.label || item.name}
                  >
                    {item.name}
                  </Link>
                ))
              )}
            </div>
            <p className="text-sm text-slate-health">
              {anatomical} ponto(s) mapeados anatomicamente. Clique no ponto ou no nome para abrir a
              pasta da especialidade em Exames/Receitas.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
