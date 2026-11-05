import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync } from 'crypto';
import type { Request } from 'express';
import { Env } from '../../../config/env';
import { FinikPaymentProvider } from './finik.provider';
import { signRequest, verifyRequest } from './request-signer';

const keyPair = () =>
  generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

const merchant = keyPair();
const finik = keyPair();

const config = (overrides: Partial<Env> = {}) =>
  ({
    get: (key: keyof Env) =>
      ({
        FINIK_ENV: 'beta',
        FINIK_API_KEY: 'api-key',
        FINIK_ACCOUNT_ID: 'account-1',
        // Как в .env: переводы строк записаны через \n
        FINIK_PRIVATE_KEY: merchant.privateKey.replace(/\n/g, '\\n'),
        FINIK_PUBLIC_KEY: finik.publicKey,
        API_PUBLIC_URL: 'https://api.oku24.kg',
        FINIK_WEBHOOK_HOST: undefined,
        ...overrides,
      })[key],
  }) as unknown as ConfigService<Env, true>;

const paymentInput = {
  paymentId: '3f2b1d3e-1c2a-4b5c-9d8e-7f6a5b4c3d2e',
  orderNumber: 'OKU-261105-7K3QX',
  amount: 65_050,
  currency: 'KGS',
  returnUrl: 'https://oku24.kg/orders/OKU-261105-7K3QX',
};

describe('FinikPaymentProvider', () => {
  const fetchMock = jest.fn();
  const provider = () => {
    const instance = new FinikPaymentProvider(config());
    jest
      .spyOn(
        (instance as unknown as { logger: { error: () => void; warn: () => void } }).logger,
        'error',
      )
      .mockImplementation(() => undefined);
    jest
      .spyOn((instance as unknown as { logger: { warn: () => void } }).logger, 'warn')
      .mockImplementation(() => undefined);
    return instance;
  };

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('createPayment', () => {
    it('sends a signed request and returns the payment URL from Location', async () => {
      fetchMock.mockResolvedValue(
        new Response(null, { status: 302, headers: { location: 'https://qr.finik.kg/pay/abc' } }),
      );

      await expect(provider().createPayment(paymentInput)).resolves.toEqual({
        paymentUrl: 'https://qr.finik.kg/pay/abc',
      });

      const [url, init] = fetchMock.mock.calls[0] as [
        string,
        RequestInit & { headers: Record<string, string> },
      ];
      expect(url).toBe('https://beta.api.acquiring.averspay.kg/v1/payment');
      expect(init.redirect).toBe('manual');

      const body = JSON.parse(init.body as string);
      expect(body).toEqual({
        Amount: 650.5,
        CardType: 'FINIK_QR',
        PaymentId: paymentInput.paymentId,
        RedirectUrl: paymentInput.returnUrl,
        Data: {
          accountId: 'account-1',
          name_en: 'OKU_24 order OKU-261105-7K3QX',
          webhookUrl: 'https://api.oku24.kg/api/v1/payments/webhooks/finik',
          additionalData: [
            { fieldId: 'paymentId', value: paymentInput.paymentId },
            { fieldId: 'orderNumber', value: paymentInput.orderNumber },
          ],
        },
      });

      // Подпись проверяется публичным ключом магазина
      const valid = verifyRequest(
        {
          method: 'POST',
          path: '/v1/payment',
          headers: {
            Host: 'beta.api.acquiring.averspay.kg',
            'x-api-key': init.headers['x-api-key'],
            'x-api-timestamp': init.headers['x-api-timestamp'],
          },
          body,
        },
        init.headers.signature,
        merchant.publicKey,
      );
      expect(valid).toBe(true);
      expect(init.headers['x-api-key']).toBe('api-key');
    });

    it('accepts a JSON response with the payment URL', async () => {
      fetchMock.mockResolvedValue(Response.json({ paymentUrl: 'https://qr.finik.kg/pay/x' }));
      await expect(provider().createPayment(paymentInput)).resolves.toEqual({
        paymentUrl: 'https://qr.finik.kg/pay/x',
      });
    });

    it('turns provider errors into 502', async () => {
      fetchMock.mockResolvedValue(new Response('bad request', { status: 400 }));
      await expect(provider().createPayment(paymentInput)).rejects.toBeInstanceOf(
        BadGatewayException,
      );

      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(provider().createPayment(paymentInput)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });

  describe('parseWebhook', () => {
    const webhookBody = {
      id: '692910201_97ab0bec_DEBIT',
      transactionId: '97ab0bec-69c5-419d-8cfa-4b7963b98b82',
      status: 'SUCCEEDED',
      amount: 650.5,
      accountId: 'account-1',
      fields: { paymentId: paymentInput.paymentId, orderNumber: paymentInput.orderNumber },
    };

    const request = (body: object, signature: string, headers: Record<string, string> = {}) =>
      ({
        body,
        path: '/api/v1/payments/webhooks/finik',
        query: {},
        headers,
        header: (name: string) => (name === 'signature' ? signature : headers[name]),
      }) as unknown as Request;

    const signAsFinik = (body: object, headers: Record<string, string> = {}) =>
      signRequest(
        {
          method: 'POST',
          path: '/api/v1/payments/webhooks/finik',
          headers: { Host: 'api.oku24.kg', ...headers },
          body: body as Record<string, unknown>,
        },
        finik.privateKey,
      );

    it('accepts a webhook signed by Finik and converts the amount to tyiyn', async () => {
      const headers = { 'x-api-timestamp': '1737537124659' };
      const event = await provider().parseWebhook(
        request(webhookBody, signAsFinik(webhookBody, headers), headers),
      );

      expect(event).toEqual({
        externalEventId: webhookBody.id,
        paymentId: paymentInput.paymentId,
        providerPaymentId: webhookBody.transactionId,
        status: 'SUCCEEDED',
        amount: 65_050,
        eventType: 'payment.succeeded',
        payload: webhookBody,
      });
    });

    it('rejects a tampered or unsigned webhook', async () => {
      const signature = signAsFinik(webhookBody);
      await expect(
        provider().parseWebhook(request({ ...webhookBody, amount: 1 }, signature)),
      ).resolves.toBeNull();
      await expect(provider().parseWebhook(request(webhookBody, ''))).resolves.toBeNull();
    });

    it('rejects a webhook signed with another key', async () => {
      const other = keyPair();
      const signature = signRequest(
        {
          method: 'POST',
          path: '/api/v1/payments/webhooks/finik',
          headers: { Host: 'api.oku24.kg' },
          body: webhookBody,
        },
        other.privateKey,
      );
      await expect(provider().parseWebhook(request(webhookBody, signature))).resolves.toBeNull();
    });

    it('ignores webhooks without our payment id', async () => {
      const body = { ...webhookBody, fields: {} };
      await expect(provider().parseWebhook(request(body, signAsFinik(body)))).resolves.toBeNull();
    });
  });
});
