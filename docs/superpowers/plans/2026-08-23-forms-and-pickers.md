# Formulários: contas opcionais, data universal e pastas por família — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a conta opcional numa despesa variável de Débito/Pix, trocar o picker de data por um que funcione no web, redesenhar o `Picker` e o campo de mês de competência, e reorganizar `form.tsx`/`states.tsx` em pastas de um componente por arquivo.

**Architecture:** Data, seleção em lista e mês de competência viram três usos de duas peças novas — `Sheet` (a sobreposição) e `FieldTrigger` (a caixa que mostra o valor escolhido). No backend, `Expense.AccountId` passa a `Guid?` copiando o que `RegisterRecurringExpenseUseCase` já faz, com uma regra de validação nova que só exige conta no Crédito.

**Tech Stack:** React Native 0.86 / Expo SDK 57 / expo-router, TypeScript strict com `noUncheckedIndexedAccess`, Jest + `@testing-library/react-native`, TanStack Query v5. Backend .NET com FluentValidation, EF Core (PostgreSQL), xUnit + FluentAssertions.

**Spec:** [`docs/superpowers/specs/2026-08-23-forms-and-pickers-design.md`](../specs/2026-08-23-forms-and-pickers-design.md)

## Global Constraints

- **Dois repositórios, duas branches.** `C:\estudos\Balance\backend` na branch `feature/optional-expense-account` (Tasks 1–3). `C:\estudos\Balance\mobile` na branch `feature/expense-forms-and-pickers` (Tasks 4–11). Ambas já existem. Commits em **inglês**.
- **Nenhuma cor literal fora de `src/components/theme.ts`.** Um `#rrggbb` em qualquer outro arquivo é um bug. Se falta um token, adicione-o em `theme.ts` respeitando as famílias `surface`/`border`/`text`/`accent`/`status`.
- **Nenhum `padding`, `gap`, `margin`, `fontSize` ou `borderRadius` numérico solto.** Tudo sai de `space`, `type` e `radius`. Expressões como `space.xs + 2` são aceitas e já existem no projeto.
- **Todo `TextInput` define `color` e `placeholderTextColor={colors.text.muted}`.** O padrão do RN é escuro sobre escuro.
- **Nenhum `Date` fora do `DateField`.** `src/utils/dates.ts` documenta por quê: `new Date('2026-08-21')` é meia-noite UTC e lê como o dia 20 em São Paulo. Datas circulam como `'YYYY-MM-DD'`. O `Date` nasce dos getters locais (`new Date(ano, mês - 1, dia)`) e morre em `toApiDate` na mesma função.
- **Mensagens de erro da API não são reescritas no app (MAD-004).** O texto que a tela mostra é o que o servidor mandou.
- **Alias `@/*` → `src/*`** já configurado nos três lugares (`tsconfig.json`, `babel.config.js`, `jest.config.js`).
- **Portas de saída do mobile:** `npx tsc --noEmit` e `npm test`. **Do backend:** `dotnet build` e `dotnet test`.
- **Chave de erro nova (verbatim):** `ACCOUNT_REQUIRED_FOR_CREDIT` — pt-BR `Escolha a conta ou cartão de uma despesa no crédito.` / invariante `An account is required for a credit expense.`

---

## Estrutura de arquivos ao final

```
mobile/src/components/
  form/
    index.ts            reexporta tudo — nenhum import de tela muda
    styles.ts           fieldStyles: a coluna do campo, a caixa, o input, o erro
    Sheet.tsx           a sobreposição (Modal + scrim + folha + cabeçalho)
    FieldTrigger.tsx    rótulo + caixa pressionável + valor/placeholder + ícone + erro
    Field.tsx           TextInput (movido de form.tsx, sem mudança)
    SubmitButton.tsx    (movido de form.tsx, sem mudança)
    OptionChips.tsx     o segmented control (≤ 4 opções)
    SelectSheet.tsx     FieldTrigger + Sheet com lista e busca (> 4 opções)
    Picker.tsx          escolhe entre os dois pelo tamanho de options
    DateField.tsx       (movido da raiz) FieldTrigger + Sheet + react-native-ui-datepicker
    MonthField.tsx      FieldTrigger + Sheet com ano e grade 3×4 de meses
    *.test.tsx          um por arquivo acima que tenha comportamento
  states/
    index.ts            reexporta tudo
    styles.ts
    Screen.tsx  Loading.tsx  EmptyState.tsx  ErrorState.tsx  connectivity.ts
    *.test.tsx
  theme.ts              fica onde está
  (MonthNavigator.tsx e MonthNavigator.test.tsx são apagados na Task 10)
```

---

## Task 1: Backend — a conta da despesa variável passa a ser opcional

**Repo:** `C:\estudos\Balance\backend`, branch `feature/optional-expense-account`.

**Files:**
- Modify: `src/Balance.Domain/Entities/Expense.cs`
- Modify: `src/Balance.Communication/Requests/RequestRegisterExpenseJson.cs`
- Modify: `src/Balance.Communication/Responses/ResponseExpenseJson.cs`
- Modify: `src/Balance.Application/UseCases/Expenses/Register/RegisterExpenseUseCase.cs`
- Create: `src/Balance.Infrastructure/Migrations/<timestamp>_ExpenseAccountNullable.cs` (gerada)
- Modify: `tests/CommonTestUtilities/Requests/RequestRegisterExpenseJsonBuilder.cs`
- Test: `tests/UseCases.Test/Expenses/Register/RegisterExpenseUseCaseTest.cs`

**Interfaces:**
- Consumes: nada.
- Produces: `RequestRegisterExpenseJson.AccountId` do tipo `Guid?`; `ResponseExpenseJson.AccountId` do tipo `Guid?`; `Expense.AccountId` do tipo `Guid?` e `Expense.Account` do tipo `Account?`. Task 2 depende do request ser `Guid?`; Task 11 depende da resposta aceitar `null`.

- [ ] **Step 1: Ler o precedente antes de escrever qualquer coisa**

Abra `src/Balance.Application/UseCases/RecurringExpenses/Register/RegisterRecurringExpenseUseCase.cs` e leia o bloco entre a busca da categoria e a construção da entidade. É exatamente o que esta task copia para a despesa variável. `RecurringExpense.AccountId` já é `Guid?` desde a migration `20260815171348_TypeExpenseAndAccountNullable`.

- [ ] **Step 2: Escrever o teste que falha**

Em `tests/UseCases.Test/Expenses/Register/RegisterExpenseUseCaseTest.cs`, acrescente. Siga o padrão de arrange dos testes já existentes no arquivo (o mesmo builder de usuário logado, os mesmos repositórios mockados) — copie o arrange do teste de sucesso que já está lá e mude só o request e as asserções:

```csharp
[Fact]
public async Task Success_Pix_Without_Account()
{
    // Arrange: mesmo setup do teste de sucesso existente, mas o repositório de conta
    // não deve ser consultado, então não configure GetById para ele.
    var request = RequestRegisterExpenseJsonBuilder.Build();
    request.Type = Balance.Communication.Enums.ExpenseType.Pix;
    request.AccountId = null;
    request.Date = new DateOnly(2026, 8, 21);

    // Act
    var result = await useCase.Execute(request);

    // Assert
    result.AccountId.Should().BeNull();
    // Pix nunca rola para o mês seguinte, qualquer que seja o dia.
    result.CompetenceMonth.Should().Be(new DateOnly(2026, 8, 1));
}
```

- [ ] **Step 3: Rodar o teste e confirmar que ele nem compila**

Run: `dotnet test tests/UseCases.Test --filter FullyQualifiedName~RegisterExpenseUseCaseTest`
Expected: FAIL na compilação — `Cannot convert null literal to non-nullable reference type` / `Cannot assign null to 'Guid'` em `request.AccountId = null`.

- [ ] **Step 4: Tornar os contratos anuláveis**

Em `src/Balance.Domain/Entities/Expense.cs`, troque as duas linhas da conta:

```csharp
    /// <summary>
    /// Null when the expense was not paid from a registered account — a Pix or a debit
    /// purchase the user did not attach to one. A credit expense always carries an account:
    /// it is that account's closing day that decides which month the purchase belongs to.
    /// </summary>
    public Guid? AccountId { get; set; }
    public Account? Account { get; set; }
```

Em `src/Balance.Communication/Requests/RequestRegisterExpenseJson.cs`:

```csharp
    /// <summary>Required for a credit expense; optional for debit and Pix.</summary>
    public Guid? AccountId { get; set; }
```

Em `src/Balance.Communication/Responses/ResponseExpenseJson.cs`:

```csharp
    public Guid? AccountId { get; set; }
```

- [ ] **Step 5: Buscar a conta só quando ela vier**

Em `src/Balance.Application/UseCases/Expenses/Register/RegisterExpenseUseCase.cs`, substitua o bloco

```csharp
        // The account may belong to a different Person of the same user (EXPN-01 AC7).
        var account = await _accountReadOnlyRepository.GetById(loggedUser, request.AccountId)
            ?? throw new NotFoundException(ResourceErrorMessages.ACCOUNT_NOT_FOUND);

        var type = (ExpenseType)request.Type;
```

por

```csharp
        // The account may belong to a different Person of the same user (EXPN-01 AC7), and may be
        // absent altogether: a Pix or a debit purchase does not have to come out of a registered
        // account. Mirrors RegisterRecurringExpenseUseCase, where the account is already optional.
        Account? account = null;

        if (request.AccountId is not null)
        {
            account = await _accountReadOnlyRepository.GetById(loggedUser, request.AccountId.Value)
                ?? throw new NotFoundException(ResourceErrorMessages.ACCOUNT_NOT_FOUND);
        }

        var type = (ExpenseType)request.Type;
```

Na construção da entidade, troque as duas linhas que usam a conta:

```csharp
            CompetenceMonth = request.CompetenceMonth?.FirstDayOfMonth()
                ?? CompetenceMonthResolver.Resolve(type, account?.ClosingDay, request.Date),
```
```csharp
            AccountId = account?.Id
```

E na resposta:

```csharp
            AccountId = expense.AccountId,
```

`CompetenceMonthResolver.Resolve` já recebe `int? closingDay` e só rola para o mês seguinte quando o tipo é `Credit` **e** há `closingDay` — nada nele muda.

- [ ] **Step 6: Deixar o builder de teste montar um request sem conta**

Em `tests/CommonTestUtilities/Requests/RequestRegisterExpenseJsonBuilder.cs`, o `AccountId` continua sendo preenchido por padrão (os testes existentes contam com isso). Só confirme que o tipo da propriedade preenchida compila como `Guid?` — se o builder usa `Guid.NewGuid()`, não precisa mudar nada.

- [ ] **Step 7: Gerar a migration**

Run:
```bash
dotnet ef migrations add ExpenseAccountNullable --project src/Balance.Infrastructure --startup-project src/Balance.Api
```
Expected: um arquivo novo em `src/Balance.Infrastructure/Migrations/` cujo `Up` contém **apenas** um `AlterColumn<Guid>` de `AccountId` na tabela `Expenses` com `nullable: true`. Abra o arquivo e confirme. Se a migration trouxer qualquer outra alteração, algum modelo divergiu do snapshot — pare e investigue antes de seguir.

- [ ] **Step 8: Rodar os testes**

Run: `dotnet test`
Expected: PASS, incluindo o teste novo e todos os que já existiam.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: a variable expense may have no account

Pix and debit purchases do not have to come out of a registered account.
Expense.AccountId becomes nullable, mirroring RecurringExpense, which has
allowed this since TypeExpenseAndAccountNullable."
```

---

## Task 2: Backend — crédito continua exigindo conta

**Files:**
- Modify: `src/Balance.Exception/ResourceErrorMessages.resx`
- Modify: `src/Balance.Exception/ResourceErrorMessages.pt-BR.resx`
- Modify: `src/Balance.Application/UseCases/Expenses/Register/RegisterExpenseValidator.cs`
- Test: `tests/Validators.Tests/Expenses/Register/RegisterExpenseValidatorTest.cs`
- Test: `tests/WebApi.Test/Expenses/RegisterExpenseTest.cs`

**Interfaces:**
- Consumes: `RequestRegisterExpenseJson.AccountId` do tipo `Guid?` (Task 1).
- Produces: a chave `ResourceErrorMessages.ACCOUNT_REQUIRED_FOR_CREDIT`. Task 11 conta com esse 400 chegando na tela pelo caminho normal de erros da API.

- [ ] **Step 1: Escrever os testes que falham**

Em `tests/Validators.Tests/Expenses/Register/RegisterExpenseValidatorTest.cs`, acrescente três casos (siga o formato dos testes já no arquivo, que constroem o validator direto e chamam `Validate`):

```csharp
[Fact]
public void Error_Credit_Without_Account()
{
    var validator = new RegisterExpenseValidator();
    var request = RequestRegisterExpenseJsonBuilder.Build();
    request.Type = Balance.Communication.Enums.ExpenseType.Credit;
    request.AccountId = null;

    var result = validator.Validate(request);

    result.IsValid.Should().BeFalse();
    result.Errors.Should().ContainSingle()
        .And.Contain(e => e.ErrorMessage.Equals(ResourceErrorMessages.ACCOUNT_REQUIRED_FOR_CREDIT));
}

[Fact]
public void Success_Pix_Without_Account()
{
    var validator = new RegisterExpenseValidator();
    var request = RequestRegisterExpenseJsonBuilder.Build();
    request.Type = Balance.Communication.Enums.ExpenseType.Pix;
    request.AccountId = null;

    var result = validator.Validate(request);

    result.IsValid.Should().BeTrue();
}

[Fact]
public void Success_Debit_Without_Account()
{
    var validator = new RegisterExpenseValidator();
    var request = RequestRegisterExpenseJsonBuilder.Build();
    request.Type = Balance.Communication.Enums.ExpenseType.Debit;
    request.AccountId = null;

    var result = validator.Validate(request);

    result.IsValid.Should().BeTrue();
}
```

- [ ] **Step 2: Rodar os testes e confirmar a falha**

Run: `dotnet test tests/Validators.Tests --filter FullyQualifiedName~RegisterExpenseValidatorTest`
Expected: FAIL na compilação — `ResourceErrorMessages` não tem `ACCOUNT_REQUIRED_FOR_CREDIT`.

- [ ] **Step 3: Adicionar a chave nos dois resx**

Em `src/Balance.Exception/ResourceErrorMessages.resx`, junto dos outros `<data>`:

```xml
  <data name="ACCOUNT_REQUIRED_FOR_CREDIT" xml:space="preserve">
    <value>An account is required for a credit expense.</value>
  </data>
```

Em `src/Balance.Exception/ResourceErrorMessages.pt-BR.resx`:

```xml
  <data name="ACCOUNT_REQUIRED_FOR_CREDIT" xml:space="preserve">
    <value>Escolha a conta ou cartão de uma despesa no crédito.</value>
  </data>
```

- [ ] **Step 4: Escrever a regra**

Em `src/Balance.Application/UseCases/Expenses/Register/RegisterExpenseValidator.cs`, dentro do construtor, depois da regra de `Amount`:

```csharp
        // Only credit needs one: it is the account's closing day that decides which month the
        // purchase belongs to. A Pix does not come out of a card, and debit does not have to come
        // out of a registered account at all.
        RuleFor(expense => expense.AccountId)
            .NotNull()
            .When(expense => expense.Type == ExpenseType.Credit)
            .WithMessage(ResourceErrorMessages.ACCOUNT_REQUIRED_FOR_CREDIT);
```

Acrescente `using Balance.Communication.Enums;` no topo se ainda não estiver lá.

- [ ] **Step 5: Rodar os testes do validator**

Run: `dotnet test tests/Validators.Tests --filter FullyQualifiedName~RegisterExpenseValidatorTest`
Expected: PASS.

- [ ] **Step 6: Escrever o teste de ponta a ponta**

Em `tests/WebApi.Test/Expenses/RegisterExpenseTest.cs`, acrescente (siga o arrange dos testes já existentes no arquivo — o mesmo `CreateClient`, o mesmo token, o mesmo `culture`):

```csharp
[Theory]
[InlineData("pt-BR")]
public async Task Error_Credit_Without_Account(string culture)
{
    var request = RequestRegisterExpenseJsonBuilder.Build();
    request.Type = ExpenseType.Credit;
    request.AccountId = null;

    var response = await DoPost(requestUri: METHOD, request: request, token: _token, culture: culture);

    response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

    var body = await response.Content.ReadAsStreamAsync();
    var errors = await JsonDocument.ParseAsync(body);
    var messages = errors.RootElement.GetProperty("errorMessages").EnumerateArray();

    var expected = ResourceErrorMessages.ResourceManager
        .GetString("ACCOUNT_REQUIRED_FOR_CREDIT", new CultureInfo(culture));

    messages.Should().ContainSingle().And.Contain(m => m.GetString()!.Equals(expected));
}
```

- [ ] **Step 7: Rodar tudo**

Run: `dotnet test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: reject a credit expense with no account

The account's closing day is what decides a credit purchase's competence
month, so credit is the one type that cannot do without one."
```

---

## Task 3: Backend — a linha mensal sem conta não mente um nome vazio

**Files:**
- Modify: `src/Balance.Communication/Responses/ResponseMonthlyExpenseJson.cs:40-41`
- Modify: `src/Balance.Application/UseCases/Expenses/GetMonthly/GetMonthlyExpenseUseCase.cs`
- Test: `tests/WebApi.Test/Expenses/GetMonthlyExpenseTest.cs`

**Interfaces:**
- Consumes: `Expense.AccountId` do tipo `Guid?` (Task 1).
- Produces: `ResponseVariableExpenseLineJson.AccountId` do tipo `Guid?` e `AccountName` do tipo `string?`. Task 11 lê esses dois no mobile.

- [ ] **Step 1: Escrever o teste que falha**

Em `tests/WebApi.Test/Expenses/GetMonthlyExpenseTest.cs`, acrescente um teste que registra uma despesa Pix sem conta e lê o mês. Siga o arrange dos testes já existentes no arquivo; o que importa é a asserção final:

```csharp
[Fact]
public async Task Variable_Line_Without_Account_Has_No_Account_Name()
{
    // Arrange: registre uma despesa Pix com AccountId null no mês corrente, do mesmo jeito
    // que os testes existentes registram uma de crédito.

    var response = await DoGet(requestUri: $"{METHOD}/{year}/{month}", token: _token);

    var body = await response.Content.ReadAsStreamAsync();
    var document = await JsonDocument.ParseAsync(body);
    var line = document.RootElement.GetProperty("variableLines").EnumerateArray().Single();

    line.GetProperty("accountId").ValueKind.Should().Be(JsonValueKind.Null);
    line.GetProperty("accountName").ValueKind.Should().Be(JsonValueKind.Null);
}
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `dotnet test tests/WebApi.Test --filter FullyQualifiedName~GetMonthlyExpenseTest`
Expected: FAIL — `accountName` chega como `""` (`JsonValueKind.String`), não como `null`.

- [ ] **Step 3: Tornar os dois campos anuláveis**

Em `src/Balance.Communication/Responses/ResponseMonthlyExpenseJson.cs`, dentro de `ResponseVariableExpenseLineJson`:

```csharp
    /// <summary>Null when the expense was not paid from a registered account.</summary>
    public Guid? AccountId { get; set; }

    /// <summary>Null when there is no account — never an empty string, which would read as a
    /// nameless account rather than as no account at all.</summary>
    public string? AccountName { get; set; }
```

- [ ] **Step 4: Parar de inventar a string vazia**

Em `src/Balance.Application/UseCases/Expenses/GetMonthly/GetMonthlyExpenseUseCase.cs`, em `BuildVariableLine`:

```csharp
            AccountId = expense.AccountId,
            AccountName = expense.Account?.Name,
```

- [ ] **Step 5: Rodar tudo**

Run: `dotnet test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: a monthly line with no account reports null, not an empty name

An empty string reads as an account without a name. Null reads as what it
is: the purchase did not come out of a registered account."
```

---

## Task 4: Mobile — `states.tsx` vira a pasta `states/`

**Repo:** `C:\estudos\Balance\mobile`, branch `feature/expense-forms-and-pickers`. Daqui em diante tudo é mobile.

Esta task **não muda comportamento nenhum**. É movimentação de arquivo, e a prova disso é a suíte passar sem que nenhum teste seja editado além de ser dividido.

**Files:**
- Create: `src/components/states/index.ts`, `styles.ts`, `Screen.tsx`, `Loading.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `connectivity.ts`
- Create: `src/components/states/Screen.test.tsx`, `Loading.test.tsx`, `EmptyState.test.tsx`, `ErrorState.test.tsx`, `connectivity.test.tsx`
- Delete: `src/components/states.tsx`, `src/components/states.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `@/components/states` continua exportando `Screen`, `Loading`, `EmptyState`, `ErrorState`, `CONNECTIVITY_MESSAGE` e `connectivityMessage` com as mesmas assinaturas. Nenhuma tela muda.

- [ ] **Step 1: Criar `src/components/states/styles.ts`**

Mova o `StyleSheet.create` inteiro do fim de `states.tsx` para cá, com os comentários, e exporte com nome:

```ts
import { StyleSheet } from 'react-native';

import { colors, radius, space, type } from '@/components/theme';

/**
 * Os estilos das quatro coisas que uma tela pode estar mostrando. Ficam juntos, e não um pedaço em
 * cada arquivo, porque `centered` e `message` são literalmente os mesmos três estados e uma cópia
 * por arquivo seria três lugares para ajustar o mesmo respiro.
 */
export const stateStyles = StyleSheet.create({
  // ... cole aqui, sem alterar, todas as chaves e comentários do StyleSheet.create de states.tsx
});
```

Nos componentes, `styles.x` passa a ser `stateStyles.x`.

- [ ] **Step 2: Criar um arquivo por componente**

`src/components/states/connectivity.ts` recebe o comentário de topo sobre MAD-004, `CONNECTIVITY_MESSAGE` e `connectivityMessage`, mais o `import { NetworkError } from '@/services/ApiError';`.

`Screen.tsx`, `Loading.tsx`, `EmptyState.tsx` e `ErrorState.tsx` recebem cada um a sua função e **os seus comentários de documentação**, importando `stateStyles` de `./styles` e o que mais precisarem. O comentário de topo de `states.tsx` ("The four things a screen can be showing…") vai para `index.ts`, porque é sobre a família, não sobre um componente.

- [ ] **Step 3: Criar `src/components/states/index.ts`**

```ts
/**
 * The four things a screen can be showing. Every list screen is built from these, which is what
 * makes UX-01 structural instead of something each screen has to remember: a screen that forgot its
 * empty state would have nothing to render at all.
 *
 * `ErrorState` takes its message from the caller. The API's own pt-BR copy is what reaches it
 * (MAD-004), so no wording is stored here - with the single exception in `connectivity.ts`, which
 * exists precisely because the API said nothing.
 */

export { Screen } from './Screen';
export { Loading } from './Loading';
export { EmptyState } from './EmptyState';
export { ErrorState } from './ErrorState';
export { CONNECTIVITY_MESSAGE, connectivityMessage } from './connectivity';
```

- [ ] **Step 4: Dividir o teste**

Cada bloco `describe` de `src/components/states.test.tsx` vai, **verbatim**, para o arquivo do componente que ele testa: `describe('Screen')` e `describe('o container de tela')` → `Screen.test.tsx`; e assim por diante. Os `import` no topo de cada arquivo novo passam a trazer só o que aquele arquivo usa. O caminho de import continua sendo `@/components/states`, que é o ponto: o teste não sabe que houve mudança.

- [ ] **Step 5: Apagar os arquivos antigos**

```bash
git rm src/components/states.tsx src/components/states.test.tsx
```

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit && npm test`
Expected: PASS, com o mesmo número de testes de antes. Se algum teste sumiu da contagem, um `describe` ficou para trás na divisão.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: states.tsx becomes a folder, one component per file"
```

---

## Task 5: Mobile — `form.tsx` vira a pasta `form/`

Também sem mudança de comportamento.

**Files:**
- Create: `src/components/form/index.ts`, `styles.ts`, `Field.tsx`, `Picker.tsx`, `SubmitButton.tsx`
- Create: `src/components/form/Field.test.tsx`, `Picker.test.tsx`, `SubmitButton.test.tsx`
- Delete: `src/components/form.tsx`, `src/components/form.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `@/components/form` continua exportando `Field`, `Picker`, `SubmitButton` e o tipo `PickerOption<T>`. `fieldStyles` passa a ser exportado de `@/components/form/styles` para uso interno da pasta; **não** entra no `index.ts`, porque estilo não é API pública. Tasks 6–10 importam `fieldStyles` daí.

- [ ] **Step 1: Criar `src/components/form/styles.ts`**

Este arquivo é a única parte da task que não é cópia: as chaves `field`, `label`, `error` e `input` do `form.tsx` são as mesmas que o `DateField.tsx` da raiz redeclara hoje, e `box`/`boxInvalid`/`value`/`placeholder` são as chaves `input`/`inputInvalid`/`value` do `DateField` renomeadas para o que elas são (uma caixa pressionável, não um input).

```ts
import { StyleSheet } from 'react-native';

import { colors, radius, space, type } from '@/components/theme';

/**
 * A coluna de um campo, e as duas formas que o controle dentro dela pode ter.
 *
 * `input` é o `TextInput` do `Field`. `box` é a caixa pressionável que o `FieldTrigger` desenha —
 * mesma altura, `paddingVertical` um ponto maior, porque ali o conteúdo é um `Text` sem a caixa
 * interna que o `TextInput` acrescenta. Os dois vivem aqui e não em cada componente porque um
 * formulário com data, texto e seleção lado a lado precisa de uma coluna só.
 */
export const fieldStyles = StyleSheet.create({
  field: {
    gap: space.xs + 2,
    marginBottom: space.lg,
  },
  label: {
    ...type.label,
    color: colors.text.secondary,
  },
  input: {
    ...type.body,
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text.primary,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  box: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  invalid: {
    borderColor: colors.status.negative,
  },
  value: {
    ...type.body,
    color: colors.text.primary,
  },
  placeholder: {
    ...type.body,
    color: colors.text.muted,
  },
  error: {
    ...type.caption,
    color: colors.status.negative,
  },
});
```

- [ ] **Step 2: Criar `Field.tsx`, `Picker.tsx` e `SubmitButton.tsx`**

Cada um recebe a sua função **e o seu comentário**, importando `{ fieldStyles }` de `./styles`. `Field` usa `fieldStyles.field`, `.label`, `.input`, `.invalid`, `.error`. `Picker` mantém, por enquanto, exatamente o desenho de hoje: leve as chaves `options`, `option`, `optionSelected`, `optionLabel` e `optionLabelSelected` para um `StyleSheet.create` local dentro de `Picker.tsx` — a Task 9 as substitui. O tipo `PickerOption<T>` vai para `Picker.tsx`. `SubmitButton` leva `submit`, `submitPending` e `submitLabel` para um `StyleSheet.create` local, mais o comentário sobre a spec UX AC4.

O comentário de topo de `form.tsx` ("The three controls every form in the app is built from…") vai para `index.ts`, atualizado, já que a pasta passará a ter mais que três.

- [ ] **Step 3: Criar `src/components/form/index.ts`**

```ts
/**
 * Os controles de que todo formulário do app é feito.
 *
 * `Field` renderiza o erro que recebe e nunca produz um. Validação é da API (MAD-001, MAD-004); o
 * app checa vazio e formato de número, e o texto embaixo de um campo é o que a API disse sobre ele.
 */

export { Field } from './Field';
export { Picker, type PickerOption } from './Picker';
export { SubmitButton } from './SubmitButton';
```

- [ ] **Step 4: Dividir o teste**

Os três blocos `describe` de `src/components/form.test.tsx` vão verbatim para `Field.test.tsx`, `Picker.test.tsx` e `SubmitButton.test.tsx`, importando de `@/components/form` como hoje.

- [ ] **Step 5: Apagar os arquivos antigos e verificar**

```bash
git rm src/components/form.tsx src/components/form.test.tsx
npx tsc --noEmit && npm test
```
Expected: PASS, mesma contagem de testes.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: form.tsx becomes a folder, one component per file

The field column styles move to form/styles.ts, where DateField can stop
redeclaring them."
```

---

## Task 6: Mobile — o `Sheet`

**Files:**
- Create: `src/components/form/Sheet.tsx`
- Create: `src/components/form/Sheet.test.tsx`
- Modify: `src/components/RecordIncomePaymentModal.tsx` (passa a usar o `Sheet`)
- Modify: `src/components/form/index.ts`

**Interfaces:**
- Consumes: `fieldStyles` não; só `theme`.
- Produces: `Sheet({ title, subtitle?, visible, onClose, children })`. `visible: boolean`, `onClose: () => void`, `children: ReactNode`. Renderiza `testID="sheet"` na folha. Tasks 8, 9 e 10 dependem disso.

- [ ] **Step 1: Escrever o teste que falha**

`src/components/form/Sheet.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Sheet } from '@/components/form/Sheet';

/**
 * O `Sheet` não decide nada: quem o abre e quem o fecha é sempre quem o usa. O que se testa aqui é
 * que ele obedece — e que fechar tem dois caminhos, porque um modal que só fecha por um botãozinho
 * no canto é um modal que prende o usuário quando o botão sai da tela.
 */
describe('Sheet', () => {
  it('não monta o conteúdo enquanto está fechado', () => {
    render(
      <Sheet onClose={jest.fn()} title="Categoria" visible={false}>
        <Text>Alimentação</Text>
      </Sheet>
    );

    expect(screen.queryByText('Alimentação')).toBeNull();
  });

  it('mostra o título e o conteúdo quando está aberto', () => {
    render(
      <Sheet onClose={jest.fn()} title="Categoria" visible>
        <Text>Alimentação</Text>
      </Sheet>
    );

    expect(screen.getByText('Categoria')).toBeTruthy();
    expect(screen.getByText('Alimentação')).toBeTruthy();
  });

  it('mostra o subtítulo quando recebe um', () => {
    render(
      <Sheet onClose={jest.fn()} subtitle="Agosto de 2026" title="Categoria" visible>
        <Text>Alimentação</Text>
      </Sheet>
    );

    expect(screen.getByText('Agosto de 2026')).toBeTruthy();
  });

  it('fecha pelo botão do canto', () => {
    const onClose = jest.fn();
    render(
      <Sheet onClose={onClose} title="Categoria" visible>
        <Text>Alimentação</Text>
      </Sheet>
    );

    fireEvent.press(screen.getByLabelText('Fechar'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fecha ao tocar fora da folha', () => {
    const onClose = jest.fn();
    render(
      <Sheet onClose={onClose} title="Categoria" visible>
        <Text>Alimentação</Text>
      </Sheet>
    );

    fireEvent.press(screen.getByLabelText('Fechar Categoria sem escolher'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- Sheet`
Expected: FAIL — `Cannot find module '@/components/form/Sheet'`.

- [ ] **Step 3: Escrever o `Sheet`**

`src/components/form/Sheet.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { colors, radius, space, type } from '@/components/theme';

/**
 * A sobreposição de todo campo que se escolhe em vez de digitar.
 *
 * Data, seleção em lista e mês de competência são o mesmo controle — um campo que abre — e antes
 * desta peça eram três desenhos diferentes, escritos em três momentos. O `Sheet` é a metade de fora
 * desse controle: escurecido, folha encostada no rodapé, cabeçalho, e o conteúdo rolando dentro.
 *
 * **Não decide nada.** Quem abre e quem fecha é sempre quem o usa; o `Sheet` só reporta os dois
 * gestos de fechar que existem. O toque no escurecido é um deles porque um modal que só fecha por um
 * alvo de 32pt no canto prende o usuário no primeiro momento em que esse alvo sai da tela.
 *
 * `visible={false}` desmonta o conteúdo (`children` não é renderizado), e não só o esconde: um
 * formulário montado atrás de um modal fechado guarda o estado da abertura anterior.
 */
export function Sheet({
  title,
  subtitle,
  visible,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}): React.JSX.Element | null {
  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <View style={styles.scrim}>
        {/* O escurecido é o mesmo da gaveta: é a mesma ideia de "a tela continua ali atrás". */}
        <Pressable
          accessibilityLabel={`Fechar ${title} sem escolher`}
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.sheet} testID="sheet">
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.title}>{title}</Text>
              {subtitle === undefined ? null : <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>

            <Pressable
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.close}
            >
              <X color={colors.text.secondary} size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /** A folha encosta no rodapé; o escurecido ocupa o resto e mantém a tela visível atrás. */
  scrim: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.base,
    borderColor: colors.border.subtle,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    // Teto, não altura: uma grade de doze meses não precisa da tela inteira, e o `ScrollView`
    // interno cuida do caso em que a lista é longa.
    maxHeight: '85%',
    paddingTop: space.lg,
  },
  header: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
  },
  heading: {
    flex: 1,
    gap: space.xs,
  },
  title: {
    ...type.heading,
    color: colors.text.primary,
  },
  subtitle: {
    ...type.caption,
    color: colors.text.secondary,
  },
  close: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: space.xxl,
    justifyContent: 'center',
    width: space.xxl,
  },
  body: {
    padding: space.lg,
  },
});
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- Sheet`
Expected: PASS (5 testes).

- [ ] **Step 5: Fazer o `RecordIncomePaymentModal` usar o `Sheet`**

Em `src/components/RecordIncomePaymentModal.tsx`, o `PaymentForm` devolve hoje `Modal > View.scrim > View.sheet > View.header + ScrollView`. Troque tudo isso pelo `Sheet`:

```tsx
  return (
    <Sheet
      onClose={onClose}
      subtitle={`${line.name} · ${monthLabel(period.year, period.month)}`}
      title="Registrar recebimento"
      visible
    >
      <DateField label="Data do pagamento" onChange={setPaymentDate} value={paymentDate} />
      {/* ...os demais campos, o map de mensagens e o SubmitButton, sem alteração... */}
    </Sheet>
  );
```

Apague de `styles` as chaves que ficaram sem uso (`scrim`, `sheet`, `header`, `heading`, `title`, `subtitle`, `close`, `body`); sobra `error`. Apague os imports que ficaram sem uso (`Modal`, `ScrollView`, `View`, `X`, `radius`, `type`, e `Pressable` se nada mais o usar) e importe `{ Sheet }` de `@/components/form`.

- [ ] **Step 6: Exportar o `Sheet` e rodar tudo**

Acrescente ao `src/components/form/index.ts`:

```ts
export { Sheet } from './Sheet';
```

Run: `npx tsc --noEmit && npm test`
Expected: PASS. `RecordIncomePaymentModal.test.tsx` não deve precisar de nenhuma edição: ele encontra os campos por rótulo, não pela estrutura do modal.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: one Sheet for every field that opens

Extracted from RecordIncomePaymentModal, which now uses it, and gaining a
tappable scrim: a modal whose only exit is a 32pt corner target traps the
user the moment that target leaves the screen."
```

---

## Task 7: Mobile — o `FieldTrigger`

**Files:**
- Create: `src/components/form/FieldTrigger.tsx`
- Create: `src/components/form/FieldTrigger.test.tsx`

**Interfaces:**
- Consumes: `fieldStyles` de `@/components/form/styles` (Task 5).
- Produces: `FieldTrigger({ label, value, placeholder, icon, error?, onPress })` com `value: string | null`, `placeholder: string`, `icon: ReactNode`, `error?: string`, `onPress: () => void`. O `accessibilityLabel` do botão é **exatamente** `` `${label}, ${value ?? placeholder}` `` — `src/utils/testDate.ts` depende desse formato. Renderiza `testID="field-error"` na linha de erro. Tasks 8, 9 e 10 dependem disso.

- [ ] **Step 1: Escrever o teste que falha**

`src/components/form/FieldTrigger.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FieldTrigger } from '@/components/form/FieldTrigger';

const icon = <Text>ícone</Text>;

describe('FieldTrigger', () => {
  it('mostra o rótulo e o valor escolhido', () => {
    render(
      <FieldTrigger
        icon={icon}
        label="Categoria"
        onPress={jest.fn()}
        placeholder="Selecionar"
        value="Alimentação"
      />
    );

    expect(screen.getByText('Categoria')).toBeTruthy();
    expect(screen.getByText('Alimentação')).toBeTruthy();
  });

  it('mostra o placeholder quando nada foi escolhido', () => {
    render(
      <FieldTrigger
        icon={icon}
        label="Categoria"
        onPress={jest.fn()}
        placeholder="Selecionar"
        value={null}
      />
    );

    expect(screen.getByText('Selecionar')).toBeTruthy();
  });

  /**
   * Rótulo e valor numa frase só: sem isto o leitor de tela anuncia um botão chamado "Alimentação",
   * sem dizer de que campo se trata.
   */
  it('anuncia rótulo e valor numa frase só', () => {
    render(
      <FieldTrigger
        icon={icon}
        label="Categoria"
        onPress={jest.fn()}
        placeholder="Selecionar"
        value="Alimentação"
      />
    );

    expect(screen.getByLabelText('Categoria, Alimentação')).toBeTruthy();
  });

  it('mostra o erro que recebeu', () => {
    render(
      <FieldTrigger
        error="Escolha uma categoria."
        icon={icon}
        label="Categoria"
        onPress={jest.fn()}
        placeholder="Selecionar"
        value={null}
      />
    );

    expect(screen.getByTestId('field-error')).toBeTruthy();
    expect(screen.getByText('Escolha uma categoria.')).toBeTruthy();
  });

  it('não mostra linha de erro quando não há erro', () => {
    render(
      <FieldTrigger
        icon={icon}
        label="Categoria"
        onPress={jest.fn()}
        placeholder="Selecionar"
        value="Alimentação"
      />
    );

    expect(screen.queryByTestId('field-error')).toBeNull();
  });

  it('reporta o toque', () => {
    const onPress = jest.fn();
    render(
      <FieldTrigger
        icon={icon}
        label="Categoria"
        onPress={onPress}
        placeholder="Selecionar"
        value="Alimentação"
      />
    );

    fireEvent.press(screen.getByLabelText('Categoria, Alimentação'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- FieldTrigger`
Expected: FAIL — `Cannot find module '@/components/form/FieldTrigger'`.

- [ ] **Step 3: Escrever o `FieldTrigger`**

`src/components/form/FieldTrigger.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { fieldStyles } from '@/components/form/styles';

/**
 * A metade de dentro de todo campo que abre: rótulo em cima, uma caixa que mostra o que está
 * escolhido, e o erro embaixo.
 *
 * A caixa é a mesma do `Field`, de propósito. Um formulário onde a data, o texto e a categoria têm
 * três alturas e três bordas diferentes lê como três formulários empilhados.
 *
 * `value` nulo é a informação, não a ausência dela: é o que separa "nada escolhido ainda" —
 * `placeholder` em `text.muted` — de uma escolha feita, em `text.primary`.
 */
export function FieldTrigger({
  label,
  value,
  placeholder,
  icon,
  error,
  onPress,
}: {
  label: string;
  /** O que está escolhido, ou null quando nada está. */
  value: string | null;
  placeholder: string;
  icon: ReactNode;
  error?: string;
  onPress: () => void;
}): React.JSX.Element {
  const shown = value ?? placeholder;

  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>

      <Pressable
        // Rótulo e valor numa frase só: sem isto o leitor de tela anuncia um botão chamado
        // "21/08/2026", sem dizer de que campo se trata.
        accessibilityLabel={`${label}, ${shown}`}
        accessibilityRole="button"
        onPress={onPress}
        style={[fieldStyles.box, error === undefined ? null : fieldStyles.invalid]}
      >
        <Text style={value === null ? fieldStyles.placeholder : fieldStyles.value}>{shown}</Text>
        {icon}
      </Pressable>

      {error === undefined ? null : (
        <Text style={fieldStyles.error} testID="field-error">
          {error}
        </Text>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- FieldTrigger`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: FieldTrigger, the box every field that opens shares"
```

---

## Task 8: Mobile — o `DateField` sobre uma biblioteca que roda no web

**Files:**
- Modify: `package.json` (entra `react-native-ui-datepicker@^3.3.0`, sai `@react-native-community/datetimepicker`)
- Create: `src/components/form/DateField.tsx`
- Create: `src/components/form/DateField.test.tsx`
- Delete: `src/components/DateField.tsx`, `src/components/DateField.test.tsx`
- Modify: `jest.setup.js`
- Modify: `src/components/form/index.ts`
- Modify: os seis arquivos que importam `@/components/DateField`

**Interfaces:**
- Consumes: `Sheet` (Task 6), `FieldTrigger` (Task 7).
- Produces: `DateField({ label, value, onChange, error? })` — **assinatura idêntica à de hoje**, `value` e o argumento de `onChange` em `'YYYY-MM-DD'`. Passa a ser importável de `@/components/form`.

- [ ] **Step 1: Instalar a biblioteca e remover a antiga**

```bash
npm install react-native-ui-datepicker@^3.3.0
npm uninstall @react-native-community/datetimepicker
```

`react-native-ui-datepicker` é JavaScript puro (sem módulo nativo) e o seu `main` aponta para `lib/commonjs/index`, então o Jest resolve sem tocar em `transformIgnorePatterns`.

- [ ] **Step 2: Trocar o mock global**

Em `jest.setup.js`, substitua o bloco `jest.mock('@react-native-community/datetimepicker', ...)` — mantendo o comentário de topo, atualizado — por:

```js
// O calendário é uma árvore de quarenta e dois dias; renderizá-lo em cada teste de formulário
// testaria a biblioteca, não a tela.
//
// O substituto expõe um alvo por evento — escolher e cancelar. Qual data ele devolve é decidido por
// `globalThis.__pickDate`: um teste que precisa de uma data diferente da que o campo já mostra a
// escreve ali antes de tocar em "escolher"; sem isso o substituto devolve o valor que recebeu, que
// é o comportamento de quem abre o calendário e confirma sem mexer.
//
// Os `testID` mantêm o nome que tinham quando o picker era nativo, e `DateField.test.tsx` mantém o
// seu próprio mock, mais detalhado, porque lá o assunto é o componente.
globalThis.__pickDate = null;

jest.mock('react-native-ui-datepicker', () => {
  const react = require('react');
  const rn = require('react-native');

  const chosen = (fallback) => {
    const wanted = globalThis.__pickDate;

    if (typeof wanted !== 'string') {
      return fallback;
    }

    const [year, month, day] = wanted.split('-').map(Number);

    // Construído pelos getters locais, nunca por `new Date(string)`, que é UTC — a mesma regra que
    // `src/utils/dates.ts` documenta e que este substituto tem de respeitar para não deslocar um dia.
    return new Date(year, month - 1, day);
  };

  return {
    __esModule: true,
    useDefaultStyles: () => ({}),
    default: ({ onChange, date }) =>
      react.createElement(rn.View, { testID: 'native-picker' }, [
        react.createElement(rn.Text, {
          key: 'set',
          testID: 'native-picker-set',
          onPress: () => onChange({ date: chosen(date) }),
        }),
        react.createElement(rn.Text, {
          key: 'dismiss',
          testID: 'native-picker-dismiss',
          onPress: () => onChange({ date: null }),
        }),
      ]),
  };
});
```

- [ ] **Step 3: Escrever o teste do componente**

Crie `src/components/form/DateField.test.tsx` a partir de `src/components/DateField.test.tsx`: **copie o arquivo inteiro**, troque o import para `@/components/form`, e substitua o `jest.mock` do topo por este, mantendo o comentário explicativo (atualizado — o calendário não é mais do sistema operacional, é da biblioteca):

```tsx
jest.mock('react-native-ui-datepicker', () => {
  const react = require('react') as typeof import('react');
  const rn = require('react-native') as typeof import('react-native');

  return {
    __esModule: true,
    useDefaultStyles: () => ({}),
    default: ({ onChange }: { onChange: (params: { date: Date | null }) => void }) =>
      react.createElement(rn.View, { testID: 'native-picker' }, [
        react.createElement(rn.Text, {
          key: 'set',
          testID: 'native-picker-set',
          onPress: () => {
            onChange({ date: new Date(2026, 8, 3) });
          },
        }),
        react.createElement(rn.Text, {
          key: 'dismiss',
          testID: 'native-picker-dismiss',
          onPress: () => {
            onChange({ date: null });
          },
        }),
      ]),
  };
});
```

Apague todo bloco que dependa de `Platform.OS` (o iOS não tem mais um "Concluir" próprio — quem fecha é o `Sheet`) e o `import { Platform } from 'react-native'`. No lugar deles, acrescente:

```tsx
describe('o calendário', () => {
  it('só existe depois que o campo é tocado', () => {
    render(<DateField label="Data" onChange={onChange} value="2026-08-21" />);

    expect(screen.queryByTestId('native-picker')).toBeNull();

    fireEvent.press(screen.getByLabelText('Data, 21/08/2026'));

    expect(screen.getByTestId('native-picker')).toBeTruthy();
  });

  it('fecha ao escolher uma data', () => {
    render(<DateField label="Data" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data, 21/08/2026'));
    fireEvent.press(screen.getByTestId('native-picker-set'));

    expect(onChange).toHaveBeenCalledWith('2026-09-03');
    expect(screen.queryByTestId('native-picker')).toBeNull();
  });

  it('cancelar não muda o valor', () => {
    render(<DateField label="Data" onChange={onChange} value="2026-08-21" />);

    fireEvent.press(screen.getByLabelText('Data, 21/08/2026'));
    fireEvent.press(screen.getByTestId('native-picker-dismiss'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Rodar e confirmar a falha**

Run: `npm test -- DateField`
Expected: FAIL — o novo arquivo não encontra `DateField` em `@/components/form`, e o arquivo antigo quebra porque o mock global mudou.

- [ ] **Step 5: Escrever o `DateField` novo**

`src/components/form/DateField.tsx`:

```tsx
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';
import { Calendar } from 'lucide-react-native';

import { formatBrDate, fromApiDate, toApiDate, todayApiDate } from '@/utils/dates';
import { FieldTrigger } from '@/components/form/FieldTrigger';
import { Sheet } from '@/components/form/Sheet';
import { colors, radius, space, type } from '@/components/theme';

/**
 * A data como um campo de verdade: um toque abre o calendário.
 *
 * **Fala `YYYY-MM-DD` para fora** e é o único lugar do app onde um `Date` chega a existir — o
 * comentário no topo de `utils/dates.ts` explica por quê: um `Date` que escapa para o resto do app é
 * um lançamento gravado no dia errado, porque a forma ISO é UTC e às 21h em São Paulo ela já virou o
 * dia seguinte. Aqui o `Date` nasce dos getters locais e morre em `toApiDate` na mesma função.
 *
 * O calendário é JavaScript puro, e é essa a razão da biblioteca: o picker do sistema não tem
 * implementação para `react-native-web`, então o campo abria e não acontecia nada justamente no
 * ambiente onde se testa mais rápido. Uma UI só, nas três plataformas, e nenhuma bifurcação por
 * `Platform.OS`.
 */

/** O `Date` que o picker precisa, construído pelos getters locais e nunca por `new Date(string)`. */
const toDate = (value: string): Date => {
  const parts = fromApiDate(value) ?? fromApiDate(todayApiDate());

  // `fromApiDate(todayApiDate())` não pode falhar: `todayApiDate` produz o formato que ela lê.
  if (parts === null) {
    return new Date();
  }

  return new Date(parts.year, parts.month - 1, parts.day);
};

const fromDate = (date: Date): string =>
  toApiDate({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });

export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  /** Uma data `YYYY-MM-DD`. O componente nunca devolve outra coisa. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const defaults = useDefaultStyles();

  const shown = formatBrDate(value);

  const handleChange = ({ date }: { date: unknown }): void => {
    setOpen(false);

    // A biblioteca tipa a data devolvida como `DateType`, que inclui string, número e null. Só um
    // `Date` interessa: qualquer outra coisa seria uma conversão implícita, e é exatamente por isso
    // que este arquivo existe.
    if (!(date instanceof Date)) {
      return;
    }

    onChange(fromDate(date));
  };

  return (
    <>
      <FieldTrigger
        error={error}
        icon={<Calendar color={colors.text.secondary} size={18} />}
        label={label}
        onPress={() => {
          setOpen(true);
        }}
        placeholder={shown}
        value={shown}
      />

      <Sheet
        onClose={() => {
          setOpen(false);
        }}
        title={label}
        visible={open}
      >
        <DateTimePicker
          date={toDate(value)}
          // `pt` e não `pt-BR`: a biblioteca só registra `pt` do dayjs, e os nomes de mês são os
          // mesmos nas duas variantes.
          locale="pt"
          mode="single"
          onChange={handleChange}
          styles={{ ...defaults, ...calendar }}
        />
      </Sheet>
    </>
  );
}

/**
 * O calendário nas cores do app.
 *
 * Só as chaves que precisam mudar: `useDefaultStyles()` responde por toda a geometria, e reescrevê-la
 * aqui seria manter uma cópia do layout da biblioteca.
 */
const calendar = StyleSheet.create({
  header: { backgroundColor: colors.surface.base },
  month_selector_label: { ...type.label, color: colors.text.primary },
  year_selector_label: { ...type.label, color: colors.text.primary },
  weekday_label: { ...type.caption, color: colors.text.secondary },
  day_label: { ...type.body, color: colors.text.primary },
  outside_label: { color: colors.text.muted },
  today: { borderColor: colors.accent.base, borderRadius: radius.sm, borderWidth: 1 },
  today_label: { color: colors.accent.base },
  selected: { backgroundColor: colors.surface.selected, borderColor: colors.border.default, borderRadius: radius.sm, borderWidth: 1 },
  selected_label: { color: colors.text.primary },
  disabled_label: { color: colors.text.muted },
  month_label: { ...type.body, color: colors.text.primary },
  year_label: { ...type.body, color: colors.text.primary },
  selected_month: { backgroundColor: colors.surface.selected, borderRadius: radius.sm },
  selected_month_label: { color: colors.text.primary },
  selected_year: { backgroundColor: colors.surface.selected, borderRadius: radius.sm },
  selected_year_label: { color: colors.text.primary },
  button_next_image: { tintColor: colors.text.secondary },
  button_prev_image: { tintColor: colors.text.secondary },
  days: { paddingTop: space.sm },
});
```

Nota sobre o `placeholder` do `FieldTrigger`: a data **sempre** tem valor (o campo nasce em hoje), então `value` e `placeholder` recebem a mesma string. Isso mantém o `accessibilityLabel` em `` `${label}, ${formatBrDate(value)}` ``, que é o que `src/utils/testDate.ts` procura.

- [ ] **Step 6: Apagar o antigo e reapontar os seis imports**

```bash
git rm src/components/DateField.tsx src/components/DateField.test.tsx
```

Em `src/components/form/index.ts`, acrescente:

```ts
export { DateField } from './DateField';
export { FieldTrigger } from './FieldTrigger';
```

Depois troque `from '@/components/DateField'` por `from '@/components/form'` em:
`src/components/RecordIncomePaymentModal.tsx`, `src/screens/ChangeIncomeValue/ChangeIncomeValueScreen.tsx`, `src/screens/ChangeRecurringValue/ChangeRecurringValueScreen.tsx`, `src/screens/RecordRecurringPayment/RecordRecurringPaymentScreen.tsx`, `src/screens/RegisterExpense/RegisterExpenseScreen.tsx`, `src/screens/RegisterInstallmentPlan/RegisterInstallmentPlanScreen.tsx`.

Onde o arquivo já importa de `@/components/form`, junte na mesma linha em vez de criar uma segunda.

- [ ] **Step 7: Rodar tudo**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Os testes de tela que usam `pickDate` de `@/utils/testDate` continuam funcionando sem edição — é para isso que o mock global manteve os `testID` e o `globalThis.__pickDate`.

- [ ] **Step 8: Ver funcionando no web**

Use a ferramenta de preview do Claude Code (`preview_start`) com `.claude/launch.json` apontando para `npm run web`. Abra uma tela com data — por exemplo `RegisterExpenseScreen` —, toque no campo e confirme que o calendário abre, que os dias estão legíveis sobre o fundo escuro e que escolher um dia fecha a folha e atualiza o campo. **Não peça para o usuário conferir manualmente.**

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: a date picker that opens on the web too

@react-native-community/datetimepicker has no web implementation, so the
field opened and nothing happened in the one environment that is fastest to
test in. react-native-ui-datepicker is pure JS: one calendar on all three
platforms, and no Platform.OS fork left in the component."
```

---

## Task 9: Mobile — o `Picker` escolhe a própria forma

**Files:**
- Create: `src/components/form/OptionChips.tsx`, `OptionChips.test.tsx`
- Create: `src/components/form/SelectSheet.tsx`, `SelectSheet.test.tsx`
- Modify: `src/components/form/Picker.tsx`, `src/components/form/Picker.test.tsx`

**Interfaces:**
- Consumes: `Sheet` (Task 6), `FieldTrigger` (Task 7), `PickerOption<T>` (Task 5).
- Produces: `Picker<T extends string | number>({ label, options, selected, onChange, placeholder? })` — mesma assinatura de hoje mais `placeholder?: string` (padrão `'Selecionar'`). `OptionChips` e `SelectSheet` recebem as mesmas props e são internos da pasta (não entram no `index.ts`).

- [ ] **Step 1: Escrever os testes que falham**

Acrescente a `src/components/form/Picker.test.tsx`, depois dos `describe` que já existem:

```tsx
const five = [
  { label: 'Alimentação', value: 'c1' },
  { label: 'Transporte', value: 'c2' },
  { label: 'Moradia', value: 'c3' },
  { label: 'Saúde', value: 'c4' },
  { label: 'Educação', value: 'c5' },
];

/**
 * Quem escolhe a forma é o componente, pelo tamanho de `options` — as telas nunca escolhem, só
 * dizem que dados têm. É o mesmo princípio do `MonthTrend`, e é o que impede uma tela de passar a
 * saber de layout.
 */
describe('a forma que o Picker toma', () => {
  it('desenha as opções direto quando são quatro ou menos', () => {
    render(
      <Picker
        label="Tipo"
        onChange={jest.fn()}
        options={five.slice(0, 4)}
        selected={null}
      />
    );

    expect(screen.getByText('Alimentação')).toBeTruthy();
    expect(screen.getByText('Saúde')).toBeTruthy();
    expect(screen.queryByLabelText('Tipo, Selecionar')).toBeNull();
  });

  it('esconde as opções atrás de um campo quando são mais de quatro', () => {
    render(<Picker label="Categoria" onChange={jest.fn()} options={five} selected={null} />);

    expect(screen.queryByText('Educação')).toBeNull();
    expect(screen.getByLabelText('Categoria, Selecionar')).toBeTruthy();
  });

  it('mostra no campo o rótulo da opção escolhida, não o seu valor', () => {
    render(<Picker label="Categoria" onChange={jest.fn()} options={five} selected="c3" />);

    expect(screen.getByLabelText('Categoria, Moradia')).toBeTruthy();
  });

  it('escolhe pela lista e fecha', () => {
    const onChange = jest.fn();
    render(<Picker label="Categoria" onChange={onChange} options={five} selected={null} />);

    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));
    fireEvent.press(screen.getByText('Educação'));

    expect(onChange).toHaveBeenCalledWith('c5');
    expect(screen.queryByText('Educação')).toBeNull();
  });
});
```

E crie `src/components/form/SelectSheet.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SelectSheet } from '@/components/form/SelectSheet';

const nine = [
  { label: 'Alimentação', value: 'c1' },
  { label: 'Transporte', value: 'c2' },
  { label: 'Moradia', value: 'c3' },
  { label: 'Saúde', value: 'c4' },
  { label: 'Educação', value: 'c5' },
  { label: 'Lazer', value: 'c6' },
  { label: 'Vestuário', value: 'c7' },
  { label: 'Assinaturas', value: 'c8' },
  { label: 'Pets', value: 'c9' },
];

describe('a busca', () => {
  it('não aparece enquanto a lista cabe na cabeça de quem lê', () => {
    render(
      <SelectSheet
        label="Categoria"
        onChange={jest.fn()}
        options={nine.slice(0, 8)}
        placeholder="Selecionar"
        selected={null}
      />
    );

    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));

    expect(screen.queryByLabelText('Buscar')).toBeNull();
  });

  it('filtra ignorando acento e caixa', () => {
    render(
      <SelectSheet
        label="Categoria"
        onChange={jest.fn()}
        options={nine}
        placeholder="Selecionar"
        selected={null}
      />
    );

    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));
    fireEvent.changeText(screen.getByLabelText('Buscar'), 'saude');

    expect(screen.getByText('Saúde')).toBeTruthy();
    expect(screen.queryByText('Alimentação')).toBeNull();
  });

  it('diz quando a busca não achou nada, em vez de mostrar uma folha vazia', () => {
    render(
      <SelectSheet
        label="Categoria"
        onChange={jest.fn()}
        options={nine}
        placeholder="Selecionar"
        selected={null}
      />
    );

    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));
    fireEvent.changeText(screen.getByLabelText('Buscar'), 'zzz');

    expect(screen.getByText('Nenhuma opção com esse nome.')).toBeTruthy();
  });

  it('recomeça limpa a cada abertura', () => {
    render(
      <SelectSheet
        label="Categoria"
        onChange={jest.fn()}
        options={nine}
        placeholder="Selecionar"
        selected={null}
      />
    );

    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));
    fireEvent.changeText(screen.getByLabelText('Buscar'), 'saude');
    fireEvent.press(screen.getByLabelText('Fechar'));
    fireEvent.press(screen.getByLabelText('Categoria, Selecionar'));

    expect(screen.getByText('Alimentação')).toBeTruthy();
  });
});
```

E `src/components/form/OptionChips.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { OptionChips } from '@/components/form/OptionChips';

const types = [
  { label: 'Crédito', value: 0 },
  { label: 'Débito', value: 1 },
  { label: 'Pix', value: 2 },
];

describe('OptionChips', () => {
  it('marca a opção escolhida para quem usa leitor de tela', () => {
    render(<OptionChips label="Tipo" onChange={jest.fn()} options={types} selected={1} />);

    expect(screen.getByLabelText('Débito').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Crédito').props.accessibilityState.selected).toBe(false);
  });

  /** Cor nunca é o único sinal: o check é o que sobra para quem não distingue as duas superfícies. */
  it('marca a opção escolhida com um sinal que não é cor', () => {
    render(<OptionChips label="Tipo" onChange={jest.fn()} options={types} selected={1} />);

    expect(screen.getByTestId('chip-check')).toBeTruthy();
  });

  it('reporta o valor da opção tocada', () => {
    const onChange = jest.fn();
    render(<OptionChips label="Tipo" onChange={onChange} options={types} selected={0} />);

    fireEvent.press(screen.getByText('Pix'));

    expect(onChange).toHaveBeenCalledWith(2);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- OptionChips SelectSheet Picker`
Expected: FAIL — módulos não encontrados, e os testes novos de `Picker` falham.

- [ ] **Step 3: Escrever `OptionChips`**

`src/components/form/OptionChips.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import type { PickerOption } from '@/components/form/Picker';
import { fieldStyles } from '@/components/form/styles';
import { colors, control, radius, space, type } from '@/components/theme';

/**
 * Poucas opções, todas visíveis: o controle certo quando ler a lista inteira custa menos que abrir
 * uma folha.
 *
 * O selecionado é `surface.selected` com `border.default` e um check — não `accent.base`. O azul de
 * destaque é da ação primária da tela, e um formulário com quatro chips azuis e um botão azul não
 * tem destaque nenhum. O check existe porque cor não pode ser o único sinal.
 */
export function OptionChips<T extends string | number>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: PickerOption<T>[];
  selected: T | null;
  onChange: (value: T) => void;
}): React.JSX.Element {
  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>

      <View style={styles.options}>
        {options.map((option, index) => {
          const isSelected = option.value === selected;

          return (
            // Duas entradas de catálogo podem legitimamente ter o mesmo nome, então o índice as
            // mantém como opções separadas em vez de colapsá-las.
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={`${String(option.value)}-${index}`}
              onPress={() => {
                onChange(option.value);
              }}
              style={[styles.option, isSelected ? styles.optionSelected : null]}
            >
              {isSelected ? (
                <Check color={colors.text.primary} size={14} testID="chip-check" />
              ) : null}
              <Text style={[styles.optionLabel, isSelected ? styles.optionLabelSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.xs,
    justifyContent: 'center',
    // O alvo confortável nas duas plataformas. Um chip de 26pt de altura é um chip que erra.
    minHeight: control.size - space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  optionSelected: {
    backgroundColor: colors.surface.selected,
    borderColor: colors.border.default,
  },
  optionLabel: {
    ...type.label,
    color: colors.text.secondary,
  },
  optionLabelSelected: {
    color: colors.text.primary,
  },
});
```

- [ ] **Step 4: Escrever `SelectSheet`**

`src/components/form/SelectSheet.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';

import type { PickerOption } from '@/components/form/Picker';
import { FieldTrigger } from '@/components/form/FieldTrigger';
import { Sheet } from '@/components/form/Sheet';
import { colors, radius, space, type } from '@/components/theme';

/** Acima disto, ler a lista inteira custa mais que digitar três letras. */
const SEARCHABLE_FROM = 8;

/** `'Saúde'` e `'saude'` têm de se encontrar: ninguém digita acento para buscar. */
const normalise = (value: string): string =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Muitas opções, uma de cada vez: o campo mostra a escolha, a folha mostra a lista.
 *
 * A busca só aparece quando a lista é longa o bastante para justificá-la. Um campo de busca sobre
 * cinco linhas é um campo a mais para o usuário decidir se deve usar.
 */
export function SelectSheet<T extends string | number>({
  label,
  options,
  selected,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  options: PickerOption<T>[];
  selected: T | null;
  onChange: (value: T) => void;
  placeholder: string;
  error?: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const chosen = options.find((option) => option.value === selected);

  const close = (): void => {
    setOpen(false);
    // A busca não sobrevive ao fechamento: reabrir o campo e encontrar a lista já filtrada por uma
    // palavra que o usuário nem lembra ter digitado é uma lista que parece ter perdido opções.
    setQuery('');
  };

  const shown =
    query.trim() === ''
      ? options
      : options.filter((option) => normalise(option.label).includes(normalise(query.trim())));

  return (
    <>
      <FieldTrigger
        error={error}
        icon={<ChevronDown color={colors.text.secondary} size={18} />}
        label={label}
        onPress={() => {
          setOpen(true);
        }}
        placeholder={placeholder}
        value={chosen?.label ?? null}
      />

      <Sheet onClose={close} title={label} visible={open}>
        {options.length > SEARCHABLE_FROM ? (
          <TextInput
            accessibilityLabel="Buscar"
            onChangeText={setQuery}
            placeholder="Buscar"
            placeholderTextColor={colors.text.muted}
            style={styles.search}
            value={query}
          />
        ) : null}

        {shown.length === 0 ? (
          <Text style={styles.empty}>Nenhuma opção com esse nome.</Text>
        ) : null}

        {shown.map((option, index) => {
          const isSelected = option.value === selected;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={`${String(option.value)}-${index}`}
              onPress={() => {
                onChange(option.value);
                close();
              }}
              style={[styles.row, isSelected ? styles.rowSelected : null]}
            >
              <Text style={styles.rowLabel}>{option.label}</Text>
              {isSelected ? <Check color={colors.accent.base} size={18} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    ...type.body,
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.text.primary,
    marginBottom: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  row: {
    alignItems: 'center',
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  rowSelected: {
    backgroundColor: colors.surface.selected,
    borderColor: colors.border.default,
  },
  rowLabel: {
    ...type.body,
    color: colors.text.primary,
  },
  empty: {
    ...type.body,
    color: colors.text.secondary,
    paddingVertical: space.lg,
    textAlign: 'center',
  },
});
```

- [ ] **Step 5: Reescrever o `Picker`**

`src/components/form/Picker.tsx` passa a ser só a decisão:

```tsx
import { OptionChips } from '@/components/form/OptionChips';
import { SelectSheet } from '@/components/form/SelectSheet';

export type PickerOption<T> = { label: string; value: T };

/** Acima disto, os chips viram uma parede e a lista passa a ser o controle honesto. */
const CHIPS_UP_TO = 4;

/**
 * A escolha de uma opção entre várias, nas duas formas que ela pode ter.
 *
 * **Quem escolhe a forma é o tamanho de `options`, nunca a tela.** É o mesmo princípio do
 * `MonthTrend`: as telas não escolhem um layout, só dizem que dados têm. Uma casa com três
 * categorias ganha chips sem ninguém configurar nada, e a mesma casa no dia em que tiver trinta
 * ganha a lista pelo mesmo motivo.
 */
export function Picker<T extends string | number>({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Selecionar',
  error,
}: {
  label: string;
  options: PickerOption<T>[];
  selected: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
}): React.JSX.Element {
  if (options.length <= CHIPS_UP_TO) {
    return <OptionChips label={label} onChange={onChange} options={options} selected={selected} />;
  }

  return (
    <SelectSheet
      error={error}
      label={label}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      selected={selected}
    />
  );
}
```

Note a dependência circular aparente: `OptionChips` e `SelectSheet` importam `PickerOption` de `Picker.tsx`, que os importa de volta. Isso é resolvido em tempo de compilação porque `PickerOption` é **só um tipo** — o `import type` não gera require em runtime. Mantenha `import type` nos dois arquivos.

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npm test -- OptionChips SelectSheet Picker`
Expected: PASS.

- [ ] **Step 7: Rodar a suíte inteira**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Os testes de tela existentes usam pickers de 1 a 3 opções (uma categoria, uma ou duas contas, três tipos), então todos caem no ramo de chips e continuam encontrando as opções por texto. Se algum teste falhar por não achar uma opção, é um picker que passou de quatro — leia a mensagem e ajuste **o teste** para abrir a folha primeiro, não o limiar.

- [ ] **Step 8: Ver funcionando**

No preview do web, abra `RegisterExpenseScreen`: o picker de Tipo deve estar em chips com o selecionado preenchido e com check; se houver mais de quatro categorias no seu banco, o de Categoria deve estar como campo. Tire um screenshot para o usuário.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: the Picker picks its own shape

Four options or fewer stay as chips, with a selected state that is actually
visible: surface.selected and a check, not accent.soft on surface.raised,
which are the same colour on a real screen. More than four move behind a
field and a searchable sheet."
```

---

## Task 10: Mobile — o mês de competência vira campo

**Files:**
- Create: `src/components/form/MonthField.tsx`, `MonthField.test.tsx`
- Modify: `src/components/form/index.ts`
- Modify: `src/screens/RegisterExpense/RegisterExpenseScreen.tsx`, `RegisterExpenseScreen.test.tsx`
- Modify: `src/screens/RecordRecurringPayment/RecordRecurringPaymentScreen.tsx`, `RecordRecurringPaymentScreen.styles.ts`
- Modify: `src/screens/Dashboard/DashboardScreen.tsx`, `src/screens/Expense/ExpenseMonthScreen.tsx`, `src/screens/Income/IncomeScreen.tsx`
- Delete: `src/components/MonthNavigator.tsx`, `src/components/MonthNavigator.test.tsx`

**Interfaces:**
- Consumes: `Sheet` (Task 6), `FieldTrigger` (Task 7), `monthLabel`/`monthAbbrev` de `@/utils/dates`.
- Produces: `MonthField({ label, year, month, onChange })` com `onChange: (year: number, month: number) => void`. Exportado de `@/components/form`.

- [ ] **Step 1: Escrever o teste que falha**

`src/components/form/MonthField.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthField } from '@/components/form/MonthField';

/**
 * Cada mês esperado abaixo é um par literal. Calcular um com `shiftMonth` na asserção espelharia o
 * componente e concordaria com ele em qualquer resposta errada (lição L-010).
 */
describe('MonthField', () => {
  it('nomeia o mês que está mostrando, em português', () => {
    render(
      <MonthField label="Mês de competência" month={8} onChange={jest.fn()} year={2026} />
    );

    expect(screen.getByLabelText('Mês de competência, Agosto de 2026')).toBeTruthy();
  });

  it('não mostra a grade antes de ser tocado', () => {
    render(
      <MonthField label="Mês de competência" month={8} onChange={jest.fn()} year={2026} />
    );

    expect(screen.queryByText('Jan')).toBeNull();
  });

  it('reporta o mês tocado na grade e fecha', () => {
    const onChange = jest.fn();
    render(<MonthField label="Mês de competência" month={8} onChange={onChange} year={2026} />);

    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));
    fireEvent.press(screen.getByText('Set'));

    expect(onChange).toHaveBeenCalledWith(2026, 9);
    expect(screen.queryByText('Jan')).toBeNull();
  });

  /**
   * Trocar o ano só muda o que a grade mostra. Se ele escolhesse sozinho, passar por 2025 a caminho
   * de 2024 registraria uma competência em 2025 no caminho.
   */
  it('avança o ano sem escolher nada', () => {
    const onChange = jest.fn();
    render(<MonthField label="Mês de competência" month={8} onChange={onChange} year={2026} />);

    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));
    fireEvent.press(screen.getByLabelText('Próximo ano'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('2027')).toBeTruthy();
  });

  it('escolhe um mês do ano para o qual a grade foi movida', () => {
    const onChange = jest.fn();
    render(<MonthField label="Mês de competência" month={8} onChange={onChange} year={2026} />);

    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));
    fireEvent.press(screen.getByLabelText('Ano anterior'));
    fireEvent.press(screen.getByText('Fev'));

    expect(onChange).toHaveBeenCalledWith(2025, 2);
  });

  it('recomeça no ano do valor a cada abertura', () => {
    render(<MonthField label="Mês de competência" month={8} onChange={jest.fn()} year={2026} />);

    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));
    fireEvent.press(screen.getByLabelText('Próximo ano'));
    fireEvent.press(screen.getByLabelText('Fechar'));
    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));

    expect(screen.getByText('2026')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- MonthField`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Escrever o `MonthField`**

`src/components/form/MonthField.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeftIcon, ArrowRightIcon, CalendarRange } from 'lucide-react-native';

import { monthAbbrev, monthLabel } from '@/utils/dates';
import { FieldTrigger } from '@/components/form/FieldTrigger';
import { Sheet } from '@/components/form/Sheet';
import { colors, control, radius, space, type } from '@/components/theme';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * O mês como campo, e não como navegação.
 *
 * A barra de "mês anterior / próximo mês" é o controle certo para *percorrer* meses vizinhos, que é
 * o que as telas de Resumo, Despesas e Receitas fazem. Aqui a pergunta é outra — em que mês este
 * lançamento entra — e a resposta pode estar a oito meses de distância. Uma grade responde em um
 * toque o que a barra responde em oito.
 *
 * O ano da grade é estado próprio e recomeça no ano do valor a cada abertura: mover a grade é olhar,
 * não escolher. Se mudar de ano escolhesse sozinho, passar por 2025 a caminho de 2024 registraria
 * uma competência em 2025 no caminho.
 */
export function MonthField({
  label,
  year,
  month,
  onChange,
}: {
  label: string;
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [shownYear, setShownYear] = useState(year);

  const chosen = monthLabel(year, month);

  return (
    <>
      <FieldTrigger
        icon={<CalendarRange color={colors.text.secondary} size={18} />}
        label={label}
        onPress={() => {
          setShownYear(year);
          setOpen(true);
        }}
        placeholder={chosen}
        value={chosen}
      />

      <Sheet
        onClose={() => {
          setOpen(false);
        }}
        title={label}
        visible={open}
      >
        <View style={styles.years}>
          <Pressable
            accessibilityLabel="Ano anterior"
            accessibilityRole="button"
            onPress={() => {
              setShownYear((current) => current - 1);
            }}
            style={styles.step}
          >
            <ArrowLeftIcon color={colors.text.primary} size={14} />
          </Pressable>

          <Text style={styles.year}>{String(shownYear)}</Text>

          <Pressable
            accessibilityLabel="Próximo ano"
            accessibilityRole="button"
            onPress={() => {
              setShownYear((current) => current + 1);
            }}
            style={styles.step}
          >
            <ArrowRightIcon color={colors.text.primary} size={14} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {MONTHS.map((each) => {
            const isSelected = shownYear === year && each === month;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={each}
                onPress={() => {
                  onChange(shownYear, each);
                  setOpen(false);
                }}
                style={[styles.month, isSelected ? styles.monthSelected : null]}
              >
                <Text style={[styles.monthLabel, isSelected ? styles.monthLabelSelected : null]}>
                  {/* `shownYear` como referência devolve 'Jan', sem o sufixo de ano que a linha de
                      tendência usa: aqui o ano já está escrito acima da grade. */}
                  {monthAbbrev(shownYear, each, shownYear)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  years: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  step: {
    alignItems: 'center',
    borderColor: colors.border.default,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: control.size - space.md,
    justifyContent: 'center',
    width: control.size - space.md,
  },
  year: {
    ...type.heading,
    color: colors.text.primary,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  month: {
    alignItems: 'center',
    backgroundColor: colors.surface.raised,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    // Três por linha, com dois vãos de `space.sm` entre elas.
    minHeight: control.size,
    width: '31%',
  },
  monthSelected: {
    backgroundColor: colors.surface.selected,
    borderColor: colors.border.default,
  },
  monthLabel: {
    ...type.label,
    color: colors.text.secondary,
  },
  monthLabelSelected: {
    color: colors.text.primary,
  },
});
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- MonthField`
Expected: PASS (6 testes).

- [ ] **Step 5: Exportar e usar nas duas telas**

Em `src/components/form/index.ts`:

```ts
export { MonthField } from './MonthField';
```

Em `src/screens/RegisterExpense/RegisterExpenseScreen.tsx`, dentro de `<View testID="competence-override">`, troque o `MonthNavigator` por:

```tsx
        {overriding ? (
          <MonthField
            label="Mês de competência"
            month={overrideMonth.month}
            onChange={(year, month) => {
              setOverrideMonth({ year, month });
            }}
            year={overrideMonth.year}
          />
        ) : null}
```

Troque o import de `@/components/MonthNavigator` por `MonthField` vindo de `@/components/form`.

Em `src/screens/RecordRecurringPayment/RecordRecurringPaymentScreen.tsx`, troque o par

```tsx
      <Text style={styles.sectionLabel}>Mês de referência</Text>
      <MonthNavigator
        month={period.month}
        onChange={...}
        year={period.year}
      />
```

por

```tsx
      <MonthField
        label="Mês de referência"
        month={period.month}
        onChange={(year, month) => {
          setPeriod({ year, month });
          setRecurringExpenseId(null);
        }}
        year={period.year}
      />
```

Apague a chave `sectionLabel` de `RecordRecurringPaymentScreen.styles.ts` e o import de `Text` se nada mais na tela o usar.

- [ ] **Step 6: Apagar o `MonthNavigator`**

Em `DashboardScreen.tsx`, `ExpenseMonthScreen.tsx` e `IncomeScreen.tsx`, troque `import { MonthNavigator } from '@/components/MonthNavigator';` por `import { MonthTrend } from '@/components/MonthTrend';` e renomeie o uso — os três já passam `series`, então as props são as mesmas (`year`, `month`, `onChange`, `series`).

```bash
git rm src/components/MonthNavigator.tsx src/components/MonthNavigator.test.tsx
```

- [ ] **Step 7: Corrigir o teste do override**

Em `src/screens/RegisterExpense/RegisterExpenseScreen.test.tsx`, no teste `'sends the chosen month and leaves the purchase date alone'`, os dois `fireEvent.press` do `MonthNavigator` deixam de existir. Troque

```tsx
    await waitFor(() => {
      expect(within(screen.getByTestId('competence-override')).getByText('Agosto de 2026')).toBeTruthy();
    });

    fireEvent.press(within(screen.getByTestId('competence-override')).getByText('Próximo mês'));
```

por

```tsx
    await waitFor(() => {
      expect(screen.getByLabelText('Mês de competência, Agosto de 2026')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Mês de competência, Agosto de 2026'));
    fireEvent.press(screen.getByText('Set'));
```

A asserção final, `expect(expensePayload().competenceMonth).toBe('2026-09-01')`, não muda: é ela que prova que o campo novo reporta o mesmo par que a barra reportava.

- [ ] **Step 8: Rodar tudo**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. Os testes de Dashboard, Expense e Income pressionam `'Mês anterior'`/`'Próximo mês'` por `accessibilityLabel`, e o `MonthTrend` tem os dois — nada a mudar neles.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: the competence month is a field, not a pair of arrows

Stepping one month at a time is the right control for browsing neighbours,
which is what the summary and the month screens do. Deciding which month a
launch belongs to is a different question, and its answer can be eight
months away. MonthNavigator's arrow branch had no callers left, so the three
browsing screens now use MonthTrend directly."
```

---

## Task 11: Mobile — despesa variável sem cartão

**Files:**
- Modify: `src/types/expense.ts`
- Modify: `src/hooks/useExpenses.ts`
- Modify: `src/screens/RegisterExpense/RegisterExpenseScreen.tsx`
- Modify: `src/screens/Expense/ExpenseMonthScreen.tsx:67`
- Test: `src/screens/RegisterExpense/RegisterExpenseScreen.test.tsx`

**Interfaces:**
- Consumes: o backend das Tasks 1–3; `Picker` da Task 9.
- Produces: nada que outra task consuma. É a última.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/screens/RegisterExpense/RegisterExpenseScreen.test.tsx`, acrescente uma conta corrente às fixtures, logo abaixo de `marinasCard`:

```tsx
/** Sem `closingDay`: não é cartão, então é de onde um Pix ou um débito sai. */
const checking = {
  id: 'a3',
  name: 'Inter',
  institution: 'Banco Inter',
  personId: 'p1',
  closingDay: null,
  dueDay: null,
  limit: null,
};
```

E um bloco novo no fim do arquivo:

```tsx
/**
 * O `closingDay` é o que separa um cartão de uma conta corrente, e é o que decide o mês de
 * competência de uma compra no crédito. Oferecer um cartão para um Pix é oferecer a única escolha
 * que não pode estar certa.
 */
describe('a conta segue o tipo da despesa', () => {
  it('oferece só os cartões no crédito', async () => {
    catalogue([rayan], [rayansCard, checking]);
    renderForm();

    await waitFor(() => {
      expect(within(screen.getByTestId('account-picker')).getByText('Nubank')).toBeTruthy();
    });

    expect(within(screen.getByTestId('account-picker')).queryByText('Inter')).toBeNull();
  });

  it('oferece só as contas correntes no Pix', async () => {
    catalogue([rayan], [rayansCard, checking]);
    renderForm();

    await waitFor(() => {
      expect(within(screen.getByTestId('account-picker')).getByText('Nubank')).toBeTruthy();
    });

    fireEvent.press(within(screen.getByTestId('type-picker')).getByText('Pix'));

    expect(within(screen.getByTestId('account-picker')).getByText('Inter')).toBeTruthy();
    expect(within(screen.getByTestId('account-picker')).queryByText('Nubank')).toBeNull();
  });

  it('esquece a conta escolhida quando ela sai da lista', async () => {
    catalogue([rayan], [rayansCard, checking]);
    stub('POST', '/expense', 201, { ...registeredIn('2026-08-01'), accountId: null, type: 2 });
    renderForm();

    await waitFor(() => {
      expect(within(screen.getByTestId('account-picker')).getByText('Nubank')).toBeTruthy();
    });

    fireEvent.press(within(screen.getByTestId('account-picker')).getByText('Nubank'));
    fireEvent.press(within(screen.getByTestId('type-picker')).getByText('Pix'));

    fireEvent.press(within(screen.getByTestId('category-picker')).getByText('Alimentação'));
    fireEvent.changeText(screen.getByLabelText('Nome'), 'Almoço');
    fireEvent.changeText(screen.getByLabelText('Valor'), '32,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/expense')).toBeDefined();
    });

    // Não 'a1': aquele cartão deixou de ser uma escolha possível no momento em que o tipo mudou.
    expect(expensePayload().accountId).toBeNull();
    expect(expensePayload().type).toBe(2);
  });
});

describe('quando a conta é obrigatória', () => {
  it('registra um Pix sem nenhuma conta escolhida', async () => {
    catalogue([rayan], [rayansCard]);
    stub('POST', '/expense', 201, { ...registeredIn('2026-08-01'), accountId: null, type: 2 });
    renderForm();

    await waitFor(() => {
      expect(within(screen.getByTestId('category-picker')).getByText('Alimentação')).toBeTruthy();
    });

    fireEvent.press(within(screen.getByTestId('type-picker')).getByText('Pix'));
    fireEvent.press(within(screen.getByTestId('category-picker')).getByText('Alimentação'));
    fireEvent.changeText(screen.getByLabelText('Nome'), 'Almoço');
    fireEvent.changeText(screen.getByLabelText('Valor'), '32,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    await waitFor(() => {
      expect(bodySentTo('POST', '/expense')).toBeDefined();
    });

    expect(expensePayload().accountId).toBeNull();
  });

  it('não envia um crédito sem conta', async () => {
    catalogue([rayan], [rayansCard]);
    renderForm();

    await waitFor(() => {
      expect(within(screen.getByTestId('category-picker')).getByText('Alimentação')).toBeTruthy();
    });

    fireEvent.press(within(screen.getByTestId('category-picker')).getByText('Alimentação'));
    fireEvent.changeText(screen.getByLabelText('Nome'), 'Passagem');
    fireEvent.changeText(screen.getByLabelText('Valor'), '480,00');
    fireEvent.press(screen.getByText('Registrar despesa'));

    // A guarda continua de pé: é o `closingDay` da conta que decide o mês de um crédito.
    expect(bodySentTo('POST', '/expense')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- RegisterExpenseScreen`
Expected: FAIL — o picker de conta ainda oferece tudo, e o Pix sem conta não chega a ser enviado.

- [ ] **Step 3: Afrouxar os tipos**

Em `src/types/expense.ts`:

```ts
  /** Null quando a despesa não saiu de uma conta cadastrada — um Pix, um débito solto. */
  accountId: string | null;
```
em `VariableExpenseLine` e em `Expense`, e em `VariableExpenseLine`:
```ts
  /** Null, e não string vazia: uma conta sem nome e nenhuma conta são coisas diferentes. */
  accountName: string | null;
```

Em `src/hooks/useExpenses.ts`, em `RegisterExpenseInput`:

```ts
  /** Obrigatória no crédito, opcional no débito e no Pix (spec EXP). */
  accountId: string | null;
```

`RegisterInstallmentPlanInput.accountId` **não muda**: um parcelamento é cartão por definição.

- [ ] **Step 4: Filtrar as contas e afrouxar a guarda**

Em `src/screens/RegisterExpense/RegisterExpenseScreen.tsx`, acrescente acima do `return`:

```tsx
  /**
   * O `closingDay` é o que separa um cartão de uma conta corrente. Um crédito precisa de um cartão —
   * é o fechamento dele que decide o mês de competência (MAD-001) —, e um Pix não sai de um.
   *
   * O servidor aceita qualquer conta com qualquer tipo e continuará aceitando: isto não é uma regra
   * que o app impõe, é uma escolha que o app deixa de oferecer. Continua sem filtrar por pessoa
   * (spec EXP AC7): uma despesa de um pode sair da conta de outro, deliberadamente.
   */
  const isCredit = type === 0;

  const accountOptions = (accounts.data ?? [])
    .filter((account) => (isCredit ? account.closingDay !== null : account.closingDay === null))
    .map((account) => ({ label: account.name, value: account.id }));

  const chooseType = (next: ExpenseType): void => {
    setType(next);

    // Uma seleção que saiu da lista mas continua sendo enviada é pior que nenhuma: o usuário vê um
    // picker sem nada marcado e a requisição leva o cartão de antes.
    setAccountId(null);
  };
```

Troque o picker de tipo para `onChange={chooseType}` e o de conta para:

```tsx
      <View testID="account-picker">
        <Picker
          label={isCredit ? 'Conta' : 'Conta (opcional)'}
          onChange={setAccountId}
          options={accountOptions}
          selected={accountId}
        />
      </View>
```

E a guarda de `submit()`:

```tsx
    // Só o crédito exige conta: é o `closingDay` dela que decide o mês de competência.
    if (personId === null || categoryId === null || (isCredit && accountId === null)) {
      return;
    }
```

- [ ] **Step 5: Dizer de onde saiu quando não houve conta**

Em `src/screens/Expense/ExpenseMonthScreen.tsx:67`, troque

```tsx
        {line.date} · {line.accountName}
```

por

```tsx
        {/* Sem conta, a resposta para "de onde saiu" é a forma de pagamento. */}
        {line.date} · {line.accountName ?? EXPENSE_TYPE_LABEL[line.type]}
```

Acrescente `EXPENSE_TYPE_LABEL` ao import de `@/types/expense` no topo do arquivo.

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npm test -- RegisterExpenseScreen`
Expected: PASS.

- [ ] **Step 7: Rodar a suíte inteira**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. O teste `'offers every household account and sends the one chosen, whoever owns it'` (spec EXP AC7) continua verde porque `rayansCard` e `marinasCard` são ambos cartões e o tipo padrão é Crédito.

- [ ] **Step 8: Ver funcionando de ponta a ponta**

Com o backend rodando na branch `feature/optional-expense-account` (`dotnet run --project src/Balance.Api`) e o app no preview do web: escolha Pix, deixe a conta em branco, registre, e confirme que a despesa aparece no mês com "Pix" no lugar do nome da conta. Depois escolha Crédito sem conta e confirme que o botão não envia. Tire screenshots dos dois.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: a Pix does not come out of a credit card

The account picker follows the type: cards for credit, current accounts for
debit and Pix, and nothing at all is a valid answer for the latter two. The
month list names the payment type where the account name used to be."
```

---

## Fechamento

- [ ] **Rodar as duas suítes inteiras uma última vez**

Backend: `dotnet test`. Mobile: `npx tsc --noEmit && npm test`.

- [ ] **Conferir a lista do balance-design**

1. Nenhum hex novo fora de `theme.ts` — `grep -rn "#[0-9a-fA-F]\{6\}" src --include=*.tsx --include=*.ts | grep -v theme.ts` deve voltar vazio.
2. Todo container de tela tem `backgroundColor` explícito.
3. Todo `TextInput` tem `color` e `placeholderTextColor` (o campo de busca do `SelectSheet` é o único novo).
4. Nenhum `padding`/`gap`/`fontSize` numérico solto.
5. Texto em `text.muted` não carrega informação essencial.

- [ ] **Abrir os PRs**

Um por repositório, com o link para a spec no corpo. Se for usar a skill `creating-pull-requests`, invoque-a agora.

---

## Auto-revisão deste plano

**Cobertura da spec.** Seção 1 → Tasks 1, 2, 3 (backend) e 11 (mobile). Seção 2 → Task 8. Seção 3 → Task 9. Seção 4 → Tasks 4 e 5, mais a movimentação do `DateField` na Task 8 e de `connectivity.ts` na Task 4. Seção 5 → Task 10, incluindo o descarte do `MonthNavigator`. "Testes" → os passos de teste de cada task, mais o fechamento. Sem lacunas.

**Consistência de nomes entre tasks.** `fieldStyles` (Task 5) é usado com as chaves `field`, `label`, `input`, `box`, `invalid`, `value`, `placeholder`, `error` nas Tasks 7 e 9 — a chave é `invalid`, não `boxInvalid`. `Sheet` recebe `title`, `subtitle?`, `visible`, `onClose`, `children` nas Tasks 6, 8, 9 e 10. `FieldTrigger` recebe `label`, `value`, `placeholder`, `icon`, `error?`, `onPress` nas Tasks 7, 8, 9 e 10. `PickerOption<T>` mora em `Picker.tsx` e é importado como tipo em `OptionChips.tsx` e `SelectSheet.tsx`. Os `testID` `native-picker`, `native-picker-set` e `native-picker-dismiss` são os mesmos no mock global (Task 8, Step 2), no mock do componente (Step 3) e em `src/utils/testDate.ts`, que não é editado.
