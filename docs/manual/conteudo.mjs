/**
 * Conteúdo instrucional do Manual do Sistema VitaLink (HTML do PDF).
 */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function tip(text) {
  return `<div class="box tip"><p><strong>💡 Dica prática.</strong> ${text}</p></div>`;
}
export function warn(text) {
  return `<div class="box warn"><p><strong>⚠️ Atenção.</strong> ${text}</p></div>`;
}
export function note(text) {
  return `<div class="box note"><p><strong>📌 Nota.</strong> ${text}</p></div>`;
}

export function fields(rows) {
  const body = rows
    .map(
      ([nome, tipo, obr, desc]) =>
        `<tr><td>${esc(nome)}</td><td>${esc(tipo)}</td><td>${esc(obr)}</td><td>${esc(desc)}</td></tr>`
    )
    .join('');
  return `<table class="fields">
    <thead><tr><th>Campo</th><th>Tipo</th><th>Obrigatório</th><th>Descrição do dado esperado</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

const ADDR = [
  ['CEP', 'Texto (máscara)', 'Não', '8 dígitos. Ao sair do campo, o sistema tenta preencher logradouro, bairro, cidade e UF.'],
  ['Logradouro', 'Texto', 'Não', 'Rua, avenida ou equivalente.'],
  ['Número', 'Texto', 'Não', 'Número do imóvel.'],
  ['Complemento', 'Texto', 'Não', 'Apto, bloco, sala.'],
  ['Bairro', 'Texto', 'Não', 'Bairro.'],
  ['Cidade', 'Texto', 'Não', 'Município.'],
  ['UF', 'Seleção', 'Não', 'Unidade da federação.'],
];

function errosCrud(entidade) {
  return `<table>
    <thead><tr><th>Mensagem / situação</th><th>O que fazer</th></tr></thead>
    <tbody>
      <tr><td>Campos obrigatórios em branco (borda vermelha ou aviso)</td><td>Preencha os campos marcados e clique em <strong>Salvar</strong> de novo.</td></tr>
      <tr><td>Registro duplicado (CPF, CRM, e-mail ou CNPJ já existente)</td><td>Busque o cadastro na lista e use <strong>Editar</strong>, ou vincule o existente em vez de criar outro.</td></tr>
      <tr><td>Sem permissão / botão ausente</td><td>Seu perfil não tem criar/editar/excluir. Peça ao administrador para ajustar em <strong>Administração → Acessos</strong>.</td></tr>
      <tr><td>Confirmação ao clicar em <strong>Excluir</strong></td><td>Confirme apenas se deseja inativar o ${esc(entidade)}. A ação impacta listas e vínculos.</td></tr>
      <tr><td>Sessão expirada (volta ao login)</td><td>Entre novamente. Alterações não salvas são perdidas.</td></tr>
    </tbody>
  </table>`;
}

/**
 * @param {{ fig: Function, pair: Function }} h
 */
export function renderChapters(h) {
  const { fig, pair } = h;
  return `
  <h2 id="s1">1. O que é o VitaLink</h2>
  <h3>1. Visão geral e finalidade</h3>
  <p>O VitaLink é a plataforma de <strong>cuidado contínuo no lar</strong>. Ele reúne ficha do paciente, medicamentos, agenda, rede de saúde, exames, receitas e acessos por perfil — para que família, cuidador, médico e administrador acompanhem a mesma rotina, com o paciente certo no topo da tela.</p>
  <h3>2. O que você consegue fazer</h3>
  <ul>
    <li>Manter a ficha (dados pessoais, alergias, diagnóstico e anamnese).</li>
    <li>Registrar horários de medicamentos, estoque e compras.</li>
    <li>Agendar consultas, rotinas e eventos do dia a dia.</li>
    <li>Consultar médicos, hospitais, clínicas e farmácias (incluindo o catálogo da Grande Florianópolis).</li>
    <li>Anexar exames e receitas.</li>
    <li>Controlar quem vê e quem altera cada módulo (perfis e acessos).</li>
  </ul>
  ${note('Tudo o que você registra fica ligado ao <strong>paciente ativo</strong> — o nome no seletor do topo. Trocar o paciente troca medicamentos, agenda, ficha e eventos.')}
  ${warn('Antes de salvar uma dose, uma consulta ou um evento, confira o nome no topo. Registrar no paciente errado mistura o prontuário.')}

  <h2 id="s2">2. Acesso à conta</h2>
  <h3>1. Visão geral e finalidade</h3>
  <p>O acesso protege o prontuário: só entra quem tem e-mail cadastrado, senha válida e conta ativa. Depois do login, o sistema monta o menu conforme o <strong>perfil</strong> da conta.</p>
  <h3>2. Acesso à funcionalidade</h3>
  <p>Abra o endereço do sistema no navegador (homologação ou produção). A primeira tela é o <strong>Login</strong>. Atalhos na própria tela: <strong>Criar conta</strong> e <strong>Esqueceu a senha?</strong>.</p>
  <h3>3. Pré-requisitos</h3>
  <ul>
    <li>Conta criada (ou convite do administrador).</li>
    <li>E-mail confirmado, se o ambiente exigir.</li>
    <li>Navegador atualizado; no celular o layout se adapta.</li>
  </ul>

  <h3>4. Guia operacional — entrar no sistema</h3>
  <ol>
    <li>Abra o endereço informado pela equipe VitaLink.</li>
    <li>No campo <strong>E-mail</strong>, digite o e-mail da conta (o mesmo do cadastro).</li>
    <li>No campo <strong>Senha</strong>, digite a senha. Os caracteres ficam ocultos.</li>
    <li>Opcional: marque <strong>Salvar credenciais de acesso neste dispositivo</strong> para o navegador lembrar e-mail e senha neste computador. Use só em aparelho particular.</li>
    <li>Clique no botão destacado <strong>Entrar no Sistema</strong> (marcador 1 na figura).</li>
  </ol>
  ${fig('2', 'login', 'Tela de login, com o botão Entrar no Sistema em destaque')}
  <p><strong>Comportamento esperado:</strong> o botão mostra “Autenticando...”. Em seguida o sistema abre o <strong>Painel</strong> (ou o <strong>Onboarding</strong>, se ainda não houver paciente). Se e-mail ou senha estiverem errados, um aviso vermelho aparece no cartão, sem detalhar o servidor.</p>

  ${fields([
    ['E-mail', 'Texto (e-mail)', 'Sim', 'Formato nome@dominio. Ex.: seu.email@empresa.com'],
    ['Senha', 'Senha', 'Sim', 'Mínimo 6 caracteres na tela de login; a senha forte vale no cadastro e na redefinição.'],
    ['Salvar credenciais', 'Caixa de seleção', 'Não', 'Guarda e-mail e senha neste navegador para o próximo acesso.'],
  ])}

  <h3>6. Mensagens de validação e erros comuns</h3>
  <table>
    <thead><tr><th>Mensagem</th><th>Como corrigir</th></tr></thead>
    <tbody>
      <tr><td>Informe o e-mail. / E-mail inválido.</td><td>Preencha um e-mail com @ e domínio.</td></tr>
      <tr><td>Informe a senha. / A senha deve ter ao menos 6 caracteres.</td><td>Digite a senha completa.</td></tr>
      <tr><td>Falha na autenticação / conta inativa</td><td>Confira Caps Lock. Se persistir, use <strong>Esqueceu a senha?</strong> ou peça ao administrador para reativar a conta em <strong>Usuários</strong>.</td></tr>
    </tbody>
  </table>
  ${tip('Marque salvar credenciais apenas em computador ou celular de uso pessoal. Em computador compartilhado, deixe desmarcado e clique em <strong>Sair</strong> ao terminar.')}
  <h3>7. Dúvidas frequentes</h3>
  <p><strong>O login abre e volta sozinho?</strong> A sessão (token) dura algumas horas. Entre de novo.</p>
  <p><strong>Não lembro se a conta existe.</strong> Tente <strong>Criar conta</strong> com o mesmo e-mail: o sistema avisa se já estiver cadastrado.</p>

  <h3>Criar conta</h3>
  <p><strong>Objetivo:</strong> registrar um novo usuário maior de 18 anos para depois entrar e, se for o caso, cadastrar o paciente.</p>
  <p><strong>Caminho:</strong> tela de login → link <strong>Criar conta</strong> → rota <code>/registro</code>.</p>
  <ol>
    <li>Clique em <strong>Criar conta</strong> abaixo do botão de entrar.</li>
    <li>Preencha nome, e-mail, CPF, telefone com DDD, data de nascimento e senha forte.</li>
    <li>Clique em <strong>Cadastrar</strong> (marcador na figura, quando destacado).</li>
    <li>Leia a mensagem de sucesso e clique em <strong>Entrar agora</strong>, ou confirme o e-mail se o sistema enviar o link.</li>
  </ol>
  ${fig('2', 'registro', 'Formulário Criar conta, com o botão Cadastrar em destaque')}
  ${fields([
    ['Nome', 'Texto', 'Sim', 'Nome completo do titular da conta.'],
    ['E-mail', 'E-mail', 'Sim', 'Será o login. Precisa ser único no sistema.'],
    ['CPF', 'Texto numérico', 'Sim', '11 dígitos válidos (dígitos verificadores).'],
    ['Telefone', 'Texto numérico', 'Sim', 'Com DDD. Ex.: 48999998888.'],
    ['Data de nascimento', 'Data (DD/MM/AAAA)', 'Sim', 'O titular precisa ter 18 anos ou mais.'],
    ['Senha', 'Senha', 'Sim', 'Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.'],
  ])}
  <p><strong>Erros comuns:</strong> “E-mail inválido.”; “CPF inválido.”; “Informe um telefone válido com DDD.”; “Cadastro restrito a maiores de 18 anos.”; senha fraca (o texto de ajuda aparece sob o campo). Corrija o campo e clique em <strong>Cadastrar</strong> novamente.</p>
  ${warn('Menores de 18 anos não criam conta própria. O cuidado de um menor entra pelo cadastro de <strong>Paciente</strong> feito por um responsável ou administrador já logado.')}

  <h3>Esqueci a senha</h3>
  <p><strong>Caminho:</strong> login → <strong>Esqueceu a senha?</strong> → <code>/esqueci-senha</code>.</p>
  <ol>
    <li>Informe o e-mail da conta.</li>
    <li>Clique no botão de envio e abra a caixa de entrada (e o spam).</li>
    <li>No link recebido, defina a senha nova com a mesma regra de senha forte.</li>
  </ol>
  ${fig('2', 'esqueci', 'Tela Esqueceu a senha? para solicitar o link por e-mail')}
  ${note('Em homologação o e-mail pode não chegar. Peça ao administrador para redefinir a senha em <strong>Usuários</strong>.')}

  <h3>Sair</h3>
  <ol>
    <li>No canto superior direito, clique no seu nome (iniciais no círculo).</li>
    <li>Clique em <strong>Sair</strong>.</li>
  </ol>
  ${fig('2', 'menu-conta', 'Menu da conta com Meus Dados e Sair em destaque')}

  <h2 id="s3">3. Primeiro uso e cadastro do paciente</h2>
  <h3>1. Visão geral e finalidade</h3>
  <p>Sem um paciente vinculado, o VitaLink não libera a rotina (Início, medicamentos, agenda clínica). O <strong>onboarding</strong> cria ou vincula o primeiro paciente pela <strong>CPF</strong>.</p>
  <h3>2. Acesso</h3>
  <p>Aberto automaticamente após o primeiro login, se o onboarding não estiver concluído. Rota <code>/onboarding</code>. Administrador, médico e atendente também cadastram em <strong>Saúde → Pacientes</strong>.</p>
  <h3>3. Pré-requisitos</h3>
  <ul>
    <li>Conta autenticada.</li>
    <li>Nome, data de nascimento e CPF do paciente em mãos.</li>
  </ul>
  <h3>4. Passo a passo</h3>
  <ol>
    <li>Informe <strong>Nome</strong>, <strong>Nascimento</strong> e <strong>CPF</strong>.</li>
    <li>Se o CPF já existir, leia o aviso e escolha <strong>vincular</strong> o cadastro em vez de duplicar.</li>
    <li>Conclua o fluxo. O sistema passa a exigir o paciente ativo nas demais telas.</li>
  </ol>
  ${fig('3', 'onboarding', 'Onboarding para cadastrar ou vincular o primeiro paciente')}
  ${fields([
    ['Nome', 'Texto', 'Sim', 'Nome completo do paciente.'],
    ['Nascimento', 'Data', 'Sim', 'Data de nascimento no formato brasileiro.'],
    ['CPF', 'Texto numérico', 'Sim', '11 dígitos. Se já cadastro, o sistema oferece vínculo.'],
    ['Telefone', 'Texto', 'Não', 'Contato do paciente, quando houver.'],
  ])}
  ${warn('Sem paciente, só permanecem liberados cadastro de pacientes (para perfis administrativos), <strong>Meus Dados</strong> e <strong>Termos</strong>.')}
  <h3>7. FAQ</h3>
  <p><strong>O CPF já está no sistema.</strong> Vincule. Não crie um segundo prontuário para a mesma pessoa.</p>

  <h2 id="s4">4. Como a tela está organizada</h2>
  <h3>1. Visão geral</h3>
  <p>Depois do login, a área de trabalho tem menu à esquerda, faixa superior (paciente ativo e conta) e conteúdo central. No módulo <strong>Início</strong>, há ainda a barra inferior de atalhos.</p>
  <h3>2. Acesso</h3>
  <p>Qualquer tela autenticada. No celular, o menu lateral abre pelo ícone de três linhas no topo.</p>
  <table>
    <thead><tr><th>Área</th><th>O que faz</th></tr></thead>
    <tbody>
      <tr><td><strong>Menu lateral</strong></td><td>Módulos permitidos ao seu perfil. Grupos: Saúde, Atividades, Administração.</td></tr>
      <tr><td><strong>Topo</strong></td><td>Identificação “Painel”, <strong>seletor de paciente</strong> e menu da conta.</td></tr>
      <tr><td><strong>Conteúdo</strong></td><td>Lista, ficha ou calendário do módulo escolhido.</td></tr>
      <tr><td><strong>Barra inferior (Início)</strong></td><td>Sintomas, Perfil, Eventos, Especialistas, Agenda, Corpo, Linha, Medicamentos, Exames/Receitas.</td></tr>
    </tbody>
  </table>
  ${fig('4', 'dashboard', 'Área autenticada: menu à esquerda, paciente no topo e conteúdo do Painel')}
  <h3>Paciente ativo</h3>
  <ol>
    <li>Localize o combo no centro do topo (não disponível no perfil Autocuidado, que vê só o próprio nome).</li>
    <li>Abra a lista e escolha o paciente.</li>
    <li>Confira se o nome bate com a ficha ou a lista que você vai alterar.</li>
  </ol>
  ${note('Quem tem um único paciente ainda vê o nome no topo. Quem tem vários precisa selecionar antes de registrar a rotina.')}
  ${pair('4', [
    { id: 'login-mobile', title: 'Login no celular' },
    { id: 'inicio-mobile', title: 'Início no celular, com menu hambúrguer e barra inferior' },
  ])}
  ${tip('No celular, os atalhos do Início ficam na barra inferior; os demais módulos estão no menu hambúrguer.')}

  <h2 id="s5">5. Perfis e permissões</h2>
  <h3>1. Visão geral e finalidade</h3>
  <p>O menu não é igual para todos. O administrador define, em <strong>Acessos</strong>, o que cada perfil pode ler, criar, editar e excluir. Sem “ler”, o item some da barra lateral.</p>
  <h3>2. Acesso</h3>
  <p><strong>Administração → Acessos</strong> (rota <code>/acessos</code>). Somente quem tem permissão de administração.</p>
  <h3>3. Pré-requisitos</h3>
  <p>Perfil Administrador (ou equivalente com acesso a Acessos). Os demais usuários só sentem o efeito nos menus.</p>
  <table>
    <thead><tr><th>Perfil</th><th>Uso típico</th></tr></thead>
    <tbody>
      <tr><td>Administrador</td><td>Usuários, perfis, acessos, auditoria e todos os cadastros.</td></tr>
      <tr><td>Médico</td><td>Pacientes, medicamentos, consultas, linha do tempo, rede de saúde.</td></tr>
      <tr><td>Atendente</td><td>Apoio operacional, conforme a matriz de acessos.</td></tr>
      <tr><td>Cuidador</td><td>Rotina dos pacientes vinculados: doses, eventos, agenda. Não cria/exclui pacientes.</td></tr>
      <tr><td>Responsável</td><td>Acompanha o familiar; pode cadastrar cuidador, responsável e paciente se a permissão existir.</td></tr>
      <tr><td>Paciente</td><td>Consulta a própria rotina autorizada.</td></tr>
      <tr><td>Autocuidado</td><td>Cuida de si: Início, médicos, estabelecimentos, farmácias e termos.</td></tr>
    </tbody>
  </table>
  <h3>4. Passo a passo (ajustar acessos)</h3>
  <ol>
    <li>Abra <strong>Administração</strong> no menu e clique em <strong>Acessos</strong>.</li>
    <li>Escolha o perfil na seleção da tela.</li>
    <li>Marque ou desmarque <strong>ler</strong>, <strong>criar</strong>, <strong>editar</strong> e <strong>excluir</strong> em cada menu.</li>
    <li>Salve, se a tela exigir confirmação. Peça para o usuário sair e entrar de novo para recarregar o menu.</li>
  </ol>
  ${fig('5', 'acessos', 'Matriz de acessos: permissões de ler, criar, editar e excluir por perfil')}
  ${warn('Tirar a leitura de um menu remove o item da barra na próxima sessão. Não desmarque o próprio acesso de administrador sem outro administrador ativo.')}
  <h3>7. FAQ</h3>
  <p><strong>Não vejo um menu.</strong> Não é falha do navegador: falta permissão de leitura. Peça o ajuste em <strong>Acessos</strong>.</p>

  <h2 id="s6">6. Painel (Dashboard)</h2>
  <h3>1. Visão geral e finalidade</h3>
  <p>O <strong>Dashboard operacional</strong> mostra o recado do dia, quantos pacientes estão ativos, eventos de hoje, consultas da semana e alertas pendentes — para você decidir o que tratar primeiro.</p>
  <h3>2. Acesso</h3>
  <p>Menu <strong>Dashboard</strong> · rota <code>/dashboard</code>. Também é o destino padrão após o login (quando o onboarding já foi concluído).</p>
  <h3>3. Pré-requisitos</h3>
  <p>Conta autenticada e permissão de leitura do Dashboard. Indicadores clínicos ficam mais ricos quando há pacientes e agenda cadastrados.</p>
  <h3>4. Passo a passo</h3>
  <ol>
    <li>Clique em <strong>Dashboard</strong> no menu esquerdo.</li>
    <li>Leia a saudação e os cartões <strong>Pacientes ativos</strong>, <strong>Eventos de hoje</strong>, <strong>Consultas na semana</strong> e <strong>Alertas / Ações</strong>.</li>
    <li>Clique em <strong>Abrir</strong> no cartão desejado para ir à lista correspondente.</li>
    <li>Em <strong>Próximos compromissos</strong>, use <strong>Ver agenda</strong> para o calendário.</li>
    <li>No <strong>Calendário operacional da semana</strong>, clique em um dia para ver o volume daquele dia.</li>
  </ol>
  ${fig('6', 'dashboard', 'Painel operacional com cartões de resumo, compromissos e calendário da semana')}
  <p><strong>Comportamento esperado:</strong> os números refletem o paciente ativo e os cadastros do ambiente. Não há botão Salvar nesta tela: ela é só leitura e atalhos.</p>
  ${tip('Use o Painel de manhã para ver o que está atrasado (cartão laranja de alertas) antes de abrir o Início.')}
  <h3>7. FAQ</h3>
  <p><strong>Os números estão zerados.</strong> Ainda não há eventos, ou o filtro de paciente não tem rotina. Cadastre a agenda e os medicamentos.</p>

  <h2 id="s7">7. Início — rotina do paciente ativo</h2>
  <h3>1. Visão geral e finalidade</h3>
  <p>O <strong>Início</strong> é o prontuário do dia a dia do paciente selecionado no topo: rede de cuidado, ficha, eventos, especialistas, agenda, mapa do corpo, linha do tempo, medicamentos e documentos.</p>
  <h3>2. Acesso</h3>
  <p>Menu <strong>Início</strong> · <code>/inicio</code>. Atalhos na barra inferior (no celular, parte dos itens fica em <strong>Mais</strong>).</p>
  <h3>3. Pré-requisitos</h3>
  <p>Pelo menos um paciente vinculado e selecionado no topo. Permissão de leitura do Início.</p>
  ${warn('Se a tela pedir para cadastrar um paciente, conclua o onboarding ou use <strong>Saúde → Pacientes</strong>.')}

  <h3>7.1 Sintomas / rede de cuidado</h3>
  <p><strong>Objetivo:</strong> ver o resumo da rede (hospitais e clínicas) e chegar rápido aos outros atalhos da barra inferior.</p>
  <ol>
    <li>Clique em <strong>Início</strong> (ícone de casa).</li>
    <li>Confira o paciente no topo.</li>
    <li>Role a <strong>Rede de cuidado</strong> ou toque em <strong>Sintomas</strong>, <strong>Perfil</strong>, <strong>Medicamentos</strong> etc. na barra inferior.</li>
  </ol>
  ${fig('7', 'inicio', 'Início do paciente ativo, com barra inferior de atalhos')}
  ${fig('7', 'inicio-mobile', 'Início no celular: hambúrguer, paciente no topo e barra Sintomas / Agenda / Medicamentos')}

  <h3>7.2 Perfil (ficha do paciente)</h3>
  <p><strong>Objetivo:</strong> consultar e atualizar dados pessoais, contato, tipo sanguíneo, diagnóstico, alergias e observações do paciente ativo.</p>
  <p><strong>Caminho:</strong> Início → <strong>Perfil</strong> na barra inferior · <code>/inicio/perfil</code>.</p>
  <ol>
    <li>Abra <strong>Perfil</strong>.</li>
    <li>Confira o nome no combo do topo.</li>
    <li>Clique em <strong>Editar ficha</strong> (marcador 1). Os campos saem do modo leitura.</li>
    <li>Altere os dados necessários.</li>
    <li>Clique em <strong>Salvar alterações</strong> ou em <strong>Cancelar</strong> para descartar.</li>
  </ol>
  ${fig('7', 'perfil', 'Ficha em modo leitura, com o botão Editar ficha em destaque')}
  ${fig('7', 'perfil-edicao', 'Ficha desbloqueada para edição, com Salvar alterações em destaque')}
  ${fields([
    ['Nome completo', 'Texto', 'Sim', 'Nome do paciente ativo.'],
    ['E-mail', 'E-mail', 'Não', 'Contato eletrônico do paciente.'],
    ['Sexo', 'Seleção', 'Não', 'Masculino, feminino ou outro conforme as opções da lista.'],
    ['Data de nascimento', 'Data', 'Sim', 'Usada também para calcular a idade na tela.'],
    ['Tipo sanguíneo', 'Seleção', 'Não', 'A+, A−, B+, B−, AB+, AB−, O+, O− ou NI.'],
    ['Telefone', 'Texto', 'Não', 'Telefone principal.'],
    ['Diagnóstico principal', 'Texto longo', 'Não', 'Resumo clínico principal.'],
    ['Alergias', 'Texto longo', 'Não', 'Alergias conhecidas. Preencha com clareza para o cuidador.'],
    ['Observações médicas', 'Texto longo', 'Não', 'Notas livres da equipe.'],
  ])}
  <p><strong>Comportamento esperado:</strong> após salvar, os campos voltam a ficar protegidos até um novo <strong>Editar ficha</strong>. A idade é recalculada pela data de nascimento.</p>
  ${warn('Salve ou cancele antes de trocar o paciente no combo. Senão você pode gravar a ficha no registro errado.')}

  <h3>7.3 Eventos</h3>
  <p><strong>Objetivo:</strong> diário de bordo — sintomas, observações e ocorrências do paciente ativo.</p>
  <p><strong>Caminho:</strong> Início → <strong>Eventos</strong> · <code>/inicio/eventos</code>.</p>
  <ol>
    <li>Abra <strong>Eventos</strong>.</li>
    <li>Inclua o tipo, a descrição e a data/hora conforme os campos da tela.</li>
    <li>Salve. O item entra no histórico e na linha do tempo.</li>
  </ol>
  ${fig('7', 'eventos', 'Lista e inclusão de eventos do paciente ativo')}

  <h3>7.4 Especialistas</h3>
  <p><strong>Objetivo:</strong> profissionais e locais usados no cuidado, com busca no contexto do Início.</p>
  <p><strong>Caminho:</strong> <code>/inicio/especialistas</code>.</p>
  ${fig('7', 'especialistas', 'Especialistas vinculados ao cuidado do paciente')}

  <h3>7.5 Agenda (Início)</h3>
  <p><strong>Objetivo:</strong> compromissos do paciente (consulta, exame, rotina, medicação) e, quando visível, envio ao <strong>Google Agenda</strong>.</p>
  <p><strong>Caminho:</strong> <code>/inicio/agenda</code>.</p>
  <ol>
    <li>Escolha o tipo de atividade (tomar remédio, consulta, pressão, glicemia ou outra rotina).</li>
    <li>Informe título, descrição e data/hora.</li>
    <li>Salve. O compromisso aparece na visão Dia / Semana / Mês.</li>
  </ol>
  ${fig('7', 'inicio-agenda', 'Agenda do paciente no módulo Início')}

  <h3>7.6 Corpo</h3>
  <p><strong>Objetivo:</strong> registrar queixas ou pontos de atenção no mapa do corpo.</p>
  <p><strong>Caminho:</strong> <code>/inicio/corpo</code>.</p>
  ${fig('7', 'corpo', 'Mapa do corpo e registros associados')}

  <h3>7.7 Linha do tempo (Início)</h3>
  <p><strong>Objetivo:</strong> histórico unificado (doses, eventos, consultas) em ordem cronológica.</p>
  <p><strong>Caminho:</strong> <code>/inicio/linha</code>.</p>
  ${fig('7', 'linha', 'Linha do tempo no Início')}

  <h3>7.8 Medicamentos (Início)</h3>
  <p><strong>Objetivo:</strong> posologia, estoque, farmácia, compras e impressão da lista do paciente ativo.</p>
  <p><strong>Caminho:</strong> Início → <strong>Medicamentos</strong> · <code>/inicio/meds</code>.</p>
  <ol>
    <li>Abra <strong>Medicamentos</strong> com o paciente correto no topo.</li>
    <li>Cadastre nome, horário ou período (manhã, tarde, noite), quantidade a administrar, estoque, farmácia (busca) e intervalo em horas.</li>
    <li>Para entrada de estoque, registre <strong>compras</strong> (quantidade, valor, data, farmácia).</li>
    <li>Use <strong>imprimir</strong> quando precisar da lista em papel.</li>
    <li>Opcional: enviar o horário ao Google Agenda, se o botão estiver visível.</li>
  </ol>
  ${fig('7', 'meds', 'Medicamentos do paciente ativo, com cadastro e ações da lista')}
  ${tip('Digite parte do nome da farmácia. O catálogo público cobre a Grande Florianópolis; as demais você cadastra em <strong>Farmácias</strong>.')}
  ${warn('Confirme a exclusão de um medicamento: a lista de horários daquele item deixa de valer para o paciente ativo.')}

  <h3>7.9 Exames e receitas (Início)</h3>
  <p><strong>Objetivo:</strong> documentos clínicos do paciente ativo, o mesmo conjunto da tela Saúde, já filtrado.</p>
  <p><strong>Caminho:</strong> <code>/inicio/docs</code>.</p>
  ${fig('7', 'docs-inicio', 'Exames e receitas no Início')}

  <h2 id="s8">8. Cadastros de saúde</h2>
  <p>As telas de Saúde seguem o padrão <strong>lista + formulário</strong>: buscar, filtrar por status, <strong>Novo cadastro</strong>, <strong>Editar</strong> e <strong>Excluir</strong> (inativar), conforme a permissão.</p>
  ${note('O botão <strong>Novo cadastro</strong> só aparece se o perfil puder criar. Sem ele, você ainda pode consultar a lista se tiver leitura.')}

  <h3>8.1 Pacientes</h3>
  <p><strong>Objetivo:</strong> prontuário cadastral — identificação, convênio, endereço, responsáveis, médicos, foto, carteirinha e anamnese.</p>
  <p><strong>Caminho:</strong> <strong>Saúde → Pacientes</strong> · <code>/pacientes</code>.</p>
  <p><strong>Pré-requisitos:</strong> permissão no menu Pacientes. CPF em mãos. Para vínculos, cadastre antes responsáveis e médicos, se for associá-los.</p>
  <ol>
    <li>Abra <strong>Pacientes</strong>.</li>
    <li>Use <strong>Buscar</strong> ou o filtro <strong>Status</strong> (Todos / ativo / inativo).</li>
    <li>Clique em <strong>Novo cadastro</strong> (marcador 1) para incluir, ou em <strong>Editar</strong> na linha.</li>
    <li>Preencha as abas <strong>Dados Gerais</strong>, <strong>Endereço</strong>, <strong>Cuidadores</strong> e <strong>Anamnese</strong>.</li>
    <li>Clique em <strong>Salvar</strong>. A lista atualiza e o registro fica <strong>ativo</strong>.</li>
  </ol>
  ${fig('8', 'pacientes', 'Lista de pacientes com busca, status e o botão Novo cadastro em destaque')}
  ${fig('8', 'pacientes-novo', 'Formulário de novo paciente, com o botão Salvar em destaque')}
  ${fields([
    ['Nome completo', 'Texto', 'Sim', 'Nome do paciente.'],
    ['Data de nascimento', 'Data', 'Sim', 'DD/MM/AAAA.'],
    ['Sexo', 'Seleção', 'Não', 'Usado também no mapa por especialidade.'],
    ['CPF', 'Texto numérico', 'Sim', 'Único. Se já existir, o sistema pede para vincular.'],
    ['Alergias', 'Texto longo', 'Não', 'Alergias conhecidas.'],
    ['Tipo sanguíneo', 'Seleção', 'Não', 'Inclui a opção NI.'],
    ['Telefone principal', 'Texto', 'Não', 'Com DDD.'],
    ['E-mail', 'E-mail', 'Não', 'Contato do paciente.'],
    ['Status', 'Seleção', 'Sim', 'Ativo ou inativo.'],
    ['Foto do paciente', 'Arquivo', 'Não', 'Imagem de identificação.'],
    ['Convênio', 'Texto', 'Não', 'Nome do plano. Pode ser sugerido pelo upload da carteirinha.'],
    ['Nº convênio', 'Texto', 'Não', 'Número da carteirinha.'],
    ['Validade convênio', 'Data', 'Não', 'Validade da carteirinha.'],
    ['Carteirinha frente/verso', 'Arquivo', 'Não', 'Imagens da carteirinha.'],
    ['Responsável(eis)', 'Seleção múltipla', 'Não', 'Família ou responsáveis já cadastrados.'],
    ['Médico(s) principal(is)', 'Busca', 'Não', 'Médicos da rede, busca por nome/CRM.'],
    ['Observações', 'Texto longo', 'Não', 'Notas livres.'],
    ...ADDR,
  ])}
  <p><strong>Anamnese (aba):</strong> doenças pré-existentes, histórico familiar, cirurgias, sono, alimentação, mobilidade, autonomia, medicamentos contraindicados, alergias alimentares, limitações, instruções especiais, episódios de confusão e contato de emergência (nome e telefone).</p>
  <p><strong>Comportamento esperado:</strong> ao salvar, o paciente entra na lista e pode ser escolhido no combo do topo. Excluir pede confirmação e inativa o registro.</p>
  ${errosCrud('paciente')}
  ${warn('Não duplique CPF. O aviso de paciente existente existe para unificar o prontuário.')}

  <h3>8.2 Médicos</h3>
  <p><strong>Objetivo:</strong> cadastro de profissionais com CRM, especialidade e locais de atendimento.</p>
  <p><strong>Caminho:</strong> <strong>Saúde → Profissionais da Saúde</strong> · <code>/medicos</code>.</p>
  <ol>
    <li>Abra a lista e clique em <strong>Novo cadastro</strong> (ou <strong>Editar</strong>).</li>
    <li>Informe nome, especialidade (busca), CRM só com números, UF do CRM e, se quiser, telefones, e-mail e locais.</li>
    <li>Clique em <strong>Salvar</strong>.</li>
  </ol>
  ${fig('8', 'medicos', 'Cadastro de médicos')}
  ${fig('8', 'medicos-novo', 'Formulário de novo médico, com Salvar em destaque')}
  ${fields([
    ['Nome completo', 'Texto', 'Sim', 'Nome do profissional.'],
    ['Especialidade', 'Busca / texto', 'Sim', 'Digite para buscar no catálogo ou informe livremente.'],
    ['CRM', 'Texto numérico', 'Sim', '4 a 10 dígitos. Único por UF.'],
    ['UF CRM', 'Seleção', 'Sim', 'Estado de registro do CRM.'],
    ['Telefone pessoal/WhatsApp', 'Texto', 'Não', 'Com DDD.'],
    ['E-mail pessoal', 'E-mail', 'Não', 'Contato profissional.'],
    ['Local(is) de atendimento', 'Busca múltipla', 'Não', 'Hospitais e clínicas da rede.'],
    ['Status', 'Seleção', 'Sim', 'Ativo ou inativo.'],
    ...ADDR,
  ])}
  ${errosCrud('médico')}
  <p><strong>CRM duplicado na mesma UF</strong> impede o salvamento. Corrija o número ou a UF, ou edite o cadastro já existente.</p>

  <h3>8.3 Remédios (catálogo)</h3>
  <p><strong>Objetivo:</strong> catálogo de medicamentos da operação (nome comercial, farmácia, posologia, estoque, prescritor).</p>
  <p><strong>Caminho:</strong> <strong>Saúde → Medicamentos</strong> · <code>/remedios</code>.</p>
  ${fig('8', 'remedios', 'Catálogo de remédios')}
  ${fields([
    ['Nome comercial', 'Texto', 'Sim', 'Nome da embalagem.'],
    ['Princípio ativo', 'Texto', 'Sim', 'Substância.'],
    ['Farmácia', 'Busca', 'Não', 'Onde o item costuma ser comprado.'],
    ['Valor do medicamento', 'Moeda', 'Sim', 'Valor de referência.'],
    ['Quantidade a administrar', 'Número', 'Sim', 'Dose de cada tomada.'],
    ['Total de comprimidos / mL', 'Número', 'Sim', 'Estoque atual.'],
    ['Indicação', 'Texto', 'Sim', 'Para que o remédio foi prescrito.'],
    ['Médico prescritor', 'Busca', 'Não', 'Profissional que prescreveu.'],
    ['Uso contínuo', 'Seleção', 'Não', 'Sim ou não.'],
    ['Período / Horário', 'Seleção', 'Não', 'Manhã, tarde, noite ou hora exata.'],
    ['Hora exata', 'Hora', 'Condicional', 'Obrigatória quando o período for hora exata.'],
    ['Status', 'Seleção', 'Sim', 'Ativo ou inativo.'],
  ])}

  <h3>8.4 Hospitais, clínicas e laboratórios</h3>
  <p><strong>Caminho:</strong> <strong>Saúde → Estabelecimentos de Saúde</strong> · <code>/hospitais</code>.</p>
  <p>O catálogo público da Grande Florianópolis já vem preenchido; você inclui os seus. Informe tipo (hospital, clínica ou laboratório), CNPJ válido e endereço (CEP preenche o logradouro).</p>
  ${fig('8', 'hospitais', 'Estabelecimentos de saúde')}
  ${fields([
    ['Nome fantasia', 'Texto', 'Sim', 'Nome de apresentação.'],
    ['Tipo', 'Seleção', 'Sim', 'Hospital, clínica ou laboratório.'],
    ['Documento (CNPJ)', 'Texto', 'Não', 'CNPJ válido, quando informado.'],
    ['Telefone / WhatsApp', 'Texto', 'Não', 'Contatos.'],
    ...ADDR,
    ['Status', 'Seleção', 'Sim', 'Ativo ou inativo.'],
  ])}

  <h3>8.5 Farmácias</h3>
  <p><strong>Caminho:</strong> <code>/farmacias</code>. Mesmo padrão de endereço e CNPJ. Use a busca no cadastro de medicamentos e nas compras.</p>
  ${fig('8', 'farmacias', 'Cadastro de farmácias')}

  <h3>8.6 Cuidadores e responsáveis</h3>
  <p><strong>Caminho:</strong> <code>/cuidadores</code> e <code>/responsaveis</code>.</p>
  <p>O cuidador só atua nos pacientes aos quais está vinculado (aba Cuidadores no paciente). Responsáveis podem ser associados na ficha do paciente.</p>
  ${fig('8', 'cuidadores', 'Cadastro de cuidadores')}
  ${fig('8', 'responsaveis', 'Cadastro de responsáveis')}
  ${fields([
    ['Nome', 'Texto', 'Sim', 'Nome completo.'],
    ['CPF', 'Texto', 'Não', 'Quando informado, deve ser válido.'],
    ['Telefone/WhatsApp', 'Texto', 'Não', 'Contato.'],
    ['Turno / Empresa', 'Seleção / texto', 'Não', 'No cadastro de cuidador, quando aplicável.'],
    ['Grau de parentesco', 'Texto', 'Não', 'No cadastro de responsável.'],
    ...ADDR,
    ['Status', 'Seleção', 'Sim', 'Ativo ou inativo.'],
  ])}

  <h3>8.7 Empresas cuidadoras</h3>
  <p><strong>Caminho:</strong> <code>/empresas-cuidadoras</code>. Razão social, contato e endereço da prestadora de cuidado.</p>
  ${fig('8', 'empresas', 'Empresas cuidadoras')}

  <h3>8.8 Exames e receitas</h3>
  <p><strong>Objetivo:</strong> guardar o documento (PDF ou imagem) ligado ao paciente, com tipo, especialidade e data.</p>
  <p><strong>Caminho:</strong> <strong>Saúde → Exames / Receitas</strong> · <code>/exames-receitas</code>.</p>
  <ol>
    <li>Clique em <strong>Novo documento</strong>.</li>
    <li>Selecione o paciente, a especialidade, o título, o tipo e anexe o arquivo.</li>
    <li>Salve. O item entra na lista com status e data.</li>
  </ol>
  ${fig('8', 'exames', 'Lista de exames e receitas')}
  ${fig('8', 'exames-novo', 'Inclusão de exame ou receita, com campos e anexo')}
  ${fields([
    ['Paciente', 'Seleção', 'Sim', 'Paciente ao qual o documento pertence.'],
    ['Especialidade', 'Texto / seleção', 'Sim', 'Área do documento.'],
    ['Título', 'Texto', 'Sim', 'Nome de apresentação na lista.'],
    ['Data do documento', 'Data', 'Não', 'Data impressa no papel ou do exame.'],
    ['Tipo', 'Seleção', 'Não', 'Exame, receita ou outro tipo da lista.'],
    ['Arquivo', 'PDF ou imagem', 'Não', 'Anexo do documento.'],
    ['Observações', 'Texto', 'Não', 'Notas da equipe.'],
  ])}
  ${errosCrud('documento')}

  <h2 id="s9">9. Agenda, consultas, rotina e linha do tempo</h2>
  <h3>9.1 Agenda</h3>
  <p><strong>Objetivo:</strong> calendário mensal e lista de compromissos da operação.</p>
  <p><strong>Caminho:</strong> <strong>Atividades → Agenda</strong> · <code>/agenda</code>.</p>
  <ol>
    <li>Abra a <strong>Agenda</strong>.</li>
    <li>Filtre por paciente, status ou tipo, se os campos estiverem visíveis.</li>
    <li>Clique no dia para ver os horários daquela data.</li>
  </ol>
  ${fig('9', 'agenda', 'Agenda mensal e lista de compromissos')}

  <h3>9.2 Consultas</h3>
  <p><strong>Objetivo:</strong> agendar atendimento com paciente, profissional, especialidade, data/hora e local; marcar como concluída depois.</p>
  <p><strong>Caminho:</strong> <strong>Atividades → Consultas</strong> · <code>/consultas</code>.</p>
  <ol>
    <li>Clique em <strong>Nova consulta</strong> (marcador 1).</li>
    <li>Selecione o <strong>Paciente</strong> (obrigatório).</li>
    <li>Busque o <strong>Profissional</strong> e a <strong>Especialidade</strong>.</li>
    <li>Informe <strong>Local</strong>, <strong>Data/Hora</strong> e, se quiser, lembrete em minutos e observações.</li>
    <li>Clique em <strong>Salvar</strong>. Depois do atendimento, edite e marque a consulta como concluída. Use o atalho do Google Agenda se estiver visível.</li>
  </ol>
  ${fig('9', 'consultas', 'Lista de consultas, com o botão Nova consulta em destaque')}
  ${fig('9', 'consultas-novo', 'Formulário de nova consulta/sessão')}
  ${fields([
    ['Paciente', 'Seleção', 'Sim', 'Quem será atendido.'],
    ['Profissional', 'Busca', 'Não', 'Médico ou profissional, busca por nome/CRM.'],
    ['Especialidade', 'Busca / texto', 'Não', 'Área do atendimento.'],
    ['Local', 'Texto / busca', 'Não', 'Onde ocorre a consulta.'],
    ['Data/Hora', 'Data e hora', 'Sim', 'Início do atendimento.'],
    ['Lembrete (min)', 'Número', 'Não', 'Antecedência do aviso, em minutos.'],
    ['Observações', 'Texto', 'Não', 'Notas do agendamento.'],
  ])}
  ${errosCrud('consulta')}
  ${tip('Cadastre o médico antes, em <strong>Profissionais da Saúde</strong>, para a busca trazer CRM e especialidade automaticamente.')}

  <h3>9.3 Rotina</h3>
  <p><strong>Objetivo:</strong> tarefas recorrentes (horário, descrição, paciente) e acompanhamento do dia.</p>
  <p><strong>Caminho:</strong> <code>/rotina</code>.</p>
  <ol>
    <li>Filtre o paciente, se necessário.</li>
    <li>Clique em <strong>Novo Evento</strong>.</li>
    <li>Informe paciente, tipo, horário, data e descrição.</li>
    <li>Salve e acompanhe as execuções na lista.</li>
  </ol>
  ${fig('9', 'rotina', 'Rotina de cuidados')}
  ${fields([
    ['Paciente', 'Seleção', 'Sim', 'Paciente da tarefa.'],
    ['Tipo', 'Seleção', 'Não', 'Classificação da rotina.'],
    ['Horário', 'Hora', 'Sim', 'Hora prevista.'],
    ['Data', 'Data', 'Sim', 'Início da vigência ou do dia.'],
    ['Descrição', 'Texto', 'Não', 'O que deve ser feito.'],
  ])}

  <h3>9.4 Linha do tempo</h3>
  <p><strong>Objetivo:</strong> visão contínua para o médico e a família revisarem o histórico.</p>
  <p><strong>Caminho:</strong> <code>/timeline</code>. Filtre por paciente e palavras-chave.</p>
  ${fig('9', 'timeline', 'Linha do tempo no módulo Atividades')}

  <h2 id="s10">10. Administração</h2>
  <h3>10.1 Usuários</h3>
  <p><strong>Objetivo:</strong> criar contas, associar perfil, inativar e redefinir senha.</p>
  <p><strong>Caminho:</strong> <strong>Administração → Usuários</strong> · <code>/usuarios</code>.</p>
  <p><strong>Pré-requisitos:</strong> perfil administrador. O responsável, quando permitido, só cria perfis da própria rede (cuidador, responsável, paciente).</p>
  <ol>
    <li>Abra <strong>Usuários</strong>.</li>
    <li>Clique em <strong>Novo cadastro</strong> ou <strong>Editar</strong>.</li>
    <li>Informe nome, e-mail e <strong>Perfil</strong>.</li>
    <li>Salve. Para senha, use a ação de redefinição da tela quando disponível.</li>
  </ol>
  ${fig('10', 'usuarios', 'Gestão de usuários')}
  ${fields([
    ['Nome', 'Texto', 'Sim', 'Nome da pessoa da conta.'],
    ['E-mail', 'E-mail', 'Sim', 'Login. Precisa ser único.'],
    ['Perfil', 'Seleção', 'Sim', 'Administrador, Médico, Cuidador etc.'],
    ['Status', 'Seleção', 'Sim', 'Ativo entra; inativo é recusado no login.'],
  ])}
  ${warn('Inativar um usuário impede o próximo login. Confirme se não é o único administrador.')}
  ${errosCrud('usuário')}

  <h3>10.2 Perfis</h3>
  <p><strong>Caminho:</strong> <code>/perfis</code>. Nome e status do papel (Administrador, Médico, Cuidador…).</p>
  ${fig('10', 'perfis', 'Cadastro de perfis')}

  <h3>10.3 Acessos</h3>
  <p>Ver o capítulo 5. A matriz é a fonte da verdade dos menus.</p>
  ${fig('10', 'acessos', 'Permissões por perfil e menu')}

  <h3>10.4 Auditoria</h3>
  <p><strong>Objetivo:</strong> trilha de quem fez o quê (login, cadastros, alterações), sem gravar o conteúdo clínico completo (LGPD).</p>
  <p><strong>Caminho:</strong> <code>/auditoria</code>.</p>
  ${fig('10', 'auditoria', 'Logs de auditoria')}
  ${note('Use a auditoria para investigar acessos indevidos, não para reler o prontuário. O detalhe clínico está nas telas de saúde.')}

  <h2 id="s11">11. Meus dados e termos</h2>
  <h3>11.1 Meus dados</h3>
  <p><strong>Objetivo:</strong> ver a identificação da conta logada e solicitar troca de senha. Isto <strong>não</strong> é a ficha clínica do paciente.</p>
  <p><strong>Caminho:</strong> menu da conta → <strong>Meus Dados</strong> · <code>/meus-dados</code>.</p>
  <ol>
    <li>Abra <strong>Meus Dados</strong>.</li>
    <li>Confira nome, e-mail e perfil (somente leitura nesta área de identificação).</li>
    <li>Para senha: preencha senha atual, nova senha e confirmação e envie o formulário.</li>
  </ol>
  ${fig('11', 'meus-dados', 'Dados da conta logada e formulário de senha')}
  ${fields([
    ['Senha atual', 'Senha', 'Sim', 'Senha em uso.'],
    ['Nova senha', 'Senha', 'Sim', 'Regra de senha forte (mínimo 8 caracteres, maiúscula, minúscula, número e especial).'],
    ['Confirmar nova senha', 'Senha', 'Sim', 'Deve ser idêntica à nova senha.'],
  ])}
  <table>
    <thead><tr><th>Mensagem</th><th>Como corrigir</th></tr></thead>
    <tbody>
      <tr><td>Preencha os campos de senha.</td><td>Informe senha atual e nova senha.</td></tr>
      <tr><td>Texto da senha fraca</td><td>Siga o hint abaixo do campo (tamanho e tipos de caractere).</td></tr>
      <tr><td>A confirmação não confere com a nova senha.</td><td>Digite a mesma senha nos dois campos.</td></tr>
    </tbody>
  </table>
  ${note('A troca de senha nesta tela pode estar em integração com a API. Se a mensagem indicar “em breve”, peça a redefinição ao administrador em <strong>Usuários</strong>.')}

  <h3>11.2 Termos</h3>
  <p><strong>Caminho:</strong> <strong>Termos e Privacidade</strong> · <code>/termos</code>. O aceite é exigido no cadastro da conta.</p>
  ${fig('11', 'termos', 'Termos de uso e privacidade')}

  <h2 id="s12">12. Perguntas frequentes gerais</h2>
  <p><strong>Não vejo um menu.</strong> Falta permissão de leitura. Peça ajuste em <strong>Acessos</strong>.</p>
  <p><strong>Troquei o paciente e a ficha não mudou.</strong> Salve ou cancele a edição, confira o nome no topo e, se preciso, atualize a página.</p>
  <p><strong>Não entro no Início.</strong> Cadastre ou vincule um paciente (onboarding ou <strong>Pacientes</strong>).</p>
  <p><strong>Farmácia ou hospital não aparece na busca.</strong> Digite parte do nome. Fora da Grande Florianópolis, cadastre em Farmácias ou Estabelecimentos.</p>
  <p><strong>A sessão caiu.</strong> O token expira em algumas horas. Entre de novo.</p>
  <p><strong>Posso usar no celular?</strong> Sim. Menu hambúrguer no topo; no Início, barra inferior.</p>

  <h2 id="indice">Índice remissivo das telas</h2>
  <table>
    <thead><tr><th>Tela</th><th>Caminho no menu</th><th>Rota</th></tr></thead>
    <tbody>
      <tr><td>Login</td><td>—</td><td>/login</td></tr>
      <tr><td>Criar conta</td><td>Login → Criar conta</td><td>/registro</td></tr>
      <tr><td>Esqueci a senha</td><td>Login → Esqueceu a senha?</td><td>/esqueci-senha</td></tr>
      <tr><td>Onboarding</td><td>Automático no primeiro uso</td><td>/onboarding</td></tr>
      <tr><td>Painel</td><td>Dashboard</td><td>/dashboard</td></tr>
      <tr><td>Início / Sintomas</td><td>Início</td><td>/inicio</td></tr>
      <tr><td>Ficha do paciente</td><td>Início → Perfil</td><td>/inicio/perfil</td></tr>
      <tr><td>Eventos</td><td>Início → Eventos</td><td>/inicio/eventos</td></tr>
      <tr><td>Especialistas</td><td>Início → Especial.</td><td>/inicio/especialistas</td></tr>
      <tr><td>Agenda (Início)</td><td>Início → Agenda</td><td>/inicio/agenda</td></tr>
      <tr><td>Corpo</td><td>Início → Corpo</td><td>/inicio/corpo</td></tr>
      <tr><td>Linha (Início)</td><td>Início → Linha</td><td>/inicio/linha</td></tr>
      <tr><td>Medicamentos (Início)</td><td>Início → Medicamentos</td><td>/inicio/meds</td></tr>
      <tr><td>Exames (Início)</td><td>Início → Exames/Receitas</td><td>/inicio/docs</td></tr>
      <tr><td>Pacientes</td><td>Saúde → Pacientes</td><td>/pacientes</td></tr>
      <tr><td>Médicos</td><td>Saúde → Profissionais da Saúde</td><td>/medicos</td></tr>
      <tr><td>Remédios</td><td>Saúde → Medicamentos</td><td>/remedios</td></tr>
      <tr><td>Exames e receitas</td><td>Saúde → Exames / Receitas</td><td>/exames-receitas</td></tr>
      <tr><td>Estabelecimentos</td><td>Saúde → Estabelecimentos de Saúde</td><td>/hospitais</td></tr>
      <tr><td>Farmácias</td><td>Saúde → Farmácias</td><td>/farmacias</td></tr>
      <tr><td>Empresas cuidadoras</td><td>Saúde → Empresas Cuidadoras</td><td>/empresas-cuidadoras</td></tr>
      <tr><td>Cuidadores</td><td>Saúde → Cuidadores</td><td>/cuidadores</td></tr>
      <tr><td>Responsáveis</td><td>Saúde → Responsáveis</td><td>/responsaveis</td></tr>
      <tr><td>Agenda</td><td>Atividades → Agenda</td><td>/agenda</td></tr>
      <tr><td>Consultas</td><td>Atividades → Consultas</td><td>/consultas</td></tr>
      <tr><td>Rotina</td><td>Atividades → Rotina</td><td>/rotina</td></tr>
      <tr><td>Linha do tempo</td><td>Atividades → Timeline</td><td>/timeline</td></tr>
      <tr><td>Usuários</td><td>Administração → Usuários</td><td>/usuarios</td></tr>
      <tr><td>Perfis</td><td>Administração → Perfis</td><td>/perfis</td></tr>
      <tr><td>Acessos</td><td>Administração → Acessos</td><td>/acessos</td></tr>
      <tr><td>Auditoria</td><td>Administração → Auditoria</td><td>/auditoria</td></tr>
      <tr><td>Meus dados</td><td>Menu da conta → Meus Dados</td><td>/meus-dados</td></tr>
      <tr><td>Termos</td><td>Termos e Privacidade</td><td>/termos</td></tr>
    </tbody>
  </table>
`;
}
