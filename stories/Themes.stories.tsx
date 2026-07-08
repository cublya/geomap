import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { GeoMap, presets, type GeoPalette, type OutlineMode } from "@cublya/geomap";
import { CITIES, DemoButton, Frame, Toolbar, scoreFill, world } from "./support";

const meta = {
  title: "Theming/Presets",
  parameters: {
    docs: {
      description: {
        component:
          "Built-in visual presets let components look complete with zero CSS imports — but CSS stays fully optional, so the package defaults to `preset=\"none\"` (nothing painted; you own every pixel via the semantic class names). Theming is three orthogonal axes: `preset` picks the colour mode (`\"light\"` / `\"dark\"`), `palette` picks the fill palette (`\"filled\"` filled / `\"minimal\"` line-art), and `countries.outline` picks the border *behaviour* independently — `\"line\"` (hairline), `\"gap\"` (ocean-tone gaps, cut-paper), `\"raised\"` (gap + a soft drop shadow lifting the land) or `\"none\"`. `outline` also takes a per-country callback for different borders per feature. The Playground below lets you switch the mode, palette and outline live on one map. `theme` overlays partial tokens on top, and `--geomap-*` CSS variables override globally. Precedence: defaults (none) → preset+palette → theme → feature callbacks → element props.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const demoLayers = {
  markers: CITIES.slice(0, 3),
  routes: [
    { id: "r1", stops: [CITIES[0]!.coordinates, CITIES[1]!.coordinates] },
    { id: "r2", stops: [CITIES[0]!.coordinates, CITIES[2]!.coordinates], dashed: true },
  ],
};

/** A labelled row of mutually-exclusive DemoButtons, one theming axis. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  dark,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  dark?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          font: "600 11px system-ui, sans-serif",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: dark ? "oklch(0.7 0.01 250)" : "oklch(0.55 0.01 90)",
        }}
      >
        {label}
      </span>
      {options.map((o) => (
        <DemoButton
          key={o.value}
          dark={dark}
          active={value === o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          style={{ padding: "5px 10px" }}
        >
          {o.label}
        </DemoButton>
      ))}
    </div>
  );
}

const PALETTES = [
  { value: "filled", label: "Filled" },
  { value: "minimal", label: "Minimal" },
] as const satisfies readonly { value: GeoPalette; label: string }[];

const OUTLINES = [
  { value: "line", label: "Line" },
  { value: "gap", label: "Gap" },
  { value: "raised", label: "Raised" },
  { value: "none", label: "None" },
] as const satisfies readonly { value: OutlineMode; label: string }[];

type MapTheme = React.ComponentProps<typeof GeoMap>["theme"];

// Raised reads best on a lighter land palette, so it ships mode-specific
// `theme` overrides that lift the land off a slightly darker ocean.
const reliefTheme = (dark: boolean): MapTheme =>
  dark
    ? {
        ocean: "oklch(0.18 0.008 250)",
        land: "oklch(0.34 0.008 250)",
        landMuted: "oklch(0.27 0.006 250)",
        landShadow: "oklch(0.05 0.008 250 / 0.6)",
      }
    : {
        ocean: "oklch(0.95 0.005 90)",
        land: "oklch(0.985 0.004 90)",
        landMuted: "oklch(0.965 0.004 90)",
        landShadow: "oklch(0.2 0.01 90 / 0.32)",
      };

/** Small chip label, reused for the per-map outline tag. */
function Tag({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: 10,
        font: "500 12px ui-monospace, monospace",
        color: dark ? "oklch(0.93 0.005 90)" : "oklch(0.3 0.01 90)",
        background: dark ? "oklch(0.27 0.008 250)" : "oklch(0.985 0.002 90)",
        border: `1px solid ${dark ? "oklch(0.95 0.01 90 / 0.18)" : "oklch(0.25 0.01 90 / 0.14)"}`,
        borderRadius: 7,
        padding: "3px 9px",
      }}
    >
      {children}
    </div>
  );
}

/**
 * One interactive surface for the theming matrix: toggle the colour mode, fill
 * palette and `outline` behaviour independently and watch the one map update. A
 * choropleth fill is on by default so the border differences read clearly; flip
 * it off to judge the bare palette.
 */
function Playground() {
  const [dark, setDark] = React.useState(false);
  const [palette, setPalette] = React.useState<GeoPalette>("filled");
  const [outline, setOutline] = React.useState<OutlineMode>("gap");
  const [choropleth, setChoropleth] = React.useState(true);

  const chipInk = dark ? "oklch(0.93 0.005 90)" : "oklch(0.3 0.01 90)";
  const chipBg = dark ? "oklch(0.27 0.008 250)" : "oklch(0.985 0.002 90)";
  const chipBd = dark ? "oklch(0.95 0.01 90 / 0.18)" : "oklch(0.25 0.01 90 / 0.14)";

  return (
    <Frame dark={dark} height={560}>
      <GeoMap
        preset={dark ? "dark" : "light"}
        palette={palette}
        countries={{
          data: world,
          outline,
          fill: choropleth ? (c) => scoreFill(c.id) : undefined,
          onSelect: () => {},
        }}
        theme={outline === "raised" ? reliefTheme(dark) : undefined}
        {...demoLayers}
        aria-label={`Playground — ${dark ? "dark" : "light"} / ${palette} / outline ${outline}`}
      />

      <Toolbar>
        <Segmented
          label="Mode"
          dark={dark}
          value={dark ? "dark" : "light"}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(v) => setDark(v === "dark")}
        />
        <Segmented
          label="Palette"
          dark={dark}
          value={palette}
          options={PALETTES}
          onChange={setPalette}
        />
        <Segmented
          label="Outline"
          dark={dark}
          value={outline}
          options={OUTLINES}
          onChange={setOutline}
        />
      </Toolbar>

      <Toolbar corner="top-right">
        <DemoButton dark={dark} active={choropleth} onClick={() => setChoropleth((v) => !v)}>
          Choropleth {choropleth ? "on" : "off"}
        </DemoButton>
      </Toolbar>

      {/* Caption: the outline currently applied. */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          font: "500 12px ui-monospace, monospace",
          color: chipInk,
          background: chipBg,
          border: `1px solid ${chipBd}`,
          borderRadius: 8,
          padding: "6px 12px",
        }}
      >
        outline=&quot;{outline}&quot;
      </div>
    </Frame>
  );
}

export const PlaygroundStory: Story = {
  name: "Playground (interactive)",
  render: () => <Playground />,
};

export const Light: Story = {
  render: () => (
    <Frame>
      <GeoMap
        preset="light"
        countries={{ data: world, onSelect: () => {} }}
        {...demoLayers}
        aria-label="Light preset"
      />
    </Frame>
  ),
};

export const Dark: Story = {
  render: () => (
    <Frame dark>
      <GeoMap
        countries={{ data: world, onSelect: () => {} }}
        {...demoLayers}
        preset="dark"
        aria-label="Dark preset"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const country = canvasElement.querySelector("path[data-country]")!;
      expect(country.getAttribute("fill")).toContain("var(--geomap-land");
    });
  },
};

/**
 * A single `outline` behaviour shown with a Light/Dark switch, so the border
 * look can be judged in both modes without a separate story per mode. Deterministic
 * default state (light) makes it a stable screenshot target.
 */
function OutlineShowcase({
  outline,
  theme,
  ariaLabel,
}: {
  outline: OutlineMode;
  theme?: (dark: boolean) => MapTheme;
  ariaLabel: string;
}) {
  const [dark, setDark] = React.useState(false);
  return (
    <Frame dark={dark}>
      <GeoMap
        preset={dark ? "dark" : "light"}
        countries={{ data: world, outline, onSelect: () => {} }}
        theme={theme?.(dark)}
        {...demoLayers}
        aria-label={`${ariaLabel} (${dark ? "dark" : "light"})`}
      />
      <Toolbar>
        <Segmented
          label="Mode"
          dark={dark}
          value={dark ? "dark" : "light"}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={(v) => setDark(v === "dark")}
        />
      </Toolbar>
      <Tag dark={dark}>outline=&quot;{outline}&quot;</Tag>
    </Frame>
  );
}

// The border look is the orthogonal `outline` axis; these two showcase the
// gap and raised behaviours with a Light/Dark switch.

export const OutlineGap: Story = {
  name: "Outline: gap",
  render: () => (
    <OutlineShowcase outline="gap" ariaLabel="Outline gap — ocean-tone cut-paper borders" />
  ),
};

export const OutlineRaised: Story = {
  name: "Outline: raised",
  render: () => (
    <OutlineShowcase
      outline="raised"
      theme={reliefTheme}
      ariaLabel="Outline raised — lifted land with a soft shadow"
    />
  ),
};

export const CustomTokens: Story = {
  name: "Custom (theme overrides)",
  render: () => (
    <Frame>
      <GeoMap
        countries={{ data: world }}
        {...demoLayers}
        preset="light"
        theme={{
          ocean: "oklch(0.97 0.01 200)",
          landStroke: "oklch(0.3 0.03 200 / 0.3)",
          marker: "oklch(0.45 0.1 200)",
          route: "oklch(0.45 0.1 200)",
          markerLabel: "oklch(0.35 0.05 200)",
        }}
        aria-label="Custom theme tokens over the light preset"
      />
    </Frame>
  ),
};

export const ComposedPreset: Story = {
  name: "Custom (composing preset objects)",
  render: () => (
    <Frame dark>
      <GeoMap
        countries={{ data: world, onSelect: () => {} }}
        {...demoLayers}
        // Exported preset objects compose: start from dark, swap accents.
        theme={{ ...presets.dark.filled, route: "oklch(0.8 0.1 150)", marker: "oklch(0.8 0.1 150)" }}
        aria-label="Dark preset composed with green accents"
      />
    </Frame>
  ),
};

export const CssVariables: Story = {
  name: "Custom (CSS variables)",
  render: () => (
    <Frame>
      {/* Any ancestor can retheme every map inside it; no props needed. */}
      <div style={
        {
          height: "100%",
          "--geomap-land": "oklch(0.9 0.04 80)",
          "--geomap-marker": "oklch(0.45 0.12 60)",
          "--geomap-route": "oklch(0.45 0.12 60)",
          "--geomap-marker-label": "oklch(0.4 0.08 60)",
        } as React.CSSProperties
      }>
        <GeoMap
          countries={{ data: world, onSelect: () => {} }}
          {...demoLayers}
          aria-label="Themed via --geomap-* CSS variables"
        />
      </div>
    </Frame>
  ),
};

const UNSTYLED_CSS = `
  .unstyled-demo .geomap-country { fill: oklch(0.93 0.02 300); stroke: oklch(0.99 0 0); stroke-width: 0.6; }
  .unstyled-demo .geomap-country:hover { fill: oklch(0.82 0.06 300); }
  .unstyled-demo .geomap-country[data-selected] { fill: oklch(0.6 0.15 300); }
  .unstyled-demo .geomap-route { stroke: oklch(0.45 0.18 300); stroke-width: 1.4; fill: none; }
  .unstyled-demo .geomap-marker circle { fill: oklch(0.45 0.18 300); }
  .unstyled-demo .geomap-label { fill: oklch(0.3 0.1 300); font: 600 9px system-ui; }
  .unstyled-demo svg:focus-visible { outline: 2px solid oklch(0.55 0.17 255); }
`;

function NoneDemo() {
  const [selectedId, setSelectedId] = React.useState<string | null>("jp");
  return (
    <Frame>
      {/* Story-only CSS: the package ships none of this. */}
      <style>{UNSTYLED_CSS}</style>
      <div className="unstyled-demo" style={{ height: "100%" }}>
        <GeoMap
          countries={{
            data: world,
            selectedId,
            onSelect: (c) => setSelectedId(c?.id ?? null),
          }}
          {...demoLayers}
          preset="none"
          aria-label="Preset none: painted entirely by host CSS"
        />
      </div>
    </Frame>
  );
}

export const None: Story = {
  name: "None (the default)",
  render: () => <NoneDemo />,
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const country = canvasElement.querySelector("path[data-country]")!;
      // The package emitted no fill; the story stylesheet owns everything.
      expect(country.getAttribute("fill")).toBeNull();
    });
  },
};
