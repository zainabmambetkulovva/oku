import { generateKeyPairSync } from 'crypto';
import { canonicalRequest, pemFromEnv, signRequest, verifyRequest } from './request-signer';

/**
 * Эталон — тестовые данные библиотеки @mancho.devs/authorizer (разработчики Finik):
 * та же подписываемая строка и та же подпись для их опубликованного тестового ключа.
 */
const LIBRARY_TEST_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAoq/3UxpzgfXOLrJEZd39TJ7Fc4iRLMcK1Hj563O+sNcP4BnA\neNnRXfCCJCLs+UZxPLxV7f1Zj7zHmgUOsB6rPS3TJwbIIbclDrhoySzPAnTNg+jU\n9lpPS99vvT8tJpUb0zAA6sAwFxHUQk43mzgLou04eMlSHZmZ4MFVGzWGakIwDRlP\nMQbQCOiU+N/0Kl7qBDwDkn6USwc16MTa2Xm6BAhcwaug0jlhN5NIu7hyK2gk8In1\nS0OrxBEK3Z1zShRhixGEhA8Z7NREJCMuqHke09dVK1nVXz6CGTQMafjDKDwgmiBR\n7cJo25Icb/OqFs4TzE7XPfU/3gK0+1YdqF4J/wIDAQABAoIBADY3DeTT28pjb+J/\n5etMnyz5fDOUP0z8x88mwaKFX/butIuqCUo8zFjR3YzNVst7fiEPYlN9KmuMLbhW\nFx76GXa53rQSvn792YueSM1B8XqQEizzWoT+c46FV2dptlI1PqCSTrvscBpABsxR\n5JYFh1s0Uq1t6b+TgIQ16Xa3z6N5AyLVw7MbXEx2iB/bVdivmWNIjLWarr4yJDwA\nMgB/dOYtZp80ut8yOYYvaTmUVBUEp4ZHjBN+MgNlMD0zDZR/y+5mr1r3TfuPUsw9\neIDpD6tYwHvDgoneSGi1LtQpuEXTKhwEFezJkLZZnVCtFCdRaKkS607fT37fJOML\nDfNOgYECgYEAzpzgjzCz3+2qHJl+ejRtw2cUxCOIvVBAzvbqVk8R/NqZVF2WteUh\nx/0lM+FK0/AHpcnpZu79ruvra3yaB/AZuaPOnrsjzLQ2xsJfLpEu0Caoho3jWP7J\nFDGhX1CQeRXEQ9VM6l+PbjoKZ4bRO6ktVMuq/D7gBNvh/mNglCziLLsCgYEAyZMw\nO91zk+4DJucflLuNKiS56J8Sq71v6j+iFwF6zimYJJAFm7xdQ2vWXSP5jf5SeKVr\nQ/aA0ACSi0iYBEzhtQ19cCydjYQKSRvO0olMvRbcJfVgABCN+JtFIaSnWLS/sXST\nzcH3vm4FgccRHtt27HQIVCFHgwwVapymAYfnRY0CgYAPKTHNMAyy7NSjvpuqSfiX\n8xNyBQ1+nsnypemyJaEzRbMknq11cXfWHfxB31FHVgCpqLRIylaxJDylKYJ//J1W\nou+BdEf/OGYglZi4aQzfV0bcgMLi/+cvZSjrPpUrXW6Gb7tyI0r6EqY6zIjD8PkT\nlNJaKh70HFJsAUzP8q8yCwKBgQCFyFJy6P8UZxtgbnTfWbrPBaD9atYRdaEZbzI8\n4paGzcRUP+H5AoNDhAa5um6edvR1bhRK/wdvBXI9TujVsdD7QQDHulS237OT4gja\nYpWzycBC0R/t6w7OuP6g3Y7TqOKw/BY8sUej85FkGKKcQDwlor0EWTIFH7f3EhB7\nY59y4QKBgB5K2pRrw3wjQOHlssEO/2FqwE1NTYZalgpghPLRO+4Y8qM8hkKsBjgQ\nAQhd66mWIbIvuvcGErUrz3qFJHtjTIZHqOSVlW3hiiuMVKzZCoPa8nUJ0l6ylTpz\nNIb/T0HUwXgSRJBNhdHNo0yGFisaJpezF/kDUhOCzvTdoNI/M0Zy\n-----END RSA PRIVATE KEY-----\n`;
const LIBRARY_TEST_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoq/3UxpzgfXOLrJEZd39\nTJ7Fc4iRLMcK1Hj563O+sNcP4BnAeNnRXfCCJCLs+UZxPLxV7f1Zj7zHmgUOsB6r\nPS3TJwbIIbclDrhoySzPAnTNg+jU9lpPS99vvT8tJpUb0zAA6sAwFxHUQk43mzgL\nou04eMlSHZmZ4MFVGzWGakIwDRlPMQbQCOiU+N/0Kl7qBDwDkn6USwc16MTa2Xm6\nBAhcwaug0jlhN5NIu7hyK2gk8In1S0OrxBEK3Z1zShRhixGEhA8Z7NREJCMuqHke\n09dVK1nVXz6CGTQMafjDKDwgmiBR7cJo25Icb/OqFs4TzE7XPfU/3gK0+1YdqF4J\n/wIDAQAB\n-----END PUBLIC KEY-----\n`;
const LIBRARY_EXPECTED_SIGNATURE =
  'TiQCuWaV1WE/VDsbYKn6O0B2diji6MyZI6zjC8Q9lEdnc6KkxURnot1i874fw8q5cyBpLXO6T7dH70VpC11pT1vlrZDZe+PzGnYe27pRqwxU6KcohG5iYp5eeUjQHNaJHL/7zkJdCRu6nIj0z84xbLYMYbPBfTHPPp+viwnGqEdR4wIcjVm18Op3WKgOj5zTv2HB4ATNi31nERYN2R3/ecn+CgK8tIf6Ox3azhNJat3oIQT6Gk10wvAROLsNFKm82Px3CeT/lXO1d8UeeTMNGe8mvo7POGUrH4UJhjsa1myvpNyKeW1vF1kuSv8bFcoJfkXbiZ51gHGxpoL8MmYhlA==';

const libraryRequest = {
  method: 'POST',
  path: '/services',
  headers: {
    Host: 'api.paymentsgateway.averspay.kg',
    'x-api-timestamp': '1636026186643',
    'x-api-key': 'h8z1TDStxu5YY2YuN8jUa9hpzIVbfkLT7kPiPiYj',
    'x-api-header': 'header value',
    'X-Forwarded-For': '54.187.127.20, 15.158.4.100',
    'X-Forwarded-Port': '443',
    'X-Forwarded-Proto': 'https',
  },
  query: { from: '0', size: '10', test: undefined, best: 'тест дата' },
  body: { payment: 'payment', amount: 100 },
};

describe('request signer (Finik / AversPay)', () => {
  it('builds the same canonical string as the reference library', () => {
    expect(canonicalRequest(libraryRequest)).toBe(
      'post\n/services\n' +
        'host:api.paymentsgateway.averspay.kg&x-api-header:header value&' +
        'x-api-key:h8z1TDStxu5YY2YuN8jUa9hpzIVbfkLT7kPiPiYj&x-api-timestamp:1636026186643\n' +
        'best=%D1%82%D0%B5%D1%81%D1%82%20%D0%B4%D0%B0%D1%82%D0%B0&from=0&size=10&test=\n' +
        '{"amount":100,"payment":"payment"}',
    );
  });

  it('produces the reference signature', () => {
    expect(signRequest(libraryRequest, LIBRARY_TEST_PRIVATE_KEY)).toBe(LIBRARY_EXPECTED_SIGNATURE);
    expect(verifyRequest(libraryRequest, LIBRARY_EXPECTED_SIGNATURE, LIBRARY_TEST_PUBLIC_KEY)).toBe(
      true,
    );
  });

  it('omits the query part when there are no query parameters and handles an empty body', () => {
    expect(
      canonicalRequest({ method: 'GET', path: '/v1/x', headers: { Host: 'h', 'x-api-key': 'k' } }),
    ).toBe('get\n/v1/x\nhost:h&x-api-key:k\n');
  });

  it('rejects tampered requests and foreign keys', () => {
    const signature = signRequest(libraryRequest, LIBRARY_TEST_PRIVATE_KEY);
    const tampered = { ...libraryRequest, body: { payment: 'payment', amount: 1000 } };
    const { publicKey: otherKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    expect(verifyRequest(tampered, signature, LIBRARY_TEST_PUBLIC_KEY)).toBe(false);
    expect(verifyRequest(libraryRequest, signature, otherKey)).toBe(false);
    expect(verifyRequest(libraryRequest, 'not-base64!', 'not a key')).toBe(false);
  });

  it('requires the Host header', () => {
    expect(() => canonicalRequest({ method: 'GET', path: '/', headers: {} })).toThrow(/Host/);
  });

  it('reads PEM keys with escaped line breaks from env variables', () => {
    expect(pemFromEnv('-----BEGIN KEY-----\\nabc\\n-----END KEY-----')).toBe(
      '-----BEGIN KEY-----\nabc\n-----END KEY-----',
    );
  });
});
