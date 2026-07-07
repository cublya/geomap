import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { renderStaticMapSvg, svgToDataUrl, svgToPngBlob } from "@cublya/geo";
import { CITIES, Frame, world } from "./support";

const meta = {
  title: "Advanced/Static SVG output",
  parameters: {
    docs: {
      description: {
        component:
          "`renderStaticMapSvg()` builds a standalone SVG string with no React and no DOM — the same geometry pipeline as `<GeoMap>`, for share images and server-side rendering. `svgToPngBlob()` rasterizes it in the browser.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const visited = new Set(["at", "jp", "br", "us", "ke", "au"]);

const shareSvg = renderStaticMapSvg({
  width: 1080,
  height: 720,
  background: "oklch(0.19 0.008 250)",
  preset: "dark",
  countries: {
    data: world,
    fill: (c) => (visited.has(c.id) ? "#8f76e8" : undefined),
  },
  routes: [
    { id: "tour", stops: CITIES.map((c) => c.coordinates), color: "#8f76e8", dashed: true },
  ],
  markers: CITIES.map((c) => ({ ...c, color: "#f5f3ef", label: undefined })),
});

function StaticDemo() {
  const [downloaded, setDownloaded] = React.useState(false);
  return (
    <Frame dark height={560}>
      <img
        src={svgToDataUrl(shareSvg)}
        alt="Share image: visited countries and a six-stop route on a dark map"
        style={{ width: "100%", height: "85%", objectFit: "contain" }}
      />
      <div style={{ display: "flex", gap: 12, padding: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={async () => {
            const blob = await svgToPngBlob(shareSvg, { width: 1080, height: 720, scale: 2 });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "geo-share.png";
            a.click();
            URL.revokeObjectURL(url);
            setDownloaded(true);
          }}
        >
          Download PNG (2160×1440)
        </button>
        <span style={{ font: "500 12px system-ui", color: "#c9c5bd" }}>
          {downloaded ? "Saved!" : `${(shareSvg.length / 1024).toFixed(0)} kB of SVG, zero React`}
        </span>
      </div>
    </Frame>
  );
}

export const ShareImage: Story = {
  render: () => <StaticDemo />,
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const img = canvasElement.querySelector("img")!;
      expect(img.getAttribute("src")).toContain("data:image/svg+xml");
    });
    expect(shareSvg).not.toContain("NaN");
    expect(shareSvg.startsWith("<svg")).toBe(true);
  },
};
