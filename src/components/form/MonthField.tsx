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
    borderColor: colors.border.strong,
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
    borderColor: colors.border.strong,
  },
  monthLabel: {
    ...type.label,
    color: colors.text.secondary,
  },
  monthLabelSelected: {
    color: colors.text.primary,
  },
});
