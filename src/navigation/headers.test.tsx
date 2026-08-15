import { fireEvent, render, screen } from '@testing-library/react-native';

import { drawerHeader, stackHeader } from '@/navigation/headers';

const navigation = (): { goBack: jest.Mock; dispatch: jest.Mock } => ({
  goBack: jest.fn(),
  dispatch: jest.fn(),
});

describe('o header dos Stacks aninhados', () => {
  it('mostra voltar quando a tela foi empilhada, e volta ao ser tocado', () => {
    const nav = navigation();
    render(stackHeader({ navigation: nav, options: { title: 'Nova despesa' }, back: {} }));

    fireEvent.press(screen.getByTestId('top-bar-back'));

    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  it('mostra o menu na raiz do destino, e o abre pelo navegador ao ser tocado', () => {
    const nav = navigation();
    render(stackHeader({ navigation: nav, options: { title: 'Despesas' }, back: undefined }));

    fireEvent.press(screen.getByTestId('top-bar-menu'));

    expect(nav.dispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' });
  });

  it('usa o título da rota', () => {
    render(stackHeader({ navigation: navigation(), options: { title: 'Pessoas' }, back: undefined }));

    expect(screen.getByText('Pessoas')).toBeTruthy();
  });
});

describe('o header do Resumo, que não tem Stack próprio', () => {
  it('mostra o menu e o título recebido', () => {
    const nav = navigation();
    render(drawerHeader('Resumo do mês')({ navigation: nav }));

    expect(screen.getByText('Resumo do mês')).toBeTruthy();

    fireEvent.press(screen.getByTestId('top-bar-menu'));

    expect(nav.dispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' });
  });
});
