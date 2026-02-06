'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mission-control-panels';

export interface PanelStates {
  agentPanel: boolean;
  activityFeed: boolean;
  todoDrawer: boolean;
}

const defaultStates: PanelStates = {
  agentPanel: false,
  activityFeed: false,
  todoDrawer: false,
};

export function usePanelCollapse() {
  const [collapsed, setCollapsed] = useState<PanelStates>(defaultStates);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCollapsed({ ...defaultStates, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.warn('Failed to load panel states:', e);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
      } catch (e) {
        console.warn('Failed to save panel states:', e);
      }
    }
  }, [collapsed, isHydrated]);

  const toggle = useCallback((panel: keyof PanelStates) => {
    setCollapsed(prev => ({ ...prev, [panel]: !prev[panel] }));
  }, []);

  const setPanel = useCallback((panel: keyof PanelStates, value: boolean) => {
    setCollapsed(prev => ({ ...prev, [panel]: value }));
  }, []);

  return {
    collapsed,
    toggle,
    setPanel,
    isHydrated,
  };
}
