// CGM Data Alignment Utilities
// Align CGM readings to 5-minute grid, interpolate gaps, compute derived features

import { roundTo5Min, generate5MinIntervals, minutesBetween } from '@t1d-india/shared';

export interface CGMReadingRaw {
  time: Date;
  glucoseMgDl: number;
  trend?: number;
  trendArrow?: string;
  source?: string;
  deviceTimestamp?: Date;
}

export interface CGMReadingAligned {
  time: Date;
  glucoseMgDl: number;
  trend: number;
  trendArrow: string;
  roc: number;           // Rate of change (mg/dL/min)
  roc5minAgo: number;
  isValid: boolean;
  interpolated: boolean;
}

/**
 * Align CGM readings to 5-minute grid with interpolation
 */
export function alignCGMReadings(
  readings: CGMReadingRaw[],
  maxGapMin: number = 15
): CGMReadingAligned[] {
  if (readings.length === 0) return [];

  // Sort by time
  const sorted = [...readings].sort((a, b) => a.time.getTime() - b.time.getTime());

  // Round timestamps to 5-min grid
  const rounded = sorted.map(r => ({
    ...r,
    time: roundTo5Min(r.time),
  }));

  // Remove duplicates (keep latest)
  const unique = new Map<string, CGMReadingRaw>();
  for (const r of rounded) {
    const key = r.time.toISOString();
    if (!unique.has(key) || r.deviceTimestamp && r.deviceTimestamp > (unique.get(key)?.deviceTimestamp || new Date(0))) {
      unique.set(key, r);
    }
  }

  const deduped = Array.from(unique.values()).sort((a, b) => a.time.getTime() - b.time.getTime());

  if (deduped.length === 0) return [];

  // Generate full 5-min grid
  const startTime = deduped[0].time;
  const endTime = deduped[deduped.length - 1].time;
  const grid = generate5MinIntervals(startTime, endTime);

  // Map readings to grid
  const readingMap = new Map<string, CGMReadingRaw>();
  for (const r of deduped) {
    readingMap.set(r.time.toISOString(), r);
  }

  // Interpolate missing values
  const aligned: CGMReadingAligned[] = [];
  let lastValidGlucose: number | null = null;
  let lastValidTime: Date | null = null;
  let gapCount = 0;

  for (const gridTime of grid) {
    const key = gridTime.toISOString();
    const reading = readingMap.get(key);

    if (reading) {
      // Valid reading
      const glucose = reading.glucoseMgDl;
      let roc = 0;

      if (lastValidGlucose !== null && lastValidTime !== null) {
        const minutes = minutesBetween(lastValidTime, gridTime);
        if (minutes > 0) {
          roc = (glucose - lastValidGlucose) / minutes;
        }
      }

      aligned.push({
        time: gridTime,
        glucoseMgDl: glucose,
        trend: reading.trend ?? 0,
        trendArrow: reading.trendArrow ?? '→',
        roc,
        roc5minAgo: 0, // Will be filled in second pass
        isValid: true,
        interpolated: false,
      });

      lastValidGlucose = glucose;
      lastValidTime = gridTime;
      gapCount = 0;
    } else if (lastValidGlucose !== null && gapCount < maxGapMin / 5) {
      // Interpolate
      gapCount++;
      // Linear interpolation would need next valid reading
      // For now, carry forward last valid (conservative)
      aligned.push({
        time: gridTime,
        glucoseMgDl: lastValidGlucose,
        trend: 0,
        trendArrow: '→',
        roc: 0,
        roc5minAgo: 0,
        isValid: false,
        interpolated: true,
      });
    } else {
      // Gap too large - mark as invalid
      aligned.push({
        time: gridTime,
        glucoseMgDl: 0,
        trend: 0,
        trendArrow: '?',
        roc: 0,
        roc5minAgo: 0,
        isValid: false,
        interpolated: false,
      });
      gapCount = 0;
      lastValidGlucose = null;
      lastValidTime = null;
    }
  }

  // Second pass: compute roc5minAgo
  for (let i = 1; i < aligned.length; i++) {
    aligned[i].roc5minAgo = aligned[i - 1].roc;
  }

  return aligned;
}

/**
 * Compute CGM-derived features for ML model input
 */
export function computeCGMFeatures(aligned: CGMReadingAligned[]): {
  glucose: number[];
  roc: number[];
  roc5minAgo: number[];
} {
  const validReadings = aligned.filter(r => r.isValid);

  // Take last 6 readings (30 min)
  const recent = validReadings.slice(-6);

  // Pad if needed
  const padLength = 6 - recent.length;
  const padding = Array(padLength).fill(0);

  return {
    glucose: [...padding, ...recent.map(r => r.glucoseMgDl)],
    roc: [...padding, ...recent.map(r => r.roc)],
    roc5minAgo: [...padding, ...recent.map(r => r.roc5minAgo)],
  };
}

/**
 * Validate CGM reading
 */
export function validateCGMReading(reading: CGMReadingRaw): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!reading.time || isNaN(reading.time.getTime())) {
    errors.push('Invalid timestamp');
  }

  if (typeof reading.glucoseMgDl !== 'number' || !Number.isInteger(reading.glucoseMgDl)) {
    errors.push('Glucose must be integer');
  } else if (reading.glucoseMgDl < 20 || reading.glucoseMgDl > 400) {
    errors.push('Glucose out of range (20-400 mg/dL)');
  }

  if (reading.trend !== undefined && (reading.trend < -3 || reading.trend > 3)) {
    errors.push('Trend must be between -3 and 3');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Batch validate and align CGM readings
 */
export function processCGMBatch(
  readings: CGMReadingRaw[],
  maxGapMin: number = 15
): {
  aligned: CGMReadingAligned[];
  accepted: number;
  rejected: number;
  errors: Array<{ index: number; code: string; message: string }>;
} {
  const errors: Array<{ index: number; code: string; message: string }> = [];
  const validReadings: CGMReadingRaw[] = [];

  for (let i = 0; i < readings.length; i++) {
    const validation = validateCGMReading(readings[i]);
    if (validation.valid) {
      validReadings.push(readings[i]);
    } else {
      errors.push({
        index: i,
        code: 'VALIDATION_ERROR',
        message: validation.errors.join(', '),
      });
    }
  }

  const aligned = alignCGMReadings(validReadings, maxGapMin);

  return {
    aligned,
    accepted: validReadings.length,
    rejected: errors.length,
    errors,
  };
}

/**
 * Get latest valid CGM reading
 */
export function getLatestValidCGM(aligned: CGMReadingAligned[]): CGMReadingAligned | null {
  for (let i = aligned.length - 1; i >= 0; i--) {
    if (aligned[i].isValid) {
      return aligned[i];
    }
  }
  return null;
}

/**
 * Check if CGM data is stale
 */
export function isCGMStale(latest: CGMReadingAligned | null, thresholdMin: number = 10): boolean {
  if (!latest) return true;
  const ageMin = minutesBetween(latest.time, new Date());
  return ageMin > thresholdMin;
}