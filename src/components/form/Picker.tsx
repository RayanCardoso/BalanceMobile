import { OptionChips } from '@/components/form/OptionChips';
import { SelectSheet } from '@/components/form/SelectSheet';

export type PickerOption<T> = { label: string; value: T };

/** Acima disto, os chips viram uma parede e a lista passa a ser o controle honesto. */
const CHIPS_UP_TO = 4;

/**
 * A escolha de uma opção entre várias, nas duas formas que ela pode ter.
 *
 * **Quem escolhe a forma é o tamanho de `options`, nunca a tela.** É o mesmo princípio do
 * `MonthTrend`: as telas não escolhem um layout, só dizem que dados têm. Uma casa com três
 * categorias ganha chips sem ninguém configurar nada, e a mesma casa no dia em que tiver trinta
 * ganha a lista pelo mesmo motivo.
 */
export function Picker<T extends string | number>({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Selecionar',
  error,
}: {
  label: string;
  options: PickerOption<T>[];
  selected: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
}): React.JSX.Element {
  if (options.length <= CHIPS_UP_TO) {
    return <OptionChips label={label} onChange={onChange} options={options} selected={selected} />;
  }

  return (
    <SelectSheet
      error={error}
      label={label}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      selected={selected}
    />
  );
}
