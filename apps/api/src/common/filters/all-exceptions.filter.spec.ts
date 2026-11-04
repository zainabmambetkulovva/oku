import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter, resolveException } from './all-exceptions.filter';

const prismaKnown = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('prisma error', { code, clientVersion: '5.22.0', meta });

describe('resolveException', () => {
  it('keeps status and message of HttpException', () => {
    expect(resolveException(new NotFoundException('Book not found'))).toEqual({
      statusCode: 404,
      message: 'Book not found',
      details: undefined,
    });
    expect(resolveException(new ForbiddenException())).toMatchObject({
      statusCode: 403,
      message: 'Forbidden',
    });
  });

  it('passes validation details through', () => {
    const details = [{ field: 'email', errors: ['email must be an email'] }];
    expect(
      resolveException(new BadRequestException({ message: 'Validation failed', details })),
    ).toEqual({ statusCode: 400, message: 'Validation failed', details });
  });

  it('treats an array message as validation errors', () => {
    expect(
      resolveException(new BadRequestException(['a must be a string', 'b is required'])),
    ).toEqual({
      statusCode: 400,
      message: 'Validation failed',
      details: ['a must be a string', 'b is required'],
    });
  });

  it('handles HttpException with a string response', () => {
    expect(resolveException(new HttpException('Too many', 429))).toEqual({
      statusCode: 429,
      message: 'Too many',
    });
  });

  it('maps Prisma unique violation to 409', () => {
    expect(resolveException(prismaKnown('P2002', { target: ['email'] }))).toEqual({
      statusCode: 409,
      message: 'Resource already exists',
      details: { fields: ['email'] },
    });
  });

  it('maps Prisma foreign key violation to 409', () => {
    expect(
      resolveException(prismaKnown('P2003', { field_name: 'orders_user_id_fkey' })),
    ).toMatchObject({ statusCode: 409, details: { constraint: 'orders_user_id_fkey' } });
  });

  it('maps Prisma record not found to 404', () => {
    expect(resolveException(prismaKnown('P2025'))).toMatchObject({ statusCode: 404 });
  });

  it('maps database CHECK violation to 400 with constraint name', () => {
    const error = new Prisma.PrismaClientUnknownRequestError(
      'PostgresError { code: "23514", message: "new row for relation \\"books\\" violates check constraint \\"books_price_positive_chk\\"" }',
      { clientVersion: '5.22.0' },
    );
    expect(resolveException(error)).toEqual({
      statusCode: 400,
      message: 'Data violates a database constraint',
      details: { constraint: 'books_price_positive_chk' },
    });
  });

  it('hides details of unknown errors', () => {
    expect(resolveException(new Error('secret internal detail'))).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
    expect(resolveException(prismaKnown('P1001'))).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});

describe('AllExceptionsFilter', () => {
  const createHost = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', originalUrl: '/api/v1/books/x' }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
    return { host, status, json };
  };

  it('writes the unified error body', () => {
    const { host, status, json } = createHost();

    new AllExceptionsFilter().catch(new NotFoundException('Book not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'Not Found',
      message: 'Book not found',
      path: '/api/v1/books/x',
      timestamp: expect.any(String),
    });
  });

  it('responds 500 for unexpected errors and logs them', () => {
    const { host, status, json } = createHost();
    const filter = new AllExceptionsFilter();
    const logSpy = jest
      .spyOn((filter as unknown as { logger: { error: () => void } }).logger, 'error')
      .mockImplementation(() => undefined);

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, error: 'Internal Server Error' }),
    );
    expect(json.mock.calls[0][0]).not.toHaveProperty('details');
    expect(logSpy).toHaveBeenCalled();
  });
});
