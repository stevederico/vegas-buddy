/**
 * Default Leaflet marker icon URLs.
 *
 * Points at the copies in public/images/leaflet so they load as same-origin
 * files. Importing the PNGs from leaflet/dist instead lets Vite inline them as
 * data: URIs, which the backend CSP (`img-src 'self' https:`) blocks, leaving
 * every map marker invisible.
 */
export const LEAFLET_ICON_URLS = {
  iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
  iconUrl: '/images/leaflet/marker-icon.png',
  shadowUrl: '/images/leaflet/marker-shadow.png',
};

/** The slice of Leaflet's `Icon.Default` this module configures. */
interface LeafletIconDefault {
  prototype: { _getIconUrl?: unknown };
  mergeOptions(options: Record<string, unknown>): void;
}

/**
 * Configures Leaflet's default marker icon to use {@link LEAFLET_ICON_URLS}.
 *
 * Every map view calls this, so markers render no matter which view loads first.
 * Leaflet's own `_getIconUrl` guesses a path from its CSS, which breaks under a
 * bundler, so it is removed in favor of the explicit URLs.
 *
 * @param iconDefault - `L.Icon.Default` from the leaflet module
 */
export function applyLeafletIcons(iconDefault: LeafletIconDefault): void {
  delete iconDefault.prototype._getIconUrl;
  iconDefault.mergeOptions(LEAFLET_ICON_URLS);
}
