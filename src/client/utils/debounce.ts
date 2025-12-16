/**
 * Debounce utility function
 * Delays function execution until after wait time has passed since last invocation
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => ReturnType<T> {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>): ReturnType<T> {
    const later = () => {
      timeout = null;
      return func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
    // Return the result type (may be Promise)
    return func(...args) as ReturnType<T>;
  };
}

/**
 * Throttle utility function
 * Limits function execution to at most once per wait time
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => ReturnType<T> {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>): ReturnType<T> {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= wait) {
      lastCall = now;
      return func(...args) as ReturnType<T>;
    } else {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, wait - timeSinceLastCall);
      return func(...args) as ReturnType<T>;
    }
  };
}

