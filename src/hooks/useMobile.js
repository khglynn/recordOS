/**
 * ============================================================================
 * USE MOBILE HOOK
 * ============================================================================
 *
 * Detects mobile viewport (< 768px) for responsive behavior.
 * Returns boolean indicating if we're on a mobile device.
 */

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    // Check initial viewport
    return typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on resize
    window.addEventListener('resize', checkMobile);

    // Initial check
    checkMobile();

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export default useMobile;
