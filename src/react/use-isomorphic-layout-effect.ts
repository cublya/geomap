import { useEffect, useLayoutEffect } from "react";

/**
 * useLayoutEffect warns during server-side rendering; fall back to useEffect
 * there (the effect only wires up browser interaction anyway).
 */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
