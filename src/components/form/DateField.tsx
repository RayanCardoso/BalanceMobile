import { useState } from 'react';
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
  // Sem argumento, a biblioteca resolve `useColorScheme() ?? 'light'` — que em `react-native-web`
  // lê `prefers-color-scheme` do navegador, ao contrário de iOS/Android, onde `userInterfaceStyle`
  // do app.json já fixa o escuro. Balance não tem tema claro, então o escuro é fixado aqui também.
  const defaults = useDefaultStyles('dark');

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
 * Só as chaves que precisam mudar: `useDefaultStyles()` responde por toda chave que este objeto não
 * nomeia. O merge com `{ ...defaults, ...calendar }` é raso, então uma chave nomeada aqui substitui
 * por inteiro o estilo da biblioteca para ela, em vez de somar-se a ele — reescrever o layout inteiro
 * aqui seria manter uma cópia do que a biblioteca já faz, por isso só as chaves que precisam mudar
 * aparecem.
 *
 * Objeto literal e **não** `StyleSheet.create`: estes estilos são espalhados dentro do objeto que a
 * biblioteca monta (`{ ...defaults, ...calendar }`) e lidos por ela. `StyleSheet.create` existe para
 * entregar estilo a um componente do RN, não para ser mesclado por terceiros.
 */
const calendar = {
  header: { backgroundColor: colors.surface.base },
  month_selector_label: { ...type.label, color: colors.text.primary },
  year_selector_label: { ...type.label, color: colors.text.primary },
  weekday_label: { ...type.caption, color: colors.text.secondary },
  day_label: { ...type.body, color: colors.text.primary },
  outside_label: { color: colors.text.muted },
  today: { borderColor: colors.accent.base, borderRadius: radius.sm, borderWidth: 1 },
  today_label: { color: colors.accent.base },
  selected: {
    backgroundColor: colors.surface.selected,
    borderColor: colors.border.strong,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
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
};
