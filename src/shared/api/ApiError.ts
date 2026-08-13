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

/** A 401. The stored token is gone or expired; the session has to be cleared. */
export class UnauthorizedError extends Error {
  constructor() {
    super('Sessão expirada');
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
    this.name = 'UnauthorizedError';
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
