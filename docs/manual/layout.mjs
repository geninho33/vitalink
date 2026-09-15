import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderChapters } from './conteudo.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(__dirname, 'screenshots');
const SHOTS_PDF = path.join(SHOTS, 'pdf');
const LOGO_OUT = path.join(SHOTS, 'logo.png');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createFigs() {
  const counts = {};
  const index = [];

  function fig(chap, id, title) {
    const scaled = path.join(SHOTS_PDF, `${id}.jpg`);
    const original = path.join(SHOTS, `${id}.jpg`);
    if (!fs.existsSync(scaled) && !fs.existsSync(original)) return '';
    const file = fs.existsSync(scaled) ? `screenshots/pdf/${id}.jpg` : `screenshots/${id}.jpg`;
    counts[chap] = (counts[chap] || 0) + 1;
    const num = `${chap}.${counts[chap]}`;
    index.push({ num, title });
    return `
    <figure class="shot">
      <img src="${file}" alt="${escapeHtml(title)}" />
      <figcaption>Figura ${num} — ${escapeHtml(title)}</figcaption>
    </figure>`;
  }

  function pair(chap, items) {
    const inner = items.map((it) => fig(chap, it.id, it.title)).join('');
    if (!inner.replace(/\s/g, '')) return '';
    return `<div class="pair">${inner}</div>`;
  }

  function indexHtml() {
    if (!index.length) return '';
    const rows = index
      .map((f) => `<tr><td>Figura ${escapeHtml(f.num)}</td><td>${escapeHtml(f.title)}</td></tr>`)
      .join('');
    return `<h2 id="figuras">Índice de figuras</h2>
      <table class="fields">
        <thead><tr><th>Nº</th><th>Título</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  return { fig, pair, indexHtml };
}

export function buildHtml(capturedAt, baseUrl) {
  const logo = fs.existsSync(LOGO_OUT) ? 'screenshots/logo.png' : '';
  const h = createFigs();
  const chapters = renderChapters(h);
  const figIndex = h.indexHtml();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Manual do Sistema VitaLink</title>
  <style>
    :root {
      --vita: #0d7377;
      --ink: #1a2e35;
      --muted: #5b7270;
      --line: #c5d5d4;
      --paper: #f7fbfb;
    }
    * { box-sizing: border-box; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      margin: 0;
      color: var(--ink);
      font: 11pt/1.65 "Segoe UI", Calibri, Arial, sans-serif;
    }
    h1 { font-size: 22pt; color: var(--vita); margin: 0 0 10pt; line-height: 1.25; }
    h2 {
      font-size: 15pt;
      color: var(--vita);
      border-bottom: 2px solid var(--line);
      padding-bottom: 6pt;
      margin: 26pt 0 12pt;
      page-break-after: avoid;
    }
    h3 { font-size: 12pt; color: #0a5c60; margin: 16pt 0 8pt; page-break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
    ol, ul { padding-left: 1.25em; margin: 8pt 0 12pt; }
    li { margin: 3pt 0; }
    table { width: 100%; border-collapse: collapse; margin: 8pt 0 14pt; font-size: 9.5pt; }
    th, td { border: 1px solid var(--line); padding: 6pt 8pt; text-align: left; vertical-align: top; }
    th { background: #e7f4f4; color: var(--vita); }
    .fields th:nth-child(3), .fields td:nth-child(3) { width: 16%; }
    .cover {
      min-height: 240mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
      background: linear-gradient(180deg, #eef6f7 0%, #ffffff 55%);
    }
    .cover img { width: 190px; height: auto; margin-bottom: 18pt; }
    .cover h1 { font-size: 28pt; }
    .cover .sub { color: var(--muted); font-size: 13pt; max-width: 145mm; line-height: 1.5; }
    .meta { margin-top: 28pt; font-size: 10pt; color: var(--muted); line-height: 1.6; }
    .toc { page-break-after: always; }
    .toc a { color: var(--ink); text-decoration: none; }
    .toc li { margin: 5pt 0; }
    figure.shot {
      width: 63.36%;
      margin: 12pt auto 18pt;
      page-break-inside: avoid;
    }
    figure.shot img {
      width: 100%;
      height: auto;
      border: 1px solid #b7c9c8;
      border-radius: 6px;
      display: block;
      background: #fff;
      box-shadow: 0 1px 3px rgba(26, 46, 53, 0.08);
    }
    figure.shot figcaption {
      font-size: 9pt;
      color: var(--muted);
      margin-top: 5pt;
      font-style: italic;
      text-align: center;
      line-height: 1.4;
    }
    .pair {
      display: flex;
      gap: 8pt;
      width: 63.36%;
      margin: 12pt auto 18pt;
      page-break-inside: avoid;
    }
    .pair figure.shot { flex: 1; width: auto; margin: 0; }
    .box {
      border-radius: 6px;
      padding: 8pt 11pt;
      margin: 10pt 0 14pt;
      font-size: 10.5pt;
      page-break-inside: avoid;
    }
    .box p { margin: 0; }
    .box.tip { background: #eef8f4; border-left: 4px solid #0d9488; }
    .box.warn { background: #fff7ed; border-left: 4px solid #d97706; }
    .box.note { background: #f4f8fb; border-left: 4px solid #0d7377; }
    .small { font-size: 9.5pt; color: var(--muted); }
    code { font-size: 9.5pt; background: #eef4f4; padding: 1px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <section class="cover">
    ${logo ? `<img src="${logo}" alt="VitaLink" />` : ''}
    <h1>Manual do Sistema</h1>
    <p class="sub">Guia operacional ilustrado — família, cuidador, médico e administrador. Versão reformulada com passo a passo, tabelas de campos e figuras numeradas.</p>
    <p class="meta">
      Versão 2.0 · ${escapeHtml(capturedAt)}<br />
      Ambiente fotografado: ${escapeHtml(baseUrl)}<br />
      Perfil das capturas: Administrador<br />
      Imagens: +20% em relação à edição anterior, proporção original preservada
    </p>
  </section>

  <section class="toc">
    <h2>Sumário</h2>
    <ol>
      <li><a href="#s1">O que é o VitaLink</a></li>
      <li><a href="#s2">Acesso à conta</a></li>
      <li><a href="#s3">Primeiro uso e cadastro do paciente</a></li>
      <li><a href="#s4">Como a tela está organizada</a></li>
      <li><a href="#s5">Perfis e permissões</a></li>
      <li><a href="#s6">Painel (Dashboard)</a></li>
      <li><a href="#s7">Início — rotina do paciente ativo</a></li>
      <li><a href="#s8">Cadastros de saúde</a></li>
      <li><a href="#s9">Agenda, consultas, rotina e linha do tempo</a></li>
      <li><a href="#s10">Administração</a></li>
      <li><a href="#s11">Meus dados e termos</a></li>
      <li><a href="#s12">Perguntas frequentes gerais</a></li>
      <li><a href="#indice">Índice remissivo das telas</a></li>
      <li><a href="#figuras">Índice de figuras</a></li>
    </ol>
    <div class="box note"><p><strong>📌 Nota.</strong> Os menus dependem do <strong>perfil</strong> da conta. Se um item não aparecer, o administrador libera a leitura em <strong>Administração → Acessos</strong>.</p></div>
  </section>

  ${chapters}
  ${figIndex}
  <p class="small">Documentação técnica (API, banco, arquitetura) permanece na pasta docs/. Prints capturados a partir de ${escapeHtml(baseUrl)}.</p>
</body>
</html>`;
}
