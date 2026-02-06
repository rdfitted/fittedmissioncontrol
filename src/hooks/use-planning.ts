import { useState, useEffect, useCallback } from 'react';

export interface PlanningSession {
  date: string;
  filename: string;
  title?: string;
}

export interface PlanningSessionDetail extends PlanningSession {
  content: string;
}

export interface Navigation {
  prev: string | null;
  next: string | null;
}

export function usePlanningSessions() {
  const [sessions, setSessions] = useState<PlanningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/planning');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data.sessions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, error, refresh };
}

export function usePlanningSession(date: string | null) {
  const [session, setSession] = useState<PlanningSessionDetail | null>(null);
  const [navigation, setNavigation] = useState<Navigation>({ prev: null, next: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async (targetDate: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/planning/${targetDate}`);
      if (!res.ok) {
        if (res.status === 404) {
          setSession(null);
          setError(`No session found for ${targetDate}`);
          return;
        }
        throw new Error('Failed to fetch session');
      }
      const data = await res.json();
      setSession(data.session);
      setNavigation(data.navigation);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (date) {
      fetchSession(date);
    } else {
      setSession(null);
    }
  }, [date, fetchSession]);

  return { session, navigation, loading, error };
}
