# Navegador de mês como gráfico de linhas

Data: 2026-08-18
Estado: aprovado para planejamento

## Problema

O [`MonthNavigator`](../../../src/components/MonthNavigator.tsx) é hoje três coisas numa linha: um
botão "Mês anterior", o nome do mês e um botão "Próximo mês". Ele diz em que mês a tela está, mas não
diz nada sobre o mês — e a única forma de descobrir se agosto foi melhor ou pior que julho é sair de
agosto, ler o número, e voltar. A comparação existe na cabeça do usuário, nunca na tela.

A troca pedida: no lugar da barra, um gráfico de linhas em que cada ponto é um mês com o seu valor,
arrastável na horizontal, e o mês em que ele encaixa passa a ser o mês da tela.

O componente é usado em seis telas, e elas não querem a mesma coisa:

| Tela | Papel do navegador |
| --- | --- |
| [Dashboard](../../../src/screens/Dashboard/DashboardScreen.tsx) | escolhe o mês que a tela lê |
| [Despesas do mês](../../../src/screens/Expense/ExpenseMonthScreen.tsx) | escolhe o mês que a tela lê |
| [Receitas](../../../src/screens/Income/IncomeScreen.tsx) | escolhe o mês que a tela lê |
| [Registrar despesa](../../../src/screens/RegisterExpense/RegisterExpenseScreen.tsx) | campo do formulário: o mês de competência |
| [Registrar pagamento de receita](../../../src/screens/RecordIncomePayment/RecordIncomePaymentScreen.tsx) | campo do formulário: o mês de referência |
| [Registrar pagamento recorrente](../../../src/screens/RecordRecurringPayment/RecordRecurringPaymentScreen.tsx) | campo do formulário: o mês de competência |

Nas três de baixo não existe "o valor do mês": o navegador é um seletor dentro de um formulário.

E a API não tem endpoint de série. Só `GET /dashboard/{y}/{m}`, `GET /expense/{y}/{m}` e
`GET /income/{y}/{m}`, um mês por requisição — um gráfico de N meses custa N requisições.

## Decisões

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Que valor a linha plota | O da própria tela | Escolha do usuário. Dashboard `balance`, Despesas `totalCommitted`, Receitas `totalReceived` |
| Telas de formulário | Seguem com a barra de setas atual | Escolha do usuário. Não há valor a mostrar, e uma tela de escrita não deveria carregar cinco meses de leitura |
| Tamanho da janela | 5 meses: o selecionado, 2 antes, 2 depois | Escolha do usuário. Cabe numa largura de celular e custa no máximo 4 requisições novas |
| Fonte dos meses | As mesmas query keys do `qk` | Mês já visitado vem do cache, o mês central não duplica a requisição da tela, e a invalidação que já existe atualiza o gráfico de graça |
| Gesto | Arrasta e encaixa no mês central | Escolha do usuário. Tocar num ponto também seleciona |
| Setas | Continuam, como ícones discretos nas pontas | Arrastar não existe para leitor de tela; são também o caminho que os testes atuais exercitam |

Descartado: um componente novo em paralelo ao `MonthNavigator`. As seis telas passariam a importar
dois componentes com a mesma responsabilidade, e a escolha de qual usar viraria decisão de cada tela
— exatamente o tipo de bifurcação que o `MonthNavigator` existe para evitar. Em vez disso a prop
`series` é o que decide a forma, e a ausência dela é a barra de hoje.

## Arquitetura

Quatro peças, cada uma com uma fronteira: uma sabe de API, uma sabe de janela de meses, uma sabe
desenhar, e a de cima só escolhe entre as duas formas.

| Arquivo | Sabe | Não sabe |
| --- | --- | --- |
| `src/hooks/useMonthSeries.ts` (novo) | montar a janela e ler N meses com `useQueries` | qual endpoint, qual campo |
| `useDashboard.ts` / `useExpenses.ts` / `useIncome.ts` | qual endpoint e qual campo é "o valor do mês" | como a janela é montada, como é desenhada |
| `src/components/MonthTrend.tsx` (novo) | desenhar a linha, o gesto e o encaixe | react-query, API |
| [`MonthNavigator.tsx`](../../../src/components/MonthNavigator.tsx) | escolher entre a barra e o gráfico | tudo o mais |

### `useMonthSeries` — a janela

```ts
export type MonthValue = {
  year: number;
  month: number;
  /** null enquanto o mês não chegou, e null quando a requisição dele falhou. */
  value: number | null;
};

/** Quantos meses de cada lado do selecionado. */
export const SERIES_RADIUS = 2;

/** Os 5 meses ao redor, em ordem, atravessando a virada de ano por `shiftMonth`. */
export function monthWindow(year: number, month: number): { year: number; month: number }[];

export function useMonthSeries<T>(
  year: number,
  month: number,
  source: {
    queryKey: (year: number, month: number) => readonly unknown[];
    queryFn: (year: number, month: number) => Promise<T>;
    value: (data: T) => number;
  }
): MonthValue[];
```

Por dentro é um `useQueries` com uma query por mês da janela, registrada **na key que o `qk` já
produz**, e um `combine` que reduz os resultados a `MonthValue[]`. Três consequências, e são elas que
justificam a escolha:

- O mês central é a mesma query que a tela já faz. Mesma key, mesma entrada de cache, zero
  requisição a mais.
- Um mês já visitado é um `data` que já está no cache: aparece sem rede.
- Toda invalidação que já existe (MAD-003 — `qk.dashboard`, `qk.expenseMonth`, `qk.incomeMonth` e os
  prefixos) atualiza o gráfico depois de um lançamento, sem nenhuma linha nova nas mutations.

Um mês que não chegou tem `value: null`, e **null não é zero**. Um zero desenharia um ponto no chão
do gráfico afirmando que o mês não teve movimento; a mesma distinção que o projeto já faz entre
`expectedAmount: null` e `R$ 0,00`. Vale também para a falha: um mês vizinho que erra é um ponto que
falta, nunca um erro na tela — o `ErrorState` continua sendo do mês que a tela lê.

O componente não guarda estado, como hoje. A janela é **derivada** de `year`/`month`: quando o
encaixe reporta outro mês, a tela troca o período, a janela recentra e os meses novos são buscados.

### Seletores por tela

Um por feature, ao lado da query que já existe, para que o conhecimento do endpoint continue num só
lugar. O caminho da URL passa a ser uma função compartilhada entre a query do mês e a da série, em
vez de a string aparecer duas vezes no arquivo:

| Hook novo | Arquivo | Valor |
| --- | --- | --- |
| `useDashboardSeries` | `useDashboard.ts` | `data.balance` |
| `useExpenseMonthSeries` | `useExpenses.ts` | `data.totalCommitted` |
| `useIncomeMonthSeries` | `useIncome.ts` | `data.totalReceived` |

### `MonthNavigator` — a bifurcação

```ts
export function MonthNavigator({ year, month, onChange, series }: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  series?: MonthValue[];
}): React.JSX.Element;
```

Sem `series`, renderiza a barra de hoje, inalterada — é o que as três telas de formulário continuam
recebendo, e é o que os seis testes atuais do componente continuam exercitando. Com `series`,
renderiza `MonthTrend`. A prop é opcional porque a ausência de série *é* a informação: a tela que não
tem valor para mostrar não passa nada.

### `MonthTrend` — o desenho e o gesto

Recebe `series`, `year`, `month`, `onChange`. Estrutura, de cima para baixo:

1. **Cabeçalho** — nome do mês selecionado (`monthLabel`) e o valor dele por `<Money>`, que já
   carrega o sinal e o vermelho de negativo (spec DASH AC5). Valor `null` vira `—`.
2. **Gráfico** — `react-native-svg`, largura de 5 slots, cada ponto no centro do seu slot.
3. **Rótulos** — a abreviação do mês sob cada ponto.
4. **Setas** — dois ícones nas pontas, sobrepostos às bordas do gráfico.

**Geometria.** A largura da viewport vem de `onLayout`; `slot = largura / 3`, então o mês selecionado
fica centrado com um vizinho de cada lado à mostra e a série continua para fora da tela. A posição de
repouso é `translateX = -slot` (o slot 2 de 5 centrado), e é dela que o gesto parte.

Enquanto a medição não chega, a largura é estimada a partir de `useWindowDimensions` menos o padding
que a `Screen` aplica e a borda do cartão. Não é preciosismo: verificado no alvo web deste projeto, o
`onLayout` **não dispara** — nem no componente, nem num `View` vazio de teste — e uma largura zero
põe os cinco pontos no mesmo `x`, desenhando os meses como um traço vertical. A estimativa é
substituída no instante em que uma medição real chega, que é o que acontece no Android e no iOS.

**Escala vertical.** Mínimo e máximo dos valores presentes, com respiro em cima e embaixo. Série de
valores iguais (ou de um único ponto) desenha uma linha no meio da altura, não colada numa borda.
Zero não é forçado como piso: com `balance` negativo o gráfico ainda tem que ter forma.

**Buracos.** Meses ausentes cortam a linha. O traçado é feito por trechos contíguos de meses com
valor: cada trecho tem o seu caminho de linha e a sua área. Interpolar por cima de um buraco
inventaria um valor que ninguém leu.

**Encaixe.** O `snapTarget` é uma função pura, exportada e testada isolada do gesto:

```ts
/** Quantos meses o arraste pediu, limitado ao que a janela alcança. */
export function snapTarget(translationX: number, slotWidth: number, radius: number): number;
```

Arrastar para a esquerda avança (`delta = round(-translationX / slotWidth)`), limitado a ±`radius`
— além disso a janela não tem dados, e encaixar num ponto vazio seria mostrar `—` num mês que o
usuário escolheu de propósito. O pan (`react-native-gesture-handler`) acompanha o dedo por
`translateX` (`react-native-reanimated`); ao soltar, anima até o slot, reporta `onChange`, e o
`translateX` volta ao repouso quando a janela recentrada chega. Um `delta` de 0 não reporta nada.

**Toque e acessibilidade.** Sobre cada slot há um `Pressable` invisível com
`accessibilityLabel` = mês + valor, que reporta aquele mês — é o caminho de toque e é como os testes
selecionam um mês sem gesto nativo. O contêiner do gráfico é `accessibilityRole="adjustable"` com
`accessibilityValue` do mês selecionado e ações de incremento/decremento, para que o leitor de tela
tenha o mesmo alcance que o dedo. As duas setas mantêm os rótulos "Mês anterior" e "Próximo mês".

### Tokens e utilitários

- `theme.ts` ganha a família `chart`: altura do gráfico, respiro vertical da escala, espessura da
  linha, raio do ponto e raio do ponto selecionado. Geometria de gráfico é decisão de design e não
  vira número solto dentro do componente. A largura do slot não é token: ela vem do `onLayout`.
- `utils/dates.ts` ganha `monthAbbrev(year, month)`: `'Ago'`, e `'Ago 25'` quando o ano difere do
  mês selecionado — sem isso, dezembro e janeiro ficam indistinguíveis numa virada de ano.

### Visual

Segue a base de design do app (`.claude/skills/balance-design`), sem nenhum hex novo fora do
`theme.ts`:

| Elemento | Token |
| --- | --- |
| Cartão do componente | `surface.raised`, `border.subtle`, `radius.md`, `padding: space.lg` |
| Área sob a linha | `accent.soft` |
| Linha | `accent.base` |
| Ponto comum | `border.strong` |
| Ponto selecionado | `accent.base`, com anel `surface.raised` |
| Guia vertical no centro | `border.subtle` |
| Rótulo de mês | `type.caption` / `text.muted` |
| Rótulo do mês selecionado | `type.label` / `text.primary` |
| Valor no cabeçalho | `<Money>` (`type.money`) |

O valor cheio aparece só no mês selecionado. Cinco `R$ 1.234,56` empilhados sob os pontos, numa
largura de celular, competem com a própria linha e com o conteúdo da tela; a forma da linha é o que
compara os meses, e o número exato é do mês escolhido.

### Dependência

`react-native-svg@15.15.5` já está em `node_modules` como peer de `lucide-react-native` e já está
liberado no `transformIgnorePatterns` do [`jest.config.js`](../../../jest.config.js). Passa a ser
dependência explícita via `npx expo install react-native-svg`: usar um peer transitivo funciona até a
primeira limpeza de lockfile.

Nada mais entra. `react-native-gesture-handler` e `react-native-reanimated` já são dependências
diretas.

## Testes

| Arquivo | O que fixa |
| --- | --- |
| `useMonthSeries.test.tsx` | os 5 meses da janela, atravessando virada de ano nos dois sentidos; leitura pelas keys do `qk`; mês em cache não refaz requisição; mês que falha vira `value: null` sem derrubar os outros |
| `MonthTrend.test.tsx` | `snapTarget` como função pura (avanço, recuo, limite ±2, arraste curto que não move); rótulos dos 5 meses; valor cheio só do selecionado; mês sem valor não vira ponto nem `R$ 0,00`; toque num vizinho reporta aquele mês; setas reportam o mês certo |
| `MonthNavigator.test.tsx` | os 6 testes atuais seguem valendo sem `series` (as telas de formulário); com `series`, mostra a linha |
| Testes das 3 telas | ganham stubs dos meses vizinhos e uma asserção de que a série aparece |

O pan em si não é testado por unidade: o gesto real depende do módulo nativo. O que o encaixe decide
está em `snapTarget`, que é testável sem gesto, e o que ele reporta está coberto pelo toque.

Os meses esperados nos testes continuam sendo pares literais, nunca calculados com `shiftMonth` na
asserção (lição L-010): uma asserção que espelha o componente concorda com ele em qualquer resposta
errada.

## Fora de escopo

- Endpoint de série na API. Cinco requisições cacheadas resolvem o gráfico pedido; um endpoint novo é
  decisão de backend e cabe numa medição, não neste componente.
- Gráfico nas telas de formulário.
- Zoom, escolha de período, ou mais de uma linha no mesmo gráfico.
