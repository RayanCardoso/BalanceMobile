# Redesign do Resumo do mês — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a lista linha-a-linha do dashboard por totais previsto×real, quatro linhas de grupo,
um carrossel de cartões coloridos por banco e três atalhos — e dissolver o destino "Catálogo".

**Architecture:** Toda a aritmética nova vive num único módulo puro (`src/utils/dashboard/projection.ts`);
toda cor nova vive em `src/components/theme.ts`; o mapeamento instituição → cor vive em `src/utils/bank.ts`.
A tela compõe esses três com dois componentes novos (`AccountCard`, `QuickActions`). As telas de
Pessoas, Categorias e Contas mudam de rota, não de conteúdo.

**Tech Stack:** React Native 0.86 / Expo SDK 57, expo-router, TanStack Query v5, lucide-react-native,
Jest + @testing-library/react-native, TypeScript 6.

## Global Constraints

- **Nenhum `#rrggbb` fora de `src/components/theme.ts`.** Cores de banco entram como família de tokens.
- **Nenhum número solto** em `padding`, `margin`, `gap`, `borderRadius` ou `fontSize`: use `space`, `radius`, `type`.
- **Ícones só de `lucide-react-native`.** Os usados aqui: `CreditCard`, `Landmark`, `UserPlus`, `Tags`, `Repeat`, `Coins`, `CalendarClock`, `ShoppingBag`, `ChevronRight`, `Plus`.
- **Todo container de tela tem `backgroundColor` explícito.**
- **Backend não é alterado.** `C:\estudos\Balance\backend\src` é somente leitura.
- Textos de UI em pt-BR. Mensagens da API não são reescritas (MAD-004).
- Import de tema é sempre `from '@/components/theme'`.

## Baseline (medido em 2026-08-19, antes deste plano)

`npx jest` → **10 suites / 45 testes falhando**, todos anteriores a este trabalho:
`ArchiveToggle`, `useRecurring`, `AppDrawer`, `AppNavigator`, `ChangeRecurringValueScreen`,
`ExpenseMonthScreen`, `IncomeScreen`, `RecordIncomePaymentScreen`, `RecordRecurringPaymentScreen`,
`RegisterRecurringExpenseScreen`.

`npx tsc --noEmit` → erros pré-existentes em `useRecurring.test.tsx` e `RecordRecurringPaymentScreen.tsx`
(`type` faltando em `RegisterRecurringPaymentInput`).

**Nenhuma tarefa deste plano conserta esses.** A régua de cada tarefa: as suites que ela toca passam, e a
contagem global de falhas não sobe. `AppDrawer` e `AppNavigator` são a exceção — a Tarefa 6 as deixa
verdes, porque a asserção quebrada (`/recurring`, destino que não existe) está nas linhas que ela edita.

---

### Task 1: Cores de banco

**Files:**
- Modify: `src/components/theme.ts` (`colors.bank`, `colors.bankFallback`, `card`)
- Create: `src/utils/bank.ts`
- Test: `src/utils/bank.test.ts`

**Interfaces:**
- Consumes: `colors` de `@/components/theme`.
- Produces: `type BankColour = { fill: string; ink: string }`, `bankColour(institution: string): BankColour`,
  `bankInitial(institution: string): string`, e os tokens `colors.bank`, `colors.bankFallback`,
  `card = { width: 264, height: 156 }`.

- [ ] **Step 1: Escrever `src/utils/bank.test.ts`** — cobre: Nubank achado como "Nubank", "Nu Pagamentos"
  e "NU PAGAMENTOS S.A."; Itaú achado com e sem acento e com "Banco"; bancos diferentes com `fill`
  diferente; desconhecido estável entre chamadas, vindo de `colors.bankFallback`, e dois desconhecidos
  distintos em cores distintas; instituição vazia não estoura; `bankInitial` maiúscula e `'?'` em branco.
- [ ] **Step 2: Rodar** `npx jest src/utils/bank.test.ts` → FAIL, `Cannot find module '@/utils/bank'`.
- [ ] **Step 3: Acrescentar `colors.bank` (14 bancos, cada um com `fill` + `ink` declarados juntos),
  `colors.bankFallback` (6 pares) e `export const card` a `theme.ts`.** O par `fill`/`ink` explícito é o
  que dispensa cálculo de luminância em runtime.
- [ ] **Step 4: Escrever `src/utils/bank.ts`** — normaliza (NFD, sem acento, minúsculas, sem ruído
  `banco|bank|s.a.|pagamentos|financeira|de|do|da`, sem pontuação), casa por **prefixo** contra as chaves
  ordenadas da mais longa para a mais curta, e cai num hash djb2 sobre `bankFallback` quando não casa.
- [ ] **Step 5: Rodar** `npx jest src/utils/bank.test.ts` → PASS. Se dois desconhecidos colidirem, troque o
  multiplicador do hash, não afrouxe a asserção.
- [ ] **Step 6: `npx tsc --noEmit`** → só os erros pré-existentes.
- [ ] **Step 7: Commit** `feat: cor de cartao por banco, com paleta de reserva estavel`

---

### Task 2: A aritmética do mês

**Files:**
- Create: `src/utils/dashboard/projection.ts`
- Test: `src/utils/dashboard/projection.test.ts`

**Interfaces:**
- Consumes: `MonthlyDashboard`, `IncomeType`.
- Produces: `Pair = { expected, actual }`, `Group = { count, total }`, `incomePair`, `expensePair`,
  `balancePair`, `incomeGroup(data, type)`, `variableExpenseGroup`, `recurringExpenseGroup`,
  `progress(pair): number | null`.

Contrato numérico, com a fixture de agosto (receita prevista 5000 / recebida 6000; variável 320,50;
recorrente prevista 150, paga 0; balance 5529,50):

| | previsto | real |
| --- | --- | --- |
| Receitas | `income.totalExpected` = 5000 | `income.totalReceived` = 6000 |
| Despesas | `totalVariable + totalRecurringExpected` = 470,50 | `totalVariable + totalRecurringPaid` = 320,50 |
| Saldo | previsto − previsto = 4529,50 | `balance` = 5529,50 |

`progress` devolve `min(actual/expected, 1)` e **null quando `expected <= 0`** — dividir por zero
desenharia uma barra que não significa nada.

- [ ] **Step 1: Escrever o teste** com as fixtures acima, mais um mês zerado e um `balance` negativo
  (que tem de sair `-470.5`, nunca em valor absoluto).
- [ ] **Step 2: Rodar** → FAIL, módulo inexistente.
- [ ] **Step 3: Escrever o módulo**, com cabeçalho documentando que é **a única exceção do app ao
  MAD-001**, por que existe (a API não publica despesa prevista nem saldo previsto) e o que fazer se
  passar a publicar: apagar o módulo.
- [ ] **Step 4: Rodar** → PASS.
- [ ] **Step 5: Commit** `feat: previsto x real do mes num modulo puro e testado`

---

### Task 3: O cartão de conta

**Files:**
- Create: `src/components/AccountCard.tsx`
- Test: `src/components/AccountCard.test.tsx`

**Interfaces:**
- Consumes: `bankColour`, `bankInitial`, `card`/`colors`/`radius`/`space`/`type`, `Account`.
- Produces: `AccountCard({ account, owner }: { account: Account; owner: string | null })`.

Regras que os testes travam:
- mostra nome da conta, instituição e dono;
- `fecha 05 · vence 12` em `account-card-days-<id>`, **omitido** quando os dois dias são nulos;
- **nunca** mostra o limite;
- marca d'água em `account-card-watermark-<id>` é só `•`, sem nenhum dígito;
- `owner === null` → a linha do dono não é renderizada (a consulta de pessoas não derruba o cartão);
- `backgroundColor` do cartão é `bankColour(institution).fill`, e todo texto usa `.ink`;
- `accessibilityLabel` = `"Nubank Roxinho, Nu Pagamentos, de Rayan"`, e sem o `, de …` quando não há dono.

- [ ] **Step 1: Escrever o teste** (10 casos, cobrindo cada regra acima).
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Escrever o componente** — `Link asChild href="/accounts"` sobre um `Pressable` de
  `card.width` × `card.height`, `radius.lg`, com selo da inicial, `CreditCard`, marca d'água, nome e
  rodapé com dono e dias.
- [ ] **Step 4: Rodar** → PASS.
- [ ] **Step 5: Commit** `feat: cartao de conta na cor do banco, sem vazar dado`

---

### Task 4: Os três atalhos

**Files:**
- Create: `src/components/QuickActions.tsx`
- Test: `src/components/QuickActions.test.tsx`

**Interfaces:**
- Produces: `QuickActions()`, sem props. Rotas fixas `/accounts`, `/people`, `/categories`.

- [ ] **Step 1: Escrever o teste** — os três `link-/…` existem, as três legendas em pt-BR
  ("Nova conta", "Nova pessoa", "Nova categoria") e os três `accessibilityLabel` correspondentes.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Escrever o componente** — círculos de `control.size` em `colors.surface.selected`,
  ícones `Landmark` / `UserPlus` / `Tags`, legenda em `type.caption` / `text.secondary`. O
  `accessibilityLabel` vai no `Pressable`, senão o leitor anuncia um botão sem nome.
- [ ] **Step 4: Rodar** → PASS.
- [ ] **Step 5: Commit** `feat: atalhos de conta, pessoa e categoria no resumo`

---

### Task 5: A tela

**Files:**
- Modify: `src/screens/Dashboard/DashboardScreen.tsx` (reescrita)
- Modify: `src/screens/Dashboard/DashboardScreen.styles.ts` (reescrita)
- Test: `src/screens/Dashboard/DashboardScreen.test.tsx` (reescrita parcial)

**Interfaces:** consome tudo das Tarefas 1–4, mais `useDashboard`/`useDashboardSeries` e
`useAccounts`/`usePeople`.

Ordem na tela: `MonthNavigator` → `Summary` → `Groups` → carrossel → `QuickActions`.

`testID`s: `dashboard-income-expected`, `dashboard-total-received`, `dashboard-expense-expected`,
`dashboard-expense-actual`, `dashboard-balance-expected`, `dashboard-balance`,
`dashboard-group-{recurring,variable}-{income,expenses}`, `dashboard-accounts`,
`dashboard-accounts-empty`, `quick-actions`.

> **Atenção:** a tela passa a chamar `useAccounts()` e `usePeople()`. O `beforeEach` do teste tem de
> stubar `GET /account` e `GET /person`, ou todo `it` morre em `no stub for`.

- [ ] **Step 1: Ajustar o teste** — fixtures de contas/pessoas; stubs no `beforeEach`; AC1 reescrito para
  os seis testIDs de previsto/real; os quatro grupos reescritos para uma linha cada (contagem, subtotal,
  `accessibilityLabel`) mais um caso que prova que os nomes dos lançamentos sumiram; carrossel (dois
  cartões com dono, estado vazio com "Cadastrar conta", `/account` 500 não derruba o mês, `/person` 500
  desenha o cartão sem dono); atalhos. Em "moving between months" e AC4, trocar
  `dashboard-total-committed` por `dashboard-expense-expected`.
- [ ] **Step 2: Rodar** → FAIL, `Unable to find an element with testID: dashboard-income-expected`.
- [ ] **Step 3: Reescrever `DashboardScreen.styles.ts`** — card de resumo, linha com barra
  (`track`/`fill`), linha de grupo, título de seção, carrossel e cartão vazio tracejado.
- [ ] **Step 4: Reescrever `DashboardScreen.tsx`** — `Bar`, `SummaryLine`, `GroupRow`, `Summary`,
  `Groups` e `renderAccounts`. `accounts.data === undefined` → carrossel não renderiza (a consulta
  lateral não derruba o mês); `ownerOf` devolve `null` quando as pessoas não chegaram.
- [ ] **Step 5: Rodar** `npx jest src/screens/Dashboard/DashboardScreen.test.tsx` → PASS.
- [ ] **Step 6: `npx tsc --noEmit && npx jest --silent`** → no máximo as 10 suites do baseline.
- [ ] **Step 7: Commit** `feat: resumo do mes em totais, grupos, cartoes e atalhos`

---

### Task 6: Dissolver o Catálogo

**Files:**
- Create: `app/(app)/{people,categories,accounts}/{_layout,index}.tsx`
- Delete: `app/(app)/catalogue/` (5 arquivos), `src/screens/Catalogue/` (3 arquivos)
- Modify: `src/navigation/AppDrawer.tsx`, `src/navigation/AppNavigator.tsx`
- Test: `src/navigation/AppDrawer.test.tsx`, `src/navigation/AppNavigator.test.tsx`

- [ ] **Step 1: Ajustar os testes de navegação** — gaveta alcança só `/`, `/income`, `/expenses`, e um
  caso novo prova que `link-/catalogue` e o texto "Catálogo" sumiram. Navegador declara `index`,
  `income`, `expenses`, `people`, `categories`, `accounts`, e não declara `catalogue`. Isso também
  remove as asserções de `/recurring`, que deixavam as duas suítes vermelhas desde antes deste plano.
- [ ] **Step 2: Rodar** `npx jest src/navigation/` → FAIL.
- [ ] **Step 3: Criar as três pastas de rota**, cada uma com `_layout.tsx` (um `Stack` com
  `stackHeader`, para haver botão de voltar) e `index.tsx` (ponto de montagem da tela existente).
- [ ] **Step 4: Apagar** `app/(app)/catalogue/` e `src/screens/Catalogue/`.
- [ ] **Step 5: Ajustar `AppDrawer` (três destinos) e `AppNavigator`** (trocar `catalogue` pelas três
  telas de cadastro, invisíveis no menu porque a gaveta desenha só `DESTINATIONS`).
- [ ] **Step 6: Corrigir as referências** a `app/(app)/catalogue/people.tsx` nos comentários de rota,
  para `app/(app)/people/index.tsx`. `useCatalogue.ts`, `types/catalogue.ts` e `utils/errors/catalogue.ts`
  **não** mudam de nome: "catálogo" continua sendo o nome do domínio.
- [ ] **Step 7: Rodar** `npx jest src/navigation/` → PASS.
- [ ] **Step 8: `npx tsc --noEmit && npx jest --silent`** → 8 suites vermelhas (as 10 do baseline menos
  as duas de navegação, que esta tarefa consertou).
- [ ] **Step 9: Commit** `refactor: catalogo vira tres rotas na raiz, alcancadas pelo resumo`

---

## Verificação final

- [ ] `npx tsc --noEmit` — só os erros pré-existentes de recorrentes.
- [ ] `npx jest --silent` — 8 suites vermelhas, nenhuma tocada por este plano.
- [ ] `grep -rn "#[0-9A-Fa-f]\{6\}" src --include=*.tsx --include=*.styles.ts` — nenhum resultado.
