/**
 * The one place the app's colours, spacing and type sizes are decided.
 *
 * Balance is a **dark app**: there is no light variant and no runtime switch. A single palette means
 * a screen cannot be accidentally readable in one mode and unreadable in the other, and it keeps the
 * rule enforceable — a literal `#rrggbb` anywhere outside this file is a bug, because it is a colour
 * no other screen can see.
 *
 * The palette is built around a near-neutral graphite. It used to be a saturated navy, and that is
 * the mistake this file now exists to prevent: with blue in the screen, in the card, in the row, in
 * the input and in the bar, the one blue that means *this is the action* had nothing to stand out
 * against. Colour is rationed here — the accent, the money statuses, and the bank cards. Everything
 * else in the app is grey, which is what makes those three read as signal.
 *
 * Depth is still expressed by *lifting* a surface (`base` → `raised` → `overlay`), not by drop
 * shadows: shadows barely read against a near-black background on either platform, while a two-step
 * lightness change does.
 *
 * Contrast is checked against the surface a token is meant to sit on. `text.primary`,
 * `text.secondary`, `text.muted` and `accent.text` all clear 4.5:1 on `surface.base` and
 * `surface.raised`; `text.muted` sits closest to that line and is for supporting copy only — never
 * for the one word a screen depends on. `accent.base` is a **fill**, not an ink: it clears 4.5:1
 * against `text.onAccent` laid on top of it, and is itself too dark to be read as text on a dark
 * surface. Where the accent has to *be* text — a link, a label, an icon — use `accent.text`.
 */

import type { TextStyle } from 'react-native';

export const colors = {
  surface: {
    /** The screen itself. Nothing sits behind it. */
    base: '#0F1113',

    /** Cards, list rows, inputs, the tab bar — anything laid on top of the screen. */
    raised: '#17191D',

    /** Modals, menus and pressed rows: one step above a card. */
    overlay: '#1E2126',

    /** A row or chip that is selected, and the resting fill of a secondary control. */
    selected: '#24272D',
  },

  border: {
    /** Hairlines between rows and around inputs — present, not loud. */
    subtle: '#26292F',

    /** A focused input, or the edge of something that must be found quickly. */
    strong: '#3A3E46',
  },

  text: {
    /** Values, headings, anything the user reads to make a decision. */
    primary: '#F1F2F4',

    /** Labels and secondary lines. */
    secondary: '#A0A5AD',

    /** Captions, placeholders, disabled copy. Never load-bearing. */
    muted: '#7C838E',

    /** Text and icons on top of `accent.base`. */
    onAccent: '#FFFFFF',
  },

  accent: {
    /**
     * The single brand blue, as a **fill**: primary buttons, the plotted line, the active dot.
     * Pair it with `text.onAccent`; do not set it as a text colour on a dark surface.
     */
    base: '#2F6FED',

    /** Its pressed state. */
    pressed: '#2559C4',

    /** A tinted fill for the accent — selected chips, informational panels, the chart's area. */
    soft: '#16233D',

    /**
     * The same blue lifted until it is legible *as ink* on `surface.base` and `surface.raised`.
     *
     * Two tokens rather than one because a colour cannot do both jobs at this lightness: dark enough
     * for white to sit on it, light enough to be read against near-black. Choosing one value for
     * both is how the old palette ended up with a button label at 4.1:1.
     */
    text: '#5A8DF2',
  },

  /**
   * O escurecido que separa a gaveta da tela atrás dela.
   */
  scrim: 'rgba(8, 9, 11, 0.64)',

  /**
   * Money and status.
   */
  status: {
    positive: '#3FBF7F',
    positiveSoft: '#12271D',

    warning: '#E0A03A',
    warningSoft: '#2A2113',

    negative: '#E5484D',
    negativeSoft: '#2C1618',

    /**
     * "Nada aconteceu ainda" é uma ausência de estado, não um estado azul. Era o mesmo azul do
     * `accent`, e um lançamento pendente competia com o botão da tela por atenção que não merecia.
     */
    neutral: '#7E8794',
    neutralSoft: '#1E2126',
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
   * É a única superfície colorida do app, e é deliberado: um cartão é reconhecido pela cor antes de
   * ser lido. Num app que passou a ser cinza, essa é a razão de ela ter ficado — e a razão de não
   * haver uma segunda.
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
export const control = { size: 44, bar: 2, fab: 56 } as const;

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
  'hero' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'money',
  TextStyle
> = {
  /**
   * O valor que É o assunto da tela — o saldo do mês no resumo, o total no mês de receitas e no de
   * despesas. Um por tela, no topo, e nada mais neste tamanho.
   *
   * Existe separado de `money` porque um valor-manchete e um valor-de-linha não são o mesmo papel:
   * dar 32pt a `money` engordaria toda coluna de lançamento junto.
   */
  hero: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
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
