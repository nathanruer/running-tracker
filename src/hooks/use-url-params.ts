'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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

function readValues<T extends ParamDefs>(
  defs: T,
  searchParams: URLSearchParams
): ParamValues<T> {
  return Object.fromEntries(
    Object.entries(defs).map(([name, def]) => {
      const raw = searchParams.get(def.key);
      if (raw === null) return [name, def.defaultValue];
      if (def.validate) {
        const validated = def.validate(raw);
        return [name, validated ?? def.defaultValue];
      }
      return [name, raw];
    })
  ) as ParamValues<T>;
}

function buildQueryString<T extends ParamDefs>(
  defs: T,
  values: ParamValues<T>,
  currentParams: URLSearchParams
): string {
  const params = new URLSearchParams(currentParams);
  for (const def of Object.values(defs)) {
    params.delete(def.key);
  }
  for (const [name, def] of Object.entries(defs)) {
    const value = values[name];
    if (value === def.defaultValue) continue;
    const serialized = def.serialize ? def.serialize(value) : String(value);
    if (serialized) params.set(def.key, serialized);
  }
  return params.toString();
}

export function useUrlParams<T extends ParamDefs>(defs: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = useMemo(
    () => readValues(defs, new URLSearchParams(searchParams)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams]
  );

  const applyUpdates = useCallback(
    (updates: Partial<ParamValues<T>>) => {
      const current = new URLSearchParams(window.location.search);
      const nextValues = { ...readValues(defs, current), ...updates } as ParamValues<T>;
      const qs = buildQueryString(defs, nextValues, current);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, router]
  );

  const setParam = useCallback(
    <K extends keyof T & string>(key: K, value: ParamValues<T>[K]) => {
      applyUpdates({ [key]: value } as unknown as Partial<ParamValues<T>>);
    },
    [applyUpdates]
  );

  const setParams = useCallback(
    (updates: Partial<ParamValues<T>>) => {
      applyUpdates(updates);
    },
    [applyUpdates]
  );

  return { params: values, setParam, setParams } as const;
}
