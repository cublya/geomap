import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Topology } from "topojson-specification";
import world110 from "@cublya/world-atlas/countries-110m.json";
import { prepareCountries } from "../core/geodata";
import { createMapCamera } from "../core/camera-map";
import { GeoMap } from "./GeoMap";
import { GeoControls, GeoViewToggle } from "./controls";
import { flagEmoji, GeoTooltip } from "./tooltip";

const world = prepareCountries(world110 as unknown as Topology, { exclude: ["AQ"] });

beforeAll(() => {
  let now = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    now += 16;
    cb(now);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(cleanup);

describe("GeoControls", () => {
  it("defaults to preset none: bare buttons with no inline presentation styles", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} />);
    const button = screen.getByRole("button", { name: "Zoom in" });
    expect(button.getAttribute("style")).toBeNull();
    // headless still exposes stable hooks for raw CSS
    expect(button.getAttribute("data-geomap-part")).toBe("zoom-in");
    expect(button.className).toBe("geomap-controls__button");
  });

  it("drives any camera and works with no stylesheet", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} preset="light" />);
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(camera.view.zoom).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(camera.view.zoom).toBeCloseTo(1, 5);
    expect(screen.getByRole("group", { name: "Map controls" })).toBeTruthy();
  });

  it("preset styling is complete without any CSS import", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} preset="light" />);
    // separate layout: each button is its own surface, inking from the token
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    expect(zoomIn.style.background).toContain("--geomap-control-bg");
    expect(zoomIn.style.color).toContain("--geomap-control-ink");
  });

  it("defaults to separate layout: standalone rounded tiles, no pill surface", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} preset="light" />);
    const group = screen.getByRole("group", { name: "Map controls" });
    expect(group.getAttribute("data-geomap-layout")).toBe("separate");
    // the group is only a flex track: no shared background/clip
    expect(group.style.background).toBe("");
    expect(group.style.overflow).toBe("");
    expect(screen.getByRole("button", { name: "Zoom in" }).style.borderRadius).toBe("8px");
  });

  it('layout="segmented" joins the buttons into one pill', () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} preset="light" layout="segmented" />);
    const group = screen.getByRole("group", { name: "Map controls" });
    expect(group.getAttribute("data-geomap-layout")).toBe("segmented");
    // the pill container carries the surface; buttons are transparent inside it
    expect(group.style.background).toContain("--geomap-control-bg");
    expect(group.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "Zoom in" }).style.background).toBe("transparent");
  });

  it("accepts custom labels", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} labels={{ zoomIn: "Bigger" }} />);
    expect(screen.getByRole("button", { name: "Bigger" }).getAttribute("title")).toBe("Bigger");
  });

  it("wraps each button for custom tooltip systems", () => {
    const camera = createMapCamera();
    render(
      <GeoControls
        camera={camera}
        labels={{ zoomIn: "Bigger" }}
        wrapButton={({ button, label, part }) => (
          <span data-label={label} data-part={part}>
            {button}
          </span>
        )}
      />,
    );

    const zoomIn = screen.getByRole("button", { name: "Bigger" });
    expect(zoomIn.getAttribute("title")).toBeNull();
    expect(zoomIn.parentElement?.getAttribute("data-label")).toBe("Bigger");
    expect(zoomIn.parentElement?.getAttribute("data-part")).toBe("zoom-in");
  });

  it("applies per-part classNames (Tailwind seam) after the base classes", () => {
    const camera = createMapCamera();
    render(
      <GeoControls
        camera={camera}
        classNames={{ root: "rounded-xl", button: "size-9", reset: "text-red-500" }}
      />,
    );
    expect(screen.getByRole("group", { name: "Map controls" }).className).toBe(
      "geomap-controls rounded-xl",
    );
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    expect(zoomIn.className).toBe("geomap-controls__button size-9");
    const reset = screen.getByRole("button", { name: "Reset view" });
    expect(reset.className).toBe("geomap-controls__button size-9 text-red-500");
  });

  it("reflects orientation on the group for CSS targeting", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} orientation="horizontal" />);
    expect(
      screen.getByRole("group", { name: "Map controls" }).getAttribute("data-geomap-orientation"),
    ).toBe("horizontal");
  });

  it("omits the fullscreen button unless a target is provided", () => {
    const camera = createMapCamera();
    render(<GeoControls camera={camera} />);
    expect(screen.queryByRole("button", { name: /fullscreen/i })).toBeNull();
  });

  it("renders a fullscreen toggle that requests fullscreen on its target", () => {
    const camera = createMapCamera();
    const target = document.createElement("div");
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    // jsdom doesn't implement the Fullscreen API; stub what the toggle touches.
    target.requestFullscreen = requestFullscreen;
    render(<GeoControls camera={camera} fullscreen={{ current: target }} />);
    const button = screen.getByRole("button", { name: "Enter fullscreen" });
    expect(button.getAttribute("data-geomap-part")).toBe("fullscreen");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it("renders a fullscreen-only cluster when no camera is given", () => {
    const target = document.createElement("div");
    target.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    render(<GeoControls fullscreen={{ current: target }} />);
    expect(screen.queryByRole("button", { name: "Zoom in" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset view" })).toBeNull();
    expect(screen.getByRole("button", { name: "Enter fullscreen" })).toBeTruthy();
  });

  it("accepts custom fullscreen labels", () => {
    const camera = createMapCamera();
    render(
      <GeoControls
        camera={camera}
        fullscreen={() => null}
        labels={{ enterFullscreen: "Expand" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Expand" })).toBeTruthy();
  });

  it("renders custom icon nodes in place of the built-in SVG glyphs", () => {
    const camera = createMapCamera();
    render(
      <GeoControls
        camera={camera}
        icons={{ zoomIn: <span data-testid="my-plus">+</span> }}
      />,
    );
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    expect(zoomIn.querySelector("[data-testid='my-plus']")).toBeTruthy();
    // Default glyphs stay for the slots left unset.
    expect(screen.getByRole("button", { name: "Zoom out" }).querySelector("svg")).toBeTruthy();
  });
});

describe("GeoViewToggle", () => {
  it("renders a two-option radiogroup with the active surface checked", () => {
    render(<GeoViewToggle mode="map" onModeChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "Map view" });
    expect(group.getAttribute("data-geomap-view")).toBe("map");
    const mapOpt = screen.getByRole("radio", { name: "Flat map" });
    const globeOpt = screen.getByRole("radio", { name: "Globe" });
    expect(mapOpt.getAttribute("aria-checked")).toBe("true");
    expect(mapOpt.getAttribute("data-geomap-active")).toBe("");
    expect(globeOpt.getAttribute("aria-checked")).toBe("false");
    expect(globeOpt.getAttribute("data-geomap-active")).toBeNull();
  });

  it("reports the chosen surface when an option is pressed", () => {
    const onModeChange = vi.fn();
    render(<GeoViewToggle mode="map" onModeChange={onModeChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Globe" }));
    expect(onModeChange).toHaveBeenCalledWith("globe");
  });

  it("defaults to preset none: bare options with no inline presentation styles", () => {
    render(<GeoViewToggle mode="map" onModeChange={() => {}} />);
    const globeOpt = screen.getByRole("radio", { name: "Globe" });
    expect(globeOpt.getAttribute("style")).toBeNull();
    expect(globeOpt.getAttribute("data-geomap-part")).toBe("view-toggle-globe");
  });

  it("preset styling highlights the active option from the control tokens", () => {
    render(<GeoViewToggle mode="globe" onModeChange={() => {}} preset="light" />);
    const globeOpt = screen.getByRole("radio", { name: "Globe" });
    expect(globeOpt.style.background).toContain("--geomap-control-ink");
    // The inactive option is transparent (no surface tint).
    expect(screen.getByRole("radio", { name: "Flat map" }).style.background).toBe("transparent");
  });

  it("accepts custom labels and icon nodes", () => {
    render(
      <GeoViewToggle
        mode="map"
        onModeChange={() => {}}
        labels={{ globe: "3D" }}
        icons={{ map: <span data-testid="my-map" /> }}
      />,
    );
    expect(screen.getByRole("radio", { name: "3D" })).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "Flat map" }).querySelector("[data-testid='my-map']"),
    ).toBeTruthy();
  });

  it("wraps each option for custom tooltip systems", () => {
    render(
      <GeoViewToggle
        mode="map"
        onModeChange={() => {}}
        labels={{ globe: "3D" }}
        wrapOption={({ option, label, active, part }) => (
          <span
            data-label={label}
            data-active={active ? "yes" : "no"}
            data-part={part}
          >
            {option}
          </span>
        )}
      />,
    );

    const globe = screen.getByRole("radio", { name: "3D" });
    expect(globe.getAttribute("title")).toBeNull();
    expect(globe.parentElement?.getAttribute("data-label")).toBe("3D");
    expect(globe.parentElement?.getAttribute("data-active")).toBe("no");
    expect(globe.parentElement?.getAttribute("data-part")).toBe("view-toggle-globe");
  });

  it("applies per-part classNames after the base classes", () => {
    render(
      <GeoViewToggle
        mode="map"
        onModeChange={() => {}}
        classNames={{ root: "rounded-2xl", option: "size-8", globe: "text-sky-500" }}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Map view" }).className).toBe(
      "geomap-view-toggle rounded-2xl",
    );
    expect(screen.getByRole("radio", { name: "Globe" }).className).toBe(
      "geomap-view-toggle__option size-8 text-sky-500",
    );
  });
});

describe("GeoTooltip", () => {
  it("renders nothing without a point or content", () => {
    const { container, rerender } = render(<GeoTooltip point={null}>hi</GeoTooltip>);
    expect(container.innerHTML).toBe("");
    rerender(<GeoTooltip point={[10, 20]} />);
    expect(container.innerHTML).toBe("");
  });

  it("positions at the given client point with inline styles only", () => {
    render(<GeoTooltip point={[120, 80]}>Japan · 87</GeoTooltip>);
    const tip = screen.getByRole("tooltip");
    expect(tip.style.position).toBe("fixed");
    expect(tip.style.left).toBe("120px");
    expect(tip.style.top).toBe("80px");
    expect(tip.textContent).toBe("Japan · 87");
  });

  it("defaults to preset none: positioned, but no surface styling", () => {
    render(<GeoTooltip point={[0, 0]}>hi</GeoTooltip>);
    const tip = screen.getByRole("tooltip");
    expect(tip.style.background).toBe("");
  });

  it('preset="light" adds a complete surface (background/ink/border) without CSS', () => {
    render(
      <GeoTooltip point={[0, 0]} preset="light">
        hi
      </GeoTooltip>,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip.style.background).toContain("--geomap-tooltip-bg");
  });

  it("draws no flag by default even when a code is supplied", () => {
    render(
      <GeoTooltip point={[0, 0]} flag="fr">
        France
      </GeoTooltip>,
    );
    expect(screen.getByRole("tooltip").querySelector('[data-geomap-part="tooltip-flag"]')).toBeNull();
  });

  it('flagStyle="emoji" renders a leading regional-indicator flag', () => {
    render(
      <GeoTooltip point={[0, 0]} flag="fr" flagStyle="emoji">
        France
      </GeoTooltip>,
    );
    const flag = screen
      .getByRole("tooltip")
      .querySelector('[data-geomap-part="tooltip-flag"]')!;
    expect(flag.textContent).toBe("🇫🇷");
  });

  it('flagStyle="icon" emits a flag-icons class by default', () => {
    render(
      <GeoTooltip point={[0, 0]} flag="FR" flagStyle="icon">
        France
      </GeoTooltip>,
    );
    const flag = screen
      .getByRole("tooltip")
      .querySelector('[data-geomap-part="tooltip-flag"]')!;
    expect(flag.className).toBe("fi fi-fr");
  });

  it("flagClassName customizes the icon class for any icon font", () => {
    render(
      <GeoTooltip
        point={[0, 0]}
        flag="fr"
        flagStyle="icon"
        flagClassName={(cc) => `flag flag-country-${cc}`}
      >
        France
      </GeoTooltip>,
    );
    const flag = screen
      .getByRole("tooltip")
      .querySelector('[data-geomap-part="tooltip-flag"]')!;
    expect(flag.className).toBe("flag flag-country-fr");
  });

  it('flagStyle="image" defaults to flagcdn and honors flagSrc', () => {
    const { rerender } = render(
      <GeoTooltip point={[0, 0]} flag="fr" flagStyle="image">
        France
      </GeoTooltip>,
    );
    const img = () =>
      screen.getByRole("tooltip").querySelector('img[data-geomap-part="tooltip-flag"]')!;
    expect(img().getAttribute("src")).toBe("https://flagcdn.com/fr.svg");
    rerender(
      <GeoTooltip
        point={[0, 0]}
        flag="fr"
        flagStyle="image"
        flagSrc={(cc) => `https://hatscripts.github.io/circle-flags/flags/${cc}.svg`}
      >
        France
      </GeoTooltip>,
    );
    expect(img().getAttribute("src")).toBe(
      "https://hatscripts.github.io/circle-flags/flags/fr.svg",
    );
  });

  it("renderFlag overrides flagStyle and receives the lowercased code", () => {
    render(
      <GeoTooltip
        point={[0, 0]}
        flag="AU"
        flagStyle="emoji"
        renderFlag={(cc) => <span className={`fi fi-${cc}`} data-testid="custom-flag" />}
      >
        Australia
      </GeoTooltip>,
    );
    const custom = screen.getByTestId("custom-flag");
    expect(custom.className).toBe("fi fi-au");
  });

  it("ignores a malformed flag code", () => {
    render(
      <GeoTooltip point={[0, 0]} flag="usa" flagStyle="emoji">
        United States
      </GeoTooltip>,
    );
    expect(screen.getByRole("tooltip").querySelector('[data-geomap-part="tooltip-flag"]')).toBeNull();
  });
});

describe("flagEmoji", () => {
  it("converts an alpha-2 code (any case) to flag emoji", () => {
    expect(flagEmoji("us")).toBe("🇺🇸");
    expect(flagEmoji("Jp")).toBe("🇯🇵");
    expect(flagEmoji(" de ")).toBe("🇩🇪");
  });

  it("returns an empty string for non-two-letter input", () => {
    expect(flagEmoji("usa")).toBe("");
    expect(flagEmoji("1")).toBe("");
    expect(flagEmoji("")).toBe("");
  });
});

describe("presets on GeoMap", () => {
  it("defaults to preset none: no fill/stroke/background without opting in", () => {
    const { container } = render(<GeoMap countries={{ data: world }} />);
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toBeNull();
    const svg = container.querySelector("svg")!;
    expect(svg.style.background).toBe("");
  });

  it('preset="light" looks complete: fills land and ocean out of the box', () => {
    const { container } = render(<GeoMap countries={{ data: world }} preset="light" />);
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toMatch(/^var\(--geomap-land, oklch\(.+\)\)$/);
    const svg = container.querySelector("svg")!;
    expect(svg.style.background).toContain("--geomap-ocean");
  });

  it("dark preset emits CSS-variable fills with dark OKLCH fallbacks", () => {
    const { container } = render(<GeoMap countries={{ data: world }} preset="dark" />);
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toBe("var(--geomap-land, oklch(0.9 0.008 250))");
  });

  it("theme overrides win over the preset (precedence step 3)", () => {
    const { container } = render(
      <GeoMap countries={{ data: world }} preset="dark" theme={{ land: "rebeccapurple" }} />,
    );
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toBe("rebeccapurple");
  });

  it("fill callbacks win over theme overrides (precedence step 4)", () => {
    const { container } = render(
      <GeoMap
        countries={{ data: world, fill: (c) => (c.id === "de" ? "tomato" : undefined) }}
        theme={{ land: "rebeccapurple" }}
      />,
    );
    expect(container.querySelector('path[data-country="de"]')!.getAttribute("fill")).toBe(
      "tomato",
    );
  });

  it("preset none emits no fill/stroke but keeps stable class names", () => {
    const { container } = render(
      <GeoMap
        countries={{ data: world }}
        preset="none"
        routes={[{ id: "r", stops: [[0, 0], [40, 20]] }]}
        markers={[{ id: "m", coordinates: [10, 50] }]}
        graticule
      />,
    );
    const de = container.querySelector('path[data-country="de"]')!;
    expect(de.getAttribute("fill")).toBeNull();
    expect(de.getAttribute("class")).toBe("geomap-country");
    expect(container.querySelector(".geomap-route")!.getAttribute("stroke")).toBeNull();
    expect(container.querySelector(".geomap-graticule")).toBeTruthy();
    expect(container.querySelector(".geomap-marker")).toBeTruthy();
    expect(container.querySelector("svg")!.getAttribute("class")).toContain("geomap-map");
  });

  it("marks the selected country with a data attribute for CSS targeting", () => {
    const { container } = render(
      <GeoMap countries={{ data: world, selectedId: "jp" }} preset="none" />,
    );
    expect(container.querySelector('path[data-country="jp"][data-selected]')).toBeTruthy();
    expect(container.querySelector(".geomap-selection")).toBeTruthy();
  });

  it("disabled countries are dimmed and inert", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <GeoMap
        preset="light"
        countries={{ data: world, onSelect, disabled: (c) => c.id === "fr" }}
      />,
    );
    const fr = container.querySelector('path[data-country="fr"]')!;
    expect(fr.getAttribute("data-disabled")).toBe("");
    expect(fr.getAttribute("fill")).toContain("--geomap-land-disabled");
    fireEvent.click(fr);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('path[data-country="de"]')!);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("interactive countries get a pointer cursor (hover affordance, not the grab hand)", () => {
    // Hover-only (no onSelect) still counts as interactive.
    const { container } = render(
      <GeoMap preset="light" countries={{ data: world, onHover: () => {}, disabled: (c) => c.id === "fr" }} />,
    );
    expect(container.querySelector('path[data-country="br"]')!.getAttribute("cursor")).toBe("pointer");
    // Disabled countries stay non-interactive (no pointer).
    expect(container.querySelector('path[data-country="fr"]')!.getAttribute("cursor")).toBeNull();
  });

  it("non-interactive countries have no pointer cursor", () => {
    const { container } = render(<GeoMap preset="light" countries={{ data: world }} />);
    expect(container.querySelector('path[data-country="br"]')!.getAttribute("cursor")).toBeNull();
  });

  it("hovering an interactive country fades the landHover overlay in and out (styled presets)", () => {
    const { container } = render(
      <GeoMap preset="light" countries={{ data: world, onSelect: () => {} }} />,
    );
    const br = container.querySelector('path[data-country="br"]')!;
    fireEvent.pointerEnter(br, { clientX: 10, clientY: 10 });
    const overlay = container.querySelector<SVGPathElement>(".geomap-hover")!;
    expect(overlay).toBeTruthy();
    expect(overlay.getAttribute("fill")).toContain("--geomap-land-hover");
    // Default animation: visible with an opacity transition.
    expect(overlay.style.opacity).toBe("1");
    expect(overlay.style.transition).toContain("opacity");
    // On leave the overlay stays mounted (opacity 0) so the fade-out can play.
    fireEvent.pointerLeave(br);
    expect(container.querySelector(".geomap-hover")).toBeTruthy();
    expect(container.querySelector<SVGPathElement>(".geomap-hover")!.style.opacity).toBe("0");
  });

  it("hover={false} keeps the highlight instant (no transition)", () => {
    const { container } = render(
      <GeoMap preset="light" countries={{ data: world, onSelect: () => {}, hover: false }} />,
    );
    const br = container.querySelector('path[data-country="br"]')!;
    fireEvent.pointerEnter(br, { clientX: 10, clientY: 10 });
    const overlay = container.querySelector<SVGPathElement>(".geomap-hover")!;
    expect(overlay.style.opacity).toBe("1");
    expect(overlay.style.transition).toBe("");
  });

  it("hover accepts a custom duration and easing", () => {
    const { container } = render(
      <GeoMap
        preset="light"
        countries={{ data: world, onSelect: () => {}, hover: { durationMs: 400, easing: "linear" } }}
      />,
    );
    fireEvent.pointerEnter(container.querySelector('path[data-country="br"]')!, {
      clientX: 10,
      clientY: 10,
    });
    expect(container.querySelector<SVGPathElement>(".geomap-hover")!.style.transition).toBe(
      "opacity 400ms linear",
    );
  });

  it("preset none skips the hover overlay entirely (no landHover token)", () => {
    const { container } = render(
      <GeoMap countries={{ data: world, onSelect: () => {} }} />,
    );
    const br = container.querySelector('path[data-country="br"]')!;
    fireEvent.pointerEnter(br, { clientX: 10, clientY: 10 });
    expect(container.querySelector(".geomap-hover")).toBeNull();
  });
});
