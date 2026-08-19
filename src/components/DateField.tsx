import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

import { formatBrDate, fromApiDate, toApiDate, todayApiDate } from '@/utils/dates';
import { colors, radius, space, type } from '@/components/theme';

/**
 * A data como um campo de verdade: um toque abre o calendário do sistema.
 *
 * Mora fora de `form.tsx` porque não é do mesmo tipo que os controles de lá. `Field`, `Picker` e
 * `SubmitButton` são JSX puro; este carrega um módulo nativo e apresenta de duas formas diferentes
 * conforme a plataforma. Essa é uma fronteira real, não separação por gosto.
 *
 * **Fala `YYYY-MM-DD` para fora**, igual ao `Field` que ele substituiu, e é o único lugar do app
 * onde um `Date` chega a existir — o comentário no topo de `utils/dates.ts` explica por quê: um
 * `Date` que escapa para o resto do app é um lançamento gravado no dia errado, porque a forma ISO é
 * UTC e às 21h em São Paulo ela já virou o dia seguinte. Aqui o `Date` nasce dos getters locais e
 * morre em `toApiDate` na mesma função.
 *
 * As duas plataformas se comportam de forma diferente e o componente não finge o contrário: no
 * Android o picker é um diálogo do sistema, que se fecha sozinho ao escolher ou cancelar; no iOS ele
 * é desenhado inline, então precisa da folha e do "Concluir" abaixo — sem isso o calendário fica
 * preso aberto no meio do formulário.
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

  const shown = formatBrDate(value);

  const handleChange = (event: DateTimePickerEvent, picked?: Date): void => {
    // No Android, cancelar chega como `dismissed` e sem data. Um campo que mudasse de valor ao ser
    // cancelado seria uma armadilha, então o evento fecha o picker e não faz mais nada.
    if (Platform.OS !== 'ios') {
      setOpen(false);
    }

    if (event.type === 'dismissed' || picked === undefined) {
      return;
    }

    onChange(fromDate(picked));
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        // Rótulo e valor numa frase só: sem isto o leitor de tela anuncia um botão chamado
        // "21/08/2026", sem dizer de que data se trata.
        accessibilityLabel={`${label}, ${shown}`}
        accessibilityRole="button"
        onPress={() => {
          setOpen(true);
        }}
        style={[styles.input, error === undefined ? null : styles.inputInvalid]}
      >
        <Text style={styles.value}>{shown}</Text>
        <Calendar color={colors.text.secondary} size={18} />
      </Pressable>

      {error === undefined ? null : (
        <Text style={styles.error} testID="field-error">
          {error}
        </Text>
      )}

      {open ? (
        <View style={Platform.OS === 'ios' ? styles.sheet : undefined}>
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            mode="date"
            onChange={handleChange}
            value={toDate(value)}
          />

          {Platform.OS === 'ios' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setOpen(false);
              }}
              style={styles.done}
            >
              <Text style={styles.doneLabel}>Concluir</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /** O mesmo espaçamento do `field` de `form.tsx`, para a coluna do formulário não desalinhar. */
  field: {
    gap: space.xs + 2,
    marginBottom: space.lg,
  },
  label: {
    ...type.label,
    color: colors.text.secondary,
  },
  /**
   * Mesma altura do `TextInput` de `form.tsx`: `paddingVertical` um ponto maior, porque aqui o
   * conteúdo é um `Text` sem a caixa interna que o `TextInput` acrescenta.
   */
  input: {
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
  inputInvalid: {
    borderColor: colors.status.negative,
  },
  value: {
    ...type.body,
    color: colors.text.primary,
  },
  error: {
    ...type.caption,
    color: colors.status.negative,
  },
  /** No iOS o calendário é conteúdo da tela, então recebe a superfície de um degrau acima. */
  sheet: {
    backgroundColor: colors.surface.overlay,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: space.sm,
    padding: space.sm,
  },
  done: {
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  doneLabel: {
    ...type.label,
    color: colors.accent.base,
  },
});
