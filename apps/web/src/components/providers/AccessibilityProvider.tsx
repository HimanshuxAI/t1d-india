'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { accessibility } from '@/lib/accessibility';

interface AccessibilityState {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  fontScale: number;
}

const defaultState: AccessibilityState = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  screenReader: false,
  fontScale: 1,
};

const AccessibilityContext = createContext<{
  state: AccessibilityState;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  toggleReducedMotion: () => void;
  toggleScreenReader: () => void;
  setFontScale: (scale: number) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
} | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(defaultState);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('t1d-accessibility');
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to parse accessibility settings');
      }
    }

    // Detect system preferences
    if (typeof window !== 'undefined') {
      const prefersHighContrast = window.matchMedia('(prefers-contrast: more)').matches;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      setState(prev => ({
        ...prev,
        highContrast: prev.highContrast || prefersHighContrast,
        reducedMotion: prev.reducedMotion || prefersReducedMotion,
      }));

      // Listen for changes
      const highContrastQuery = window.matchMedia('(prefers-contrast: more)');
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

      const handleHighContrastChange = (e: MediaQueryListEvent) => {
        setState(prev => ({ ...prev, highContrast: e.matches }));
      };

      const handleReducedMotionChange = (e: MediaQueryListEvent) => {
        setState(prev => ({ ...prev, reducedMotion: e.matches }));
      };

      highContrastQuery.addEventListener?.('change', handleHighContrastChange);
      reducedMotionQuery.addEventListener?.('change', handleReducedMotionChange);

      return () => {
        highContrastQuery.removeEventListener?.('change', handleHighContrastChange);
        reducedMotionQuery.removeEventListener?.('change', handleReducedMotionChange);
      };
    }

    setInitialized(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (initialized) {
      localStorage.setItem('t1d-accessibility', JSON.stringify(state));
      applyAccessibilityStyles(state);
    }
  }, [state, initialized]);

  const toggleHighContrast = () => setState(prev => ({ ...prev, highContrast: !prev.highContrast }));
  const toggleLargeText = () => setState(prev => ({ ...prev, largeText: !prev.largeText }));
  const toggleReducedMotion = () => setState(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  const toggleScreenReader = () => setState(prev => ({ ...prev, screenReader: !prev.screenReader }));
  const setFontScale = (scale: number) => setState(prev => ({ ...prev, fontScale: Math.max(0.8, Math.min(2, scale)) }));
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    accessibility.announce(message, priority);
  };

  return (
    <AccessibilityContext.Provider value={{
      state,
      toggleHighContrast,
      toggleLargeText,
      toggleReducedMotion,
      toggleScreenReader,
      setFontScale,
      announce,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

function applyAccessibilityStyles(state: AccessibilityState) {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  const body = document.body;

  // High contrast
  if (state.highContrast) {
    html.classList.add('high-contrast');
    body.classList.add('high-contrast');
  } else {
    html.classList.remove('high-contrast');
    body.classList.remove('high-contrast');
  }

  // Large text
  if (state.largeText) {
    html.classList.add('large-text');
    body.classList.add('large-text');
  } else {
    html.classList.remove('large-text');
    body.classList.remove('large-text');
  }

  // Reduced motion
  if (state.reducedMotion) {
    html.classList.add('reduce-motion');
    body.classList.add('reduce-motion');
  } else {
    html.classList.remove('reduce-motion');
    body.classList.remove('reduce-motion');
  }

  // Font scale
  document.documentElement.style.setProperty('--font-scale', state.fontScale.toString());
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

// Hook for accessible form fields
export function useFormField(label: string, error?: string, required?: boolean) {
  const { announce } = useAccessibility();
  const [errorMessage, setErrorMessage] = useState(error);

  const handleBlur = () => {
    if (errorMessage) {
      announce(`${label} error: ${errorMessage}`, 'assertive');
    }
  };

  return {
    errorMessage,
    setErrorMessage,
    handleBlur,
  };
}

// Hook for keyboard navigation
export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  currentIndex: number,
  onSelect: (index: number) => void,
  orientation: 'horizontal' | 'vertical' = 'vertical'
) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    let newIndex = currentIndex;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      newIndex = (currentIndex + 1) % items.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      newIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = items.length - 1;
    }

    if (newIndex !== currentIndex) {
      items[newIndex]?.focus();
      onSelect(newIndex);
    }
  };

  return { handleKeyDown };
}

// Export hook
export function useAccessibilityContext() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  }
  return context;
}