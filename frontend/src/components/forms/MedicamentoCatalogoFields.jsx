import AutocompleteSelect from './AutocompleteSelect';
import { Field, TextInput, TextSelect } from './FormControls';
import { searchCatalogoMedicamentos } from '../../utils/redeSaude';

const FORMA_DB = {
  comprimido: 'comprimido',
  capsula: 'capsula',
  xarope: 'xarope',
  solucao: 'solucao',
  injecao: 'injecao',
  pomada: 'pomada',
  creme: 'creme',
  gotas: 'gotas',
  inalador: 'inalador',
  spray: 'inalador',
  gel: 'creme',
  adesivo: 'outro',
  pó: 'outro',
  suspensao: 'solucao',
  outro: 'outro',
};

function formaParaCadastro(forma) {
  return FORMA_DB[forma] || 'outro';
}

const FORMA_LABEL = {
  comprimido: 'comprimido',
  capsula: 'cápsula',
  xarope: 'dose',
  solucao: 'dose',
  injecao: 'aplicação',
  pomada: 'aplicação',
  creme: 'aplicação',
  gotas: 'gotas',
  inalador: 'jato',
  spray: 'jato',
  outro: 'unidade',
};

export function sugestaoQuantidade(dosagem, forma) {
  if (!dosagem) return '';
  const label = FORMA_LABEL[forma] || forma || 'comprimido';
  if (forma === 'gotas') return dosagem;
  return `1 ${label} de ${dosagem}`;
}

export default function MedicamentoCatalogoFields({
  form,
  setForm,
  showPrincipioAtivo = false,
  showConcentracao = false,
  required = true,
}) {
  const dosagens = Array.isArray(form.catalogoDosagens) ? form.catalogoDosagens : [];
  const formas = Array.isArray(form.catalogoFormas) ? form.catalogoFormas : [];
  const formaPadrao = formas[0] || form.forma_farmaceutica || 'comprimido';

  function applyCatalogo(opt, nomeLivre) {
    const raw = opt?.raw;
    if (!raw) {
      setForm({
        ...form,
        nome_comercial: nomeLivre || '',
        catalogoDosagens: [],
        catalogoFormas: [],
      });
      return;
    }
    const primeira = raw.dosagens?.[0] || '';
    const forma = formaParaCadastro(
      raw.formas?.[0] || form.forma_farmaceutica || 'comprimido'
    );
    setForm({
      ...form,
      nome_comercial: raw.nome_comercial,
      principio_ativo: raw.principio_ativo || form.principio_ativo || '',
      forma_farmaceutica: forma,
      concentracao: primeira || form.concentracao || '',
      catalogoDosagens: raw.dosagens || [],
      catalogoFormas: raw.formas || [],
      quantidade_administrar:
        primeira
          ? sugestaoQuantidade(primeira, forma)
          : form.quantidade_administrar,
    });
  }

  function applyDosagem(dosagem) {
    const forma = formaPadrao;
    setForm({
      ...form,
      concentracao: dosagem || form.concentracao,
      quantidade_administrar: dosagem
        ? sugestaoQuantidade(dosagem, forma)
        : form.quantidade_administrar,
    });
  }

  return (
    <>
      <div className={showPrincipioAtivo ? '' : 'sm:col-span-2'}>
        <AutocompleteSelect
          label="Nome do medicamento"
          required={required}
          allowFreeText
          value={form.nome_comercial || ''}
          selectedLabel={form.nome_comercial || ''}
          fetchOptions={searchCatalogoMedicamentos}
          placeholder="Buscar no catálogo (ex.: losartana, metformina)…"
          hint="Ao escolher o remédio, as dosagens à venda são sugeridas."
          onChange={(value, opt) => applyCatalogo(opt, value)}
        />
      </div>
      {showPrincipioAtivo ? (
        <Field label="Princípio ativo" required={required}>
          <TextInput
            required={required}
            value={form.principio_ativo || ''}
            onChange={(e) => setForm({ ...form, principio_ativo: e.target.value })}
          />
        </Field>
      ) : null}
      {dosagens.length ? (
        <Field label="Dosagem disponível para venda" hint="Sugestões do catálogo">
          <TextSelect
            value={
              dosagens.includes(form.concentracao) ? form.concentracao : dosagens[0]
            }
            onChange={(e) => applyDosagem(e.target.value)}
          >
            {dosagens.map((d) => (
              <option key={d} value={d}>
                {d}
                {formas.length > 1 ? '' : formaPadrao ? ` · ${formaPadrao}` : ''}
              </option>
            ))}
          </TextSelect>
        </Field>
      ) : showConcentracao ? (
        <Field label="Dosagem / concentração">
          <TextInput
            value={form.concentracao || ''}
            onChange={(e) => setForm({ ...form, concentracao: e.target.value })}
            placeholder="Ex.: 50 mg"
          />
        </Field>
      ) : null}
    </>
  );
}
