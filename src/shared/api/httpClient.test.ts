import { ApiError, NetworkError, UnauthorizedError } from '@/shared/api/ApiError';
import { get, post, put, request } from '@/shared/api/httpClient';
import { useSessionStore } from '@/shared/lib/sessionStore';

jest.mock('@/shared/lib/tokenStorage', () => ({
  getToken: jest.fn(),
  setToken: jest.fn(),
  clearToken: jest.fn(),
}));

const fetchMock = jest.fn();

type FetchInit = {
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
};

/** The init object the module handed `fetch` on its most recent call. */
const lastInit = (): FetchInit => fetchMock.mock.calls[0]?.[1] as FetchInit;

const lastUrl = (): string => fetchMock.mock.calls[0]?.[0] as string;

const respondWith = (status: number, body?: unknown): void => {
  fetchMock.mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
};

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  useSessionStore.setState({ token: null, name: null, status: 'signedOut' });
});

describe('the request the client sends', () => {
  it('targets the configured base URL followed by the path', async () => {
    respondWith(200, {});

    await request('GET', '/dashboard/2026/8');

    expect(lastUrl()).toBe('http://10.0.2.2:5126/api/dashboard/2026/8');
  });

  it('attaches the bearer header when the session holds a token', async () => {
    useSessionStore.setState({ token: 'stored-token', status: 'signedIn' });
    respondWith(200, {});

    await request('GET', '/dashboard/2026/8');

    expect(lastInit().headers['Authorization']).toBe('Bearer stored-token');
  });

  it('sends no bearer header when the session holds no token', async () => {
    respondWith(200, {});

    await request('POST', '/login', { email: 'a@b.c' });

    expect(lastInit().headers['Authorization']).toBeUndefined();
  });

  it('asks for pt-BR, so the API returns the messages the app renders verbatim', async () => {
    respondWith(200, {});

    await request('GET', '/dashboard/2026/8');

    expect(lastInit().headers['Accept-Language']).toBe('pt-BR');
  });

  it('serialises the body as JSON', async () => {
    respondWith(200, {});

    await request('POST', '/login', { email: 'a@b.c', password: 'secret' });

    expect(lastInit().body).toBe('{"email":"a@b.c","password":"secret"}');
  });

  it.each([
    ['GET', get],
    ['POST', post],
    ['PUT', put],
  ])('sends %s from its own helper', async (method, helper) => {
    respondWith(200, {});

    await helper('/anything');

    expect(lastInit().method).toBe(method);
  });
});

describe('what the client returns', () => {
  it('resolves the parsed body of a successful response', async () => {
    respondWith(200, { token: 'issued-token', name: 'Rayan' });

    await expect(request('POST', '/login', {})).resolves.toEqual({
      token: 'issued-token',
      name: 'Rayan',
    });
  });

  it('resolves null for 204, which carries no body to parse', async () => {
    respondWith(204);

    await expect(request('PUT', '/recurring-expense/payment/1', {})).resolves.toBeNull();
  });
});

describe('how the client maps a failure', () => {
  it('turns a 400 into an ApiError', async () => {
    respondWith(400, { errorMessages: ['O nome é obrigatório'] });

    await expect(request('POST', '/person', {})).rejects.toBeInstanceOf(ApiError);
  });

  it("carries the API's errorMessages into ApiError.messages element for element", async () => {
    respondWith(400, {
      errorMessages: ['O nome é obrigatório', 'O valor deve ser maior que zero'],
    });

    // MAD-004: the messages are rendered as they arrive, so losing or reordering one changes what
    // the user is told about their own input.
    await expect(request('POST', '/person', {})).rejects.toMatchObject({
      messages: ['O nome é obrigatório', 'O valor deve ser maior que zero'],
    });
  });

  it('turns a 401 into an UnauthorizedError, so the session can be cleared', async () => {
    useSessionStore.setState({ token: 'expired-token', status: 'signedIn' });
    respondWith(401, {});

    await expect(request('GET', '/dashboard/2026/8')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("carries a 401's errorMessages onto the UnauthorizedError", async () => {
    respondWith(401, { errorMessages: ['E-mail e/ou senha inválidos.'] });

    // Spec AUTH AC7. The API answers a wrong password with 401, so this envelope is the only
    // wording the sign-in screen has; dropping it with the status code makes the criterion
    // unreachable without the app writing a message of its own (MAD-004).
    await expect(request('POST', '/login', {})).rejects.toMatchObject({
      messages: ['E-mail e/ou senha inválidos.'],
    });
  });

  it('does not report an expired session as a validation failure', async () => {
    useSessionStore.setState({ token: 'expired-token', status: 'signedIn' });
    respondWith(401, {});

    await expect(request('GET', '/dashboard/2026/8')).rejects.not.toBeInstanceOf(ApiError);
  });

  it('turns a rejected fetch into a NetworkError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(request('GET', '/dashboard/2026/8')).rejects.toBeInstanceOf(NetworkError);
  });

  it('does not report an unreachable API as a validation failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    // Spec UX AC5. An implementation collapsing every failure into ApiError would pass every
    // "an error was thrown" test above and fail this one.
    await expect(request('GET', '/dashboard/2026/8')).rejects.not.toBeInstanceOf(ApiError);
  });
});
