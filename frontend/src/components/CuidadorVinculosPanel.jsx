import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AddressFields,
  DateBrInput,
  Field,
  TextInput,
  TextSelect,
} from './forms/FormControls';
import { apiRequest } from '../services/api';
import { maskCpf, maskPhone, onlyDigits } from '../hooks/useCep';

const emptyVinculo = () => ({
  tipo: 'pj',
  empresa_cuidadora_id: '',
  cuidador_id: '',
  nome_escalado: '',
  contato_escalado: '',
  profissional_nome: '',
  profissional_cpf: '',
  contato: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  data_inicio: new Date().toISOString().slice(0, 10),
  data_termino: '',
  ativo: true,
});

/**
 * Histórico temporal de vínculos de cuidador (PJ empresa / PF profissional).
 * Exige paciente já salvo (pacienteId).
 */
export default function CuidadorVinculosPanel({ pacienteId }) {
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [cuidadores, setCuidadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyVinculo);

  const load = useCallback(async () => {
    if (!pacienteId) return;
    setLoading(true);
    setError('');
    try {
      const [v, e, c] = await Promise.all([
        apiRequest(`/pacientes/${pacienteId}/cuidador-vinculos`),
        apiRequest('/empresas-cuidadoras', { query: { pageSize: 100, status: 'ativo' } }),
        apiRequest('/cuidadores', { query: { pageSize: 100, status: 'ativo' } }),
      ]);
      setRows(v.data || []);
      setEmpresas(e.data || []);
      setCuidadores(c.data || []);
    } catch (err) {
      setError(err.message || 'Falha ao carregar vínculos.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyVinculo());
    setFormOpen(true);
  }

  function openEdit(row) {
    setEditingId(row.id);
    setForm({
      ...emptyVinculo(),
      ...row,
      empresa_cuidadora_id: row.empresa_cuidadora_id || '',
      cuidador_id: row.cuidador_id || '',
      data_inicio: row.data_inicio ? String(row.data_inicio).slice(0, 10) : '',
      data_termino: row.data_termino ? String(row.data_termino).slice(0, 10) : '',
      ativo: row.ativo !== false,
    });
    setFormOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    const body = {
      ...form,
      empresa_cuidadora_id: form.empresa_cuidadora_id
        ? Number(form.empresa_cuidadora_id)
        : null,
      cuidador_id: form.cuidador_id ? Number(form.cuidador_id) : null,
      profissional_cpf: form.profissional_cpf
        ? onlyDigits(form.profissional_cpf)
        : null,
      contato: form.contato ? onlyDigits(form.contato) : null,
      contato_escalado: form.contato_escalado
        ? onlyDigits(form.contato_escalado)
        : null,
      cep: form.cep ? onlyDigits(form.cep) : null,
      data_termino: form.data_termino || null,
      ativo: Boolean(form.ativo),
    };
    try {
      if (editingId) {
        await apiRequest(`/pacientes/${pacienteId}/cuidador-vinculos/${editingId}`, {
          method: 'PUT',
          body,
        });
      } else {
        await apiRequest(`/pacientes/${pacienteId}/cuidador-vinculos`, {
          method: 'POST',
          body,
        });
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar o vínculo.');
    }
  }

  async function encerrar(row) {
    const termino =
      window.prompt('Data de término (AAAA-MM-DD):', new Date().toISOString().slice(0, 10)) ||
      '';
    if (!termino) return;
    try {
      await apiRequest(`/pacientes/${pacienteId}/cuidador-vinculos/${row.id}`, {
        method: 'PUT',
        body: { data_termino: termino, ativo: false },
      });
      await load();
    } catch (err) {
      setError(err.message || 'Falha ao encerrar vínculo.');
    }
  }

  async function excluir(row) {
    if (!window.confirm('Excluir este vínculo do histórico?')) return;
    try {
      await apiRequest(`/pacientes/${pacienteId}/cuidador-vinculos/${row.id}`, {
        method: 'DELETE',
      });
      await load();
    } catch (err) {
      setError(err.message || 'Falha ao excluir.');
    }
  }

  if (!pacienteId) {
    return (
      <p className="text-sm text-slate-health">
        Salve o paciente para registrar o histórico de cuidadores (PJ/PF).
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-ink">Histórico de vínculos de cuidador</h3>
          <p className="text-[11px] text-slate-health">
            PJ (empresa) ou PF (profissional) com datas de início e término.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/empresas-cuidadoras"
            className="text-xs font-semibold text-vita hover:underline"
          >
            Empresas
          </Link>
          <Link to="/cuidadores" className="text-xs font-semibold text-vita hover:underline">
            + Novo cuidador
          </Link>
          <button
            type="button"
            onClick={openCreate}
            className="min-h-9 rounded-lg bg-vita px-3 text-xs font-semibold text-white"
          >
            Novo vínculo
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-slate-health">Carregando…</p> : null}

      <ul className="grid gap-1.5">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-[#e2eeee] bg-[#fbfefe] px-2.5 py-2 text-sm"
          >
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                r.tipo === 'pj' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {r.tipo}
            </span>
            <span className="min-w-0 flex-1 font-semibold text-ink">
              {r.tipo === 'pj'
                ? r.empresa_nome || `Empresa #${r.empresa_cuidadora_id}`
                : r.profissional_nome || r.cuidador_nome || 'Profissional'}
              {r.nome_escalado ? (
                <span className="font-normal text-slate-health"> · {r.nome_escalado}</span>
              ) : null}
            </span>
            <span className="text-[11px] text-slate-health">
              {r.data_inicio ? String(r.data_inicio).slice(0, 10) : '—'}
              {' → '}
              {r.data_termino ? String(r.data_termino).slice(0, 10) : 'atual'}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                r.ativo ? 'bg-mint-soft text-aqua-deep' : 'bg-slate-100 text-slate-health'
              }`}
            >
              {r.ativo ? 'Ativo' : 'Encerrado'}
            </span>
            <button
              type="button"
              className="text-[11px] font-semibold text-vita hover:underline"
              onClick={() => openEdit(r)}
            >
              Editar
            </button>
            {r.ativo ? (
              <button
                type="button"
                className="text-[11px] font-semibold text-amber-700 hover:underline"
                onClick={() => encerrar(r)}
              >
                Encerrar
              </button>
            ) : null}
            <button
              type="button"
              className="text-[11px] font-semibold text-red-600 hover:underline"
              onClick={() => excluir(r)}
            >
              Excluir
            </button>
          </li>
        ))}
        {!loading && !rows.length ? (
          <li className="py-3 text-center text-sm text-slate-health">Nenhum vínculo registrado.</li>
        ) : null}
      </ul>

      {formOpen ? (
        <form
          onSubmit={save}
          className="grid gap-3 rounded-2xl border border-[#d0e4ef] bg-white p-4 sm:grid-cols-2"
        >
          <p className="sm:col-span-2 text-sm font-bold text-ink">
            {editingId ? 'Editar vínculo' : 'Novo vínculo'}
          </p>
          <Field label="Tipo" required>
            <TextSelect
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            >
              <option value="pj">PJ — Empresa cuidadora</option>
              <option value="pf">PF — Profissional individual</option>
            </TextSelect>
          </Field>
          <Field label="Data início" required>
            <DateBrInput
              required
              value={form.data_inicio}
              onChange={(data_inicio) => setForm({ ...form, data_inicio })}
            />
          </Field>
          <Field label="Data término">
            <DateBrInput
              value={form.data_termino || ''}
              onChange={(data_termino) => setForm({ ...form, data_termino })}
            />
          </Field>
          <Field label="Status">
            <TextSelect
              value={form.ativo ? 'ativo' : 'inativo'}
              onChange={(e) => setForm({ ...form, ativo: e.target.value === 'ativo' })}
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Encerrado</option>
            </TextSelect>
          </Field>

          {form.tipo === 'pj' ? (
            <>
              <Field label="Empresa cuidadora" required>
                <TextSelect
                  value={form.empresa_cuidadora_id || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      empresa_cuidadora_id: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome_fantasia}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Field label="Cuidador escalado (cadastro)">
                <TextSelect
                  value={form.cuidador_id || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cuidador_id: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                >
                  <option value="">—</option>
                  {cuidadores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Field label="Nome do cuidador escalado">
                <TextInput
                  value={form.nome_escalado || ''}
                  onChange={(e) => setForm({ ...form, nome_escalado: e.target.value })}
                />
              </Field>
              <Field label="Contato do escalado">
                <TextInput
                  value={maskPhone(form.contato_escalado || '')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contato_escalado: onlyDigits(e.target.value).slice(0, 11),
                    })
                  }
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Cuidador cadastrado">
                <TextSelect
                  value={form.cuidador_id || ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : '';
                    const c = cuidadores.find((x) => x.id === id);
                    setForm({
                      ...form,
                      cuidador_id: id,
                      profissional_nome: c?.nome || form.profissional_nome,
                      profissional_cpf: c?.cpf || form.profissional_cpf,
                      contato: c?.telefone_principal || form.contato,
                    });
                  }}
                >
                  <option value="">— ou preencha manualmente —</option>
                  {cuidadores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </TextSelect>
              </Field>
              <Field label="Nome do profissional" required>
                <TextInput
                  value={form.profissional_nome || ''}
                  onChange={(e) => setForm({ ...form, profissional_nome: e.target.value })}
                />
              </Field>
              <Field label="CPF">
                <TextInput
                  value={maskCpf(form.profissional_cpf || '')}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      profissional_cpf: onlyDigits(e.target.value).slice(0, 11),
                    })
                  }
                />
              </Field>
              <Field label="Contato">
                <TextInput
                  value={maskPhone(form.contato || '')}
                  onChange={(e) =>
                    setForm({ ...form, contato: onlyDigits(e.target.value).slice(0, 11) })
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs font-bold text-slate-health">Endereço (opcional)</p>
                <AddressFields values={form} onChange={setForm} required={false} />
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              className="min-h-10 rounded-xl bg-vita px-4 text-sm font-semibold text-white"
            >
              Salvar vínculo
            </button>
            <button
              type="button"
              className="min-h-10 rounded-xl border border-[#d7e8e7] px-4 text-sm font-semibold"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
