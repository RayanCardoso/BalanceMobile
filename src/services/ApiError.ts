/**
 * The three failures a screen has to tell apart. Screens branch on the *type*, never on a status
 * code: a status code is an HTTP detail, and once it leaks past `httpClient` every caller has to
 * agree on what 400 versus 401 versus a dead socket means. One of these three arrives instead.
 *
 * `Object.setPrototypeOf` in each constructor keeps `instanceof` honest. When a class extending a
 * built-in is downlevelled, the returned object's prototype is `Error.prototype` and every
 * `instanceof` narrowing below collapses to the same branch, which is exactly the confusion these
 * types exist to prevent.
 */

/** A 400 from the API. `messages` is its `errorMessages` array, already localised to pt-BR. */
export class ApiError extends Error {
  readonly messages: string[];

  constructor(messages: string[]) {
    super(messages.join('\n'));
    Object.setPrototypeOf(this, ApiError.prototype);
    this.name = 'ApiError';
    this.messages = messages;
  }
}

/**
 * A 401. On an authorised route it means the stored token is gone or expired and the session has to
 * be cleared. On `/login` it is how the API rejects a wrong password, and that response carries the
 * only wording the sign-in screen has to show (spec AUTH AC7), so the envelope's `errorMessages`
 * travel on the error rather than being dropped with the status code.
 */
export class UnauthorizedError extends Error {
  readonly messages: string[];

  constructor(messages: string[] = []) {
    super('Sessão expirada');
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
    this.name = 'UnauthorizedError';
    this.messages = messages;
  }
}

/** `fetch` itself rejected. The API was never reached, so nothing was validated or rejected. */
export class NetworkError extends Error {
  constructor() {
    super('Não foi possível conectar');
    Object.setPrototypeOf(this, NetworkError.prototype);
    this.name = 'NetworkError';
  }
}
