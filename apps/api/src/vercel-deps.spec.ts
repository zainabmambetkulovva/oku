import { readFileSync } from 'fs';
import { join } from 'path';

describe('vercel-deps', () => {
  it('imports every runtime dependency so the Vercel function bundles it', () => {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const source = readFileSync(join(__dirname, 'vercel-deps.ts'), 'utf8');
    const missing = Object.keys(pkg.dependencies)
      .filter((name) => name !== 'prisma')
      .filter((name) => !source.includes(`import '${name}';`));
    expect(missing).toEqual([]);
  });
});
