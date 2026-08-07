/**
 * Abre janela de impressão paisagem para lista ou estoque de medicamentos.
 * mode: 'lista' | 'estoque'
 */
export function printMedicamentos(rows = [], { mode = 'lista', pacienteNome = '' } = {}) {
  const now = new Date().toLocaleString('pt-BR');
  const title =
    mode === 'estoque' ? 'Estoque de Medicamentos' : 'Lista de Medicamentos';
  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}vitalink-logo.png`;

  const headCols =
    mode === 'estoque'
      ? `<th>Medicamento</th><th>Dose</th><th>Estoque</th><th>Uso/dia*</th><th>Dias restantes</th><th>Reposição</th>`
      : `<th>#</th><th>Medicamento</th><th>Princípio</th><th>Dose</th><th>Estoque</th><th>Indicação</th><th>Prescritor</th>`;

  const body = (rows || [])
    .slice(0, 20)
    .map((r, i) => {
      const dose = r.quantidade_administrar || '—';
      const estoque = Number(r.quantidade_estoque ?? 0);
      const perDay = parseFloat(String(dose).replace(',', '.').match(/[\d.]+/)?.[0] || '1') || 1;
      const days = perDay > 0 ? Math.floor(estoque / perDay) : '—';
      const reposicao =
        typeof days === 'number'
          ? days <= 7
            ? 'Urgente'
            : days <= 15
              ? 'Em breve'
              : 'OK'
          : '—';
      if (mode === 'estoque') {
        return `<tr>
          <td>${esc(r.nome_comercial)}</td>
          <td>${esc(dose)}</td>
          <td>${esc(estoque)}</td>
          <td>${esc(perDay)}</td>
          <td>${esc(days)}</td>
          <td class="${reposicao === 'Urgente' ? 'urgent' : reposicao === 'Em breve' ? 'soon' : ''}">${esc(reposicao)}</td>
        </tr>`;
      }
      return `<tr>
        <td>${i + 1}</td>
        <td>${esc(r.nome_comercial)}</td>
        <td>${esc(r.principio_ativo || '—')}</td>
        <td>${esc(dose)}</td>
        <td>${esc(estoque)}</td>
        <td>${esc(r.indicacao || '—')}</td>
        <td>${esc(r.medico_prescritor_nome || '—')}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title} — VitaLink</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; }
    header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0077B6; padding-bottom: 8px; margin-bottom: 10px; }
    header img { height: 36px; }
    header .meta { text-align: right; line-height: 1.35; }
    h1 { font-size: 16px; margin: 0 0 4px; color: #0077B6; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #cfe0df; padding: 4px 6px; text-align: left; vertical-align: top; line-height: 1.25; }
    th { background: #e8f4f8; font-size: 10px; text-transform: uppercase; letter-spacing: .02em; }
    .urgent { color: #b91c1c; font-weight: 700; }
    .soon { color: #b45309; font-weight: 600; }
    footer { margin-top: 10px; border-top: 1px solid #cfe0df; padding-top: 6px; display: flex; justify-content: space-between; font-size: 10px; color: #475569; }
    .note { margin-top: 6px; font-size: 9px; color: #64748b; }
  </style>
</head>
<body>
  <header>
    <div>
      <img src="${logoUrl}" alt="VitaLink" onerror="this.style.display='none'" />
      <h1>${title}</h1>
      ${pacienteNome ? `<div><strong>Paciente:</strong> ${esc(pacienteNome)}</div>` : ''}
    </div>
    <div class="meta">
      <div>www.vitalink.app.br</div>
      <div>Impresso em ${esc(now)}</div>
    </div>
  </header>
  <table>
    <thead><tr>${headCols}</tr></thead>
    <tbody>${body || '<tr><td colspan="7">Nenhum medicamento.</td></tr>'}</tbody>
  </table>
  ${mode === 'estoque' ? '<p class="note">* Uso/dia estimado a partir da quantidade a administrar. Reposição: Urgente ≤7 dias · Em breve ≤15 dias.</p>' : ''}
  <footer>
    <span>VitaLink — cuidado contínuo</span>
    <span>Página 1 · até 20 itens</span>
  </footer>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=700');
  if (!w) {
    window.alert('Permita pop-ups para imprimir.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
