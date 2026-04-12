import { createContext, useContext } from "react";

/**
 * Provides a single `useMediaQuery` result for the xl breakpoint (1536 px)
 * to all button children, avoiding N individual media-query listeners per row.
 * true  → narrow viewport, show text buttons
 * false → wide viewport, show icon buttons
 */
export const CompactContext = createContext(false);
export const useCompact = () => useContext(CompactContext);
