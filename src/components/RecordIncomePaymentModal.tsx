import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { useRegisterIncomePayment } from '@/hooks/useIncome';
import type { MonthlyIncomeLine } from '@/types/income';
import { apiMessages } from '@/utils/errors/income';
import { monthLabel, toApiDate, todayApiDate } from '@/utils/dates';
import { parseMoneyInput } from '@/utils/money';
import { DateField } from '@/components/DateField';
import { Field, SubmitButton } from '@/components/form';
import { colors, radius, space, type } from '@/components/theme';

/**
 * Registrar um recebimento, sobre a lista do mês em vez de no lugar dela.
 *
 * Era uma tela empilhada, e não precisava ser: o formulário tem três campos e é aberto a partir de
 * uma linha que já diz de quem é o recebimento. Como modal, ele nasce sabendo a fonte e o mês —
 * `line` e `period` chegam prontos da tela — e some o vaivém de params de rota que a versão anterior
 * tinha de reler e revalidar na entrada.
 *
 * Spec INC AC5: **o mês de referência e a data do pagamento são fatos diferentes**. Um salário pago
 * em 3 de setembro referente a agosto é o caso que a spec nomeia. O mês vem da tela, que é onde o
 * usuário já o escolheu; a data do pagamento começa em hoje e se move sozinha. Nada mantém os dois
 * em sincronia, de propósito.
 *
 * Spec INC AC9: nada aqui recusa um segundo pagamento da mesma fonte no mesmo mês. Receita soma
 * vários pagamentos num mês, ao contrário de uma conta recorrente, que a API rejeita.
 *
 * `line` nulo é a forma fechada. Um `Modal` com `visible={false}` ainda monta os filhos, e montá-los
 * sem linha significaria um formulário guardando o estado do recebimento anterior — por isso o
 * componente inteiro devolve null, e cada abertura começa limpa.
 */
export function RecordIncomePaymentModal({
  line,
  period,
  onClose,
}: {
  /** A linha que o usuário escolheu, ou null quando o modal está fechado. */
  line: MonthlyIncomeLine | null;
  period: { year: number; month: number };
  onClose: () => void;
}): React.JSX.Element | null {
  if (line === null) {
    return null;
  }

  return <PaymentForm key={line.incomeSourceId} line={line} onClose={onClose} period={period} />;
}

/**
 * O formulário propriamente dito, montado só quando há uma linha.
 *
 * Separado para poder receber `key={incomeSourceId}`: trocar de fonte troca a chave, o React descarta
 * a instância, e o valor digitado para a fonte anterior não reaparece na seguinte.
 */
function PaymentForm({
  line,
  period,
  onClose,
}: {
  line: MonthlyIncomeLine;
  period: { year: number; month: number };
  onClose: () => void;
}): React.JSX.Element {
  const [paymentDate, setPaymentDate] = useState(() => todayApiDate());
  const [amountReceived, setAmountReceived] = useState('');
  const [notes, setNotes] = useState('');

  const record = useRegisterIncomePayment();

  const messages = record.isError ? apiMessages(record.error) : [];

  const submit = (): void => {
    record.mutate(
      {
        incomeSourceId: line.incomeSourceId,
        paymentDate,
        // Qualquer dia dentro do mês; a API normaliza para o primeiro.
        referenceMonth: toApiDate({ year: period.year, month: period.month, day: 1 }),
        amountReceived: parseMoneyInput(amountReceived) ?? 0,
        notes: notes.trim() === '' ? null : notes,
      },
      // Fecha só no sucesso. Um erro que fechasse o modal levaria junto o que foi digitado, e o
      // usuário teria de redigitar tudo para ler o que a API reclamou.
      { onSuccess: onClose }
    );
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      {/* O escurecido é o mesmo da gaveta: é a mesma ideia de "a tela continua ali atrás". */}
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.title}>Registrar recebimento</Text>
              <Text style={styles.subtitle}>
                {line.name} · {monthLabel(period.year, period.month)}
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Fechar"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.close}
            >
              <X color={colors.text.secondary} size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <DateField label="Data do pagamento" onChange={setPaymentDate} value={paymentDate} />

            <Field
              label="Valor recebido"
              onChangeText={setAmountReceived}
              placeholder="5000,00"
              value={amountReceived}
            />

            <Field
              label="Observações"
              onChangeText={setNotes}
              placeholder="Opcional"
              value={notes}
            />

            {messages.map((message, index) => (
              <Text key={`${message}-${index}`} style={styles.error} testID="form-error">
                {message}
              </Text>
            ))}

            <SubmitButton
              label="Registrar pagamento"
              onPress={submit}
              pending={record.isPending}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /** A folha encosta no rodapé; o escurecido ocupa o resto e mantém a lista visível atrás. */
  scrim: {
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface.base,
    borderColor: colors.border.subtle,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    // Teto, não altura: um formulário de três campos não precisa da tela inteira, e o `ScrollView`
    // interno cuida do caso em que o teclado come o espaço restante.
    maxHeight: '85%',
    paddingTop: space.lg,
  },
  header: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border.subtle,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
  },
  heading: {
    flex: 1,
    gap: space.xs,
  },
  title: {
    ...type.heading,
    color: colors.text.primary,
  },
  subtitle: {
    ...type.caption,
    color: colors.text.secondary,
  },
  close: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: space.xxl,
    justifyContent: 'center',
    width: space.xxl,
  },
  body: {
    padding: space.lg,
  },
  error: {
    ...type.caption,
    color: colors.status.negative,
    marginBottom: space.md,
  },
});
