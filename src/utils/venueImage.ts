/**
 * Venue photo resolution.
 *
 * Venue photos are optional. Drop a file into `public/images/` and set the
 * venue's `image` field in `src/assets/*.json` to its file name. Venues
 * without a photo render a text-only card, so a missing photo never shows
 * as a broken image.
 */

/** Public URL prefix that venue photos are served from. */
export const VENUE_IMAGE_BASE = '/images/';

/**
 * Resolve a venue's `image` field to a same-origin URL.
 *
 * Accepts a bare file name (`"venue.jpg"`) or an absolute same-origin path
 * (`"/images/venue.jpg"`). Anything else, including empty values and
 * off-site URLs the CSP would block, resolves to null.
 *
 * @param image - Raw `image` value from the venue JSON
 * @returns Image URL, or null when the venue has no usable photo
 */
export function venueImageSrc(image: string | null | undefined): string | null {
  const name = image?.trim();
  if (!name) return null;
  if (name.startsWith('/') && !name.startsWith('//')) return name;
  if (name.includes('/') || name.includes(':')) return null;
  return `${VENUE_IMAGE_BASE}${name}`;
}
