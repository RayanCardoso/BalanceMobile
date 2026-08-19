import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AccountCard } from '@/components/AccountCard';
import { colors } from '@/components/theme';
import type { Account } from '@/types/catalogue';

/** `Link` vira um passa-through: o que se testa aqui é o cartão, não a navegação. */
jest.mock('expo-router', () => {
  const react = require('react') as typeof import('react');

  return {
    Link: ({ children }: { children: ReactNode }) =>
      react.createElement(react.Fragment, null, children),
  };
});

/** Um cartão de crédito: tem os três campos que só um cartão tem. */
const credit: Account = {
  id: 'a1',
  name: 'Nubank Roxinho',
  institution: 'Nu Pagamentos',
  personId: 'p1',
  closingDay: 5,
  dueDay: 12,
  limit: 8000,
};

/** Uma conta que não é cartão: os três campos vêm nulos (spec CAT AC4). */
const debit: Account = {
  id: 'a2',
  name: 'Inter Débito',
  institution: 'Inter',
  personId: 'p2',
  closingDay: null,
  dueDay: null,
  limit: null,
};

describe('o que o cartão mostra', () => {
  it('mostra o nome da conta, a instituição e o dono', () => {
    render(<AccountCard account={credit} owner="Rayan" />);

    expect(screen.getByText('Nubank Roxinho')).toBeTruthy();
    expect(screen.getByText('Nu Pagamentos')).toBeTruthy();
    expect(screen.getByText('Rayan')).toBeTruthy();
  });

  it('mostra os dias de fechamento e vencimento quando é cartão de crédito', () => {
    render(<AccountCard account={credit} owner="Rayan" />);

    expect(screen.getByTestId('account-card-days-a1')).toHaveTextContent('fecha 05 · vence 12');
  });

  it('omite os dias quando a conta não é cartão de crédito', () => {
    render(<AccountCard account={debit} owner="Ana" />);

    expect(screen.queryByTestId('account-card-days-a2')).toBeNull();
  });

  /** O limite é o dado mais sensível da conta e nada na tela inicial depende dele. */
  it('nunca mostra o limite', () => {
    render(<AccountCard account={credit} owner="Rayan" />);

    expect(screen.queryByText('R$ 8.000,00')).toBeNull();
    expect(screen.queryByText('8000')).toBeNull();
  });

  /**
   * A marca d'água é decoração: a API não guarda número de cartão, então não existe dígito real para
   * vazar. O teste existe para que ela continue sendo pontinhos e não vire um campo de verdade.
   */
  it('desenha a marca dagua como pontos, nunca como dígitos', () => {
    render(<AccountCard account={credit} owner="Rayan" />);

    const watermark = screen.getByTestId('account-card-watermark-a1');

    expect(String(watermark.props.children)).toMatch(/^[•\s]+$/);
    expect(String(watermark.props.children)).not.toMatch(/\d/);
  });
});

describe('o dono, que vem de uma segunda consulta', () => {
  /** Um cartão não vira estado de erro porque a lista de pessoas ainda não chegou. */
  it('some com a linha do dono em vez de mostrar um buraco', () => {
    render(<AccountCard account={credit} owner={null} />);

    expect(screen.queryByTestId('account-card-owner-a1')).toBeNull();
    expect(screen.getByText('Nubank Roxinho')).toBeTruthy();
  });
});

describe('a cor', () => {
  it('pinta o cartão com a cor do banco a que ele pertence', () => {
    render(<AccountCard account={credit} owner="Rayan" />);

    expect(screen.getByTestId('account-card-a1')).toHaveStyle({
      backgroundColor: colors.bank.nu.fill,
    });
  });

  it('dá cores diferentes a bancos diferentes', () => {
    render(<AccountCard account={debit} owner="Ana" />);

    expect(screen.getByTestId('account-card-a2')).toHaveStyle({
      backgroundColor: colors.bank.inter.fill,
    });
  });
});

describe('quem usa leitor de tela', () => {
  it('lê o cartão inteiro numa frase, em vez de campo por campo', () => {
    render(<AccountCard account={credit} owner="Rayan" />);

    expect(screen.getByLabelText('Nubank Roxinho, Nu Pagamentos, de Rayan')).toBeTruthy();
  });

  it('não inventa um dono quando não há', () => {
    render(<AccountCard account={debit} owner={null} />);

    expect(screen.getByLabelText('Inter Débito, Inter')).toBeTruthy();
  });
});
