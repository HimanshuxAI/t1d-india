import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatGlucose(mgDl: number): string {
  return `${mgDl} mg/dL`;
}

export function formatInsulin(units: number): string {
  return `${units.toFixed(1)} U`;
}

export function formatCarbs(grams: number): string {
  return `${Math.round(grams)} g`;
}

export function formatTimeAgo(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export function getGlucoseColor(value: number): string {
  if (value < 54) return 'text-red-600';
  if (value < 70) return 'text-yellow-600';
  if (value > 250) return 'text-red-600';
  if (value > 180) return 'text-orange-600';
  return 'text-green-600';
}

export function getGlucoseBgColor(value: number): string {
  if (value < 54) return 'bg-red-500';
  if (value < 70) return 'bg-yellow-500';
  if (value > 250) return 'bg-red-500';
  if (value > 180) return 'bg-orange-500';
  return 'bg-green-500';
}

export function getTrendArrow(trend: number | null): string {
  if (trend === null) return '—';
  if (trend >= 3) return '↑↑';
  if (trend >= 2) return '↑';
  if (trend >= 1) return '↗';
  if (trend <= -3) return '↓↓';
  if (trend <= -2) return '↓';
  if (trend <= -1) return '↘';
  return '→';
}

export function getTrendColor(trend: number | null): string {
  if (trend === null) return 'text-gray-500';
  if (trend > 0) return 'text-green-600';
  if (trend < 0) return 'text-red-600';
  return 'text-gray-500';
}

export function getMealTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'breakfast': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'lunch': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'dinner': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'snack': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

export function getInputMethodLabel(method: string): string {
  switch (method) {
    case 'PHOTO_ML': return 'Photo';
    case 'PHOTO_OCR': return 'OCR Scan';
    case 'VOICE': return 'Voice';
    case 'COMPOSITE_SELECT': return 'Plate';
    case 'BARCODE': return 'Barcode';
    default: return 'Manual';
  }
}

export function getInputMethodIcon(method: string): string {
  switch (method) {
    case 'PHOTO_ML': return 'Photo';
    case 'PHOTO_OCR': return 'Scan';
    case 'VOICE': return 'Voice';
    case 'COMPOSITE_SELECT': return 'Plate';
    case 'BARCODE': return 'Barcode';
    default: return 'Manual';
  }
}

export function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function formatNumber(num: number, decimals = 1): string {
  if (num >= 1000000) return (num / 1000000).toFixed(decimals) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(decimals) + 'K';
  return num.toFixed(decimals);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^(\+91|91|0)?[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));
}

export function getGlycemicCategory(gi: number | null): { label: string; color: string } | null {
  if (gi === null) return null;
  if (gi <= 55) return { label: 'Low', color: 'text-green-600' };
  if (gi <= 69) return { label: 'Medium', color: 'text-yellow-600' };
  return { label: 'High', color: 'text-red-600' };
}