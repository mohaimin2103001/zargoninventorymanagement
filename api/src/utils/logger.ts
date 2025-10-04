// Simple logger utility with environment-based logging levels

const isDevelopment = process.env.NODE_ENV !== 'production';
const isVerbose = process.env.LOG_LEVEL === 'verbose' || process.env.LOG_LEVEL === 'debug';

export const logger = {
  // Always log errors
  error: (...args: any[]) => {
    console.error(...args);
  },

  // Always log warnings
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  // Log important info (production + dev)
  info: (...args: any[]) => {
    console.log(...args);
  },

  // Only log in development or if verbose mode
  debug: (...args: any[]) => {
    if (isDevelopment || isVerbose) {
      console.log(...args);
    }
  },

  // Only log HTTP requests in development
  http: (method: string, path: string, ...extra: any[]) => {
    if (isDevelopment) {
      console.log(`${new Date().toISOString()} - ${method} ${path}`, ...extra);
    }
  }
};
