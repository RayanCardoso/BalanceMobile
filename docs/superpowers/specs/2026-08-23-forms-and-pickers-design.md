# Formulários: campos que abrem, contas opcionais e uma pasta por família

Data: 2026-08-23
Repositórios: `mobile` (branch `feature/expense-forms-and-pickers`) e `backend`
(branch `feature/optional-expense-account`).
Telas: `RegisterExpenseScreen`, `RecordRecurringPaymentScreen`, `ExpenseMonthScreen`, e todas as que
importam de `@/components/form` e `@/components/states`.

## O problema

São cinco queixas, e quatro delas são a mesma queixa.

**Não dá para lançar um Pix.** O `RegisterExpenseScreen` oferece Crédito, Débito e Pix no picker de
tipo, mas `submit()` começa com `if (personId === null || categoryId === null || accountId === null)
return;`. Sem conta escolhida o botão não faz nada, sem aviso. E não adiantaria escolher: o picker de
conta lista todos os cartões de crédito, que é justamente de onde um Pix *não* sai. Do outro lado,
`Expense.AccountId` é `Guid` não-anulável no domínio e no `RequestRegisterExpenseJson`. A despesa
variável sem conta é impossível nas duas pontas.

**O calendário não abre no web.** O `DateField` já é usado em todos os seis campos de data do app, mas
por dentro ele é `@react-native-community/datetimepicker`, que não tem implementação para
`react-native-web`. No `expo start --web` o campo abre e nada acontece — que é exatamente o ambiente
onde se testa mais rápido.

**Escolher entre trinta categorias é uma parede de chips.** O `Picker` desenha toda opção como um chip
em `flexWrap`, e o estado selecionado é `accent.soft` (`#102A56`) sobre `surface.raised` (`#0B1F44`) —
duas cores que, num dispositivo real, são a mesma cor. A única diferença legível é a borda. Com poucas
opções isso é feio; com muitas, é ilegível.

**Escolher o mês de competência é arrastar setas.** O `MonthNavigator` sem `series` é uma barra com
"Mês anterior" e "Próximo mês". Como *navegação* entre meses vizinhos ela funciona. Como *campo* —
"em que mês esta despesa entra" — ela obriga a passar mês a mês para chegar em qualquer lugar.

E a quinta: `form.tsx` e `states.tsx` são dois arquivos com sete componentes, num projeto onde todo o
resto é um componente por arquivo com o teste ao lado.

## A ideia que amarra o resto

Data, seleção em lista e mês de competência são **o mesmo controle**: um campo que mostra o que está
escolhido e abre uma sobreposição para escolher outra coisa. Hoje são três desenhos diferentes porque
foram escritos em três momentos diferentes. Passam a ser três usos de duas peças:

- **`Sheet`** — a sobreposição. `Modal` transparente, scrim em `colors.scrim`, painel em
  `colors.surface.overlay` com `radius.lg`, título e um "Fechar". É o único lugar do app que desenha
  um modal de formulário.
- **`FieldTrigger`** — a caixa. Rótulo em `text.secondary`, uma `Pressable` com `surface.raised`,
  `border.subtle`, valor em `text.primary` (ou placeholder em `text.muted`), um ícone à direita, e a
  linha de erro em `status.negative` embaixo. É o visual que o `DateField` já tem hoje, extraído.

`DateField`, `Picker` em modo lista e `MonthField` são `FieldTrigger` + `Sheet` com conteúdos
diferentes. Um usuário que aprendeu a mexer em um sabe mexer nos três.

---

## 1. Despesa variável sem conta

### A regra

| Tipo | Conta |
| --- | --- |
| Crédito (0) | **obrigatória** — é o `closingDay` dela que decide o mês de competência |
| Débito (1) | opcional |
| Pix (2) | opcional |

E o picker de conta passa a refletir o tipo: Crédito oferece as contas com `closingDay !== null`
(os cartões), Débito e Pix oferecem as que têm `closingDay === null` (as contas correntes). Trocar o
tipo com uma conta escolhida que sai da lista limpa a escolha, porque uma seleção invisível que
continua sendo enviada é pior do que nenhuma.

Isto é uma regra de cliente que o servidor não tem, e é deliberado: o servidor aceita qualquer conta
com qualquer tipo, e continuará aceitando. O que o app faz é não *oferecer* o que quase nunca é o
certo. O comentário atual do `RegisterExpenseScreen` — "the account picker is not filtered to the
chosen person (AC7)" — continua valendo e não é contrariado: o filtro é por natureza da conta, nunca
por dono.

### Backend

Tudo abaixo espelha, linha por linha, o que `RegisterRecurringExpenseUseCase` já faz desde a migration
`20260815171348_TypeExpenseAndAccountNullable`: `RecurringExpense.AccountId` e
`RecurringExpensePayment.AccountId` já são `Guid?`. A despesa variável é a que ficou para trás.

| Arquivo | Mudança |
| --- | --- |
| `Domain/Entities/Expense.cs` | `Guid AccountId` → `Guid?`; `Account Account = null!` → `Account? Account` |
| `Communication/Requests/RequestRegisterExpenseJson.cs` | `Guid AccountId` → `Guid?` |
| `Communication/Responses/ResponseExpenseJson.cs` | `Guid AccountId` → `Guid?` |
| `Communication/Responses/ResponseMonthlyExpenseJson.cs` | em `ResponseVariableExpenseLineJson`: `Guid AccountId` → `Guid?`; `string AccountName = string.Empty` → `string? AccountName` |
| `Application/UseCases/Expenses/Register/RegisterExpenseValidator.cs` | nova regra: `RuleFor(e => e.AccountId).NotNull().When(e => e.Type == ExpenseType.Credit)` |
| `Exception/ResourceErrorMessages.resx` e `.pt-BR.resx` | nova chave `ACCOUNT_REQUIRED_FOR_CREDIT` |
| `Application/UseCases/Expenses/Register/RegisterExpenseUseCase.cs` | busca a conta só quando `request.AccountId is not null`; `CompetenceMonthResolver.Resolve(type, account?.ClosingDay, request.Date)`; `AccountId = account?.Id` |
| `Application/UseCases/Expenses/GetMonthly/GetMonthlyExpenseUseCase.cs` | `BuildVariableLine`: `AccountName = expense.Account?.Name` (hoje `?? string.Empty`) |
| `Infrastructure/Migrations/` | migration nova `ExpenseAccountNullable`: `AlterColumn` de `AccountId` em `Expenses` para `nullable: true` |

Mensagem da chave nova — pt-BR: `Escolha a conta ou cartão de uma despesa no crédito.`; invariante:
`An account is required for a credit expense.` O texto é do servidor e chega intacto na tela
(MAD-004); o app não escreve nenhuma variante dele.

**Não muda:** `CompetenceMonthResolver` — ele já lê `int? closingDay` e só rola para o mês seguinte
quando o tipo é `Credit` *e* há `closingDay`, então Pix e Débito sempre caíram no mês da data e
continuam caindo. `ExpenseController` não muda (a assinatura é o request). `InstallmentPlan` não muda:
um parcelamento é cartão por definição e sua conta segue obrigatória. `Dashboard` não referencia
`AccountId`. O `ExpenseRepository.GetForMonth` já faz `.Include(expense => expense.Account)`, e um
`Include` sobre FK anulável é uma `LEFT JOIN` — nada a fazer.

**Testes do backend:** `RequestRegisterExpenseJsonBuilder`, `RegisterExpenseValidatorTest`,
`RegisterExpenseUseCaseTest`, `WebApi.Test/Expenses/RegisterExpenseTest`,
`WebApi.Test/Expenses/GetMonthlyExpenseTest`. Casos novos: Pix sem conta é criado com
`AccountId` nulo e competência no mês da data; Crédito sem conta responde 400 com
`ACCOUNT_REQUIRED_FOR_CREDIT`; a linha mensal de uma despesa sem conta traz `accountName` nulo.

### Mobile

`RegisterExpenseInput.accountId` passa a `string | null`. Em `types/expense.ts`, `Expense.accountId` e
`VariableExpenseLine.accountId` passam a `string | null`, e `VariableExpenseLine.accountName` a
`string | null`, acompanhando as respostas. `RegisterInstallmentPlanInput.accountId` continua
`string`: o parcelamento não muda.

No `RegisterExpenseScreen`: a guarda de `submit()` passa a exigir conta apenas em Crédito; o rótulo do
picker vira `Conta` em Crédito e `Conta (opcional)` nos outros dois; as opções saem da lista filtrada.

Em `ExpenseMonthScreen:67`, `{line.date} · {line.accountName}` renderiza `"21/08/2026 · "` quando não
há conta. Passa a mostrar o rótulo do tipo — `EXPENSE_TYPE_LABEL[line.type]`, isto é, "Pix" — porque
"de onde saiu" é a pergunta que aquela posição responde, e sem conta a resposta é a forma de
pagamento.

---

## 2. Uma data que funciona no web

Entra `react-native-ui-datepicker@3.3.0`; sai `@react-native-community/datetimepicker`. A escolha é
por ser JavaScript puro — sem módulo nativo, mesma UI no web, no iOS e no Android, e temável pelos
tokens. Seu `main` aponta para `lib/commonjs/index`, então o Jest resolve sem tocar em
`transformIgnorePatterns`.

**O `DateField` mantém a API exatamente igual** — `label`, `value: 'YYYY-MM-DD'`, `onChange`,
`error?` — então nenhuma das seis telas que o usam muda uma linha. O que muda é o interior: o
calendário passa a viver no `Sheet` em vez de ser um diálogo do sistema no Android e um bloco inline
no iOS, e some com ele a bifurcação por `Platform.OS` que o componente carrega hoje.

Tema do calendário, dos tokens: painel em `surface.overlay`, dia selecionado em `surface.selected` com
`border.default`, hoje marcado em `accent.base`, dias de fora do mês em `text.muted`, cabeçalho de
semana em `text.secondary`. Locale `pt-br`.

A regra do `src/utils/dates.ts` continua sendo o contrato: **o `Date` nasce dos getters locais e morre
em `toApiDate` na mesma função**. `toDate`/`fromDate` do `DateField` seguem como estão; o que a
biblioteca devolve é convertido no mesmo handler e nada além disso vê um `Date`. Os testes de fuso
existentes continuam sendo o que prende isso.

O cabeçalho do `DateField` documenta hoje por que ele mora fora de `form.tsx`: "carrega um módulo
nativo e apresenta de duas formas diferentes conforme a plataforma". Depois desta mudança as duas
afirmações são falsas, e a fronteira que elas justificavam deixa de existir — por isso o arquivo se
muda para `form/` na seção 4.

**Mock de teste.** O `jest.setup.js` mocka hoje `@react-native-community/datetimepicker` expondo
`native-picker-set` e `native-picker-dismiss` e lendo `globalThis.__pickDate`. O mock passa a ser de
`react-native-ui-datepicker` com **os mesmos dois `testID` e o mesmo global**, para que as telas que
usam data não virem um refactor de teste à parte. O `DateField.test.tsx` mantém o seu mock próprio,
mais detalhado, pelo mesmo motivo de hoje: lá o assunto é o componente.

---

## 3. O Picker escolhe a própria forma

A API pública não muda — `label`, `options`, `selected`, `onChange` — e ganha um `placeholder?`
opcional. Quem escolhe entre as duas formas é o componente, pelo tamanho de `options`:

| `options.length` | Forma |
| --- | --- |
| ≤ 4 | chips (`OptionChips`) |
| > 4 | campo + lista (`SelectSheet`) |

É o mesmo princípio que o `MonthNavigator` já usa e documenta: *as telas nunca escolhem uma forma, só
dizem que dados têm*. Uma tela não passa a saber de layout, e uma casa com três categorias ganha
chips sem ninguém configurar nada. Na prática: Tipo e Prioridade sempre em chips; Categoria, Conta e
"contas recorrentes do mês" quase sempre em lista; Pessoa depende de quantas pessoas existem, que é
exatamente o critério certo.

**Chips.** O selecionado passa a ser `surface.selected` com `border.default`, rótulo em `text.primary`
e um ícone de check — cor não é o único sinal. O não selecionado fica em `surface.raised` com
`border.subtle` e rótulo em `text.secondary`. Alvo de toque mínimo de `control.size` (44). O
`accent.base` continua reservado para a ação primária da tela: um formulário com quatro chips azuis e
um botão azul não tem destaque nenhum.

**Lista.** `FieldTrigger` mostrando o rótulo da opção escolhida, ou o `placeholder` em `text.muted`
quando não há escolha, com um chevron à direita. Toque abre o `Sheet` com o rótulo do campo no título
e as opções como linhas roláveis (`surface.raised`, check em `accent.base` na escolhida). Acima de
oito opções o `Sheet` mostra um campo de busca que filtra por `label`, sem acento e sem caixa. Tocar
numa linha escolhe e fecha.

O `key` continua sendo `` `${value}-${index}` ``: duas entradas de catálogo podem legitimamente ter o
mesmo nome, e o índice é o que as mantém como opções distintas.

---

## 4. Uma pasta por família

```
src/components/form/            src/components/states/
  index.ts                        index.ts
  styles.ts                       styles.ts
  Sheet.tsx                       Screen.tsx
  FieldTrigger.tsx                Loading.tsx
  Field.tsx                       EmptyState.tsx
  Picker.tsx                      ErrorState.tsx
  OptionChips.tsx                 connectivity.ts
  SelectSheet.tsx
  SubmitButton.tsx
  DateField.tsx
  MonthField.tsx
```

Cada arquivo leva o seu `*.test.tsx` ao lado, como todo o resto do projeto. `styles.ts` guarda o que
mais de um componente da pasta usa — a coluna do campo (`field`, `label`, `error`) e a caixa do input
—, que é justamente a duplicação que hoje existe entre `form.tsx` e `DateField.tsx`.

`index.ts` reexporta tudo, então **nenhum import de tela muda**: `@/components/form` e
`@/components/states` continuam resolvendo. Isso é o que deixa o diff desta seção legível como
movimentação de arquivo em vez de um toque em quinze telas.

Duas coisas se movem além do pedido literal, e ambas por um motivo desta mesma spec:

1. `src/components/DateField.tsx` → `src/components/form/DateField.tsx`. O motivo documentado para ele
   estar fora morre na seção 2. Muda o import em seis arquivos, e todos passam a poder importar de
   `@/components/form` junto com `Field` e `SubmitButton`.
2. `CONNECTIVITY_MESSAGE` e `connectivityMessage` → `states/connectivity.ts`. Não são componentes;
   numa pasta de um componente por arquivo, ficariam sem arquivo próprio ou penduradas num alheio.

O `theme.ts` fica onde está. Ele não é dessas duas famílias e é importado por todo o app.

---

## 5. O mês de competência como campo

`MonthField({ label, year, month, onChange })`. O `FieldTrigger` mostra `monthLabel(year, month)` —
"Agosto de 2026" — com um ícone de calendário. O `Sheet` traz uma linha de ano (`‹ 2026 ›`, um passo
por toque) e uma grade 3×4 com as abreviações dos meses. O mês escolhido vem em `surface.selected` com
`border.default`; tocar em um mês chama `onChange(year, month)` e fecha. Trocar o ano não escolhe nada
sozinho — só muda o que a grade está mostrando —, senão passar por 2025 para chegar em 2024
registraria uma competência em 2025 no caminho.

Entra em dois lugares:

- **`RegisterExpenseScreen`**, sob o toggle "Definir o mês de competência", no lugar do
  `MonthNavigator`. O toggle continua exatamente como está: sem ele, `competenceMonth` vai nulo e a
  API decide (spec EXP AC3).
- **`RecordRecurringPaymentScreen`**, no lugar do par `<Text>Mês de referência</Text>` +
  `MonthNavigator`. O `MonthField` traz o próprio rótulo, então o `Text` solto e o
  `styles.sectionLabel` que só ele usava saem junto.

**Consequência: o `MonthNavigator` fica sem o seu ramo sem `series`.** Os três chamadores restantes —
`DashboardScreen`, `ExpenseMonthScreen`, `IncomeScreen` — sempre passam `series`, e nesse caso o
componente inteiro é `return <MonthTrend ... />`. Um wrapper de um `return` e um ramo morto é pior do
que nenhum wrapper: `MonthNavigator.tsx` e `MonthNavigator.test.tsx` são apagados e as três telas
importam `MonthTrend` diretamente. A linha de tendência não muda em nada.

---

## Testes

TDD nos dois repositórios: o teste que descreve o comportamento novo primeiro, vermelho, depois o
código.

**Mobile.** Um `*.test.tsx` por componente novo (`Sheet`, `FieldTrigger`, `OptionChips`,
`SelectSheet`, `MonthField`), com os existentes de `form` e `states` divididos junto com os
componentes. Os testes olham `testID` e `accessibilityRole`, então a movimentação de arquivos não
deve quebrar nada — se quebrar, foi estrutura que mudou junto e é para olhar.

Casos que precisam existir e hoje não existem:
- registrar Pix sem escolher conta chega na API com `accountId: null`;
- registrar Crédito sem conta não dispara a mutation;
- trocar o tipo de Crédito para Pix limpa uma conta escolhida que saiu da lista;
- `Picker` com 4 opções renderiza chips, com 5 renderiza o gatilho da lista;
- a busca do `SelectSheet` filtra ignorando acento e caixa;
- `MonthField` avança o ano sem alterar o valor, e escolher um mês fecha e reporta o par.

**Backend.** `dotnet test` nos três projetos. Além dos casos listados na seção 1, o
`RegisterExpenseValidatorTest` ganha o par simétrico: Crédito com conta é válido, Débito sem conta é
válido.

**Portas de saída.** Mobile: `npx tsc --noEmit` e `npm test`. Backend: `dotnet build` e `dotnet test`.
Depois disso, o app rodando em `expo start --web` para ver o calendário abrindo, um Pix sendo
registrado sem conta, e a grade de meses.

## Ordem de implementação

1. Backend: conta opcional na despesa variável (é o que destrava a tela).
2. Mobile: estrutura de pastas `form/` e `states/` sem mudança de comportamento.
3. Mobile: `Sheet` e `FieldTrigger`.
4. Mobile: `DateField` sobre a biblioteca nova.
5. Mobile: `Picker` híbrido.
6. Mobile: `MonthField` e a remoção do `MonthNavigator`.
7. Mobile: `RegisterExpenseScreen` com conta opcional e filtrada.

O passo 2 vem antes dos componentes novos para que eles nasçam já no lugar certo, e o passo 7 por
último porque é o único que depende do backend e dos três componentes ao mesmo tempo.

## O que esta spec não faz

- Não filtra conta por pessoa (spec EXP AC7 continua valendo).
- Não mexe no parcelamento: `InstallmentPlan` segue exigindo conta.
- Não mexe na linha de tendência do `MonthTrend` nem nas telas que navegam por mês.
- Não introduz tema claro, `Date` fora do `DateField`, nem cor literal fora do `theme.ts`.
