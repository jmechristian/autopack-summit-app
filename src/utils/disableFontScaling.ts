import React from 'react';
import { Text, TextInput } from 'react-native';

const TEXT_SCALING_PATCH_FLAG = '__apsTextScalingPatchApplied';

type PatchedGlobal = typeof globalThis & {
  [TEXT_SCALING_PATCH_FLAG]?: boolean;
};

const patchedGlobal = globalThis as PatchedGlobal;

const FORCED_PROPS = {
  allowFontScaling: false,
  maxFontSizeMultiplier: 1,
};

function applyForcedProps(type: unknown, props: unknown) {
  if ((type === Text || type === TextInput) && props && typeof props === 'object') {
    return { ...(props as Record<string, unknown>), ...FORCED_PROPS };
  }
  return props;
}

function patchJsxFunction<F extends (...args: any[]) => any>(fn: F | undefined): F | undefined {
  if (typeof fn !== 'function') return fn;
  const wrapped = function patchedJsx(this: unknown, type: unknown, props: unknown, ...rest: unknown[]) {
    return (fn as any).call(this, type, applyForcedProps(type, props), ...rest);
  } as unknown as F;
  return wrapped;
}

if (!patchedGlobal[TEXT_SCALING_PATCH_FLAG]) {
  patchedGlobal[TEXT_SCALING_PATCH_FLAG] = true;

  // RN 0.81 + React 19 use the new component syntax for Text/TextInput, which means
  // defaultProps and forwardRef.render are no longer respected. The JSX runtime is the
  // only hook that catches every render, so patch it directly. Metro requires literal
  // require() strings, so each runtime is required explicitly.
  function patchRuntime(runtime: unknown) {
    if (!runtime || typeof runtime !== 'object') return;
    const r = runtime as {
      jsx?: (...args: unknown[]) => unknown;
      jsxs?: (...args: unknown[]) => unknown;
      jsxDEV?: (...args: unknown[]) => unknown;
    };
    if (typeof r.jsx === 'function') {
      r.jsx = patchJsxFunction(r.jsx);
    }
    if (typeof r.jsxs === 'function') {
      r.jsxs = patchJsxFunction(r.jsxs);
    }
    if (typeof r.jsxDEV === 'function') {
      r.jsxDEV = patchJsxFunction(r.jsxDEV);
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    patchRuntime(require('react/jsx-runtime'));
  } catch {
    // ignore
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    patchRuntime(require('react/jsx-dev-runtime'));
  } catch {
    // The dev runtime may not be available in production bundles.
  }

  const originalCreateElement = React.createElement;
  React.createElement = function createElementWithoutFontScaling(
    type: any,
    props: any,
    ...children: any[]
  ) {
    return originalCreateElement(type, applyForcedProps(type, props) as any, ...children);
  } as typeof React.createElement;
}
