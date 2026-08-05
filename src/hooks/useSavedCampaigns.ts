import { useCallback, useEffect, useState } from "react";

const KEY = "clipper.saved-campaigns";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const listeners = new Set<(ids: string[]) => void>();

function broadcast(ids: string[]) {
  listeners.forEach((l) => l(ids));
}

/** Client-side campaign bookmarks. No schema change — persists per device. */
export function useSavedCampaigns() {
  const [ids, setIds] = useState<string[]>(() => read());

  useEffect(() => {
    listeners.add(setIds);
    return () => {
      listeners.delete(setIds);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    broadcast(next);
    return next.includes(id);
  }, []);

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  return { saved: ids, isSaved, toggle };
}
