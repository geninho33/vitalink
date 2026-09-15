# Manual do Sistema VitaLink

**Versão:** 2.0 (texto operacional completo no PDF)  
**Público:** usuários do dia a dia (família, cuidador, médico e administrador)  
**Ambiente de homologação:** https://homolog.vitalink.app.br

A versão ilustrada, com passo a passo, tabelas de campos, caixas de dica/atenção/nota, figuras numeradas e índice remissivo, está em **`docs/Manual_do_Sistema.pdf`**.

Este Markdown é o resumo de consulta rápida. Os menus que você vê dependem do **perfil** da sua conta; se um item não aparecer, o administrador precisa liberar a leitura em **Acessos**.

---

## Sumário

1. [O que é o VitaLink](#1-o-que-é-o-vitalink)
2. [Acesso à conta](#2-acesso-à-conta)
3. [Primeiro uso e cadastro do paciente](#3-primeiro-uso-e-cadastro-do-paciente)
4. [Como a tela está organizada](#4-como-a-tela-está-organizada)
5. [Perfis e o que cada um pode fazer](#5-perfis-e-o-que-cada-um-pode-fazer)
6. [Painel (Dashboard)](#6-painel-dashboard)
7. [Início — rotina do paciente ativo](#7-início--rotina-do-paciente-ativo)
8. [Cadastros de saúde](#8-cadastros-de-saúde)
9. [Agenda, consultas, rotina e linha do tempo](#9-agenda-consultas-rotina-e-linha-do-tempo)
10. [Administração](#10-administração)
11. [Meus dados e termos](#11-meus-dados-e-termos)
12. [Perguntas frequentes](#12-perguntas-frequentes)

---

## 1. O que é o VitaLink

O VitaLink é uma plataforma de **cuidado contínuo no lar**. Ele reúne, em um só lugar:

- ficha do paciente (dados pessoais, alergias, diagnóstico);
- medicamentos, horários e confirmação de doses;
- consultas, rotina e eventos do dia a dia;
- rede de saúde (médicos, hospitais, clínicas, farmácias);
- exames e receitas;
- acesso controlado para familiar, cuidador, médico e administrador.

Tudo o que você registra fica ligado ao **paciente ativo** (o nome escolhido no seletor do topo). Trocar o paciente no combo troca o contexto de toda a rotina.

---

## 2. Acesso à conta

### 2.1 Entrar

1. Abra o endereço do sistema (ex.: homologação ou produção).
2. Informe **e-mail** e **senha**.
3. Opcional: marque **salvar credenciais** neste navegador.
4. Clique em **Entrar no Sistema**.

Se a senha estiver errada ou a conta estiver inativa, o sistema avisa na própria tela, sem detalhes internos do servidor.

### 2.2 Criar conta

Na tela de login, use **Criar conta** / **Registro**. Preencha nome, e-mail, senha forte e aceite os termos. Depois:

1. Confirme o e-mail pelo link enviado.
2. Faça login.
3. Conclua o **onboarding** (cadastro inicial do paciente), se o sistema pedir.

### 2.3 Esqueci a senha

1. Em **Esqueci a senha**, informe o e-mail da conta.
2. Abra o e-mail com o link de redefinição.
3. Defina uma senha nova (mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial).

### 2.4 Sair

No canto superior direito, abra o menu do seu nome e clique em **Sair**.

---

## 3. Primeiro uso e cadastro do paciente

Na primeira vez (ou se ainda não houver paciente vinculado), o sistema pode abrir o **onboarding**.

1. Informe **nome**, **data de nascimento** e **CPF** do paciente.
2. Se o CPF já existir, o VitaLink oferece **vincular** o cadastro em vez de criar outro.
3. Conclua o fluxo. Sem paciente, o restante do sistema fica bloqueado (só cadastro, termos e seus dados).

Perfis administrativos (Administrador, Médico, Atendente) também podem cadastrar pacientes em **Pacientes**, no menu lateral.

---

## 4. Como a tela está organizada

| Área | Função |
|------|--------|
| **Menu lateral** (à esquerda) | Módulos permitidos ao seu perfil. No celular, abre pelo ícone de menu. |
| **Topo** | Identificação do painel, **seletor de paciente** e menu da conta. |
| **Conteúdo** | Tela do módulo escolhido. |
| **Menu inferior** (módulo Início) | Atalhos: Sintomas, Perfil, Eventos, Agenda, Medicamentos, Exames etc. |

### 4.1 Paciente ativo

- Quem **não** é Autocuidado e tem mais de um paciente vê um **combo** no topo.
- Trocar o nome no combo troca medicamentos, agenda, ficha e eventos para aquele paciente.
- O perfil **Autocuidado** vê só o próprio nome (não há combo).

Sempre confira o nome no topo antes de registrar dose, consulta ou evento.

### 4.2 Menu da conta

- **Meus Dados:** seus dados de usuário (não a ficha clínica do paciente).
- **Sair:** encerra a sessão.

---

## 5. Perfis e o que cada um pode fazer

Os menus são montados pelas **permissões** do perfil. Em resumo:

| Perfil | Uso típico |
|--------|------------|
| **Administrador** | Usuários, perfis, acessos, auditoria e todos os cadastros. |
| **Médico** | Pacientes, medicamentos, consultas, linha do tempo, rede de saúde. |
| **Atendente** | Apoio operacional (leitura e cadastros permitidos). |
| **Cuidador** | Rotina do paciente vinculado: doses, eventos, agenda. Não cria/exclui pacientes. |
| **Responsável** | Acompanha o familiar; pode cadastrar alguns usuários da rede (cuidador, responsável, paciente), conforme permissão. |
| **Paciente** | Visualiza a própria rotina autorizada. |
| **Autocuidado** | Cuida de si mesmo: Início, médicos, estabelecimentos, farmácias e termos. |

Um mesmo e-mail pode ter **papéis** diferentes; o login carrega o papel ativo e os menus correspondentes.

---

## 6. Painel (Dashboard)

Rota: **Painel** / `/dashboard`.

- Saudação e recado do dia.
- Resumo da agenda e da rotina (quando o perfil não é só administrativo).
- Gráficos e atalhos conforme o perfil.

Use o painel para ver o que está **próximo** ou **atrasado**; o detalhe fica no Início e na Agenda.

---

## 7. Início — rotina do paciente ativo

Rota: **Início** / `/inicio`.  
Só funciona com pelo menos um paciente ativo. No rodapé (e no desktop em barra própria) você navega entre as telas abaixo.

### 7.1 Sintomas (visão geral)

- Resumo da **rede de cuidado** (hospitais, clínicas e profissionais).
- Na barra inferior: Perfil, Eventos, Agenda, Medicamentos, Exames etc.
- Em alguns perfis também aparece a semana de compromissos e o registro rápido de sintomas.

### 7.2 Perfil (ficha do paciente)

1. Abra **Perfil**.
2. Confira o paciente no combo do topo.
3. Clique em **Editar ficha**.
4. Preencha nome, nascimento, sexo, tipo sanguíneo, telefone, diagnóstico, alergias e observações.
5. **Salvar alterações** ou **Cancelar**.

Os campos ficam bloqueados até você clicar em Editar.

### 7.3 Eventos

Diário de bordo: sintomas, observações, ocorrências.  
Crie, edite e acompanhe o histórico do paciente ativo.

### 7.4 Especialistas

Rede de profissionais e locais usados no cuidado (busca e vínculo no contexto do Início).

### 7.5 Agenda (Início)

Compromissos do paciente (consultas, exames, retornos).  
É possível gerar evento para o **Google Agenda**, quando o botão estiver visível.

### 7.6 Corpo

Registros relacionados a queixas ou marcações no corpo (mapa / pontos de atenção).

### 7.7 Linha do tempo

Histórico unificado dos acontecimentos do paciente (doses, eventos, consultas), em ordem cronológica.

### 7.8 Medicamentos

1. Cadastre o remédio: nome, horário ou período (manhã, tarde, noite), quantidade a administrar, estoque, farmácia (busca automática), valor e intervalo em horas.
2. Confirme exclusões quando o sistema pedir.
3. Registre **compras** (quantidade, valor, data, farmácia).
4. Use **imprimir** para lista de medicamentos.
5. Opcional: enviar horário para o Google Agenda.

A farmácia pode ser escolhida no catálogo público da Grande Florianópolis ou em farmácias que você cadastrou.

### 7.9 Exames e receitas (Início)

Atalho para documentos do paciente (mesmo conjunto da tela **Exames/Receitas** do menu Saúde, com o paciente ativo).

---

## 8. Cadastros de saúde

Telas no padrão de **lista + formulário** (buscar, novo, editar, inativar, quando a permissão permitir).

### 8.1 Pacientes

- Nome, nascimento, CPF, contato, convênio, endereço, alergias, diagnóstico.
- Vínculos com **médicos** e **responsáveis**.
- Upload de foto e carteirinha de convênio, quando disponível.
- Se o CPF já existir, o sistema avisa para **vincular** em vez de duplicar.

### 8.2 Médicos

- Nome, **CRM**, **UF**, especialidade (busca).
- Telefone, e-mail e locais de atendimento (hospitais/clínicas com busca).
- CRM deve ser válido (4 a 10 dígitos) e único por UF.

### 8.3 Medicamentos (catálogo / prontuário)

Cadastro completo de remédios do paciente ou do catálogo, conforme a tela: nome comercial, indicação, farmácia, posologia, estoque e impressão.

### 8.4 Hospitais, clínicas e laboratórios

- Tipo: hospital, clínica ou laboratório.
- CNPJ (validado), endereço (CEP preenche logradouro), telefone.
- O catálogo público da Grande Florianópolis já vem preenchido; você pode incluir os seus.

### 8.5 Farmácias

Mesmo padrão de endereço e CNPJ. Use a busca no cadastro de medicamentos e nas compras.

### 8.6 Cuidadores e responsáveis

Pessoas da rede de cuidado, com contato e endereço.  
O **cuidador** só vê e atua nos pacientes aos quais está vinculado.

### 8.7 Empresas cuidadoras

Cadastro de empresas prestadoras de cuidado (razão social, contato, endereço).

### 8.8 Exames e receitas

Documentos clínicos: tipo, datas, paciente, arquivos anexos e status.

---

## 9. Agenda, consultas, rotina e linha do tempo

Módulo **Atividades** (além da agenda resumida do Início).

### 9.1 Agenda

Calendário mensal e lista de compromissos. Filtre pelo paciente quando a tela oferecer o campo.

### 9.2 Consultas

Agende consulta: paciente, médico (busca por nome/CRM), especialidade, data/hora, local.  
Marque como **concluída** quando o atendimento ocorrer.  
Há atalho para o Google Agenda.

### 9.3 Rotina

Tarefas recorrentes do cuidado (horários, descrição, paciente).  
Acompanhe execuções do dia.

### 9.4 Linha do tempo

Visão contínua dos eventos do paciente, útil para o médico e para a família revisarem o histórico.

---

## 10. Administração

Visível sobretudo para o **Administrador**.

### 10.1 Usuários

Criar, editar, inativar e redefinir senha.  
Associe um **perfil**. O responsável, quando permitido, só cria perfis da própria rede (cuidador, responsável, paciente).

### 10.2 Perfis

Nome e status do perfil (Administrador, Médico, Cuidador, etc.).

### 10.3 Acessos

Marque, por perfil, o que pode **ler, criar, editar e excluir** em cada menu.  
Quem não tem “ler” não vê o item na sidebar.

### 10.4 Auditoria

Trilha de quem fez o quê (login, cadastros, alterações).  
Os logs **não** gravam o conteúdo clínico completo (LGPD).

---

## 11. Meus dados e termos

- **Meus Dados:** altere seus dados de conta (nome, contato, senha), não a ficha do paciente.
- **Termos:** política e termos de uso; o aceite é exigido no cadastro.

---

## 12. Perguntas frequentes

**Não vejo um menu.**  
O perfil da conta não tem permissão de leitura para aquele módulo. Peça ao administrador para ajustar em **Acessos**.

**Troquei o paciente no combo e a ficha não mudou.**  
Atualize a página e confira se o nome no topo é o mesmo da ficha. Sempre salve ou cancele a edição antes de trocar de paciente.

**Não consigo entrar no Início.**  
É obrigatório ter ao menos um paciente vinculado. Conclua o onboarding ou cadastre em **Pacientes**.

**A farmácia / o hospital não aparece na busca.**  
Digite parte do nome. O catálogo público cobre a Grande Florianópolis; o restante deve ser cadastrado em Farmácias ou Hospitais/Clínicas.

**A sessão caiu.**  
O token expira após algumas horas. Faça login de novo.

**Esqueci a senha e não chega e-mail.**  
Verifique spam. Em homologação, o envio de e-mail pode estar limitado — peça ao administrador para redefinir em **Usuários**.

**Posso usar no celular?**  
Sim. O layout se adapta; o menu lateral abre pelo ícone no topo, e no Início há a barra inferior.

---

## Atalhos de rotas (referência)

| Tela | Caminho |
|------|---------|
| Login | `/login` |
| Painel | `/dashboard` |
| Início | `/inicio` |
| Ficha do paciente | `/inicio/perfil` |
| Eventos | `/inicio/eventos` |
| Especialistas | `/inicio/especialistas` |
| Medicamentos (Início) | `/inicio/meds` |
| Exames/Receitas (Início) | `/inicio/docs` |
| Pacientes | `/pacientes` |
| Médicos | `/medicos` |
| Remédios (catálogo) | `/remedios` |
| Farmácias | `/farmacias` |
| Hospitais/clínicas | `/hospitais` |
| Exames e receitas | `/exames-receitas` |
| Consultas | `/consultas` |
| Agenda | `/agenda` |
| Rotina | `/rotina` |
| Linha do tempo | `/timeline` |
| Usuários | `/usuarios` |
| Perfis | `/perfis` |
| Acessos | `/acessos` |
| Auditoria | `/auditoria` |
| Meus dados | `/meus-dados` |

---

## Onde está este arquivo

- Texto resumido: `docs/Manual_do_Sistema.md`
- PDF ilustrado (versão 2.0, passo a passo e figuras numeradas): `docs/Manual_do_Sistema.pdf`
- Geração: `docs/manual/gerar-pdf.mjs` (`cd docs/manual && npm install && npm run pdf`)

Documentação técnica complementar (API, banco, arquitetura) permanece nas outras páginas da pasta `docs/`.
