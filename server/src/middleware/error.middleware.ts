import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    const lower = err.message.toLowerCase();
    const errors: Array<{ field: string; message: string }> = [];
    if (lower.includes('email')) {
      errors.push({ field: 'email', message: err.message });
    } else if (lower.includes('employee id') || lower.includes('employeeid')) {
      errors.push({ field: 'employeeId', message: err.message });
    } else if (lower.includes('voter id') || lower.includes('voterid')) {
      errors.push({ field: 'voterId', message: err.message });
    } else if (lower.includes('officer')) {
      errors.push({ field: 'officerId', message: err.message });
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(errors.length > 0 ? { errors } : {}),
    });
    return;
  }

  // Prisma unique constraint
  if ((err as { code?: string }).code === 'P2002') {
    const metaTarget = (err as { meta?: { target?: string[] | string } }).meta?.target;
    const targetStr = Array.isArray(metaTarget) ? metaTarget.join(' ') : String(metaTarget || '');
    
    let field = '';
    let message = 'A record with this unique value already exists.';

    if (targetStr.toLowerCase().includes('employeeid') || targetStr.toLowerCase().includes('employee_id')) {
      field = 'employeeId';
      message = 'An officer with this Employee ID already exists. Please choose a different ID.';
    } else if (targetStr.toLowerCase().includes('email')) {
      field = 'email';
      message = 'An account with this email address already exists. Please choose a different email.';
    } else if (targetStr.toLowerCase().includes('voterid') || targetStr.toLowerCase().includes('voter_id')) {
      field = 'voterId';
      message = 'A voter with this Voter ID already exists.';
    } else if (targetStr.toLowerCase().includes('code')) {
      field = 'code';
      message = 'This code is already in use. Please enter a unique code.';
    }

    res.status(409).json({
      success: false,
      message,
      ...(field ? { errors: [{ field, message }] } : {}),
    });
    return;
  }

  // Prisma not found
  if ((err as { code?: string }).code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'Record not found.',
    });
    return;
  }

  // Default 500
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found.`,
  });
};
