---
name: balance-design
description: Base de design obrigatória do app Balance — tema escuro em azul-marinho, tokens de cor, espaçamento, tipografia e receitas de componente. Use SEMPRE que o trabalho tocar em aparência - criar ou editar tela, componente, StyleSheet, cor, hex, fundo, botão, card, input, badge, ícone, tab bar, splash, status bar, layout, espaçamento, tipografia, dark mode, "deixa mais bonito", "ajusta o visual", "muda a cor", "arruma o design", UI, UX.
---

# Base de design do Balance

O Balance é um app **escuro, em azul-marinho profundo**. Não existe tema claro, não existe toggle.
Qualquer coisa que apareça na tela nasce da base descrita aqui.

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

Tamanhos e pesos saem de `type.*` (`title`, `heading`, `body`, `label`, `caption`, `money`).
Valor monetário usa `type.money`, que traz `tabular-nums`.

## Cor com significado

- Azul `colors.accent.base`: ação primária, link, destino ativo. **Um** azul, um destaque por tela.
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
```

Estado pressionado: um degrau de superfície acima, ou `colors.accent.pressed` no primário.
Estado desabilitado/pendente: `opacity: disabledOpacity`.

## Fora do JS

- `app.json` → `userInterfaceStyle: "dark"`. Não volte para `"automatic"`.
- Barra de status: `<StatusBar style="light" />` (`expo-status-bar`).
- Ícone, splash e `adaptiveIcon.backgroundColor` acompanham o fundo escuro, não um azul claro.

## Antes de dar por pronto

1. Nenhum hex novo fora de `theme.ts`.
2. Todo container de tela tem `backgroundColor` explícito.
3. Todo `TextInput` tem `color` e `placeholderTextColor`.
4. Nenhum `padding`/`gap`/`fontSize` numérico solto — tudo veio de `space`/`type`/`radius`.
5. Texto pequeno ou de apoio não está em `text.muted` carregando informação essencial.
6. `npx tsc --noEmit` e `npm test` passam (os testes olham `testID`/`accessibilityRole`, então
   mudança de estilo não deve quebrá-los — se quebrou, você mudou estrutura junto).
