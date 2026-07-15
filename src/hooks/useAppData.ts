import { useCallback, useEffect, useState } from "react";
import type { AppData } from "../types";

export function useAppData() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    window.bubu.getData().then((value) => {
      if (!alive) return;
      setData(value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback(async (next: AppData) => {
    const saved = await window.bubu.saveData(next);
    setData(saved);
    return saved;
  }, []);

  const patch = useCallback(
    async (updater: (current: AppData) => AppData) => {
      if (!data) return null;
      const next = updater(data);
      const saved = await window.bubu.saveData(next);
      setData(saved);
      return saved;
    },
    [data]
  );

  return { data, setData, loading, save, patch };
}

