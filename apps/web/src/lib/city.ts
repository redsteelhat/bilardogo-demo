'use client';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'bg_city';
const EVENT = 'bg-city-change';

/** Seçili şehir: giriş yapmış kullanıcıda profil şehri, yoksa tarayıcıda saklanan seçim (varsayılan İstanbul). */
export function useSelectedCity(profileCity: number | null | undefined) {
  const [city, setCityState] = useState<number>(() => {
    if (typeof window === 'undefined') return profileCity ?? 34;
    const stored = Number(window.localStorage.getItem(KEY));
    return stored >= 1 && stored <= 81 ? stored : (profileCity ?? 34);
  });
  useEffect(() => {
    const onChange = () => {
      const stored = Number(window.localStorage.getItem(KEY));
      if (stored >= 1 && stored <= 81) setCityState(stored);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  useEffect(() => {
    if (profileCity && !window.localStorage.getItem(KEY)) setCityState(profileCity);
  }, [profileCity]);
  const setCity = useCallback((plate: number) => {
    window.localStorage.setItem(KEY, String(plate));
    setCityState(plate);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [city, setCity] as const;
}
