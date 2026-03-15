import { useState, useEffect } from 'react'

// Breakpoints: xs (<480), sm (480–767), md (768–1023), lg (>=1024)
function getBreakpoint(width) {
  if (width < 480) return 'xs'
  if (width < 768) return 'sm'
  if (width < 1024) return 'md'
  return 'lg'
}

export function useBreakpoint() {
  const [state, setState] = useState(() => {
    const width = window.innerWidth
    return { breakpoint: getBreakpoint(width), width }
  })

  useEffect(() => {
    let timer = null

    const handleResize = () => {
      // Debounce by 100ms to avoid excessive re-renders
      clearTimeout(timer)
      timer = setTimeout(() => {
        const width = window.innerWidth
        setState({ breakpoint: getBreakpoint(width), width })
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return {
    breakpoint: state.breakpoint,
    width: state.width,
    isMobile: state.breakpoint === 'xs' || state.breakpoint === 'sm', // width < 768
    isTablet: state.breakpoint === 'md',  // 768–1023
    isDesktop: state.breakpoint === 'lg', // >= 1024
  }
}

export default useBreakpoint
