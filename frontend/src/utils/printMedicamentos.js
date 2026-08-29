/**
 * Impressão da lista/estoque de medicamentos.
 * Evita window.open(..., 'noopener') — o Chrome devolve null e o diálogo nunca abre.
 * Quando os dados ainda precisam ser carregados, abre a janela no clique (gesto do usuário)
 * e só então preenche o HTML, para o bloqueador de pop-up não interceptar.
 */
export function printMedicamentos(rows = [], options = {}) {
  const html = buildPrintHtml(rows, options);
  deliverPrintHtml(html);
}

export async function printMedicamentosFromLoader(loadRows, options = {}) {
  const preview = window.open('', '_blank', 'width=1100,height=700');
  if (preview && !preview.closed) {
    try {
      preview.document.write(
        '<p style="font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#334155">Preparando impressão…</p>'
      );
    } catch {
      /* ignore */
    }
  }

  try {
    const rows = await loadRows();
    const html = buildPrintHtml(rows, options);
    if (preview && !preview.closed) {
      preview.document.open();
      preview.document.write(html);
      preview.document.close();
      return;
    }
    deliverPrintHtml(html);
  } catch (err) {
    if (preview && !preview.closed) preview.close();
    throw err;
  }
}

function deliverPrintHtml(html) {
  const preview = window.open('', '_blank', 'width=1100,height=700');
  if (preview && !preview.closed) {
    try {
      preview.document.open();
      preview.document.write(html);
      preview.document.close();
      return;
    } catch {
      try {
        preview.close();
      } catch {
        /* ignore */
      }
    }
  }
  printViaIframe(html);
}

function printViaIframe(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    window.alert('Não foi possível abrir a impressão. Verifique o bloqueador de pop-ups.');
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const win = iframe.contentWindow;
  const cleanup = () => {
    setTimeout(() => iframe.remove(), 500);
  };
  const trigger = () => {
    try {
      win.focus();
      win.print();
    } catch {
      window.alert('Não foi possível abrir a impressão. Verifique o bloqueador de pop-ups.');
    }
    if (win.onafterprint !== undefined) {
      win.onafterprint = cleanup;
    }
    setTimeout(cleanup, 60_000);
  };
  if (win.document.readyState === 'complete') {
    setTimeout(trigger, 250);
  } else {
    iframe.onload = () => setTimeout(trigger, 250);
  }
}

function buildPrintHtml(rows = [], { mode = 'lista', pacienteNome = '' } = {}) {
  const now = new Date().toLocaleString('pt-BR');
  const title =
    mode === 'estoque' ? 'Estoque de Medicamentos' : 'Lista de Medicamentos';
  const logoUrl = `${window.location.origin}${import.meta.env.BASE_URL}vitalink-logo.png`;

  const headCols =
    mode === 'estoque'
      ? `<th>Medicamento</th><th>Dose</th><th>Total de comprimidos / Total em mL</th><th>Uso/dia*</th><th>Dias restantes</th><th>Reposição</th>`
      : `<th>#</th><th>Medicamento</th><th>Princípio</th><th>Dose</th><th>Total de comprimidos / Total em mL</th><th>Indicação</th><th>Prescritor</th>`;

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

  return `<!DOCTYPE html>
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
  <script>window.onload = function () { window.focus(); window.print(); };</script>
</body>
</html>`;
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
