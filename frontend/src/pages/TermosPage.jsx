import PageHeader, { PlaceholderCard } from '../components/PageHeader';

export default function TermosPage() {
  return (
    <div>
      <PageHeader
        title="Termos e Condições de Uso e Política de Privacidade"
        description="Documento informativo do VitaLink. Substitua este texto pelo documento oficial quando disponível."
      />
      <PlaceholderCard>
        <article className="prose prose-sm max-w-none text-ink">
          <h2 className="font-display text-xl font-bold text-aqua-deep">1. Termos e Condições de Uso</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-health">
            O VitaLink é uma plataforma de prontuário eletrônico e apoio ao cuidado contínuo de
            pacientes, cuidadores e responsáveis. Ao utilizar o sistema, você concorda em fornecer
            informações verdadeiras, manter a confidencialidade de suas credenciais e utilizar os
            dados exclusivamente para fins de cuidado em saúde autorizados.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-health">
            O acesso é controlado por perfil (Administrador, Responsável, Cuidador e Paciente). Cada
            usuário deve respeitar os limites de permissão atribuídos e a finalidade do tratamento
            dos dados.
          </p>

          <h2 className="mt-6 font-display text-xl font-bold text-aqua-deep">
            2. Política de Privacidade (LGPD)
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-health">
            Tratamos dados pessoais e dados sensíveis de saúde com base na necessidade do cuidado e
            nas bases legais aplicáveis da Lei Geral de Proteção de Dados (LGPD). As informações são
            protegidas por autenticação, controle de acesso por perfil e registro de auditoria das
            operações relevantes.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-health">
            Você pode solicitar informações sobre o tratamento dos seus dados, correção de cadastro
            e esclarecimentos pelo canal de suporte do responsável pelo sistema. Dados de pacientes
            só devem ser acessados por usuários devidamente vinculados (Responsáveis, Cuidadores ou
            o próprio Paciente), conforme as regras de vínculo do VitaLink.
          </p>

          <h2 className="mt-6 font-display text-xl font-bold text-aqua-deep">3. Contato</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-health">
            Site: <a href="https://www.vitalink.app.br" className="font-semibold text-aqua hover:underline">www.vitalink.app.br</a>
          </p>
          <p className="mt-4 rounded-xl border border-[#d0e4ef] bg-vita-soft/40 px-3 py-2 text-xs text-ink">
            Nota: este conteúdo é um placeholder operacional. Substitua pelo texto integral do
            documento anexado à especificação assim que disponibilizado.
          </p>
        </article>
      </PlaceholderCard>
    </div>
  );
}
