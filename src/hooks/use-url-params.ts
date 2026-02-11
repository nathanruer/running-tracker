'use client';

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';

type Serializable = string | number | boolean;

interface ParamDef<T extends Serializable> {
  key: string;
  defaultValue: T;
  validate?: (raw: string) => T | null;
  serialize?: (value: Serializable) => string;
}

type ParamDefs = Record<string, ParamDef<Serializable>>;

type ParamValues<T extends ParamDefs> = {
  [K in keyof T]: T[K] extends ParamDef<infer V> ? V : never;
};

interface UrlParamsOptions {
  initialValues?: Record<string, Serializable>;
}

function readFromUrl<T extends ParamDefs>(defs: T): ParamValues<T> {
  if (typeof window === 'undefined') {
    return Object.fromEntries(
      Object.entries(defs).map(([name, def]) => [name, def.defaultValue])
    ) as ParamValues<T>;
  }

  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(
    Object.entries(defs).map(([name, def]) => {
      const raw = params.get(def.key);
      if (raw === null) return [name, def.defaultValue];
      if (def.validate) {
        const validated = def.validate(raw);
        return [name, validated ?? def.defaultValue];
      }
      return [name, raw];
    })
  ) as ParamValues<T>;
}

function buildUrl<T extends ParamDefs>(defs: T, values: ParamValues<T>): string {
  const params = new URLSearchParams(window.location.search);
  const ownedKeys = new Set(Object.values(defs).map((def) => def.key));
  for (const key of ownedKeys) {
    params.delete(key);
  }
  for (const [name, def] of Object.entries(defs)) {
    const value = values[name];
    if (value === def.defaultValue) continue;
    const serialized = def.serialize ? def.serialize(value) : String(value);
    if (serialized) params.set(def.key, serialized);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : window.location.pathname;
}

function getDefaults<T extends ParamDefs>(defs: T): ParamValues<T> {
  return Object.fromEntries(
    Object.entries(defs).map(([name, def]) => [name, def.defaultValue])
  ) as ParamValues<T>;
}

export function useUrlParams<T extends ParamDefs>(defs: T, options?: UrlParamsOptions) {
  const defsRef = useRef(defs);
  const initialValues = options?.initialValues;
  const isFirstRender = useRef(true);
  const [values, setValues] = useState<ParamValues<T>>(() => {
    const defaults = getDefaults(defs);
    if (initialValues) {
      return { ...defaults, ...initialValues } as ParamValues<T>;
    }
    return defaults;
  });

  useLayoutEffect(() => {
    if (initialValues) return;
    const urlValues = readFromUrl(defsRef.current);
    setValues(urlValues);
  }, [initialValues]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const url = buildUrl(defsRef.current, values);
    window.history.replaceState(window.history.state, '', url);
  }, [values]);

  const setParam = useCallback(<K extends keyof T & string>(
    key: K,
    value: ParamValues<T>[K]
  ) => {
    setValues((prev) => {
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const setParams = useCallback((updates: Partial<ParamValues<T>>) => {
    setValues((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [k, v] of Object.entries(updates)) {
        if (prev[k] !== v) {
          (next as Record<string, unknown>)[k] = v;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  return { params: values, setParam, setParams } as const;
}
