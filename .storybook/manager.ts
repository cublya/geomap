import { addons } from "storybook/manager-api";
import { create } from "storybook/theming/create";

// A custom theme replaces Storybook's automatic light/dark switching, so pick
// the base (and matching logo) from the OS preference at load time.
const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

const theme = create({
  base: prefersDark ? "dark" : "light",
  brandTitle: "@cublya/geomap",
  brandUrl: "./",
  brandImage: prefersDark ? "./brand/logo-white.svg" : "./brand/logo-color.svg",
  brandTarget: "_self",
});

addons.setConfig({ theme });
