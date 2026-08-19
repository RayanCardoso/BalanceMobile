import { bankColour, bankInitial } from '@/utils/bank';
import { colors } from '@/components/theme';

/**
 * A instituição chega como texto livre da API. O que este módulo garante é que o mesmo banco escrito
 * de duas formas dá a mesma cor, e que um banco desconhecido dá sempre a mesma cor — nunca um cinza
 * único que apagaria a diferença entre três contas.
 */

describe('a cor de um banco conhecido', () => {
  it('acha o Nubank escrito de qualquer jeito', () => {
    expect(bankColour('Nubank')).toEqual(colors.bank.nu);
    expect(bankColour('Nu Pagamentos')).toEqual(colors.bank.nu);
    expect(bankColour('NU PAGAMENTOS S.A.')).toEqual(colors.bank.nu);
  });

  it('ignora acento e o ruído "banco"', () => {
    expect(bankColour('Itaú')).toEqual(colors.bank.itau);
    expect(bankColour('Banco Itau Unibanco')).toEqual(colors.bank.itau);
  });

  it('separa bancos diferentes', () => {
    expect(bankColour('Inter').fill).not.toBe(bankColour('Bradesco').fill);
  });
});

describe('a cor de um banco que ninguém mapeou', () => {
  it('devolve sempre a mesma cor para o mesmo nome', () => {
    expect(bankColour('Cooperativa Sicoob')).toEqual(bankColour('Cooperativa Sicoob'));
  });

  it('escolhe da paleta de reserva, nunca uma cor inventada', () => {
    expect(colors.bankFallback).toContainEqual(bankColour('Cooperativa Sicoob'));
  });

  it('não empilha dois desconhecidos diferentes na mesma cor', () => {
    expect(bankColour('Sicoob').fill).not.toBe(bankColour('Sicredi').fill);
  });

  it('aguenta uma instituição vazia sem estourar', () => {
    expect(colors.bankFallback).toContainEqual(bankColour(''));
  });
});

describe('a inicial mostrada no cartão', () => {
  it('é a primeira letra maiúscula do nome', () => {
    expect(bankInitial('Nu Pagamentos')).toBe('N');
    expect(bankInitial('itaú')).toBe('I');
  });

  it('é uma interrogação quando não há nome', () => {
    expect(bankInitial('   ')).toBe('?');
  });
});
