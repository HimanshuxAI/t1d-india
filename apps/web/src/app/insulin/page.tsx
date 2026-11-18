'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { InsulinCalculatorCard } from '@/components/insulin/insulin-calculator-card';
import { InsulinHistory } from '@/components/insulin/insulin-history';
import { InsulinSummary } from '@/components/insulin/insulin-summary';
import { Syringe, Droplet, Pill, Calendar, Clock, BarChart2, Plus, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InsulinPage() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'history' | 'summary'>('calculator');
  const [currentGlucose, setCurrentGlucose] = useState<number | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Insulin</h1>
            <p className="text-muted-foreground">Calculate doses, log injections, track patterns</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button className="btn-outline">
              <Calendar className="w-4 h-4 mr-2" />
              Daily Summary
            </button>
          </div>
        </div>

        {/* Current glucose input */}
        <div className="card">
          <div className="card-content pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                  <Syringe className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Glucose</p>
                  <div className="flex items-baseline gap-2">
                    <input
                      type="number"
                      value={currentGlucose || ''}
                      onChange={(e) => setCurrentGlucose(e.target.value ? Number(e.target.value) : null)}
                      placeholder="mg/dL"
                      className="w-24 text-2xl font-bold bg-transparent border-none focus:ring-0 text-right"
                      min="20"
                      max="400"
                    />
                    <span className="text-muted-foreground">mg/dL</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Last updated: {currentGlucose ? 'Just now' : 'Not set'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { id: 'calculator', label: 'Calculator', icon: Syringe },
            { id: 'history', label: 'History', icon: Clock },
            { id: 'summary', label: 'Daily Summary', icon: BarChart2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="animate-fade-in">
          {activeTab === 'calculator' && (
            <InsulinCalculatorCard currentGlucose={currentGlucose} />
          )}
          {activeTab === 'history' && (
            <InsulinHistory />
          )}
          {activeTab === 'summary' && (
            <InsulinSummary />
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 text-left transition-colors">
                <Droplet className="w-5 h-5 text-primary-600 dark:text-primary-400 mb-2" />
                <p className="font-medium">Log Rapid Insulin</p>
                <p className="text-sm text-muted-foreground">Meal bolus / correction</p>
              </button>
              <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 text-left transition-colors">
                <Pill className="w-5 h-5 text-primary-600 dark:text-primary-400 mb-2" />
                <p className="font-medium">Log Regular/NPH</p>
                <p className="text-sm text-muted-foreground">Basal / scheduled dose</p>
              </button>
              <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 text-left transition-colors">
                <Syringe className="w-5 h-5 text-primary-600 dark:text-primary-400 mb-2" />
                <p className="font-medium">Log Basal</p>
                <p className="text-sm text-muted-foreground">Glargine / Degludec</p>
              </button>
              <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 text-left transition-colors">
                <Plus className="w-5 h-5 text-primary-600 dark:text-primary-400 mb-2" />
                <p className="font-medium">Custom Entry</p>
                <p className="text-sm text-muted-foreground">Any insulin type</p>
              </button>
            </div>
          </div>
        </div>

        {/* Regimen info */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Regimen</h3>
            <p className="card-description">Configured in Profile → Insulin Settings</p>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <RegimenCard
                title="Basal-Bolus"
                description="Rapid-acting + Long-acting (Glargine/Degludec)"
                icon={Syringe}
                color="blue"
                items={[
                  { label: 'ICR', value: '10 g/U' },
                  { label: 'ISF', value: '50 mg/dL/U' },
                  { label: 'Target', value: '110 mg/dL' },
                ]}
              />
              <RegimenCard
                title="NPH + Regular"
                description="Human insulin, 2-3 injections/day"
                icon={Pill}
                color="orange"
                items={[
                  { label: 'NPH Morning', value: '16 U' },
                  { label: 'NPH Evening', value: '12 U' },
                  { label: 'Regular Meals', value: 'Per meal' },
                ]}
              />
              <RegimenCard
                title="Pump Therapy"
                description="Continuous subcutaneous insulin infusion"
                icon={Syringe}
                color="green"
                items={[
                  { label: 'Basal Rate', value: '0.8 U/hr' },
                  { label: 'ICR', value: '10 g/U' },
                  { label: 'ISF', value: '50 mg/dL/U' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function RegimenCard({ title, description, icon: Icon, color, items }: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: { label: string; value: string }[];
}) {
  const colorMap = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  };

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className={cn('p-3 rounded-xl', colorMap[color as keyof typeof colorMap] || colorMap.blue)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}