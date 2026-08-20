'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value` delayed by `delayMs`. Used to keep search inputs responsive
 * (and mounted) while throttling the API calls they trigger.
 */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
