'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface CGMReading {
  time: string;
  glucoseMgDl: number;
  trend: number;
  trendArrow: string;
  isValid: boolean;
  source: string;
}

interface CGMStats {
  avgGlucose: number;
  gmi: number;
  cv: number;
  timeInRange: {
    veryLow: number;
    low: number;
    inRange: number;
    high: number;
    veryHigh: number;
  };
}

interface CGMData {
  current: CGMReading | null;
  stats: CGMStats | null;
  series: Array<{
    time: string;
    glucose: number;
    trend: number;
    trendArrow: string;
  }>;
}

async function fetchCGMData(hours = 24): Promise<CGMData> {
  const response = await fetch(`/api/v1/cgm/stats?hours=${hours}`);
  if (!response.ok) throw new Error('Failed to fetch CGM data');
  return response.json();
}

async function fetchLatestCGM(): Promise<CGMReading | null> {
  const response = await fetch('/api/v1/cgm/latest');
  if (!response.ok) return null;
  return response.json();
}

export function useCGM(hours = 24) {
  const queryClient = useQueryClient();
  const [realtimeGlucose, setRealtimeGlucose] = useState<CGMReading | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cgm', hours],
    queryFn: () => fetchCGMData(hours),
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000,
  });

  // Real-time latest reading
  useQuery({
    queryKey: ['cgm', 'latest'],
    queryFn: fetchLatestCGM,
    refetchInterval: 15000, // 15 seconds
    onSuccess: (data) => {
      if (data) setRealtimeGlucose(data);
    },
  });

  // WebSocket for real-time updates (if available)
  useEffect(() => {
    // In production, connect to WebSocket for real-time CGM updates
    // const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/cgm`);
    // ws.onmessage = (event) => {
    //   const reading = JSON.parse(event.data);
    //   setRealtimeGlucose(reading);
    //   queryClient.invalidateQueries({ queryKey: ['cgm'] });
    // };
    // return () => ws.close();
  }, [queryClient]);

  const currentGlucose = realtimeGlucose?.glucoseMgDl ?? data?.current?.glucoseMgDl ?? null;
  const trend = realtimeGlucose?.trend ?? data?.current?.trend ?? null;
  const trendArrow = realtimeGlucose?.trendArrow ?? data?.current?.trendArrow ?? null;

  return {
    currentGlucose,
    trend,
    trendArrow,
    stats: data?.stats ?? null,
    series: data?.series ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useCGMRealtime() {
  const [reading, setReading] = useState<CGMReading | null>(null);

  useQuery({
    queryKey: ['cgm', 'latest'],
    queryFn: fetchLatestCGM,
    refetchInterval: 10000,
    onSuccess: (data) => {
      if (data) setReading(data);
    },
  });

  return reading;
}

// Mutation for batch CGM upload
export function useUploadCGM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (readings: Array<{
      time: string;
      glucoseMgDl: number;
      trend?: number;
      trendArrow?: string;
      source: string;
    }>) => {
      const response = await fetch('/api/v1/cgm/readings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readings }),
      });
      if (!response.ok) throw new Error('Failed to upload CGM readings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cgm'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';