import { useState, useEffect } from 'react';

/**
 * Returns 'dark' | 'light' and re-renders when the theme class changes on <html>.
 * Useful for invalidating memoised values that depend on CSS custom properties.
 */
export function useThemeKey() {
  const [key, setKey] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setKey(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return key;
}
