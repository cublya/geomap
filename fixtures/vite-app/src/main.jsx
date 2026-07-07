// Exercises the packed tarball end-to-end in Vite: package import, subpath
// stylesheet export, TopoJSON preprocessing, components and static rendering.
import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  GeoControls,
  GeoGlobe,
  GeoMap,
  prepareCountries,
  renderStaticMapSvg,
  useMapCamera,
} from "@cublya/geomap";
import "@cublya/geomap/styles.css";
import world110 from "world-atlas/countries-110m.json";

const world = prepareCountries(world110, { exclude: ["AQ"] });

// Static output must work at module scope, before any React renders.
const staticSvg = renderStaticMapSvg({ width: 400, height: 200, countries: { data: world } });
if (staticSvg.includes("NaN")) throw new Error("static svg contains NaN");

function App() {
  const camera = useMapCamera();
  return (
    <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", height: "100%" }}>
      <div style={{ position: "relative" }}>
        <GeoMap
          camera={camera}
          countries={{ data: world, fill: (c) => (c.id === "br" ? "#7f61d3" : undefined) }}
          markers={[{ id: "vie", coordinates: { lat: 48.2, lng: 16.37 }, label: "Vienna" }]}
          aria-label="Fixture map"
        />
        <GeoControls camera={camera} style={{ position: "absolute", bottom: 12, right: 12 }} />
      </div>
      <GeoGlobe countries={{ data: world }} preset="dark" aria-label="Fixture globe" />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
