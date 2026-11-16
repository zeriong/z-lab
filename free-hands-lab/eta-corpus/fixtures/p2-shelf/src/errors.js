export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BadRequest extends HttpError {
  constructor(message, details) {
    super(400, 'bad_request', message, details);
  }
}

export class ValidationError extends HttpError {
  constructor(problems) {
    super(422, 'validation_failed', 'Validation failed', problems);
  }
}

export class NotFound extends HttpError {
  constructor(what) {
    super(404, 'not_found', `${what} not found`);
  }
}

export class Conflict extends HttpError {
  constructor(message) {
    super(409, 'conflict', message);
  }
}

export class PayloadTooLarge extends HttpError {
  constructor(limit) {
    super(413, 'payload_too_large', `Request body exceeds ${limit} bytes`);
  }
}

export function toErrorBody(err) {
  if (err instanceof HttpError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details !== undefined) body.error.details = err.details;
    return body;
  }
  return { error: { code: 'internal_error', message: 'Internal server error' } };
}
