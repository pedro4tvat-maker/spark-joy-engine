# Lançamento dos dados financeiros da venda

Hoje a aba **Financeiro** da atividade só mostra números (Vendido, Recebido, Dinheiro, PIX, Cartão, Atendimentos, Alunos, Vendas, Colaboradores) — não existe nenhum lugar no sistema para digitar esses valores. Os campos existem no banco, mas nenhuma tela grava neles. Por isso tudo aparece zerado.

## O que será feito

### 1. Aba Financeiro editável
Transformar a aba Financeiro em um formulário com campos:
- Valor vendido, Valor recebido
- Dinheiro, PIX, Cartão
- Atendimentos, Alunos atendidos, Vendas, Colaboradores

Botão **Salvar financeiro** grava direto na atividade. Enquanto não salva, aparece o aviso de alterações pendentes.

### 2. Conferência automática
Abaixo dos campos, um resumo calculado:
- Soma de Dinheiro + PIX + Cartão comparada com o Valor recebido (destaque em vermelho quando divergir)
- Total vendido/recebido somado a partir dos **Itens / OS** já lançados

### 3. Preencher a partir dos itens
Botão **Usar totais dos itens**: preenche Valor vendido, Valor recebido e Vendas com a soma dos itens de entrega lançados na aba Itens / OS, para não precisar digitar duas vezes.

### 4. Forma de pagamento no item
Na aba Itens / OS, incluir a seleção de forma de pagamento (lista de Formas de pagamento já cadastrada), que hoje não é preenchida.

## Detalhes técnicos
- Edição em `src/routes/_authenticated/atividades/$activityId.tsx`, aba `financeiro`, com estado local inicializado pela atividade e `update` na tabela `activities`.
- `delivery_items.payment_method_id` alimentado por select carregado de `payment_methods` (apenas ativos).
- Sem mudanças de schema; invalidação das queries após salvar.
