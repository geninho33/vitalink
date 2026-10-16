-- Flag de reaceite por versão + Política 1.1.1 (esclarecimento sobre retenção de backups, sem novo aceite). Idempotente.
ALTER TABLE lgpd_documentos ADD COLUMN IF NOT EXISTS exige_reaceite BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO lgpd_documentos (tipo, versao, titulo, conteudo, exige_reaceite) VALUES
('politica_privacidade', '1.1.1', 'Política de Privacidade (LGPD)', $doc$Esta política explica como o VitaLink trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).

Quais dados tratamos:
- dados de cadastro: nome, e-mail, CPF (opcional), data de nascimento e telefone;
- dados de pacientes cadastrados por você ou pela sua rede de cuidado;
- dados sensíveis de saúde: medicamentos e doses, sintomas, sinais vitais, exames, receitas, consultas e anotações;
- registros técnicos: IP, navegador, inscrições de notificação e trilha de auditoria das operações.

Para que usamos: organizar o cuidado do paciente, enviar lembretes, permitir que pessoas autorizadas acompanhem as informações, gerar o relatório para o médico quando você pedir, e manter a segurança e a rastreabilidade do sistema.

Compartilhamento: não vendemos dados. Os dados só são compartilhados com os usuários vinculados ao paciente, com quem recebe um link de relatório criado por um responsável (somente o PDF, por tempo limitado) e com prestadores de infraestrutura necessários ao funcionamento do serviço.

Seus direitos (art. 18 da LGPD), diretamente no app, em "Meus dados":
- acesso e portabilidade: exportar seus dados e os dos pacientes que você gerencia (arquivo JSON ou planilhas CSV);
- revogação do consentimento para dados de saúde: o uso do app fica bloqueado até você aceitar de novo ou pedir a exclusão;
- eliminação: pedir a exclusão da conta. Após 15 dias de carência (cancelável), sua conta é anonimizada e seus acessos removidos.
Regras para pacientes compartilhados: se outro responsável ainda acompanha o paciente, os dados do paciente continuam com ele e apenas o seu vínculo é removido; se só restarem cuidadores, a gestão é transferida a um deles; se ninguém mais acompanha, o paciente e seus dados de saúde são excluídos. O registro do próprio paciente (autocuidado) é excluído quando o titular pede a exclusão.
O que guardamos mesmo após a exclusão, pelo mínimo necessário (art. 16 da LGPD): o registro dos aceites destes documentos e a trilha de auditoria, sem dados de saúde, para cumprimento de obrigação legal e defesa de direitos.
Cópias de segurança (backups) do banco de dados são mantidas por no máximo 30 dias e depois apagadas automaticamente. Por isso, dados excluídos ou anonimizados podem permanecer nessas cópias por até 30 dias, protegidos e sem uso, até serem descartados.
Correção e demais pedidos podem ser feitos no próprio app ou pelo canal de suporte (www.vitalink.app.br).

Esta política pode ser atualizada. Quando houver nova versão, pediremos seu aceite novamente.$doc$, FALSE)
ON CONFLICT (tipo, versao) DO NOTHING;
