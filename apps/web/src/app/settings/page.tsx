'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { cn } from '@/lib/utils';
import {
  Bell, Shield, Globe, Palette, Moon, Sun, Monitor,
  Download, Upload, Trash2, Key, Smartphone, Desktop,
  Save, Loader2, CheckCircle, AlertCircle, Eye, EyeOff,
  Wifi, WifiOff, Battery, BatteryLow, Volume2, VolumeX
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'appearance' | 'data' | 'security' | 'about'>('general');
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState({
    // General
    language: 'en',
    timezone: 'Asia/Kolkata',
    units: 'metric',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    // Notifications
    pushEnabled: true,
    emailEnabled: false,
    hypoAlerts: true,
    hyperAlerts: true,
    mealReminders: true,
    insulinReminders: true,
    weeklyReport: true,
    // Appearance
    theme: 'system',
    compactMode: false,
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    // Data
    autoSync: true,
    syncFrequency: '15min',
    dataRetention: '1year',
    exportFormat: 'json',
    // Security
    biometricEnabled: false,
    sessionTimeout: '30min',
    twoFactorEnabled: false,
    // About
    version: '0.0.1',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage for demo
      localStorage.setItem('t1d-settings', JSON.stringify(settings));
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `t1d-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setSettings(prev => ({ ...prev, ...imported }));
        toast.success('Settings imported!');
      } catch {
        toast.error('Invalid settings file');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      setSettings({
        language: 'en',
        timezone: 'Asia/Kolkata',
        units: 'metric',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        pushEnabled: true,
        emailEnabled: false,
        hypoAlerts: true,
        hyperAlerts: true,
        mealReminders: true,
        insulinReminders: true,
        weeklyReport: true,
        theme: 'system',
        compactMode: false,
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        autoSync: true,
        syncFrequency: '15min',
        dataRetention: '1year',
        exportFormat: 'json',
        biometricEnabled: false,
        sessionTimeout: '30min',
        twoFactorEnabled: false,
        version: '0.0.1',
      });
      toast.success('Settings reset to defaults');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-muted-foreground">Customize your T1D India experience</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="btn-outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <label className="btn-outline cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Import
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={handleReset} className="btn-outline text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="w-4 h-4 mr-2" />
              Reset
            </button>
            <button onClick={handleSave} disabled={isSaving} className="btn-primary">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'general', label: 'General', icon: Globe },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'data', label: 'Data & Sync', icon: Wifi },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'about', label: 'About', icon: Smartphone },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
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
          {activeTab === 'general' && <GeneralSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'notifications' && <NotificationSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'appearance' && <AppearanceSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'data' && <DataSettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'security' && <SecuritySettings settings={settings} setSettings={setSettings} />}
          {activeTab === 'about' && <AboutSettings />}
        </div>
      </div>
    </DashboardLayout>
  );
}

function GeneralSettings({ settings, setSettings }: { settings: any; setSettings: (s: any) => void }) {
  const handleChange = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Language & Region</h3>
        </div>
        <div className="card-content space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select value={settings.language} onChange={e => handleChange('language', e.target.value)} className="input">
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
                <option value="bn">বাংলা (Bengali)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select value={settings.timezone} onChange={e => handleChange('timezone', e.target.value)} className="input">
                <option value="Asia/Kolkata">India (UTC+5:30)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">US Eastern</option>
                <option value="America/Los_Angeles">US Pacific</option>
                <option value="Europe/London">UK</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Units</label>
              <select value={settings.units} onChange={e => handleChange('units', e.target.value)} className="input">
                <option value="metric">Metric (mg/dL, kg, cm)</option>
                <option value="imperial">Imperial (mg/dL, lbs, in)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date Format</label>
              <select value={settings.dateFormat} onChange={e => handleChange('dateFormat', e.target.value)} className="input">
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time Format</label>
              <select value={settings.timeFormat} onChange={e => handleChange('timeFormat', e.target.value)} className="input">
                <option value="24h">24-hour (14:30)</option>
                <option value="12h">12-hour (2:30 PM)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">App Behavior</h3>
        </div>
        <div className="card-content space-y-4">
          <ToggleSetting
            label="Auto-sync data"
            description="Automatically sync data when online"
            checked={true}
            onChange={(v) => console.log(v)}
          />
          <ToggleSetting
            label="Background app refresh"
            description="Allow app to fetch data in background"
            checked={true}
            onChange={(v) => console.log(v)}
          />
          <ToggleSetting
            label="Haptic feedback"
            description="Vibrate on button presses and alerts"
            checked={true}
            onChange={(v) => console.log(v)}
          />
          <ToggleSetting
            label="Keep screen on during CGM"
            description="Prevent screen timeout while viewing glucose"
            checked={false}
            onChange={(v) => console.log(v)}
          />
        </div>
      </div>
    </div>
  );
}

function NotificationSettings({ settings, setSettings }: { settings: any; setSettings: (s: any) => void }) {
  const handleChange = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Alert Types</h3>
        </div>
        <div className="card-content space-y-4">
          <AlertSetting
            title="Hypoglycemia Alerts"
            description="Critical low glucose warnings (<70 mg/dL)"
            checked={settings.hypoAlerts}
            onChange={v => handleChange('hypoAlerts', v)}
            critical
          />
          <AlertSetting
            title="Severe Hypo Alerts"
            description="Emergency alerts for glucose <54 mg/dL"
            checked={settings.hypoAlerts}
            onChange={v => handleChange('hypoAlerts', v)}
            critical
          />
          <AlertSetting
            title="Hyperglycemia Alerts"
            description="High glucose warnings (>180 mg/dL)"
            checked={settings.hyperAlerts}
            onChange={v => handleChange('hyperAlerts', v)}
          />
          <AlertSetting
            title="Rate of Change Alerts"
            description="Rapid glucose rise/fall warnings"
            checked={true}
            onChange={() => {}}
          />
          <AlertSetting
            title="Signal Loss Alerts"
            description="CGM signal lost or sensor error"
            checked={true}
            onChange={() => {}}
            critical
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Reminders</h3>
        </div>
        <div className="card-content space-y-4">
          <AlertSetting
            title="Meal Reminders"
            description="Remind to log meals at typical times"
            checked={settings.mealReminders}
            onChange={v => handleChange('mealReminders', v)}
          />
          <AlertSetting
            title="Insulin Reminders"
            description="Scheduled insulin dose reminders"
            checked={settings.insulinReminders}
            onChange={v => handleChange('insulinReminders', v)}
          />
          <AlertSetting
            title="Weekly Report"
            description="Weekly glucose summary email"
            checked={settings.weeklyReport}
            onChange={v => handleChange('weeklyReport', v)}
          />
          <AlertSetting
            title="Site Rotation Reminder"
            description="Remind to rotate injection sites"
            checked={false}
            onChange={() => {}}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Delivery Methods</h3>
        </div>
        <div className="card-content space-y-4">
          <DeliveryMethodSetting
            label="Push Notifications"
            description="Instant alerts on device"
            checked={settings.pushEnabled}
            onChange={v => handleChange('pushEnabled', v)}
            icon="📱"
          />
          <DeliveryMethodSetting
            label="Email Notifications"
            description="Weekly reports and important alerts"
            checked={settings.emailEnabled}
            onChange={v => handleChange('emailEnabled', v)}
            icon="📧"
          />
          <DeliveryMethodSetting
            label="SMS (Emergency Only)"
            description="Critical alerts via SMS to emergency contacts"
            checked={false}
            onChange={() => {}}
            icon="📱"
          />
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings({ settings, setSettings }: { settings: any; setSettings: (s: any) => void }) {
  const { theme, setTheme } = useTheme();
  const handleChange = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Theme</h3>
        </div>
        <div className="card-content space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); handleChange('theme', opt.value); }}
                className={cn(
                  'p-4 rounded-lg border-2 text-center transition-colors',
                  settings.theme === opt.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                )}
              >
                <opt.icon className="w-8 h-8 mx-auto mb-2" />
                <div className="font-medium">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Accessibility</h3>
        </div>
        <div className="card-content space-y-4">
          <ToggleSetting
            label="High Contrast Mode"
            description="Increase color contrast for better visibility"
            checked={settings.highContrast}
            onChange={v => handleChange('highContrast', v)}
          />
          <ToggleSetting
            label="Large Text"
            description="Increase font sizes throughout the app"
            checked={settings.largeText}
            onChange={v => handleChange('largeText', v)}
          />
          <ToggleSetting
            label="Reduced Motion"
            description="Disable animations and transitions"
            checked={settings.reducedMotion}
            onChange={v => handleChange('reducedMotion', v)}
          />
          <ToggleSetting
            label="Compact Mode"
            description="Denser information layout"
            checked={settings.compactMode}
            onChange={v => handleChange('compactMode', v)}
          />
        </div>
      </div>
    </div>
  );
}

function DataSettings({ settings, setSettings }: { settings: any; setSettings: (s: any) => void }) {
  const handleChange = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Sync Settings</h3>
        </div>
        <div className="card-content space-y-4">
          <ToggleSetting
            label="Auto Sync"
            description="Automatically sync data when online"
            checked={settings.autoSync}
            onChange={v => handleChange('autoSync', v)}
          />
          <div>
            <label className="block text-sm font-medium mb-1">Sync Frequency</label>
            <select value={settings.syncFrequency} onChange={e => handleChange('syncFrequency', e.target.value)} className="input">
              <option value="5min">Every 5 minutes</option>
              <option value="15min">Every 15 minutes</option>
              <option value="30min">Every 30 minutes</option>
              <option value="1hour">Every hour</option>
              <option value="manual">Manual only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sync on WiFi Only</label>
            <select value="wifi" onChange={e => handleChange('syncOnWifi', e.target.value)} className="input">
              <option value="wifi">WiFi only</option>
              <option value="any">Any connection</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium">Force Sync Now</p>
              <p className="text-sm text-muted-foreground">Manually trigger data synchronization</p>
            </div>
            <button className="btn-primary">Sync Now</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Data Management</h3>
        </div>
        <div className="card-content space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data Retention</label>
            <select value={settings.dataRetention} onChange={e => handleChange('dataRetention', e.target.value)} className="input">
              <option value="30days">30 days</option>
              <option value="90days">90 days</option>
              <option value="1year">1 year</option>
              <option value="forever">Forever</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Export Format</label>
            <select value={settings.exportFormat} onChange={e => handleChange('exportFormat', e.target.value)} className="input">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF Report</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button className="btn-outline flex-1">Export Data</button>
            <button className="btn-outline flex-1">Import Data</button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Delete All Data</p>
              <p className="text-sm text-red-700 dark:text-red-300">Permanently delete all local data</p>
            </div>
            <button className="btn-outline text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Delete All</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Storage Usage</h3>
        </div>
        <div className="card-content">
          <div className="space-y-3">
            <StorageBar label="CGM Data" used={245} total={500} unit="MB" color="blue" />
            <StorageBar label="Meal Logs" used={12} total={50} unit="MB" color="green" />
            <StorageBar label="Insulin Logs" used={8} total={20} unit="MB" color="orange" />
            <StorageBar label="Photos" used={156} total={500} unit="MB" color="purple" />
            <StorageBar label="App Cache" used={34} total={100} unit="MB" color="gray" />
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Total Used</span>
                <span className="font-medium">455 MB / 1.1 GB</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-primary-600 rounded-full" style={{ width: '40%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings({ settings, setSettings }: { settings: any; setSettings: (s: any) => void }) {
  const handleChange = (key: string, value: any) => setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Authentication</h3>
        </div>
        <div className="card-content space-y-4">
          <ToggleSetting
            label="Biometric Authentication"
            description="Use Face ID / Fingerprint / PIN to unlock app"
            checked={settings.biometricEnabled}
            onChange={v => handleChange('biometricEnabled', v)}
          />
          <ToggleSetting
            label="Two-Factor Authentication"
            description="Require 2FA for account access"
            checked={settings.twoFactorEnabled}
            onChange={v => handleChange('twoFactorEnabled', v)}
          />
          <div>
            <label className="block text-sm font-medium mb-1">Session Timeout</label>
            <select value={settings.sessionTimeout} onChange={e => handleChange('sessionTimeout', e.target.value)} className="input">
              <option value="15min">15 minutes</option>
              <option value="30min">30 minutes</option>
              <option value="1hour">1 hour</option>
              <option value="4hours">4 hours</option>
              <option value="never">Never (stay logged in)</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-muted-foreground">Update your account password</p>
            </div>
            <button className="btn-outline">Change Password</button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="font-medium">Manage Sessions</p>
              <p className="text-sm text-muted-foreground">View and revoke active sessions</p>
            </div>
            <button className="btn-outline">View Sessions</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Device Security</h3>
        </div>
        <div className="card-content space-y-4">
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">This Device</p>
                <p className="text-sm text-muted-foreground">Currently active session</p>
              </div>
              <span className="badge badge-primary">Active</span>
            </div>
          </div>
          <button className="btn-outline w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            Sign Out of All Other Devices
          </button>
        </div>
      </div>

      <div className="card border-red-200 dark:border-red-800">
        <div className="card-header">
          <h3 className="card-title text-red-600">Danger Zone</h3>
        </div>
        <div className="card-content">
          <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <p className="font-medium text-red-800 dark:text-red-200">Delete Account</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">Permanently delete your account and all data. This action cannot be undone.</p>
          </div>
          <button className="w-full btn-outline text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-content text-center py-8">
          <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
            <Syringe className="w-10 h-10 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold">T1D India</h2>
          <p className="text-muted-foreground mt-2">Version 0.0.1 (Beta)</p>
          <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto">
            AI-powered hypoglycemia prediction and carb-counting for Indian Type 1 Diabetes diets.
            Built for the T1D community in India.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Links</h3>
        </div>
        <div className="card-content space-y-3">
          <LinkItem label="Documentation" href="#" icon="📚" />
          <LinkItem label="Privacy Policy" href="#" icon="🔒" />
          <LinkItem label="Terms of Service" href="#" icon="📄" />
          <LinkItem label="Clinical Study Info" href="#" icon="🏥" />
          <LinkItem label="Report a Bug" href="#" icon="🐛" />
          <LinkItem label="Feature Request" href="#" icon="💡" />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Acknowledgments</h3>
        </div>
        <div className="card-content space-y-2 text-sm text-muted-foreground">
          <p>• ICMR-NIN for Indian food composition data</p>
          <p>• UVA/Padova T1D Simulator for synthetic data</p>
          <p>• JMIR 2024 for hypo prediction benchmarks</p>
          <p>• T1D community in India for co-design</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Licenses</h3>
        </div>
        <div className="card-content">
          <p className="text-sm text-muted-foreground">This project is licensed under the MIT License.</p>
          <p className="text-sm text-muted-foreground mt-2">Third-party licenses available in the app repository.</p>
        </div>
      </div>
    </div>
  );
}

// Helper components
function ToggleSetting({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
    </label>
  );
}

function AlertSetting({ title, description, checked, onChange, critical }: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  critical?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{title}</p>
          {critical && <span className="badge badge-destructive text-xs">Critical</span>}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
    </label>
  );
}

function DeliveryMethodSetting({ label, description, checked, onChange, icon }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
    </label>
  );
}

function StorageBar({ label, used, total, unit, color }: {
  label: string;
  used: number;
  total: number;
  unit: string;
  color: string;
}) {
  const percentage = (used / total) * 100;
  const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{used} / {total} {unit}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: colorMap[color as keyof typeof colorMap] || colorMap.blue }}
        />
      </div>
    </div>
  );
}

function LinkItem({ label, href, icon }: { label: string; href: string; icon: string }) {
  return (
    <a href={href} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </a>
  );
}