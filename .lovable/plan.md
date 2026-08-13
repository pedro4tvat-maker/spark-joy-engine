# Logins com acesso limitado (sem dados financeiros)

Objetivo: você cria contas para a equipe, elas usam cadastros, agenda e atividades normalmente, mas não veem nem editam valores de vendas e entregas.

## Como fica na prática

**Dois níveis de acesso**

- Gestão (administrador, coordenador, financeiro): tudo, incluindo financeiro.
- Operacional (vendedor, optometrista, entregador, motorista): cadastros, calendário, atividades, checklist, equipe, anexos e comentários — sem nenhum acesso a valores.

**Tela de Usuários (só para gestão)**

- Lista de usuários com nome, e-mail e papel.
- Botão "Novo usuário": nome, e-mail, senha inicial e papel — a conta já nasce pronta para uso.
- Trocar o papel de alguém ou desativar o acesso.

**O que o usuário operacional vê**

- Dashboard voltado à agenda: atividades de hoje, próximas, atrasadas e pendências de checklist. Sem faturamento, sem valores recebidos.
- Atividades: abas Detalhes, Checklist, Equipe, Anexos e Comentários. As abas Financeiro e Itens/OS não aparecem.
- Cadastros: pode criar e editar cidades, escolas, funcionários, veículos, laboratórios, parceiros e lentes. As listas suspensas e formas de pagamento continuam só para gestão.

## Detalhes técnicos

**Banco de dados**

1. Mover as colunas financeiras de `activities` (`amount_sold`, `amount_received`, `amount_pix`, `amount_cash`, `amount_card`, `sales_count`, `service_count`) para uma nova tabela `activity_finance` (1‑1 com a atividade), com GRANTs e RLS restritos a `is_manager(auth.uid())`. Esconder por RLS só funciona por linha, então separar a tabela é o que realmente impede leitura do valor pela API.
2. `delivery_items`: trocar as policies atuais por leitura e escrita apenas para `is_manager(auth.uid())`.
3. `cities`, `schools`, `employees`, `vehicles`, `labs`, `partners`, `lens_types`: liberar escrita para qualquer usuário autenticado (leitura já é livre). `list_options`, `payment_methods`, `dre_lines`, `finance_categories` continuam só para gestão.
4. `user_roles`: adicionar policies de inserção/alteração/remoção restritas a `is_admin(auth.uid())`.
5. `profiles`: já possui `active`; usado para bloquear acesso de contas desativadas.

**Aplicação**

- `src/lib/*.functions.ts` novo: server functions com `requireSupabaseAuth` que verificam o papel do chamador e usam o cliente admin (carregado dentro do handler) para criar usuário, definir papel e desativar acesso.
- Nova rota `src/routes/_authenticated/usuarios.tsx`, visível no menu apenas para gestão.
- `src/routes/_authenticated/atividades/$activityId.tsx`: abas Financeiro e Itens/OS renderizadas só quando `isManagerRole`; leitura/escrita passam a usar `activity_finance`.
- `src/routes/_authenticated/dashboard.tsx`: blocos de valores só para gestão; para operacional, dashboard focado em agenda e pendências.
- `src/components/app-shell.tsx`: itens de menu filtrados por papel.
- `src/routes/_authenticated/cadastros.tsx`: abas Listas e Pagamentos apenas para gestão.

**Observação**: como a criação de contas passa a ser feita por você, o cadastro público em `/auth` fica restrito a login (sem auto-signup).
