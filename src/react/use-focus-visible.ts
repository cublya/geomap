import * as React from "react";

function matchesFocusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    // Older engines without the pseudo-class: treat any focus as visible.
    return true;
  }
}

/**
 * Tracks keyboard-visible focus so the theme's `focus` token can be drawn as an
 * inline outline (SVG/props styling, no stylesheet required).
 */
export function useFocusVisible(): {
  focusVisible: boolean;
  onFocus: (e: React.FocusEvent) => void;
  onBlur: () => void;
} {
  const [focusVisible, setFocusVisible] = React.useState(false);
  return {
    focusVisible,
    onFocus: (e) => setFocusVisible(matchesFocusVisible(e.currentTarget)),
    onBlur: () => setFocusVisible(false),
  };
}
