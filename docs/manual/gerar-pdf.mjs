/**
 * Captura telas do VitaLink (homologação) e gera docs/Manual_do_Sistema.pdf
 *
 * Uso:
 *   cd docs/manual
 *   npm install
 *   npm run pdf
 *
 * Variáveis opcionais:
 *   MANUAL_BASE_URL   (default https://homolog.vitalink.app.br)
 *   MANUAL_EMAIL
 *   MANUAL_PASSWORD
 *   MANUAL_CHROME     caminho do chrome.exe
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { buildHtml } from './layout.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SHOTS = path.join(__dirname, 'screenshots');
const HTML_OUT = path.join(__dirname, 'manual.html');
const PDF_OUT = path.join(ROOT, 'docs', 'Manual_do_Sistema.pdf');
const LOGO_OUT = path.join(SHOTS, 'logo.png');

const BASE = (process.env.MANUAL_BASE_URL || 'https://homolog.vitalink.app.br').replace(/\/$/, '');
const EMAIL = process.env.MANUAL_EMAIL || 'admin@vitalink.local';
const PASSWORD = process.env.MANUAL_PASSWORD || 'Admin@Vitalink1';
const CHROME =
  process.env.MANUAL_CHROME ||
  (fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe');

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1.25 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const PUBLIC_PAGES = [
  { id: 'login', route: '/login', title: 'Login', caption: 'Tela inicial de acesso ao sistema.', highlight: ['Entrar no Sistema'] },
  { id: 'registro', route: '/registro', title: 'Criar conta', caption: 'Cadastro de novo usuário (maiores de 18 anos).', highlight: ['Cadastrar'] },
  { id: 'esqueci', route: '/esqueci-senha', title: 'Esqueci a senha', caption: 'Solicitação do link de redefinição por e-mail.' },
];

const AUTH_PAGES = [
  { id: 'dashboard', route: '/dashboard', title: 'Painel', caption: 'Resumo do dia, agenda e atalhos conforme o perfil.' },
  { id: 'inicio', route: '/inicio', title: 'Início — Sintomas', caption: 'Visão da semana, registro rápido e rotina do paciente ativo.' },
  { id: 'perfil', route: '/inicio/perfil', title: 'Ficha do paciente', caption: 'Dados pessoais, alergias e diagnóstico. Campos bloqueados até Editar ficha.', click: 'Editar ficha', afterId: 'perfil-edicao', afterCaption: 'Ficha desbloqueada para edição.', highlight: ['Editar ficha'], afterHighlight: ['Salvar alterações'] },
  { id: 'eventos', route: '/inicio/eventos', title: 'Eventos', caption: 'Diário de bordo: sintomas, observações e ocorrências.' },
  { id: 'especialistas', route: '/inicio/especialistas', title: 'Especialistas', caption: 'Profissionais e locais usados no cuidado.' },
  { id: 'inicio-agenda', route: '/inicio/agenda', title: 'Agenda (Início)', caption: 'Compromissos do paciente e atalho para o Google Agenda.' },
  { id: 'corpo', route: '/inicio/corpo', title: 'Corpo', caption: 'Queixas e marcações no mapa do corpo.' },
  { id: 'linha', route: '/inicio/linha', title: 'Linha do tempo (Início)', caption: 'Histórico unificado do paciente ativo.' },
  { id: 'meds', route: '/inicio/meds', title: 'Medicamentos (Início)', caption: 'Posologia, estoque, farmácia e registro de compras.' },
  { id: 'docs-inicio', route: '/inicio/docs', title: 'Exames e receitas (Início)', caption: 'Documentos clínicos do paciente ativo.' },
  { id: 'pacientes', route: '/pacientes', title: 'Pacientes', caption: 'Cadastro de pacientes, CPF, convênio e vínculos.', click: 'Novo cadastro', afterId: 'pacientes-novo', afterCaption: 'Formulário de novo paciente.', highlight: ['Novo cadastro'], afterHighlight: ['Salvar'] },
  { id: 'medicos', route: '/medicos', title: 'Médicos', caption: 'CRM, especialidade e locais de atendimento.', click: 'Novo cadastro', afterId: 'medicos-novo', afterCaption: 'Formulário de novo médico.', highlight: ['Novo cadastro'], afterHighlight: ['Salvar'] },
  { id: 'remedios', route: '/remedios', title: 'Remédios', caption: 'Catálogo de medicamentos.' },
  { id: 'exames', route: '/exames-receitas', title: 'Exames e receitas', caption: 'Documentos clínicos com anexos.', click: 'Novo documento', afterId: 'exames-novo', afterCaption: 'Inclusão de exame ou receita.', highlight: ['Novo documento'], afterHighlight: ['Salvar'] },
  { id: 'hospitais', route: '/hospitais', title: 'Hospitais, clínicas e laboratórios', caption: 'Rede de estabelecimentos (catálogo + cadastros próprios).' },
  { id: 'farmacias', route: '/farmacias', title: 'Farmácias', caption: 'Farmácias usadas nas compras de medicamentos.' },
  { id: 'empresas', route: '/empresas-cuidadoras', title: 'Empresas cuidadoras', caption: 'Prestadoras de cuidado.' },
  { id: 'cuidadores', route: '/cuidadores', title: 'Cuidadores', caption: 'Profissionais vinculados aos pacientes.' },
  { id: 'responsaveis', route: '/responsaveis', title: 'Responsáveis', caption: 'Familiares e responsáveis legais.' },
  { id: 'agenda', route: '/agenda', title: 'Agenda', caption: 'Calendário mensal e lista de compromissos.' },
  { id: 'consultas', route: '/consultas', title: 'Consultas', caption: 'Agendamento com médico, especialidade e local.', click: 'Nova consulta', afterId: 'consultas-novo', afterCaption: 'Formulário de nova consulta.', highlight: ['Nova consulta'], afterHighlight: ['Salvar'] },
  { id: 'rotina', route: '/rotina', title: 'Rotina', caption: 'Tarefas recorrentes do cuidado.' },
  { id: 'timeline', route: '/timeline', title: 'Linha do tempo', caption: 'Histórico contínuo para revisão clínica e familiar.' },
  { id: 'usuarios', route: '/usuarios', title: 'Usuários', caption: 'Contas, perfis e redefinição de senha.' },
  { id: 'perfis', route: '/perfis', title: 'Perfis', caption: 'Administrador, Médico, Cuidador, Responsável, Paciente e Autocuidado.' },
  { id: 'acessos', route: '/acessos', title: 'Acessos', caption: 'Permissões de ler, criar, editar e excluir por perfil.' },
  { id: 'auditoria', route: '/auditoria', title: 'Auditoria', caption: 'Trilha de quem fez o quê, sem gravar o conteúdo clínico completo.' },
  { id: 'meus-dados', route: '/meus-dados', title: 'Meus dados', caption: 'Dados da conta do usuário logado (não é a ficha do paciente).' },
  { id: 'termos', route: '/termos', title: 'Termos', caption: 'Termos de uso e política de privacidade.' },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function settle(page, ms = 1200) {
  try {
    await page.waitForNetworkIdle({ idleTime: 600, timeout: 10000 });
  } catch {
    /* páginas com polling não ficam idle */
  }
  await sleep(ms);
}

async function markHighlights(page, labels = []) {
  if (!labels.length) return;
  await page.evaluate((items) => {
    document.querySelectorAll('[data-vl-badge]').forEach((n) => n.remove());
    items.forEach((label, i) => {
      const el = [...document.querySelectorAll('button, a, [role="button"]')].find((e) =>
        (e.textContent || '').replace(/\s+/g, ' ').trim().includes(label)
      );
      if (!el) return;
      const pos = getComputedStyle(el).position;
      if (pos === 'static' || !pos) el.style.position = 'relative';
      el.style.outline = '3px solid #dc2626';
      el.style.outlineOffset = '3px';
      el.style.boxShadow = '0 0 0 3px rgba(220,38,38,.25)';
      const badge = document.createElement('span');
      badge.dataset.vlBadge = '1';
      badge.textContent = String(i + 1);
      Object.assign(badge.style, {
        position: 'absolute',
        top: '-11px',
        left: '-11px',
        width: '22px',
        height: '22px',
        borderRadius: '999px',
        background: '#dc2626',
        color: '#fff',
        font: '700 11px/22px Segoe UI, sans-serif',
        textAlign: 'center',
        zIndex: '10000',
        pointerEvents: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,.35)',
      });
      el.appendChild(badge);
    });
  }, labels);
}

async function shot(page, id, highlights = []) {
  if (highlights.length) await markHighlights(page, highlights);
  const dest = path.join(SHOTS, `${id}.jpg`);
  await page.screenshot({ path: dest, type: 'jpeg', quality: 82, fullPage: false });
  console.log('  ok', id);
  return dest;
}

async function clickByText(page, text) {
  return page.evaluate((t) => {
    const els = [...document.querySelectorAll('button, a, [role="button"]')];
    const el = els.find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t));
    if (!el) return false;
    el.click();
    return true;
  }, text);
}

async function closeOverlay(page) {
  await page.keyboard.press('Escape');
  await sleep(400);
}

const IMAGE_SCALE = 0.6336; // 0.528 + 20%, proporção mantida
const SHOTS_PDF = path.join(SHOTS, 'pdf');


async function downloadLogo() {
  try {
    const res = await fetch(`${BASE}/vitalink-logo.png`);
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(LOGO_OUT, buf);
  } catch {
    const local = path.join(ROOT, 'frontend', 'public', 'vitalink-logo.png');
    if (fs.existsSync(local)) fs.copyFileSync(local, LOGO_OUT);
  }
}

async function gotoApp(page, route, extraMs = 1100) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page
    .waitForFunction((r) => window.location.pathname === r, { timeout: 20000 }, route)
    .catch(() => {});
  await settle(page, extraMs);
}

async function capturePublic(page) {
  console.log('Telas públicas…');
  for (const p of PUBLIC_PAGES) {
    await gotoApp(page, p.route, 800);
    await shot(page, p.id, p.highlight);
  }
}

async function login(page) {
  await gotoApp(page, '/login', 500);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.click('input[type="email"]', { clickCount: 3 });
  await page.type('input[type="email"]', EMAIL, { delay: 15 });
  await page.click('input[type="password"]', { clickCount: 3 });
  await page.type('input[type="password"]', PASSWORD, { delay: 15 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 25000 });
  await settle(page, 1800);
  const url = page.url();
  console.log('Logado em', url);
}

async function captureAuth(page) {
  console.log('Telas autenticadas…');
  if (page.url().includes('/onboarding')) {
    await settle(page, 800);
    await shot(page, 'onboarding');
  }

  for (const p of AUTH_PAGES) {
    try {
      await gotoApp(page, p.route, p.route === '/dashboard' ? 2400 : 1200);
      if (page.url().includes('/login')) {
        console.warn('  sessão caiu em', p.route);
        await login(page);
        await gotoApp(page, p.route, 1200);
      }
      if (page.url().includes('/onboarding') && p.id !== 'dashboard') {
        await shot(page, 'onboarding');
        continue;
      }
      console.log('  rota', p.route, '→', new URL(page.url()).pathname);
      await shot(page, p.id, p.highlight);
      if (p.click) {
        await page
          .waitForFunction(
            (t) =>
              [...document.querySelectorAll('button, a')].some((e) =>
                (e.textContent || '').includes(t)
              ),
            { timeout: 8000 },
            p.click
          )
          .catch(() => {});
        const ok = await clickByText(page, p.click);
        if (ok) {
          await settle(page, 1000);
          await shot(page, p.afterId, p.afterHighlight);
          await closeOverlay(page);
        } else {
          console.warn('  botão não encontrado:', p.click, 'em', p.route);
        }
      }
    } catch (err) {
      console.warn('  falhou', p.route, err.message);
    }
  }

  try {
    await gotoApp(page, '/dashboard', 1000);
    const opened = await page.evaluate(() => {
      const btn = document.querySelector('header button[aria-haspopup="menu"]');
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (opened) {
      await sleep(400);
      await shot(page, 'menu-conta', ['Sair']);
    }
  } catch (err) {
    console.warn('  menu conta:', err.message);
  }
}

async function captureMobile(browser) {
  console.log('Telas mobile…');
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(MOBILE);
  await page.setUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  );
  try {
    await gotoApp(page, '/login', 800);
    await shot(page, 'login-mobile', ['Entrar no Sistema']);
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.type('input[type="email"]', EMAIL, { delay: 10 });
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', PASSWORD, { delay: 10 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 25000 });
    await settle(page, 1600);
    await gotoApp(page, '/inicio', 1400);
    await shot(page, 'inicio-mobile');
  } catch (err) {
    console.warn('  mobile:', err.message);
  } finally {
    await context.close();
  }
}

async function scaleShotsForPdf(browser) {
  fs.mkdirSync(SHOTS_PDF, { recursive: true });
  const files = fs.readdirSync(SHOTS).filter((f) => f.endsWith('.jpg'));
  const page = await browser.newPage();
  for (const file of files) {
    const src = path.join(SHOTS, file);
    const dest = path.join(SHOTS_PDF, file);
    const b64 = fs.readFileSync(src).toString('base64');
    const dataUrl = await page.evaluate(
      async (payload, scale) => {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${payload}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.78);
      },
      b64,
      IMAGE_SCALE
    );
    fs.writeFileSync(dest, Buffer.from(dataUrl.split(',')[1], 'base64'));
  }
  await page.close();
  console.log(`Imagens em ${Math.round(IMAGE_SCALE * 100)}% da captura original (proporção mantida).`);
}

async function printPdf(browser) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(HTML_OUT).href, { waitUntil: 'load', timeout: 60000 });
  await sleep(500);
  await page.pdf({
    path: PDF_OUT,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:8px;width:100%;padding:0 14mm;color:#5b7270;font-family:Segoe UI,Arial;">VitaLink — Manual do Sistema v2.0</div>`,
    footerTemplate: `<div style="font-size:8px;width:100%;padding:0 14mm;color:#5b7270;font-family:Segoe UI,Arial;display:flex;justify-content:space-between;"><span>Uso interno · prints das telas do sistema</span><span>Página <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    margin: { top: '16mm', bottom: '16mm', left: '12mm', right: '12mm' },
  });
  await page.close();
}

async function main() {
  const pdfOnly = process.argv.includes('--pdf-only');
  fs.mkdirSync(SHOTS, { recursive: true });
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  if (!pdfOnly) await downloadLogo();

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vitalink-manual-'));
  console.log('Chrome:', CHROME);
  if (!pdfOnly) console.log('Base:', BASE);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    ignoreHTTPSErrors: true,
    defaultViewport: DESKTOP,
    args: [
      '--ignore-certificate-errors',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      `--window-size=${DESKTOP.width},${DESKTOP.height}`,
    ],
  });

  try {
    if (!pdfOnly) {
      const page = await browser.newPage();
      await page.setViewport(DESKTOP);
      await capturePublic(page);
      await login(page);
      await captureAuth(page);
      await page.close();
      await captureMobile(browser);
    }

    await scaleShotsForPdf(browser);
    const capturedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    fs.writeFileSync(HTML_OUT, buildHtml(capturedAt, BASE), 'utf8');
    console.log('HTML:', HTML_OUT);
    await printPdf(browser);
    const size = fs.statSync(PDF_OUT).size;
    console.log('PDF:', PDF_OUT, `(${(size / 1024 / 1024).toFixed(1)} MB)`);
  } finally {
    await browser.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
