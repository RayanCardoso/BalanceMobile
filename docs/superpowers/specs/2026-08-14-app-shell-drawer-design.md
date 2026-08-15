# Gaveta lateral e telas responsivas

Data: 2026-08-14
Estado: aprovado para planejamento

## Problema

O `AppShell` resolve navegação com uma fileira de `Link`s no rodapé
([`src/features/navigation/ui/AppShell.tsx`](../../../src/features/navigation/ui/AppShell.tsx)). São
seis controles disputando uma linha com `flexWrap`, sem estado ativo e sem hierarquia — a barra
mostra onde se pode ir, mas não onde se está.

Junto disso, `react-native-safe-area-context` é dependência do projeto e não é usado em lugar
nenhum. Como o Expo SDK 57 liga edge-to-edge no Android por padrão, o conteúdo das telas divide
espaço com a status bar em cima e com a barra de gestos embaixo.

## Decisões

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Forma do menu | Gaveta lateral deslizante, sobre a tela | Escolha do usuário; padrão Android e comporta nome do usuário e seção de saída |
| Implementação | `Drawer` de `expo-router/drawer` | Escolha do usuário. **Não custa dependência nova**: o Expo Router 57 vendoriza o drawer do React Navigation e já traz `react-native-drawer-layout` |
| Controle nas telas secundárias | `←` no lugar do `☰` | Dá um voltar visível onde hoje só existe o back do sistema |
| Título da tela | Migra para a barra superior | Evita o título aparecer duas vezes; alinha com a forma escolhida |

A alternativa descartada era construir a gaveta à mão dentro do `AppShell`, preservando o `Stack`
atual. Custaria menos reestruturação de rotas, mas a animação e o tratamento de gesto seriam
código nosso.

## Arquitetura

### Rotas

`app/(app)/_layout.tsx` continua sendo só ponto de montagem do `AppShell`. O `AppShell` passa a
renderizar `<Drawer>` no lugar de `<Stack>`, declarando os cinco destinos na ordem em que aparecem.

Entram três `_layout.tsx` novos — `income/`, `expenses/` e `recurring/` — cada um um `Stack` com
`stackScreenOptions`, no mesmo formato do
[`catalogue/_layout.tsx`](../../../app/(app)/catalogue/_layout.tsx) que já existe.

**Por que são obrigatórios:** sob um `Drawer`, cada arquivo de uma pasta sem `_layout` vira um
destino da gaveta. Sem esses três arquivos, `/expenses/new` apareceria como item do menu em vez de
ser empilhado sobre Despesas.

`app/(app)/index.tsx` continua sendo o índice do grupo, então `/` segue resolvendo para o dashboard.

```
(app)/                    Drawer
├── index.tsx             → Resumo      (sem Stack; header vem do Drawer)
├── income/_layout.tsx    → Receitas    (Stack, novo)
├── expenses/_layout.tsx  → Despesas    (Stack, novo)
├── recurring/_layout.tsx → Recorrentes (Stack, novo)
└── catalogue/_layout.tsx → Catálogo    (Stack, já existe)
```

### `AppDrawer` — o conteúdo da gaveta

Arquivo novo: `src/features/navigation/ui/AppDrawer.tsx`, passado ao `Drawer` como `drawerContent`.

- Cabeçalho com o wordmark Balance e o nome do usuário, lido de `useSessionStore`.
- Os cinco destinos. O ativo em `colors.surface.selected` com texto `colors.accent.base`; os demais
  em `colors.text.secondary`. O destino ativo sai do estado do navegador, não de estado próprio.
- Separador `colors.border.subtle` e, por último, **Sair**, chamando o `useSignOut` que hoje vive no
  `AppShell`. O critério AUTH AC6 continua atendido — muda de lugar, não de comportamento.
- Painel em `colors.surface.raised`; `drawerType: 'front'`, deslizando por cima em vez de empurrar.
- `paddingTop`/`paddingBottom` de `useSafeAreaInsets`.

### `TopBar` — a barra superior

Arquivo novo: `src/features/navigation/ui/TopBar.tsx`, usado como `header` dos Stacks aninhados.

Recebe as props de header do React Navigation e decide sozinha qual controle mostrar: **`←` quando
existe `back`, `☰` quando não existe.** Uma peça cobre os dois casos, e nenhuma tela precisa saber
em que profundidade está. O Resumo, única rota sem Stack próprio, recebe a barra pelo `Drawer`.

O título vem de `options.title` da rota. Fundo `colors.surface.raised`, borda inferior
`colors.border.subtle`, `paddingTop: insets.top`.

Sem biblioteca de ícones no projeto: o `☰` são três `View`s finas e o `←` é um glifo de texto.

### Responsividade

- `TopBar` aplica `insets.top` — conteúdo deixa de dividir espaço com a status bar.
- `Screen` ([`src/shared/ui/states.tsx`](../../../src/shared/ui/states.tsx)) aplica
  `insets.bottom` — conteúdo deixa de ficar sob a barra de gestos do Android. Como as 17 telas já
  usam `Screen`, todas herdam a correção sem serem editadas para isso.
- `Screen` ganha `ScrollView` + `KeyboardAvoidingView`, hoje presentes apenas no
  [`AuthFrame`](../../../src/features/auth/ui/AuthFrame.tsx). É o que faz uma tela de formulário
  rolar em vez de cortar quando o teclado sobe.

Concentrar as duas correções em `TopBar` e `Screen` é o que impede que "respeitar a safe area" vire
uma regra que cada tela nova tem que lembrar de seguir.

### Títulos

As 16 telas do grupo assinado que hoje renderizam `<Text style={styles.title}>` perdem esse
elemento; o texto passa a ser o `title` da rota. O `AuthFrame` fica de fora — o título dele é uma
prop e as telas de autenticação não têm barra superior. Sem isso, "Nova despesa", "Receitas" e "Pessoas" apareceriam duas vezes na
mesma tela. Nenhum teste de tela assere esses textos.

## Testes

- `AppShell.test.tsx` reescrito: o mock de `expo-router` passa a fornecer `Drawer`.
- `AppDrawer.test.tsx` (novo): os cinco destinos e seus rótulos em pt-BR, o destaque do destino
  ativo, e os dois testes de AUTH AC6 que hoje vivem no `AppShell.test.tsx` — token limpo, sessão
  em `signedOut`, cache do React Query esvaziado.
- `TopBar.test.tsx` (novo): `←` quando há `back`, `☰` quando não há, e que o `☰` abre a gaveta.
- Se algum teste renderizar o `Drawer` de verdade, `react-native-drawer-layout` precisa entrar no
  `transformIgnorePatterns` do [`jest.config.js`](../../../jest.config.js).

## Fora de escopo

- Gesto de arrastar da borda para abrir: o `☰` está sempre visível e o `Drawer` já traz o gesto.
- Ícones nos itens da gaveta.
- Telas de autenticação: o `AuthFrame` já trata teclado e rolagem, e fica fora da gaveta.
- `predictiveBackGestureEnabled` continua `false` em `app.json`.

## Riscos

| Risco | Sinal | Resposta |
| --- | --- | --- |
| Barra duplicada (Drawer + Stack) | Duas faixas no topo | `headerShown: false` no `Drawer`, exceto no Resumo |
| Rota virar item da gaveta | `new` ou `payment` no menu | Os três `_layout.tsx` novos; verificar na primeira execução |
| `react-native-drawer-layout` sem transpilar | Erro de parse de ESM no Jest | Incluir no `transformIgnorePatterns` |
