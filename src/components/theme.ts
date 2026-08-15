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
    base: '#0B1220',
    /** Cards, list rows, inputs, the tab bar — anything laid on top of the screen. */
    raised: '#121C2E',
    /** Modals, menus and pressed rows: one step above a card. */
    overlay: '#1A2740',
    /** A row or chip that is selected, and the resting fill of a secondary control. */
    selected: '#1D2E4D',
  },

  border: {
    /** Hairlines between rows and around inputs — present, not loud. */
    subtle: '#22314F',
    /** A focused input, or the edge of something that must be found quickly. */
    strong: '#334770',
  },

  text: {
    /** Values, headings, anything the user reads to make a decision. */
    primary: '#E8EEF9',
    /** Labels and secondary lines. */
    secondary: '#A7B4CC',
    /** Captions, placeholders, disabled copy. Never load-bearing. */
    muted: '#6F7F9C',
    /** Text and icons on top of `accent.base`. */
    onAccent: '#06122A',
  },

  accent: {
    /** The single brand blue: primary buttons, links, the active destination. */
    base: '#4C8DFF',
    /** Its pressed state. */
    pressed: '#3B72D6',
    /** A tinted fill for the accent — selected chips, informational panels. */
    soft: '#16294A',
  },

  /**
   * O escurecido que separa a gaveta da tela atrás dela. Não é uma superfície: é o navy do app com
   * alfa, para que o conteúdo continue legível como contexto sem competir com o menu.
   */
  scrim: 'rgba(6, 18, 42, 0.6)',

  /**
   * Money and status. `positive`/`negative` name the *tone*, not the sign: a paid bill is positive
   * and an overdue one is negative, in the same colours a credit and a debit use.
   */
  status: {
    positive: '#4ADE80',
    positiveSoft: '#102A1D',
    warning: '#F5B14C',
    warningSoft: '#2E2312',
    negative: '#FF6B6B',
    negativeSoft: '#33161A',
    neutral: '#A7B4CC',
    neutralSoft: '#1A2740',
  },
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
  pill: 999,
} as const;

/**
 * Os controles desenhados no `TopBar`. `size` é o alvo de toque — 44 é o mínimo confortável em
 * ambas as plataformas — e `bar` é a espessura de um traço do ☰.
 */
export const control = { size: 44, bar: 2 } as const;

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

export const theme = { colors, space, radius, type, disabledOpacity } as const;
