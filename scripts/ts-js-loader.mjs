import { register } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const loaderCode = `
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && specifier.endsWith('.js')) {
      const tsSpecifier = specifier.slice(0, -3) + '.ts';
      try {
        return await nextResolve(tsSpecifier, context);
      } catch {
        throw err;
      }
    }
    throw err;
  }
}
`;

register('data:text/javascript,' + encodeURIComponent(loaderCode), import.meta.url);
