/**
 * MediaPipe WASM Initialization Fix
 * 
 * This file handles the Module.arguments deprecation error in MediaPipe WASM binaries.
 * It MUST be imported before any MediaPipe imports in the application.
 */

// Extend the Window interface to include Module
declare global {
  interface Window {
    Module: {
      arguments?: string[];
      [key: string]: any;
    };
  }
}

/**
 * Initialize MediaPipe WASM compatibility layer
 * This prevents the "Module.arguments has been replaced with plain arguments_" error
 */
export function initMediaPipe(): void {
  if (typeof window === 'undefined') return;

  // Create Module object if it doesn't exist
  if (!window.Module) {

s    window.Module = {} as any;
  }

  // CRITICAL FIX: Intercept the WASM error by providing both 'arguments' and 'arguments_'
  // The new MediaPipe WASM expects 'arguments_' but still checks for old 'arguments'
  const argsArray: string[] = [];
  
  // Define both properties to handle the transition
  Object.defineProperty(window.Module, 'arguments', {
    get: function() {
      // Return the new property name instead of throwing
      return argsArray;
    },
    set: function(value) {
      // Silently ignore sets
    },
    configurable: true
  });

  // Also define the new 'arguments_' property
  (window.Module as any).arguments_ = argsArray;

  // Additional WASM compatibility settings
  window.Module.locateFile = window.Module.locateFile || ((path: string, prefix: string) => {
    // Default behavior - let MediaPipe handle file location
    return prefix + path;
  });

  console.log('✅ MediaPipe WASM compatibility layer initialized');
}

// Auto-initialize when this module is imported
initMediaPipe();
