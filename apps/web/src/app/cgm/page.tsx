'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { GlucoseCard } from '@/components/cgm/glucose-card';
import { HypoAlertBanner } from '@/components/cgm/hypo-alert-banner';
import { CGMChart } from '@/components/cgm/cgm-chart';
import { CGMStats } from '@/components/cgm/cgm-stats';
import { CGMUpload } from '@/components/cgm/cgm-upload';
import { useCGM } from '@/hooks/use-cgm';
import { useHypoPredictions } from '@/hooks/use-hypo-predictions';
import { Activity, Download, Settings, Bluetooth, Wifi, WifiOff, AlertTriangle, CheckCircle, Radio, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CGMPage() {
  const { currentGlucose, trend, trendArrow, stats, series, isLoading, error, refetch } = useCGM(24);
  const { predictions, isLoading: predLoading } = useHypoPredictions();
  const [timeRange, setTimeRange] = useState<'3h' | '6h' | '12h' | '24h' | '7d'>('24h');
  const [showUpload, setShowUpload] = useState(false);

  const hoursMap = { '3h': 3, '6h': 6, '12h': 12, '24h': 24, '7d': 168 };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-black text-[#231F2B] dark:text-[#F3EEE4]">
              CGM & Hypo Monitor
            </h1>
            <p className="text-sm text-[#5C5665] dark:text-[#8C8496]">
              Continuous glucose streaming & 30–60 min predictive horizons
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpload(true)}
              className="btn-outline text-xs"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Sensor Settings
            </button>
            <button onClick={() => refetch()} className="btn-outline text-xs">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              Sync Stream
            </button>
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10 dark:border-white/10 shadow-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2E8B57]" />
          <div>
            <p className="font-serif font-bold text-sm text-[#231F2B] dark:text-[#F3EEE4]">
              Dexcom G6 Telemetry Link Active
            </p>
            <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
              Continuous 5-minute sampling paired via Bluetooth · Sensor life: 7 days remaining
            </p>
          </div>
          <div className="flex-1" />
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#FAF4E8] dark:bg-[#16131C] text-[#2E8B57] border border-[#2E8B57]/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E8B57]" />
            Continuous
          </span>
        </div>

        {/* Hypo alerts */}
        <HypoAlertBanner predictions={predictions} />

        {/* Current glucose card */}
        <GlucoseCard
          glucose={currentGlucose}
          trend={trend}
          trendArrow={trendArrow}
          stats={stats}
          isLoading={isLoading}
        />

        {/* Time range tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { id: '3h', label: '3H' },
            { id: '6h', label: '6H' },
            { id: '12h', label: '12H' },
            { id: '24h', label: '24H' },
            { id: '7d', label: '7D' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                timeRange === tab.id
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Glucose Trend</h3>
            <p className="card-description">
              {timeRange === '7d' ? 'Last 7 days' : `Last ${timeRange}`}
            </p>
          </div>
          <div className="card-content">
            <CGMChart
              series={series}
              timeRange={hoursMap[timeRange]}
              stats={stats}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Average"
              value={stats.avgGlucose}
              unit="mg/dL"
              icon={Activity}
              color="primary"
            />
            <StatCard
              label="GMI"
              value={stats.gmi}
              unit="%"
              icon={Activity}
              color="secondary"
            />
            <StatCard
              label="Variability (CV)"
              value={stats.cv}
              unit="%"
              icon={Activity}
              color="warning"
            />
            <StatCard
              label="Time in Range"
              value={stats.timeInRange.inRange}
              unit="%"
              icon={Activity}
              color="green"
              subtitle={`${stats.timeInRange.veryLow + stats.timeInRange.low}% low • ${stats.timeInRange.high + stats.timeInRange.veryHigh}% high`}
            />
          </div>
        )}

        {/* Time in Range breakdown */}
        {stats && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Time in Range (24h)</h3>
            </div>
            <div className="card-content">
              <div className="space-y-3">
                <TIRBar label="Very Low" value={stats.timeInRange.veryLow} color="bg-red-500" threshold="<54 mg/dL" />
                <TIRBar label="Low" value={stats.timeInRange.low} color="bg-yellow-500" threshold="54-70 mg/dL" />
                <TIRBar label="In Range" value={stats.timeInRange.inRange} color="bg-green-500" threshold="70-180 mg/dL" />
                <TIRBar label="High" value={stats.timeInRange.high} color="bg-orange-500" threshold="180-250 mg/dL" />
                <TIRBar label="Very High" value={stats.timeInRange.veryHigh} color="bg-red-600" threshold=">250 mg/dL" />
              </div>
            </div>
          </div>
        )}

        {/* Predictions */}
        {predictions.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Hypo Predictions</h3>
            </div>
            <div className="card-content">
              <div className="space-y-3">
                {predictions.map((pred) => (
                  <PredictionRow key={pred.horizonMin} pred={pred} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CGM Upload Modal */}
        {showUpload && (
          <CGMUploadModal
            onClose={() => setShowUpload(false)}
            onSuccess={() => { setShowUpload(false); refetch(); }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, unit, icon: Icon, color, subtitle }: {
  label: string;
  value: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}) {
  const colorMap = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
    secondary: 'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  };

  return (
    <div className="card">
      <div className="card-content pt-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold">{value}</span>
              <span className="text-muted-foreground">{unit}</span>
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn('p-3 rounded-xl', colorMap[color as keyof typeof colorMap] || colorMap.primary)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TIRBar({ label, value, color, threshold }: {
  label: string;
  value: number;
  color: string;
  threshold: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">{label}</span>
        <span className="font-bold">{value.toFixed(1)}%</span>
      </div>
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color.replace('bg-', 'bg-') }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{threshold}</p>
    </div>
  );
}

function PredictionRow({ pred }: { pred: any }) {
  const isUrgent = pred.hypoProbability > 0.5 || pred.severeHypoProbability > 0.3;
  const isSevere = pred.severeHypoProbability > 0.3;

  return (
    <div className={cn(
      'p-3 rounded-lg border',
      isSevere ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
      isUrgent ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' :
      'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            isSevere ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
            isUrgent ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
          )}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium">
              {pred.horizonMin} min prediction
            </p>
            <p className="text-sm text-muted-foreground">
              {pred.glucoseP10}–{pred.glucoseP90} mg/dL (median: {pred.glucoseP50})
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn('text-2xl font-bold',
            isSevere ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-yellow-600'
          )}>
            {Math.round(pred.hypoProbability * 100)}%
          </p>
          <p className="text-xs text-muted-foreground">Hypo risk</p>
          {pred.severeHypoProbability > 0.1 && (
            <p className="text-xs text-red-600">
              Severe: {Math.round(pred.severeHypoProbability * 100)}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CGMUploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [method, setMethod] = useState<'dexcom' | 'libre' | 'medtronic' | 'manual' | 'bluetooth'>('dexcom');
  const [isConnecting, setIsConnecting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Connect CGM</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose your CGM device to sync glucose data automatically
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'dexcom', label: 'Dexcom G6/G7', icon: Smartphone, color: 'blue' },
              { id: 'libre', label: 'FreeStyle Libre 2/3', icon: Smartphone, color: 'purple' },
              { id: 'medtronic', label: 'Medtronic Guardian', icon: Smartphone, color: 'red' },
              { id: 'bluetooth', label: 'Bluetooth (Direct)', icon: Radio, color: 'green' },
            ].map((opt) => {
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => setMethod(opt.id as any)}
                  className={cn(
                    'p-4 rounded-lg border-2 text-center transition-colors flex flex-col items-center justify-center gap-2',
                    method === opt.id
                      ? 'border-[#2A3F8F] bg-[#2A3F8F]/10 dark:bg-[#7F93E6]/20'
                      : 'border-[#231F2B]/15 dark:border-[#F3EEE4]/15 hover:border-[#2A3F8F]/40'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-[#221E2B] border border-[#231F2B]/10 flex items-center justify-center text-[#2A3F8F] dark:text-[#7F93E6]">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="font-medium text-sm text-[#231F2B] dark:text-[#F3EEE4]">{opt.label}</div>
                </button>
              );
            })}
          </div>

          <div className="pt-4">
            {method === 'bluetooth' ? (
              <button
                onClick={async () => {
                  setIsConnecting(true);
                  // Web Bluetooth API would go here
                  setTimeout(() => { setIsConnecting(false); toast.error('Requires browser with Web Bluetooth'); }, 1000);
                }}
                disabled={isConnecting}
                className="w-full btn-primary"
              >
                {isConnecting ? 'Scanning...' : 'Scan for Device'}
              </button>
            ) : (
              <button
                onClick={async () => {
                  setIsConnecting(true);
                  // OAuth flow would start here
                  setTimeout(() => { setIsConnecting(false); onClose(); onSuccess(); }, 1000);
                }}
                disabled={isConnecting}
                className="w-full btn-primary"
              >
                {isConnecting ? 'Connecting...' : `Connect ${method.charAt(0).toUpperCase() + method.slice(1)}`}
              </button>
            )}

            <button onClick={onClose} className="w-full btn-outline mt-2">
              Manual Upload Instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}