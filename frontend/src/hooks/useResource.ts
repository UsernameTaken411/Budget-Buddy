import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";

export function useResource<T>(path: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<T[]>(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}
