/**
 * The one place the app's colours, spacing and type sizes are decided.
 *
 * Balance is a **dark app**: there is no light variant and no runtime switch. A single palette means
 * a screen cannot be accidentally readable in one mode and unreadable in the other, and it keeps the
 * rule enforceable — a literal `#rrggbb` anywhere outside this file is a bug, because it is a colour
 * no other screen can see.
 *
 * The palette is built around a deep navy rather than neutral grey. Depth is expressed by *lifting*
 * a surface towards blue (`base` → `raised` → `overlay`), not by drop shadows: shadows barely read
 * against a near-black background on either platform, while a two-step lightness change does.
 *
 * Contrast is checked against the surface a token is meant to sit on. `text.primary`,
 * `text.secondary` and `accent.base` all clear 4.5:1 on `surface.base` and `surface.raised`;
 * `text.muted` is at the 4.5:1 line and is for supporting copy only — never for the one word a
 * screen depends on.
 */

import type { TextStyle } from 'react-native';

export const colors = {
  surface: {
    /** The screen itself. Nothing sits behind it. */
    base: '#111827',

    /** Cards, list rows, inputs, the tab bar — anything laid on top of the screen. */
    raised: '#0B1F44',

    /** Modals, menus and pressed rows: one step above a card. */
    overlay: '#132A52',

    /** A row or chip that is selected, and the resting fill of a secondary control. */
    selected: '#173B70',
  },

  border: {
    default: 'rgb(51, 129, 255)',
    
    /** Hairlines between rows and around inputs — present, not loud. */
    subtle: '#23426F',

    /** A focused input, or the edge of something that must be found quickly. */
    strong: '#3566A3',
  },

  text: {
    /** Values, headings, anything the user reads to make a decision. */
    primary: '#E5E7EB',

    /** Labels and secondary lines. */
    secondary: '#AAB8CF',

    tertiary: "rgb(51, 129, 255)",

    /** Captions, placeholders, disabled copy. Never load-bearing. */
    muted: '#7183A3',

    /** Text and icons on top of `accent.base`. */
    onAccent: '#06122A',
  },

  accent: {
    /** The single brand blue: primary buttons, links, the active destination. */
    base: '#0D6EFD',

    /** Its pressed state. */
    pressed: '#0A5DD1',

    /** A tinted fill for the accent — selected chips, informational panels. */
    soft: '#102A56',
  },

  /**
   * O escurecido que separa a gaveta da tela atrás dela.
   */
  scrim: 'rgba(6, 18, 42, 0.6)',

  /**
   * Money and status.
   */
  status: {
    positive: '#22C55E',
    positiveSoft: '#102A1D',

    warning: '#F59E0B',
    warningSoft: '#2E2312',

    negative: '#EF4444',
    negativeSoft: '#33161A',

    neutral: 'rgb(51, 129, 255)',
    neutralSoft: '#132A52',
  },

  /**
   * A cor de cada banco, e a tinta que se lê em cima dela.
   *
   * `fill` e `ink` são declarados **juntos** de propósito. A alternativa seria calcular luminância em
   * tempo de execução para decidir entre texto claro e escuro; declarar o par transforma uma dedução
   * numa decisão revisável lendo este arquivo — o amarelo do Banco do Brasil nasce com tinta escura,
   * o roxo do Nubank com tinta clara, e ninguém precisa confiar numa fórmula.
   *
   * A chave é o nome normalizado (ver `src/utils/bank.ts`) e o casamento é por prefixo, então `nu`
   * cobre "Nubank" e "Nu Pagamentos", e `itau` cobre "Itaú Unibanco".
   *
   * É a única superfície do app que não é azul-marinho, e é deliberado: um cartão é reconhecido pela
   * cor antes de ser lido.
   */
  bank: {
    nu: { fill: '#820AD1', ink: '#FFFFFF' },
    inter: { fill: '#FF7A00', ink: '#2B1400' },
    itau: { fill: '#EC7000', ink: '#2B1400' },
    bradesco: { fill: '#CC092F', ink: '#FFFFFF' },
    santander: { fill: '#EC0000', ink: '#FFFFFF' },
    caixa: { fill: '#005CA9', ink: '#FFFFFF' },
    brasil: { fill: '#FAE128', ink: '#241F00' },
    picpay: { fill: '#21C25E', ink: '#04240F' },
    original: { fill: '#00A94F', ink: '#04240F' },
    next: { fill: '#00E05C', ink: '#04240F' },
    will: { fill: '#00E88F', ink: '#04240F' },
    c6: { fill: '#242424', ink: '#F2F2F2' },
    xp: { fill: '#0A0A0A', ink: '#FFD200' },
    bb: { fill: '#FAE128', ink: '#241F00' },
  },

  /**
   * A paleta de quem não está no mapa. Escolhida por hash do nome, de modo que a mesma instituição
   * receba sempre a mesma cor e duas instituições desconhecidas continuem distinguíveis entre si —
   * que é exatamente o que um cinza único para "outros" destruiria.
   */
  bankFallback: [
    { fill: '#4C5FD7', ink: '#FFFFFF' },
    { fill: '#1F7A8C', ink: '#FFFFFF' },
    { fill: '#8E5AC8', ink: '#FFFFFF' },
    { fill: '#B4543A', ink: '#FFFFFF' },
    { fill: '#2E7D5B', ink: '#FFFFFF' },
    { fill: '#8A6D3B', ink: '#FFFFFF' },
  ],
} as const;

/** A 4pt scale. Gaps and padding come from here so rhythm survives being edited by someone else. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  /** Pills: badges, chips, filter options. */
  pill: 10
} as const;

/**
 * Os controles desenhados no `TopBar`. `size` é o alvo de toque — 44 é o mínimo confortável em
 * ambas as plataformas — e `bar` é a espessura de um traço do ☰.
 */
export const control = { size: 44, bar: 2 } as const;

/**
 * A geometria da linha de tendência sob o navegador de mês.
 *
 * Está aqui, e não dentro do componente, pela mesma razão que as cores estão: altura de gráfico e
 * raio de ponto são decisão de design, e um número escrito solto no `MonthTrend` seria uma decisão
 * que nenhuma outra parte do app enxerga.
 *
 * `padding` é o respiro entre o valor extremo e a borda da área desenhada — sem ele o maior mês
 * encosta no topo e o menor no chão, e a linha parece cortada em vez de plotada. A largura de um mês
 * não está aqui: ela é medida em tempo de layout, para que três meses caibam na tela de qualquer
 * aparelho.
 */
export const chart = {
  height: 72,
  padding: 10,
  line: 2,
  dot: 3,
  dotSelected: 5,
  /** O anel que separa o ponto selecionado da área desenhada atrás dele. */
  dotRing: 2,
} as const;

/**
 * A geometria do cartão de conta no carrossel do resumo.
 *
 * Largura fixa, e não uma fração da tela: é ela que o `snapToInterval` do `ScrollView` usa para parar
 * um cartão por vez, e uma largura percentual daria um passo diferente em cada aparelho — o carrossel
 * pararia no lugar certo num telefone e no meio de um cartão no seguinte.
 */
export const card = { width: 264, height: 156 } as const;

export const type: Record<
  'title' | 'heading' | 'body' | 'label' | 'caption' | 'money',
  TextStyle
> = {
  /** Screen titles. */
  title: { fontSize: 22, fontWeight: '700' },
  /** Section headings and card titles. */
  heading: { fontSize: 17, fontWeight: '600' },
  /** Body copy and list rows. */
  body: { fontSize: 15, fontWeight: '400' },
  /** Field labels, buttons, the active tab. */
  label: { fontSize: 13, fontWeight: '600' },
  /** Field errors, badge text, captions. */
  caption: { fontSize: 12, fontWeight: '400' },
  /**
   * Amounts. Tabular figures keep a column of values aligned on the decimal point, which is the
   * whole reason a currency column is scannable.
   */
  money: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
};

/** How much a disabled or pending control is dimmed. One value, so "inactive" looks the same twice. */
export const disabledOpacity = 0.5;

/**
 * What every `Stack` in the app is configured with.
 *
 * A navigator paints its own container behind whatever screen is mounted, and React Navigation's
 * default for it is a light grey. It is invisible while a screen covers it and then flashes white
 * during every push and pop — so the background is set here too, not only on the screens.
 */
export const stackScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.surface.base },
};

export const theme = { colors, space, radius, type, chart, disabledOpacity } as const;
