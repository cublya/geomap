// Server Component: the core (prepareCountries, renderStaticMapSvg) runs during
// SSR/prerender with no client boundary, proving the package is server-safe.
import { prepareCountries, renderStaticMapSvg } from "@cublya/geomap";
import world110 from "world-atlas/countries-110m.json";
import { ClientMap } from "./client-map";

const world = prepareCountries(
  world110 as unknown as Parameters<typeof prepareCountries>[0],
  { exclude: ["AQ"] },
);
const staticSvg = renderStaticMapSvg({
  width: 800,
  height: 400,
  countries: { data: world },
});

export default function Page() {
  return (
    <main style={{ display: "grid", gap: 16, padding: 16 }}>
      <h1>@cublya/geomap Next.js fixture</h1>
      <section aria-label="Server-rendered static map">
        {/* Rendered on the server as a plain string. */}
        <div dangerouslySetInnerHTML={{ __html: staticSvg }} />
      </section>
      <section aria-label="Interactive client map" style={{ height: 480 }}>
        <ClientMap />
      </section>
    </main>
  );
}
