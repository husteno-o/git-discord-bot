export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, code = "INTERNAL_ERROR", statusCode = 500, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    super(
      identifier
        ? `${resource} with ID '${identifier}' was not found.`
        : `${resource} was not found.`,
      "NOT_FOUND",
      404,
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You do not have permission to execute this command.") {
    super(message, "UNAUTHORIZED", 403);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message?: string) {
    super(
      message || `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
      "RATE_LIMIT_EXCEEDED",
      429,
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string, details?: unknown) {
    super(`${service} service error: ${message}`, "EXTERNAL_SERVICE_ERROR", 502, details);
    this.service = service;
  }
}

export class SecurityError extends AppError {
  constructor(message: string) {
    super(message, "SECURITY_VIOLATION", 400);
  }
}
