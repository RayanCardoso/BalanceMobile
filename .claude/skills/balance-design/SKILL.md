---
name: balance-design
description: Base de design obrigatória do app Balance — tema escuro em grafite neutro com a cor racionada, tokens de cor, espaçamento, tipografia e receitas de componente. Use SEMPRE que o trabalho tocar em aparência - criar ou editar tela, componente, StyleSheet, cor, hex, fundo, botão, card, input, badge, ícone, tab bar, splash, status bar, layout, espaçamento, tipografia, dark mode, "deixa mais bonito", "ajusta o visual", "muda a cor", "arruma o design", UI, UX.
---

# Base de design do Balance

O Balance é um app **escuro, em grafite quase neutro**. Não existe tema claro, não existe toggle.
Qualquer coisa que apareça na tela nasce da base descrita aqui.

O chão era azul-marinho saturado, e ele voltou a ser cinza por um motivo que vale repetir antes de
qualquer decisão: **com azul no fundo, no cartão, na linha, no input e na barra, o azul que significa
"esta é a ação" não tinha contra o que se destacar.** Cor aqui é racionada — o acento, os status de
dinheiro, e o cartão de banco. Todo o resto é cinza, e é isso que faz aqueles três lerem como sinal.

## Regra número um: nada de cor literal

Toda cor vem de [`src/shared/ui/theme.ts`](../../../src/shared/ui/theme.ts). Um `#rrggbb` escrito
direto numa tela é uma cor que nenhuma outra tela enxerga — é assim que um app perde a identidade.

```ts
import { colors, radius, space, type } from '@/shared/ui/theme';
```

Se falta um token para o que você precisa, **adicione o token em `theme.ts`** e use-o. Nunca resolva
localmente. Ao adicionar, respeite a lógica das famílias existentes (`surface`, `border`, `text`,
`accent`, `status`).

## Profundidade: cor, não sombra

Sombra não lê em fundo quase preto. Elevação no Balance é um degrau de superfície:

| Camada | Token | Onde |
| --- | --- | --- |
| Fundo da tela | `colors.surface.base` | `Screen`, o container de tudo |
| Card / linha / input / tab bar | `colors.surface.raised` | conteúdo apoiado sobre a tela |
| Modal / menu / linha pressionada | `colors.surface.overlay` | um degrau acima do card |
| Selecionado | `colors.surface.selected` | chip ativo, linha escolhida |

Separação entre itens: `borderColor: colors.border.subtle` com `borderWidth: 1` (ou
`borderTopWidth`). `colors.border.strong` só para o que precisa ser achado rápido (input em foco).

Todo container de tela **precisa** de `backgroundColor` explícito. Um `View` sem fundo herda branco
em algumas superfícies do RN e produz um flash claro — o defeito mais visível que este app pode ter.

## Texto

`colors.text.primary` para valor, título, o que decide algo. `colors.text.secondary` para rótulo e
linha de apoio. `colors.text.muted` só para legenda, placeholder e desabilitado — nunca para a única
informação que a tela dá. Em cima de `colors.accent.base`, use `colors.text.onAccent`.

Em `TextInput`, sempre defina `placeholderTextColor={colors.text.muted}` e `color` do texto — o
padrão do RN é escuro sobre escuro e some.

Tamanhos e pesos saem de `type.*` (`hero`, `title`, `heading`, `body`, `label`, `caption`, `money`).
Valor monetário usa `type.money`, que traz `tabular-nums`. `type.hero` é o valor que **é** o assunto
da tela — o saldo do mês, o total de receitas, o total de despesas: **um por tela**, no topo, e nada
mais neste tamanho.

## Cor com significado

- Azul: **um** azul, um destaque por tela. Ele vem em dois tokens porque tem dois trabalhos, e
  trocar um pelo outro produz texto ilegível nas duas direções:
  - `colors.accent.base` é **preenchimento** — botão primário, a linha do gráfico, o ponto ativo.
    Em cima dele vai `colors.text.onAccent`. Nunca use `accent.base` como cor de texto.
  - `colors.accent.text` é o mesmo azul **como tinta** sobre superfície escura — link, rótulo de
    ação, ícone que leva a algum lugar.
- Ícone não é lugar de cor. Se o rótulo ao lado já diz o que a linha é, o ícone vai em
  `colors.text.secondary` dentro de um disco `colors.surface.overlay`. Ícone verde ao lado da
  palavra "Receitas" não informa nada e gasta um dos poucos destaques da tela.
- `colors.status.positive` / `warning` / `negative` para tom de dinheiro e situação. Os `*Soft`
  correspondentes são o fundo do badge; o texto do badge vai na cor forte.
- Cor nunca é o único sinal (o sinal negativo continua no texto, o rótulo continua no badge). Já é
  o que `Money`/`StatusBadge` fazem — mantenha.

## Espaçamento e forma

`space.*` (escala de 4pt) para todo `padding`, `margin` e `gap`. `radius.sm` em input e botão,
`radius.md`/`lg` em card, `radius.pill` em badge e chip. Nada de número solto.

## Receitas

```ts
// Tela
screen: { flex: 1, backgroundColor: colors.surface.base, padding: space.lg }

// Card / linha de lista
card: {
  backgroundColor: colors.surface.raised,
  borderColor: colors.border.subtle,
  borderRadius: radius.md,
  borderWidth: 1,
  gap: space.sm,
  padding: space.lg,
}

// Input
input: {
  backgroundColor: colors.surface.raised,
  borderColor: colors.border.subtle,
  borderRadius: radius.sm,
  borderWidth: 1,
  color: colors.text.primary,
  paddingHorizontal: space.md,
  paddingVertical: space.sm,
}

// Botão primário / secundário
primary:   { backgroundColor: colors.accent.base, borderRadius: radius.sm, paddingVertical: space.md }
primaryLabel: { ...type.label, color: colors.text.onAccent }
secondary: { borderColor: colors.border.strong, borderWidth: 1, borderRadius: radius.sm }

// Lista de linhas: UM bloco com régua interna, não N cartões soltos
list: { backgroundColor: colors.surface.raised, borderColor: colors.border.subtle,
        borderRadius: radius.md, borderWidth: 1, overflow: 'hidden' }
row:  { alignItems: 'center', flexDirection: 'row', gap: space.md, padding: space.md }
rowIcon: { alignItems: 'center', backgroundColor: colors.surface.overlay, borderRadius: space.xxl,
           height: space.xxl, justifyContent: 'center', width: space.xxl }
// Recuada até depois do ícone: ela separa os nomes, não corta a linha inteira.
rule: { backgroundColor: colors.border.subtle, height: StyleSheet.hairlineWidth,
        marginLeft: space.md + space.xxl + space.md }

// Botão de adicionar: círculo de `control.fab`, sem legenda
fab: { alignItems: 'center', backgroundColor: colors.accent.base, borderRadius: control.fab,
       height: control.fab, justifyContent: 'center', width: control.fab }
```

**Quatro cartões com borda são quatro objetos; um bloco com régua é uma lista.** Sempre que as linhas
forem irmãs — as partições do mês, as opções de adicionar — use o bloco. `overflow: 'hidden'` é o que
impede a primeira e a última linha de vazarem por cima do raio quando estão pressionadas.

O que flutua por cima da rolagem entra pela prop `floating` do `Screen`, nunca como filho do
conteúdo: um filho rolaria junto e deixaria de flutuar. O `Screen` já reserva a borda de baixo pelo
tamanho dele, senão o último cartão nasce debaixo do botão e não é alcançável por rolagem.

Estado pressionado: um degrau de superfície acima, ou `colors.accent.pressed` no primário.
Estado desabilitado/pendente: `opacity: disabledOpacity`.

## Fora do JS

- `app.json` → `userInterfaceStyle: "dark"`. Não volte para `"automatic"`.
- Barra de status: `<StatusBar style="light" />` (`expo-status-bar`).
- Ícone, splash e `adaptiveIcon.backgroundColor` acompanham o fundo escuro, não um azul claro.

## Antes de dar por pronto

1. Nenhum hex novo fora de `theme.ts`.
2. `colors.accent.base` não aparece em nenhuma propriedade `color` — texto e ícone usam
   `colors.accent.text`. E há **um** destaque azul na tela, não dois.
3. Todo container de tela tem `backgroundColor` explícito.
4. Todo `TextInput` tem `color` e `placeholderTextColor`.
5. Nenhum `padding`/`gap`/`fontSize` numérico solto — tudo veio de `space`/`type`/`radius`.
6. Texto pequeno ou de apoio não está em `text.muted` carregando informação essencial.
7. `npx tsc --noEmit` e `npm test` passam (os testes olham `testID`/`accessibilityRole`, então
   mudança de estilo não deve quebrá-los — se quebrou, você mudou estrutura junto).
