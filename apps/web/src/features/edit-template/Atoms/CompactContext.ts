import { createContext, useContext } from "react";

/** Single `useMediaQuery` result for the xl breakpoint (1536px), shared with all button children instead of N
 * separate listeners. `true` = narrow (text buttons), `false` = wide (icon buttons). */
export const CompactContext = createContext(false);
export const useCompact = () => useContext(CompactContext);
