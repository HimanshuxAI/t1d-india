'use client';

import { useQuery } from '@tanstack/react-query';

interface HypoPrediction {
  horizonMin: number;
  glucoseP10: number;
  glucoseP50: number;
  glucoseP90: number;
  hypoProbability: number;
  severeHypoProbability: number;
  topFeatures: Array<{ feature: string; contribution: number }>;
  predictedAt: string;
  modelVersion: string;
}

interface HypoPredictionResponse {
  predictions: HypoPrediction[];
}

async function fetchHypoPredictions(): Promise<HypoPredictionResponse> {
  const response = await fetch('/api/v1/predictions/hypo/latest');
  if (!response.ok) throw new Error('Failed to fetch predictions');
  return response.json();
}

async function fetchHypoHistory(hours = 24): Promise<HypoPrediction[]> {
  const response = await fetch(`/api/v1/predictions/hypo/history?hours=${hours}`);
  if (!response.ok) throw new Error('Failed to fetch prediction history');
  return response.json();
}

export function useHypoPredictions() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['hypo', 'predictions'],
    queryFn: fetchHypoPredictions,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000,
  });

  return {
    predictions: data?.predictions ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useHypoHistory(hours = 24) {
  return useQuery({
    queryKey: ['hypo', 'history', hours],
    queryFn: () => fetchHypoHistory(hours),
    refetchInterval: 300000, // 5 minutes
    staleTime: 60000,
  });
}

export function useHypoAlert() {
  const { predictions } = useHypoPredictions();
  
  // Get the most urgent active alert
  const activeAlert = predictions
    .filter(p => p.hypoProbability > 0.2)
    .sort((a, b) => b.hypoProbability - a.hypoProbability)[0];

  const getAlertLevel = (prediction: typeof activeAlert) => {
    if (!prediction) return null;
    if (prediction.severeHypoProbability > 0.3) return 'emergency';
    if (prediction.hypoProbability > 0.5) return 'urgent';
    return 'warning';
  };

  return {
    activeAlert,
    alertLevel: activeAlert ? getAlertLevel(activeAlert) : null,
    shouldAlert: activeAlert !== undefined,
  };
}

// Hook for triggering manual prediction
export function useTriggerPrediction() {
  return useQuery({
    queryKey: ['hypo', 'trigger'],
    queryFn: async () => {
      const response = await fetch('/api/v1/predictions/hypo/trigger', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to trigger prediction');
      return response.json();
    },
    enabled: false, // Only run when manually triggered
  });
}