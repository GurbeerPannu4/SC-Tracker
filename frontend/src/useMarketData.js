import { useCallback, useEffect, useRef, useState } from "react";

const REFRESH_MS = 60_000; // matches the backend cache, so asking more often gains nothing

/**
 * Loads a list from the backend and keeps it fresh.
 * Only polls while `active` is true, so a hidden tab doesn't use up API quota.
 */
export default function useMarketData(path, active) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [errorDetail, setErrorDetail] = useState(""); // the backend's own explanation, if it gave one
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  // Fetch the list. On a failed refresh we keep showing the old data.
  const load = useCallback(async () => {
    if (inFlight.current) return; // never run two requests at once
    inFlight.current = true;
    setRefreshing(true);
    try {
      const res = await fetch(path);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const error = new Error(`HTTP ${res.status}`);
        error.detail = body?.detail ?? "";
        throw error;
      }
      setItems(await res.json());
      setStatus("ready");
      setUpdatedAt(new Date());
      setRefreshFailed(false);
      setErrorDetail("");
    } catch (error) {
      setRefreshFailed(true);
      setErrorDetail(error.detail ?? "");
      setStatus((current) => (current === "loading" ? "error" : current));
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, [path]);

  // Load when this tab becomes active, then every minute. Skip while the browser tab is hidden.
  useEffect(() => {
    if (!active) return undefined;
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, REFRESH_MS);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, load]);

  return { items, status, errorDetail, updatedAt, refreshFailed, refreshing, reload: load };
}