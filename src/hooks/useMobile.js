/**
 * ============================================================================
 * USE MOBILE HOOK
 * ============================================================================
 *
 * Detects mobile viewport for responsive behavior.
 * Breakpoint set to 480px (menu ~180px + flyout ~180px + margin).
 * This keeps flyout menus working on tablets, only switching on phones.
 */

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 480;

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
