import { ApiError, NetworkError, UnauthorizedError } from '@/shared/api/ApiError';

/**
 * Spec UX AC5 - an unreachable API must read as connectivity, not as a validation problem - is only
 * satisfiable if the three failures are distinguishable at the point a screen catches them. Every
 * pair below is asserted in both directions: a single shared type would still pass a test that only
 * checked `error instanceof ApiError` on an `ApiError`.
 */
describe('ApiError', () => {
  it('carries the API messages element for element', () => {
    const error = new ApiError(['O nome é obrigatório', 'O valor deve ser maior que zero']);

    expect(error.messages).toEqual(['O nome é obrigatório', 'O valor deve ser maior que zero']);
  });

  it('is an Error, so an unhandled one still reports as a failure', () => {
    expect(new ApiError(['qualquer']) instanceof Error).toBe(true);
  });

  it('is not an UnauthorizedError', () => {
    expect(new ApiError(['qualquer']) instanceof UnauthorizedError).toBe(false);
  });

  it('is not a NetworkError, so a validation failure never reads as connectivity', () => {
    expect(new ApiError(['qualquer']) instanceof NetworkError).toBe(false);
  });
});

describe('UnauthorizedError', () => {
  it('is an UnauthorizedError', () => {
    expect(new UnauthorizedError() instanceof UnauthorizedError).toBe(true);
  });

  it('is not an ApiError, so an expired session never reads as a validation failure', () => {
    expect(new UnauthorizedError() instanceof ApiError).toBe(false);
  });

  it('is not a NetworkError', () => {
    expect(new UnauthorizedError() instanceof NetworkError).toBe(false);
  });
});

describe('NetworkError', () => {
  it('is a NetworkError', () => {
    expect(new NetworkError() instanceof NetworkError).toBe(true);
  });

  it('is not an ApiError, so an unreachable API never reads as a validation failure', () => {
    expect(new NetworkError() instanceof ApiError).toBe(false);
  });

  it('is not an UnauthorizedError', () => {
    expect(new NetworkError() instanceof UnauthorizedError).toBe(false);
  });
});
