import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { venueImageSrc } from './venueImage.ts';

const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url));
const ASSET_FILES = ['happy.json', 'food.json', 'attractions.json', 'kids.json'];

/**
 * Collect every `image` value from the venue JSON files.
 *
 * @returns Raw image values, including nulls
 */
function allVenueImages(): unknown[] {
  return ASSET_FILES.flatMap((file) => {
    const parsed: unknown = JSON.parse(readFileSync(new URL(`../assets/${file}`, import.meta.url), 'utf8'));
    const list: unknown[] = Array.isArray(parsed) ? parsed : [];
    return list.map((entry) => (typeof entry === 'object' && entry !== null ? Reflect.get(entry, 'image') : undefined));
  });
}

describe('venueImageSrc', () => {
  it('returns null for a missing image', () => {
    assert.equal(venueImageSrc(null), null);
  });

  it('returns null for an empty string', () => {
    assert.equal(venueImageSrc('  '), null);
  });

  it('prefixes a bare file name with /images/', () => {
    assert.equal(venueImageSrc('venue.jpg'), '/images/venue.jpg');
  });

  it('keeps an absolute same-origin path', () => {
    assert.equal(venueImageSrc('/images/venue.jpg'), '/images/venue.jpg');
  });

  it('rejects off-site URLs', () => {
    assert.equal(venueImageSrc('https://example.com/a.jpg'), null);
  });

  it('rejects protocol-relative URLs', () => {
    assert.equal(venueImageSrc('//example.com/a.jpg'), null);
  });
});

describe('venue JSON images', () => {
  it('point only at files that exist in public/', () => {
    const missing = allVenueImages()
      .map((image) => (typeof image === 'string' ? venueImageSrc(image) : null))
      .filter((src): src is string => src !== null && !existsSync(`${PUBLIC_DIR}${src}`));
    assert.deepEqual(missing, []);
  });
});
