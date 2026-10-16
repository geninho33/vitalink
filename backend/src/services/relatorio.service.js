/**
 * Relatório em PDF para levar à consulta (pdfkit: sem Chromium no container).
 * Somente registro/organização — sem interpretação clínica (RDC ANVISA 657/2022).
 */
const PDFDocument = require('pdfkit');
const { query } = require('../config/database');

const TZ = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
const MAX_DIAS = 366;

const TIPOS = {
  pressao: { label: 'Pressão arterial', unidade: 'mmHg' },
  frequencia_cardiaca: { label: 'Frequência cardíaca', unidade: 'bpm' },
  glicemia: { label: 'Glicemia', unidade: 'mg/dL' },
  temperatura: { label: 'Temperatura', unidade: '°C' },
  saturacao_o2: { label: 'Saturação de O2', unidade: '%' },
  peso: { label: 'Peso', unidade: 'kg' },
};
const ORIGEM_FAIXA = { medico: 'pelo médico', familia: 'pela família/cuidador' };

const fmtData = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
function d(v) { return v ? fmtData.format(new Date(v)) : '—'; }
function dh(v) { return v ? fmtDataHora.format(new Date(v)) : '—'; }
function dataSimples(v) {
  if (!v) return '—';
  const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
  const [y, m, dd] = s.split('-');
  return `${dd}/${m}/${y}`;
}
function n(v) {
  if (v == null) return '—';
  const x = Number(v);
  return Number.isInteger(x) ? String(x) : x.toFixed(1).replace('.', ',');
}

function hojeSP() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

/** Valida e normaliza o período (YYYY-MM-DD, fuso do app). Padrão: últimos 30 dias. */
function normalizarPeriodo(inicio, fim) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const f = fim && re.test(fim) ? fim : hojeSP();
  let i = inicio && re.test(inicio) ? inicio : null;
  if (!i) {
    const dt = new Date(`${f}T12:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - 29);
    i = dt.toISOString().slice(0, 10);
  }
  const di = new Date(`${i}T00:00:00Z`);
  const df = new Date(`${f}T00:00:00Z`);
  if (Number.isNaN(di.getTime()) || Number.isNaN(df.getTime()) || di > df) {
    const err = new Error('Período inválido.');
    err.status = 400;
    err.code = 'validation_error';
    throw err;
  }
  if ((df - di) / 86400000 > MAX_DIAS) {
    const err = new Error(`O período pode ter no máximo ${MAX_DIAS} dias.`);
    err.status = 400;
    err.code = 'validation_error';
    throw err;
  }
  return { inicio: i, fim: f };
}

async function coletarDados(pacienteId, periodo) {
  const p = { pid: pacienteId, inicio: periodo.inicio, fim: periodo.fim, tz: TZ };
  const INI = '(CAST(:inicio AS date)::timestamp AT TIME ZONE :tz)';
  const FIM = '((CAST(:fim AS date) + 1)::timestamp AT TIME ZONE :tz)';
  const [pac] = await query(
    `SELECT id, nome, data_nascimento, sexo, tipo_sanguineo, alergias, diagnostico_principal
     FROM pacientes WHERE id = :pid`,
    p
  );
  if (!pac) return null;
  const remedios = await query(
    `SELECT r.id, r.nome_comercial, r.principio_ativo, r.concentracao, r.forma_farmaceutica,
            r.quantidade_administrar, r.periodo_horario, r.intervalo_horas, r.hora_exata, r.uso_continuo,
            r.instrucoes_uso, r.status,
            COUNT(md.id) FILTER (WHERE md.status = 'tomada') AS tomadas,
            COUNT(md.id) FILTER (WHERE md.status = 'pulada') AS puladas,
            COUNT(md.id) FILTER (WHERE md.status = 'pendente') AS sem_confirmacao
     FROM remedios r
     LEFT JOIN medicamento_doses md ON md.remedio_id = r.id AND md.paciente_id = r.paciente_id
       AND md.data_hora >= ${INI} AND md.data_hora < LEAST(${FIM}, NOW())
     WHERE r.paciente_id = :pid AND COALESCE(r.status, 'ativo') <> 'inativo'
     GROUP BY r.id
     ORDER BY r.nome_comercial`,
    p
  );
  const sinais = await query(
    `SELECT tipo, valor, sistolica, diastolica, medido_em
     FROM sinais_vitais
     WHERE paciente_id = :pid AND medido_em >= ${INI} AND medido_em < ${FIM}
     ORDER BY medido_em ASC
     LIMIT 5000`,
    p
  );
  const faixasRows = await query(
    `SELECT tipo, valor_min, valor_max, sistolica_min, sistolica_max, diastolica_min, diastolica_max, origem
     FROM sinais_vitais_faixas WHERE paciente_id = :pid`,
    p
  );
  const faixas = Object.fromEntries(faixasRows.map((f) => [f.tipo, f]));
  const registros = await query(
    `SELECT data_registro, tipo, titulo, descricao, prioridade, status
     FROM inicio_registros
     WHERE paciente_id = :pid AND data_registro >= ${INI} AND data_registro < ${FIM}
     ORDER BY data_registro DESC
     LIMIT 40`,
    p
  );
  const exames = await query(
    `SELECT data_documento, tipo, titulo, especialidade, observacoes
     FROM exames_receitas
     WHERE paciente_id = :pid
       AND (data_documento IS NULL OR data_documento >= CAST(:inicio AS date) - 180)
       AND (data_documento IS NULL OR data_documento <= CAST(:fim AS date))
     ORDER BY data_documento DESC NULLS LAST, id DESC
     LIMIT 40`,
    p
  );
  return { paciente: pac, periodo, remedios, sinais, faixas, registros, exames };
}

function foraDaFaixa(s, f) {
  if (!f) return false;
  if (s.tipo === 'pressao') {
    return (f.sistolica_min != null && s.sistolica < f.sistolica_min)
      || (f.sistolica_max != null && s.sistolica > f.sistolica_max)
      || (f.diastolica_min != null && s.diastolica < f.diastolica_min)
      || (f.diastolica_max != null && s.diastolica > f.diastolica_max);
  }
  const v = Number(s.valor);
  return (f.valor_min != null && v < Number(f.valor_min)) || (f.valor_max != null && v > Number(f.valor_max));
}

function textoFaixa(tipo, f) {
  if (!f) return null;
  const quem = ORIGEM_FAIXA[f.origem] || 'pelo usuário';
  if (tipo === 'pressao') {
    const s = [f.sistolica_min ?? '…', f.sistolica_max ?? '…'].join('–');
    const di = [f.diastolica_min ?? '…', f.diastolica_max ?? '…'].join('–');
    return `Faixa definida ${quem}: sistólica ${s}, diastólica ${di} mmHg`;
  }
  return `Faixa definida ${quem}: ${n(f.valor_min ?? null)}–${n(f.valor_max ?? null)} ${TIPOS[tipo]?.unidade || ''}`
    .replace('—–', '… –').replace('–—', '– …');
}

function idade(nasc) {
  if (!nasc) return null;
  const s = nasc instanceof Date ? nasc.toISOString().slice(0, 10) : String(nasc).slice(0, 10);
  const [y, m, dd] = s.split('-').map(Number);
  const hoje = hojeSP().split('-').map(Number);
  let a = hoje[0] - y;
  if (hoje[1] < m || (hoje[1] === m && hoje[2] < dd)) a -= 1;
  return a;
}

const COR = { ink: '#16302f', cinza: '#5b6b6a', linha: '#d7e3e2', faixa: '#e8f1f0', serie: '#1f6f6b', serie2: '#8a5a00' };

function gerarPdf(dados) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      info: { Title: 'Relatório VitaLink', Author: 'VitaLink', Producer: 'VitaLink' },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 100;
    const L = 50;
    const geradoEm = dh(new Date());
    const { paciente: pac, periodo } = dados;

    function garantir(h) {
      if (doc.y + h > doc.page.height - 70) doc.addPage();
    }
    function titulo(t) {
      garantir(40);
      doc.moveDown(0.6);
      doc.font('Helvetica-Bold').fontSize(13).fillColor(COR.ink).text(t, L, doc.y);
      const y = doc.y + 2;
      doc.moveTo(L, y).lineTo(L + W, y).lineWidth(0.7).strokeColor(COR.linha).stroke();
      doc.moveDown(0.4);
    }
    function texto(t, opts = {}) {
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10)
        .fillColor(opts.color || COR.ink).text(t, L, doc.y, { width: W, ...opts.pdf });
    }
    function vazio(t) {
      texto(t, { color: COR.cinza, size: 9.5 });
    }
    /** Tabela simples com quebra de página e cabeçalho repetido. */
    function tabela(cols, linhas) {
      const total = cols.reduce((s, c) => s + c.w, 0);
      const esc = W / total;
      const drawHeader = () => {
        let x = L;
        const y = doc.y;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COR.cinza);
        const hh = Math.max(...cols.map((c) => doc.heightOfString(c.t, { width: c.w * esc - 4 })), 10);
        cols.forEach((c) => { doc.text(c.t, x + 2, y, { width: c.w * esc - 4 }); x += c.w * esc; });
        doc.y = y + hh + 3;
        doc.moveTo(L, doc.y - 2).lineTo(L + W, doc.y - 2).lineWidth(0.5).strokeColor(COR.linha).stroke();
      };
      garantir(30);
      drawHeader();
      for (const row of linhas) {
        doc.font('Helvetica').fontSize(8.5);
        const hs = cols.map((c, i) => doc.heightOfString(String(row[i] ?? ''), { width: c.w * esc - 4 }));
        const h = Math.max(...hs, 10) + 4;
        if (doc.y + h > doc.page.height - 70) {
          doc.addPage();
          drawHeader();
        }
        let x = L;
        const y = doc.y;
        cols.forEach((c, i) => {
          const cell = row[i];
          const marcado = cell && typeof cell === 'object';
          doc.font(marcado ? 'Helvetica-Bold' : 'Helvetica').fillColor(COR.ink)
            .text(String(marcado ? cell.t : cell ?? ''), x + 2, y + 2, { width: c.w * esc - 4 });
          x += c.w * esc;
        });
        doc.y = y + h;
        doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(0.3).strokeColor(COR.linha).stroke();
      }
      doc.x = L;
      doc.moveDown(0.3);
    }
    function grafico(tipo, pontos, faixa) {
      if (pontos.length < 2) return;
      const H = 110;
      garantir(H + 30);
      const x0 = L + 34;
      const w = W - 40;
      const y0 = doc.y + 4;
      const vals = [];
      for (const s of pontos) {
        if (tipo === 'pressao') vals.push(s.sistolica, s.diastolica);
        else vals.push(Number(s.valor));
      }
      const limites = [];
      if (faixa) {
        if (tipo === 'pressao') limites.push(faixa.sistolica_min, faixa.sistolica_max, faixa.diastolica_min, faixa.diastolica_max);
        else limites.push(faixa.valor_min, faixa.valor_max);
      }
      const todos = [...vals, ...limites.filter((v) => v != null).map(Number)];
      let min = Math.min(...todos);
      let max = Math.max(...todos);
      if (max === min) { max += 1; min -= 1; }
      const pad = (max - min) * 0.1;
      min -= pad; max += pad;
      const t0 = new Date(pontos[0].medido_em).getTime();
      const t1 = new Date(pontos[pontos.length - 1].medido_em).getTime();
      const X = (t) => x0 + (t1 === t0 ? w / 2 : ((t - t0) / (t1 - t0)) * w);
      const Y = (v) => y0 + H - ((v - min) / (max - min)) * H;
      doc.rect(x0, y0, w, H).lineWidth(0.5).strokeColor(COR.linha).stroke();
      // Faixa definida pelo usuário: sombreado neutro.
      const banda = (lo, hi) => {
        const a = Y(hi != null ? Number(hi) : max);
        const b = Y(lo != null ? Number(lo) : min);
        doc.rect(x0, a, w, b - a).fillOpacity(1).fill(COR.faixa);
      };
      if (faixa) {
        if (tipo === 'pressao') {
          if (faixa.sistolica_min != null || faixa.sistolica_max != null) banda(faixa.sistolica_min, faixa.sistolica_max);
        } else if (faixa.valor_min != null || faixa.valor_max != null) banda(faixa.valor_min, faixa.valor_max);
      }
      doc.font('Helvetica').fontSize(7).fillColor(COR.cinza);
      doc.text(n(max), L, y0 - 3, { width: 30, align: 'right' });
      doc.text(n(min), L, y0 + H - 5, { width: 30, align: 'right' });
      doc.text(d(pontos[0].medido_em), x0, y0 + H + 3);
      doc.text(d(pontos[pontos.length - 1].medido_em), x0 + w - 60, y0 + H + 3, { width: 60, align: 'right' });
      const serie = (getter, cor) => {
        pontos.forEach((s, i) => {
          const x = X(new Date(s.medido_em).getTime());
          const y = Y(getter(s));
          if (i === 0) doc.moveTo(x, y); else doc.lineTo(x, y);
        });
        doc.lineWidth(1).strokeColor(cor).stroke();
        pontos.forEach((s) => {
          const x = X(new Date(s.medido_em).getTime());
          const y = Y(getter(s));
          if (foraDaFaixa(s, faixa)) doc.circle(x, y, 2.6).lineWidth(0.9).strokeColor(COR.ink).stroke();
          else doc.circle(x, y, 1.4).fill(cor);
        });
      };
      if (tipo === 'pressao') {
        serie((s) => s.sistolica, COR.serie);
        serie((s) => s.diastolica, COR.serie2);
      } else serie((s) => Number(s.valor), COR.serie);
      doc.y = y0 + H + 14;
      doc.x = L;
      doc.font('Helvetica').fontSize(7.5).fillColor(COR.cinza).text(
        `${tipo === 'pressao' ? 'Linha verde: sistólica; linha marrom: diastólica. ' : ''}`
        + `${faixa ? `Área sombreada: faixa definida pelo usuário${tipo === 'pressao' ? ' (sistólica)' : ''}; círculo vazado: fora da faixa definida.` : ''}`,
        L, doc.y, { width: W }
      );
      doc.moveDown(0.3);
    }

    // Cabeçalho
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COR.serie).text('VitaLink', L, 45);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COR.ink).text('Relatório para a consulta médica', L, doc.y + 2);
    doc.font('Helvetica').fontSize(9.5).fillColor(COR.cinza)
      .text(`Período: ${dataSimples(periodo.inicio)} a ${dataSimples(periodo.fim)}   ·   Gerado em ${geradoEm} (horário de Brasília)`, L, doc.y + 2);
    doc.moveDown(0.3);
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(COR.cinza).text(
      'Informações registradas pelo paciente, familiares ou cuidadores no aplicativo. Não é laudo nem diagnóstico; '
      + 'cabe ao profissional de saúde interpretá-las.',
      L, doc.y, { width: W }
    );

    titulo('Identificação');
    const id = idade(pac.data_nascimento);
    texto(`Nome: ${pac.nome}`, { bold: true });
    texto([
      `Nascimento: ${dataSimples(pac.data_nascimento)}${id != null ? ` (${id} anos)` : ''}`,
      pac.sexo ? `Sexo: ${pac.sexo}` : null,
      pac.tipo_sanguineo ? `Tipo sanguíneo: ${pac.tipo_sanguineo}` : null,
    ].filter(Boolean).join('   ·   '));
    texto(`Alergias informadas: ${pac.alergias || 'nenhuma informada'}`);
    if (pac.diagnostico_principal) texto(`Condição principal informada pela família: ${pac.diagnostico_principal}`);

    titulo('Medicamentos em uso e registro de doses');
    if (dados.remedios.length) {
      let tt = 0; let tp = 0; let ts = 0;
      const linhas = dados.remedios.map((r) => {
        const t = Number(r.tomadas); const pu = Number(r.puladas); const s = Number(r.sem_confirmacao);
        tt += t; tp += pu; ts += s;
        const posologia = [
          r.quantidade_administrar,
          r.intervalo_horas ? `a cada ${r.intervalo_horas}h` : null,
          r.hora_exata ? `às ${String(r.hora_exata).slice(0, 5)}` : null,
          r.periodo_horario,
          r.uso_continuo ? 'uso contínuo' : null,
        ].filter(Boolean).join(', ');
        const total = t + pu + s;
        return [
          [r.nome_comercial, r.concentracao].filter(Boolean).join(' '),
          r.principio_ativo || '—',
          posologia || '—',
          total ? `${t} / ${pu} / ${s}` : 'sem doses no período',
        ];
      });
      tabela(
        [{ t: 'Medicamento', w: 30 }, { t: 'Princípio ativo', w: 22 }, { t: 'Como usa', w: 28 }, { t: 'Tomadas / puladas / sem confirmação', w: 20 }],
        linhas
      );
      const tot = tt + tp + ts;
      vazio(tot
        ? `No período, ${tot} doses programadas até agora: ${tt} registradas como tomadas, ${tp} puladas e ${ts} sem confirmação no aplicativo `
          + `(${Math.round((tt / tot) * 100)}% registradas como tomadas). "Sem confirmação" significa apenas que ninguém marcou a dose no app.`
        : 'Não há doses programadas no período (lembretes não configurados ou sem horários).');
    } else vazio('Nenhum medicamento ativo cadastrado.');

    titulo('Sinais vitais registrados');
    const porTipo = {};
    for (const s of dados.sinais) (porTipo[s.tipo] ||= []).push(s);
    const tiposPresentes = Object.keys(TIPOS).filter((t) => porTipo[t]?.length);
    if (!tiposPresentes.length) vazio('Nenhum sinal vital registrado no período.');
    for (const tipo of tiposPresentes) {
      const lst = porTipo[tipo];
      const f = dados.faixas[tipo];
      const cfg = TIPOS[tipo];
      garantir(lst.length >= 2 ? 200 : 60);
      doc.moveDown(0.3);
      texto(`${cfg.label} (${cfg.unidade}) — ${lst.length} registro(s)`, { bold: true, size: 10.5 });
      let resumo;
      if (tipo === 'pressao') {
        const ss = lst.map((s) => s.sistolica); const ds = lst.map((s) => s.diastolica);
        const media = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
        resumo = `Média ${media(ss)}/${media(ds)} · menor ${Math.min(...ss)}/${Math.min(...ds)} · maior ${Math.max(...ss)}/${Math.max(...ds)} mmHg`;
      } else {
        const vs = lst.map((s) => Number(s.valor));
        resumo = `Média ${n(vs.reduce((x, y) => x + y, 0) / vs.length)} · menor ${n(Math.min(...vs))} · maior ${n(Math.max(...vs))} ${cfg.unidade}`;
      }
      texto(resumo, { size: 9.5 });
      const tf = textoFaixa(tipo, f);
      if (tf) {
        const fora = lst.filter((s) => foraDaFaixa(s, f)).length;
        texto(`${tf}. Registros fora da faixa definida: ${fora} de ${lst.length}.`, { size: 9, color: COR.cinza });
      }
      grafico(tipo, lst, f);
      const ultimos = lst.slice(-12).reverse();
      tabela(
        [{ t: 'Data/hora', w: 30 }, { t: 'Valor', w: 30 }, { t: 'Observação', w: 40 }],
        ultimos.map((s) => {
          const v = tipo === 'pressao' ? `${s.sistolica}/${s.diastolica}` : n(s.valor);
          const fora = foraDaFaixa(s, f);
          return [dh(s.medido_em), fora ? { t: `${v} *` } : v, fora ? `fora da faixa definida ${ORIGEM_FAIXA[f.origem] || 'pelo usuário'}` : ''];
        })
      );
    }

    titulo('Anotações do período (linha do tempo)');
    if (dados.registros.length) {
      tabela(
        [{ t: 'Data', w: 18 }, { t: 'Tipo', w: 14 }, { t: 'Anotação', w: 68 }],
        dados.registros.map((r) => [
          dh(r.data_registro),
          r.tipo || '—',
          [r.titulo, r.descricao ? String(r.descricao).slice(0, 400) : null].filter(Boolean).join(' — '),
        ])
      );
    } else vazio('Nenhuma anotação no período.');

    titulo('Exames e receitas cadastrados');
    if (dados.exames.length) {
      tabela(
        [{ t: 'Data', w: 15 }, { t: 'Tipo', w: 15 }, { t: 'Título', w: 40 }, { t: 'Especialidade', w: 30 }],
        dados.exames.map((e) => [dataSimples(e.data_documento), e.tipo || '—', e.titulo || '—', e.especialidade || '—'])
      );
      vazio('Os arquivos dos exames ficam no aplicativo e não são incluídos neste relatório.');
    } else vazio('Nenhum exame ou receita cadastrado no período.');

    // Rodapé em todas as páginas
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i);
      const y = doc.page.height - 45;
      doc.page.margins.bottom = 0;
      doc.moveTo(L, y - 4).lineTo(L + W, y - 4).lineWidth(0.4).strokeColor(COR.linha).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor(COR.cinza).text(
        `Gerado pelo VitaLink em ${geradoEm}. Registro informativo — não é diagnóstico, laudo nem prescrição. `
        + `Página ${i - range.start + 1} de ${range.count}.`,
        L, y, { width: W, align: 'center', lineBreak: true }
      );
    }
    doc.end();
  });
}

module.exports = { normalizarPeriodo, coletarDados, gerarPdf, foraDaFaixa, MAX_DIAS };
