import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  parameters: {
    layout: "padded",
    a11y: {
      // Fail the Storybook test-runner on accessibility violations.
      test: "error",
    },
    controls: { expanded: true },
    options: {
      storySort: {
        order: [
          "Start",
          "Intro",
          "Maps",
          "Globe",
          "Layers",
          "Camera",
          "Theming",
          "Accessibility",
          "Data",
          "Advanced",
        ],
      },
    },
  },
};

export default preview;
