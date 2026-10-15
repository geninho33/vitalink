import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiRequest } from '../../../services/api';

const PERIODOS = [7, 30, 90];
const COR_FORA = '#B45309'; // âmbar neutro

export function origemLabel(f) {
  if (!f) return '';
  const quem = f.origem === 'medico' ? 'médico' : 'família';
  return f.definido_por_nome ? `${f.definido_por_nome} (${quem})` : quem;
}

function fora(v, min, max) {
  if (v == null) return false;
  return (min != null && v < Number(min)) || (max != null && v > Number(max));
}

function Ponto({ cx, cy, payload, dataKey, faixa }) {
  if (cx == null || cy == null) return null;
  const v = payload[dataKey];
  if (v == null) return null;
  let isFora = false;
  if (faixa) {
    if (dataKey === 'sistolica') isFora = fora(v, faixa.sistolica_min, faixa.sistolica_max);
    else if (dataKey === 'diastolica') isFora = fora(v, faixa.diastolica_min, faixa.diastolica_max);
    else isFora = fora(v, faixa.valor_min, faixa.valor_max);
  }
  return isFora ? (
    <circle cx={cx} cy={cy} r={6} fill={COR_FORA} stroke="#fff" strokeWidth={2} />
  ) : (
    <circle cx={cx} cy={cy} r={3} fill="#0077B6" />
  );
}

function fmtData(ts) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function SinaisGrafico({ pacienteId, tipo, label, unidade, faixa, refreshKey }) {
  const [dias, setDias] = useState(30);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancel = false;
    apiRequest('/inicio/sinais-vitais', {
      query: { paciente_id: pacienteId, tipo, dias, limit: 1000 },
    })
      .then((res) => !cancel && setRows(res.data || []))
      .catch(() => !cancel && setRows([]));
    return () => {
      cancel = true;
    };
  }, [pacienteId, tipo, dias, refreshKey]);

  const data = useMemo(
    () =>
      [...rows]
        .reverse()
        .map((r) => ({
          t: new Date(r.medido_em).getTime(),
          valor: r.valor != null ? Number(r.valor) : null,
          sistolica: r.sistolica,
          diastolica: r.diastolica,
        })),
    [rows]
  );

  const pressao = tipo === 'pressao';
  const foraCount = rows.filter((r) => r.fora_da_faixa).length;

  // Domínio Y incluindo a faixa, para a banda ficar visível.
  const dominio = useMemo(() => {
    const vals = [];
    for (const d of data) {
      if (pressao) vals.push(d.sistolica, d.diastolica);
      else vals.push(d.valor);
    }
    if (faixa) {
      if (pressao) vals.push(faixa.sistolica_min, faixa.sistolica_max, faixa.diastolica_min, faixa.diastolica_max);
      else vals.push(faixa.valor_min, faixa.valor_max);
    }
    const nums = vals.filter((v) => v != null).map(Number);
    if (!nums.length) return [0, 1];
    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    const pad = Math.max((hi - lo) * 0.1, 1);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }, [data, faixa, pressao]);

  const banda = (min, max, cor) =>
    min != null || max != null ? (
      <ReferenceArea
        y1={min != null ? Number(min) : dominio[0]}
        y2={max != null ? Number(max) : dominio[1]}
        fill={cor}
        fillOpacity={0.15}
        stroke={cor}
        strokeOpacity={0.3}
        ifOverflow="extendDomain"
      />
    ) : null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">
          {label} <span className="font-medium text-slate-health">({unidade})</span>
        </p>
        <div className="flex gap-1">
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDias(p)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                dias === p ? 'bg-aqua text-white' : 'border border-[#d7e8e7] text-ink'
              }`}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>
      {data.length ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#e2eeee" strokeDasharray="3 3" />
              <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={fmtData} tick={{ fontSize: 11 }} />
              <YAxis domain={dominio} tick={{ fontSize: 11 }} allowDecimals={!pressao} />
              {faixa && pressao ? banda(faixa.sistolica_min, faixa.sistolica_max, '#0077B6') : null}
              {faixa && pressao ? banda(faixa.diastolica_min, faixa.diastolica_max, '#00B4D8') : null}
              {faixa && !pressao ? banda(faixa.valor_min, faixa.valor_max, '#0077B6') : null}
              <Tooltip
                labelFormatter={(t) => new Date(t).toLocaleString('pt-BR')}
                formatter={(v, name) => [`${Number(v).toLocaleString('pt-BR')} ${unidade}`, name]}
              />
              {pressao ? (
                <>
                  <Line type="monotone" dataKey="sistolica" name="Máxima" stroke="#0077B6" strokeWidth={2} isAnimationActive={false}
                    dot={(p) => <Ponto key={`s${p.index}`} {...p} dataKey="sistolica" faixa={faixa} />} />
                  <Line type="monotone" dataKey="diastolica" name="Mínima" stroke="#00B4D8" strokeWidth={2} isAnimationActive={false}
                    dot={(p) => <Ponto key={`d${p.index}`} {...p} dataKey="diastolica" faixa={faixa} />} />
                </>
              ) : (
                <Line type="monotone" dataKey="valor" name={label} stroke="#0077B6" strokeWidth={2} isAnimationActive={false}
                  dot={(p) => <Ponto key={`v${p.index}`} {...p} dataKey="valor" faixa={faixa} />} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[#cfe0df] px-3 py-6 text-center text-sm text-slate-health">
          Sem medições de {label.toLowerCase()} nos últimos {dias} dias.
        </p>
      )}
      <p className="mt-2 text-xs text-slate-health">
        {faixa ? (
          <>
            Área sombreada: faixa definida por {origemLabel(faixa)}.{' '}
            {foraCount ? (
              <span style={{ color: COR_FORA }} className="font-semibold">
                {foraCount} medição(ões) fora da faixa definida.
              </span>
            ) : null}
          </>
        ) : (
          'Nenhuma faixa definida para este tipo.'
        )}
      </p>
    </div>
  );
}
