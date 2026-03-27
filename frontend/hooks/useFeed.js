"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getFeed } from "../lib/api";

export function useFeed({ coin, minNotional = 5000, pollMs = 6000 } = {}) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCount, setNewCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const seenIds = useRef(new Set());
  const timer = useRef(null);

  const fetchOnce = useCallback(async (reset = false) => {
    try {
      const res = await getFeed({ limit: 80, coin, minNotional });
      const incoming = res.data || [];
      if (reset) {
        seenIds.current = new Set(incoming.map((t) => t.id));
        setTrades(incoming);
        setNewCount(0);
      } else {
        const fresh = incoming.filter((t) => !seenIds.current.has(t.id));
        fresh.forEach((t) => seenIds.current.add(t.id));
        if (fresh.length) {
          setNewCount((n) => n + fresh.length);
          setTrades((prev) => [...fresh, ...prev].slice(0, 400));
        }
      }
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [coin, minNotional]);

  // Reset on filter change
  useEffect(() => {
    setLoading(true);
    setTrades([]);
    seenIds.current = new Set();
    fetchOnce(true);
  }, [fetchOnce]);

  // Polling
  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(() => fetchOnce(false), pollMs);
    return () => clearInterval(timer.current);
  }, [fetchOnce, pollMs, paused]);

  const flush = useCallback(() => setNewCount(0), []);

  return { trades, loading, error, newCount, paused, setPaused, flush };
}
