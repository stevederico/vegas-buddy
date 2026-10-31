/**
 * Ambient type declarations for the leaflet subset used by the venue views.
 *
 * Leaflet ships no types and the project avoids @types packages, so this
 * declares only the surface DrinksView/FoodView/AttractionsView touch:
 * map creation, tile layers, markers, the default-icon override, and CSS
 * side-effect imports. Intentionally loose — leaflet stays a runtime dep.
 */
declare module 'leaflet' {
  /** A `[lat, lng]` tuple as accepted by Leaflet factories. */
  export type LatLngTuple = [number, number];

  /** A layer added to a map (tile layer, marker, etc.). */
  export interface Layer {
    addTo(map: Map): this;
    bindPopup(content: string): this;
  }

  /** Marker layer; also used as a constructor for `instanceof` checks. */
  export class Marker implements Layer {
    addTo(map: Map): this;
    bindPopup(content: string): this;
  }

  /** A Leaflet map instance. */
  export interface Map {
    setView(center: LatLngTuple, zoom: number): this;
    invalidateSize(): this;
    remove(): this;
    eachLayer(fn: (layer: Layer) => void): this;
    removeLayer(layer: Layer): this;
  }

  /** Tile layer options (subset). */
  export interface TileLayerOptions {
    attribution?: string;
    maxZoom?: number;
    [key: string]: unknown;
  }

  /** Default marker icon, including the private url resolver Leaflet exposes. */
  export const Icon: {
    Default: {
      prototype: { _getIconUrl?: unknown };
      mergeOptions(options: Record<string, unknown>): void;
    };
  };

  /** Create a map bound to a container element. */
  export function map(element: HTMLElement | string): Map;

  /** Create a tile layer from a URL template. */
  export function tileLayer(urlTemplate: string, options?: TileLayerOptions): Layer;

  /** Create a marker at the given coordinates. */
  export function marker(latlng: LatLngTuple): Marker;
}

declare module 'leaflet/dist/leaflet.css';
