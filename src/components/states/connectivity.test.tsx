import { ApiError, NetworkError, UnauthorizedError } from '@/services/ApiError';
import { connectivityMessage } from '@/components/states';

/**
 * Spec UX AC5 - "IF the API is unreachable THEN the system SHALL say so rather than reporting a
 * validation problem". The distinction is the whole criterion, so the failures that are *not*
 * connectivity are asserted to produce nothing here: a helper answering for every error type would
 * relabel a rejected form as an offline device.
 */
describe('connectivityMessage', () => {
  it('says the server could not be reached when fetch itself failed', () => {
    expect(connectivityMessage(new NetworkError())).toBe(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
    );
  });

  it("answers for no other failure, so a rejection keeps the API's own words", () => {
    expect(connectivityMessage(new ApiError(['O nome é obrigatório.']))).toBeNull();
    expect(connectivityMessage(new UnauthorizedError(['Sessão expirada.']))).toBeNull();
    expect(connectivityMessage(new Error('Algo deu errado'))).toBeNull();
  });
});
