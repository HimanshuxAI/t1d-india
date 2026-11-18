'use client';

import { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface CGMChartProps {
  series: Array<{
    time: string;
    glucose: number;
    trend?: number;
    trendArrow?: string;
  }>;
  timeRange: number; // hours
  stats?: {
    timeInRange: {
      veryLow: number;
      low: number;
      inRange: number;
      high: number;
      veryHigh: number;
    };
  } | null;
  isLoading: boolean;
}

const TARGET_LOW = 70;
const TARGET_HIGH = 180;
const VERY_LOW = 54;
const VERY_HIGH = 250;

export function CGMChart({ series, timeRange, stats, isLoading }: CGMChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || isLoading) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    drawChart(ctx, rect.width, rect.height);
  }, [series, timeRange, stats, isLoading]);

  const drawChart = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!series || series.length === 0) {
      // Draw empty state
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No glucose data available', width / 2, height / 2);
      return;
    }

    const padding = { top: 20, right: 40, bottom: 40, left: 50 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Data processing
    const data = series.filter(d => d.glucose > 0);
    if (data.length === 0) return;

    const glucoseValues = data.map(d => d.glucose);
    const minGlucose = Math.max(20, Math.min(...glucoseValues) - 20);
    const maxGlucose = Math.min(400, Math.max(...glucoseValues) + 20);

    // Time range
    const times = data.map(d => new Date(d.time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange_ms = maxTime - minTime || 1;

    // Scales
    const xScale = (time: number) => padding.left + ((time - minTime) / timeRange_ms) * plotWidth;
    const yScale = (glucose: number) => padding.top + plotHeight - ((glucose - minGlucose) / (maxGlucose - minGlucose)) * plotHeight;

    // Draw target range background
    const targetLowY = yScale(TARGET_LOW);
    const targetHighY = yScale(TARGET_HIGH);
    const veryLowY = yScale(VERY_LOW);
    const veryHighY = yScale(VERY_HIGH);

    // Very high zone
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(padding.left, padding.top, plotWidth, veryHighY - padding.top);

    // High zone
    ctx.fillStyle = 'rgba(249, 115, 22, 0.1)';
    ctx.fillRect(padding.left, targetHighY, plotWidth, veryHighY - targetHighY);

    // Target range
    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
    ctx.fillRect(padding.left, targetLowY, plotWidth, targetHighY - targetLowY);

    // Low zone
    ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
    ctx.fillRect(padding.left, veryLowY, plotWidth, targetLowY - veryLowY);

    // Very low zone
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(padding.left, veryLowY, plotWidth, padding.top + plotHeight - veryLowY);

    // Target lines
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    [TARGET_HIGH, TARGET_LOW].forEach(g => {
      const y = yScale(g);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    });

    ctx.setLineDash([]);

    // Very low/high lines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    [VERY_HIGH, VERY_LOW].forEach(g => {
      const y = yScale(g);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    });

    // Draw glucose line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    data.forEach((point, i) => {
      const x = xScale(new Date(point.time).getTime());
      const y = yScale(point.glucose);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Color segments based on glucose value
    data.forEach((point, i) => {
      if (i === data.length - 1) return;
      const next = data[i + 1];
      const x1 = xScale(new Date(point.time).getTime());
      const y1 = yScale(point.glucose);
      const x2 = xScale(new Date(next.time).getTime());
      const y2 = yScale(next.glucose);

      let color = '#22c55e'; // in range
      if (point.glucose < VERY_LOW || next.glucose < VERY_LOW) color = '#ef4444';
      else if (point.glucose < TARGET_LOW || next.glucose < TARGET_LOW) color = '#f59e0b';
      else if (point.glucose > VERY_HIGH || next.glucose > VERY_HIGH) color = '#ef4444';
      else if (point.glucose > TARGET_HIGH || next.glucose > TARGET_HIGH) color = '#f97316';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Current glucose point
    if (data.length > 0) {
      const last = data[data.length - 1];
      const x = xScale(new Date(last.time).getTime());
      const y = yScale(last.glucose);

      // Pulse animation
      const time = Date.now() / 1000;
      const pulseRadius = 8 + Math.sin(time * 3) * 2;

      ctx.fillStyle = '#22c55e';
      if (last.glucose < VERY_LOW) ctx.fillStyle = '#ef4444';
      else if (last.glucose < TARGET_LOW) ctx.fillStyle = '#f59e0b';
      else if (last.glucose > VERY_HIGH) ctx.fillStyle = '#ef4444';
      else if (last.glucose > TARGET_HIGH) ctx.fillStyle = '#f97316';

      ctx.beginPath();
      ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      // White center
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // X-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';

    const numXTicks = Math.min(6, data.length);
    for (let i = 0; i < numXTicks; i++) {
      const idx = Math.floor((i / (numXTicks - 1)) * (data.length - 1));
      const point = data[idx];
      const x = xScale(new Date(point.time).getTime());
      const date = new Date(point.time);
      const label = timeRange <= 12
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      ctx.fillText(label, x, height - padding.bottom + 18);
    }

    // Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';

    const yTicks = [minGlucose, TARGET_LOW, TARGET_HIGH, maxGlucose].filter((v, i, arr) => arr.indexOf(v) === i);
    yTicks.forEach(g => {
      const y = yScale(g);
      ctx.fillText(`${g}`, padding.left - 8, y + 4);
    });

    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Glucose (mg/dL)', 0, 0);
    ctx.restore();
  };

  return (
    <div className="relative" ref={containerRef}>
      <canvas ref={canvasRef} className="w-full h-[400px]" />
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
        </div>
      )}
    </div>
  );
}