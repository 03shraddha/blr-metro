import { useBreakpoint } from './useBreakpoint'

// Backward-compatible hook — returns a single boolean.
// Internally delegates to useBreakpoint so the breakpoint threshold is
// defined in one place (< 768 px = mobile).
export function useIsMobile() {
  return useBreakpoint().isMobile
}

export default useIsMobile
