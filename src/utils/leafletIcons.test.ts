import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LEAFLET_ICON_URLS, applyLeafletIcons } from './leafletIcons.ts';

const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url));

describe('LEAFLET_ICON_URLS', () => {
  it('points every icon at a file that exists in public/', () => {
    const missing = Object.values(LEAFLET_ICON_URLS).filter((url) => !existsSync(`${PUBLIC_DIR}${url}`));
    assert.deepEqual(missing, []);
  });

  it('uses same-origin paths, not data: URIs the CSP blocks', () => {
    assert.ok(Object.values(LEAFLET_ICON_URLS).every((url) => url.startsWith('/')));
  });
});

describe('applyLeafletIcons', () => {
  it('removes the default url resolver and merges the icon urls', () => {
    const merged: Record<string, unknown>[] = [];
    const prototype: { _getIconUrl?: unknown } = { _getIconUrl: () => '' };
    const iconDefault = {
      prototype,
      mergeOptions: (options: Record<string, unknown>) => { merged.push(options); },
    };
    applyLeafletIcons(iconDefault);
    assert.deepEqual({ resolver: iconDefault.prototype._getIconUrl, merged }, { resolver: undefined, merged: [LEAFLET_ICON_URLS] });
  });
});
