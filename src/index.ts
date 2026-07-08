// Types
export type {
  Coordinate,
  CountriesLayerProps,
  CountryHover,
  CountryHoverAnimation,
  CountryPattern,
  CountrySet,
  FlatProjectionKind,
  GeoBounds,
  GeoMarker,
  GeoRoute,
  LiveObject,
  LonLat,
  PreparedCountry,
  PreparedFeature,
  Rotation,
} from "./types";

// Presets & theme tokens
export {
  cx,
  presets,
  resolveTheme,
  type GeoPreset,
  type GeoPalette,
  type GeoTheme,
  type ResolvedGeoTheme,
} from "./theme";

// Border behaviour (orthogonal to the colour preset)
export {
  resolveOutline,
  type Outline,
  type OutlineMode,
  type OutlineStyle,
  type ResolvedOutline,
} from "./core/outline";

// Coordinates & spherical math
export {
  angularDistance,
  bearingBetween,
  geographicBounds,
  greatCirclePoints,
  haversineKm,
  interpolateGreatCircle,
  shortestAngleDelta,
  sphericalCentroid,
  toLonLat,
} from "./core/coords";

// ISO 3166-1 identity
export { lookupIso, normalizeName, resolveCountryName, type IsoCountry } from "./core/iso";
export { ISO_3166_1, type IsoRow } from "./core/iso-data";

// Geodata preprocessing
export {
  prepareCountries,
  type CountryFeature,
  type CountrySource,
  type PrepareCountriesOptions,
} from "./core/geodata";

// Projections
export {
  configureGlobe,
  createFlatProjection,
  createGlobeProjection,
  type FlatProjectionOptions,
  type GlobeProjectionResult,
  type ProjectionInput,
  type Size,
} from "./core/projections";

// Routes
export { routeLineString, routePoints } from "./core/routes";

// Cameras (framework-free stores)
export {
  createMapCamera,
  type FitOptions,
  type FitTarget,
  type FlyCurve,
  type FlyToOptions,
  type MapCamera,
  type MapCameraOptions,
  type MapView,
} from "./core/camera-map";
export {
  createGlobeCamera,
  type GlobeCamera,
  type GlobeCameraOptions,
  type GlobeView,
} from "./core/camera-globe";

// Animation primitives
export {
  easeInOutQuad,
  prefersReducedMotion,
  startDecay,
  tween,
  type Cancel,
  type DecayOptions,
  type TweenOptions,
} from "./core/animation";

// React components
export { GeoMap, type GeoMapProps } from "./react/GeoMap";
export { GeoGlobe, type GeoGlobeProps } from "./react/GeoGlobe";
export { GeoView, type GeoViewProps } from "./react/GeoView";

// React layers (for custom composition) & context
export {
  CountriesLayer,
  GraticuleLayer,
  LiveLayer,
  MarkersLayer,
  RoutesLayer,
  type LiveLayerComponentProps,
  type MarkersLayerProps,
  type RoutesLayerProps,
} from "./react/layers";
export { useGeo, type GeoContextValue } from "./react/geo-context";

// Optional UI helpers (cosmetics live in the optional @cublya/geomap/styles.css)
export {
  GeoControls,
  GeoViewToggle,
  type CameraControlsHandle,
  type GeoControlsProps,
  type GeoControlsClassNames,
  type GeoControlsIcons,
  type FullscreenTarget,
  type GeoViewMode,
  type GeoViewToggleProps,
  type GeoViewToggleClassNames,
  type GeoViewToggleIcons,
} from "./react/controls";
export {
  flagEmoji,
  GeoTooltip,
  type GeoFlagStyle,
  type GeoTooltipProps,
} from "./react/tooltip";

// React hooks
export {
  useGlobeCamera,
  useGlobeView,
  useMapCamera,
  useMapView,
} from "./react/use-cameras";
export { usePrefersReducedMotion } from "./react/use-reduced-motion";
export { clientToViewBox } from "./react/gestures";

// Static output
export {
  escapeXml,
  renderStaticMapSvg,
  svgToDataUrl,
  svgToPngBlob,
  type PngOptions,
  type StaticMapOptions,
} from "./static/render-svg";
