'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { cn } from '@/lib/utils';
import {
  User, Calendar, Scale, Ruler, Pill, Droplet, Syringe,
  Heart, Brain, Shield, Bell, Share2, Globe, Save,
  Loader2, CheckCircle, AlertCircle, Edit, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const REGIMEN_OPTIONS = [
  { value: 'BASAL_BOLUS', label: 'Basal-Bolus (Rapid + Long-acting)', description: 'Glargine/Degludec + Lispro/Aspart' },
  { value: 'NPH_REGULAR', label: 'NPH + Regular (Human Insulin)', description: '2-3 injections/day, common in India' },
  { value: 'PREMIXED_30_70', label: 'Premixed 30/70', description: '30% Regular + 70% NPH' },
  { value: 'PREMIXED_50_50', label: 'Premixed 50/50', description: '50% Regular + 50% NPH' },
  { value: 'PUMP', label: 'Insulin Pump', description: 'Continuous subcutaneous infusion' },
] as const;

const CGM_TYPES = [
  { value: 'DEXCOM_G6', label: 'Dexcom G6' },
  { value: 'DEXCOM_G7', label: 'Dexcom G7' },
  { value: 'LIBRE_2', label: 'FreeStyle Libre 2' },
  { value: 'LIBRE_3', label: 'FreeStyle Libre 3' },
  { value: 'MEDTRONIC_G3', label: 'Medtronic Guardian 3' },
  { value: 'MEDTRONIC_G4', label: 'Medtronic Guardian 4' },
  { value: 'NONE', label: 'No CGM' },
] as const;

const DIABETES_TYPES = ['T1D', 'T2D', 'LADA', 'MODY', 'OTHER'] as const;
const GENDERS = ['male', 'female', 'other'] as const;

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState<'clinical' | 'insulin' | 'devices' | 'preferences' | 'consent'>('clinical');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch profile
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await fetch('/api/v1/profile');
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    gender: 'male',
    heightCm: '',
    weightKg: '',
    diabetesType: 'T1D',
    diagnosisDate: '',
    hba1cLatest: '',
    hba1cDate: '',
    insulinRegimen: 'NPH_REGULAR',
    icrGPerU: '',
    isfMgDlPerU: '',
    targetGlucoseMgDl: 110,
    basalRateUPerHr: '',
    nphMorningU: '',
    nphEveningU: '',
    regularBreakfastU: '',
    regularLunchU: '',
    regularDinnerU: '',
    cgmType: 'NONE',
    cgmSerialHash: '',
    pumpType: '',
    hypoThresholdMgDl: 70,
    severeHypoThresholdMgDl: 54,
    alertSoundEnabled: true,
    caregiverShareEnabled: false,
    dataSharingConsent: false,
    researchConsent: false,
    marketingConsent: false,
  });

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        dateOfBirth: profile.dateOfBirth || '',
        gender: profile.gender || 'male',
        heightCm: profile.heightCm || '',
        weightKg: profile.weightKg || '',
        diabetesType: profile.diabetesType || 'T1D',
        diagnosisDate: profile.diagnosisDate || '',
        hba1cLatest: profile.hba1cLatest || '',
        hba1cDate: profile.hba1cDate || '',
        insulinRegimen: profile.insulinRegimen || 'NPH_REGULAR',
        icrGPerU: profile.icrGPerU || '',
        isfMgDlPerU: profile.isfMgDlPerU || '',
        targetGlucoseMgDl: profile.targetGlucoseMgDl || 110,
        basalRateUPerHr: profile.basalRateUPerHr || '',
        nphMorningU: profile.nphMorningU || '',
        nphEveningU: profile.nphEveningU || '',
        regularBreakfastU: profile.regularBreakfastU || '',
        regularLunchU: profile.regularLunchU || '',
        regularDinnerU: profile.regularDinnerU || '',
        cgmType: profile.cgmType || 'NONE',
        cgmSerialHash: profile.cgmSerialHash || '',
        pumpType: profile.pumpType || '',
        hypoThresholdMgDl: profile.hypoThresholdMgDl || 70,
        severeHypoThresholdMgDl: profile.severeHypoThresholdMgDl || 54,
        alertSoundEnabled: profile.alertSoundEnabled ?? true,
        caregiverShareEnabled: profile.caregiverShareEnabled ?? false,
        dataSharingConsent: profile.dataSharingConsent ?? false,
        researchConsent: profile.researchConsent ?? false,
        marketingConsent: profile.marketingConsent ?? false,
      }));
    }
  }, [profile]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/v1/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Profile saved!');
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="card animate-pulse">
            <div className="card-content">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
              <div className="grid grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
              <p className="text-muted-foreground">Manage your clinical profile and preferences</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={cn('btn-primary', isEditing && 'bg-green-600 hover:bg-green-700')}
              >
                {isEditing ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
            {[
              { id: 'clinical', label: 'Clinical', icon: User },
              { id: 'insulin', label: 'Insulin', icon: Syringe },
              { id: 'devices', label: 'Devices', icon: Droplet },
              { id: 'preferences', label: 'Preferences', icon: Bell },
              { id: 'consent', label: 'Privacy', icon: Shield },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  activeSection === tab.id
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Clinical Section */}
          {activeSection === 'clinical' && (
            <ClinicalSection formData={formData} handleChange={handleChange} disabled={!isEditing} />
          )}

          {/* Insulin Section */}
          {activeSection === 'insulin' && (
            <InsulinSection formData={formData} handleChange={handleChange} disabled={!isEditing} />
          )}

          {/* Devices Section */}
          {activeSection === 'devices' && (
            <DevicesSection formData={formData} handleChange={handleChange} disabled={!isEditing} />
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <PreferencesSection formData={formData} handleChange={handleChange} disabled={!isEditing} />
          )}

          {/* Consent Section */}
          {activeSection === 'consent' && (
            <ConsentSection formData={formData} handleChange={handleChange} disabled={!isEditing} />
          )}

          {/* Submit button */}
          {isEditing && (
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 btn-primary py-3"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-outline px-6"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </form>
    </DashboardLayout>
  );
}

function ClinicalSection({ formData, handleChange, disabled }: { formData: any; handleChange: (key: string, value: any) => void; disabled: boolean }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            <h3 className="card-title">Demographics</h3>
          </div>
        </div>
        <div className="card-content space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                disabled={disabled}
                className="input"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                disabled={disabled}
                className="input"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Height (cm)</label>
              <input
                type="number"
                value={formData.heightCm}
                onChange={(e) => handleChange('heightCm', e.target.value)}
                disabled={disabled}
                className="input"
                min="50"
                max="250"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Weight (kg)</label>
              <input
                type="number"
                value={formData.weightKg}
                onChange={(e) => handleChange('weightKg', e.target.value)}
                disabled={disabled}
                className="input"
                min="2"
                max="200"
                step="0.1"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary-600" />
            <h3 className="card-title">Diabetes Details</h3>
          </div>
        </div>
        <div className="card-content space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Diabetes Type</label>
              <select
                value={formData.diabetesType}
                onChange={(e) => handleChange('diabetesType', e.target.value)}
                disabled={disabled}
                className="input"
              >
                <option value="T1D">Type 1 Diabetes</option>
                <option value="T2D">Type 2 Diabetes</option>
                <option value="LADA">LADA</option>
                <option value="MODY">MODY</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Diagnosis Date</label>
              <input
                type="date"
                value={formData.diagnosisDate}
                onChange={(e) => handleChange('diagnosisDate', e.target.value)}
                disabled={disabled}
                className="input"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Latest HbA1c (%)</label>
              <input
                type="number"
                value={formData.hba1cLatest}
                onChange={(e) => handleChange('hba1cLatest', e.target.value)}
                disabled={disabled}
                className="input"
                step="0.1"
                min="3"
                max="15"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">HbA1c Date</label>
              <input
                type="date"
                value={formData.hba1cDate}
                onChange={(e) => handleChange('hba1cDate', e.target.value)}
                disabled={disabled}
                className="input"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsulinSection({ formData, handleChange, disabled }: { formData: any; handleChange: (key: string, value: any) => void; disabled: boolean }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Syringe className="w-5 h-5 text-primary-600" />
            <h3 className="card-title">Insulin Regimen</h3>
          </div>
        </div>
        <div className="card-content space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Insulin Regimen</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: 'BASAL_BOLUS', label: 'Basal-Bolus', desc: 'Rapid + Long-acting (Glargine/Degludec)' },
                { value: 'NPH_REGULAR', label: 'NPH + Regular', desc: 'Human insulin, 2-3×/day (common in India)' },
                { value: 'PREMIXED_30_70', label: 'Premixed 30/70', desc: '30% Regular + 70% NPH' },
                { value: 'PREMIXED_50_50', label: 'Premixed 50/50', desc: '50% Regular + 50% NPH' },
                { value: 'PUMP', label: 'Insulin Pump', desc: 'Continuous infusion' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChange('insulinRegimen', opt.value)}
                  disabled={disabled}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-colors',
                    formData.insulinRegimen === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                  )}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ICR (g/U)</label>
              <input
                type="number"
                value={formData.icrGPerU}
                onChange={(e) => handleChange('icrGPerU', e.target.value)}
                disabled={disabled}
                className="input"
                step="0.1"
                min="1"
                max="100"
                placeholder="e.g., 10"
              />
              <p className="text-xs text-muted-foreground mt-1">Grams of carbs per unit of rapid insulin</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ISF (mg/dL/U)</label>
              <input
                type="number"
                value={formData.isfMgDlPerU}
                onChange={(e) => handleChange('isfMgDlPerU', e.target.value)}
                disabled={disabled}
                className="input"
                step="1"
                min="10"
                max="200"
                placeholder="e.g., 50"
              />
              <p className="text-xs text-muted-foreground mt-1">mg/dL drop per unit of insulin</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Glucose (mg/dL)</label>
              <input
                type="number"
                value={formData.targetGlucoseMgDl}
                onChange={(e) => handleChange('targetGlucoseMgDl', e.target.value)}
                disabled={disabled}
                className="input"
                min="70"
                max="180"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Basal Rate (U/hr)</label>
              <input
                type="number"
                value={formData.basalRateUPerHr}
                onChange={(e) => handleChange('basalRateUPerHr', e.target.value)}
                disabled={disabled}
                className="input"
                step="0.05"
                min="0"
                max="10"
                placeholder="Pump only"
              />
            </div>
          </div>

          {/* NPH/Regular doses */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">NPH + Regular Doses (U)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">NPH Morning</label>
                <input
                  type="number"
                  value={formData.nphMorningU}
                  onChange={(e) => handleChange('nphMorningU', e.target.value)}
                  disabled={disabled}
                  className="input"
                  step="0.5"
                  min="0"
                  max="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">NPH Evening</label>
                <input
                  type="number"
                  value={formData.nphEveningU}
                  onChange={(e) => handleChange('nphEveningU', e.target.value)}
                  disabled={disabled}
                  className="input"
                  step="0.5"
                  min="0"
                  max="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Regular Breakfast</label>
                <input
                  type="number"
                  value={formData.regularBreakfastU}
                  onChange={(e) => handleChange('regularBreakfastU', e.target.value)}
                  disabled={disabled}
                  className="input"
                  step="0.5"
                  min="0"
                  max="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Regular Lunch</label>
                <input
                  type="number"
                  value={formData.regularLunchU}
                  onChange={(e) => handleChange('regularLunchU', e.target.value)}
                  disabled={disabled}
                  className="input"
                  step="0.5"
                  min="0"
                  max="50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Regular Dinner</label>
                <input
                  type="number"
                  value={formData.regularDinnerU}
                  onChange={(e) => handleChange('regularDinnerU', e.target.value)}
                  disabled={disabled}
                  className="input"
                  step="0.5"
                  min="0"
                  max="50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DevicesSection({ formData, handleChange, disabled }: { formData: any; handleChange: (key: string, value: any) => void; disabled: boolean }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Droplet className="w-5 h-5 text-primary-600" />
            <h3 className="card-title">CGM Device</h3>
          </div>
        </div>
        <div className="card-content space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">CGM Type</label>
              <select
                value={formData.cgmType}
                onChange={(e) => handleChange('cgmType', e.target.value)}
                disabled={disabled}
                className="input"
              >
                <option value="NONE">No CGM</option>
                <option value="DEXCOM_G6">Dexcom G6</option>
                <option value="DEXCOM_G7">Dexcom G7</option>
                <option value="LIBRE_2">FreeStyle Libre 2</option>
                <option value="LIBRE_3">FreeStyle Libre 3</option>
                <option value="MEDTRONIC_G3">Medtronic Guardian 3</option>
                <option value="MEDTRONIC_G4">Medtronic Guardian 4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CGM Serial (hashed)</label>
              <input
                type="text"
                value={formData.cgmSerialHash}
                onChange={(e) => handleChange('cgmSerialHash', e.target.value)}
                disabled={disabled}
                className="input"
                placeholder="Auto-filled on pairing"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Syringe className="w-5 h-5 text-primary-600" />
            <h3 className="card-title">Insulin Pump</h3>
          </div>
        </div>
        <div className="card-content space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pump Type</label>
            <input
              type="text"
              value={formData.pumpType}
              onChange={(e) => handleChange('pumpType', e.target.value)}
              disabled={disabled}
              className="input"
              placeholder="e.g., Tandem t:slim X2, Medtronic 780G"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferencesSection({ formData, handleChange, disabled }: { formData: any; handleChange: (key: string, value: any) => void; disabled: boolean }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-600" />
            <h3 className="card-title">Alert Settings</h3>
          </div>
        </div>
        <div className="card-content space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hypo Threshold (mg/dL)</label>
              <input
                type="number"
                value={formData.hypoThresholdMgDl}
                onChange={(e) => handleChange('hypoThresholdMgDl', e.target.value)}
                disabled={disabled}
                className="input"
                min="50"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Severe Hypo Threshold (mg/dL)</label>
              <input
                type="number"
                value={formData.severeHypoThresholdMgDl}
                onChange={(e) => handleChange('severeHypoThresholdMgDl', e.target.value)}
                disabled={disabled}
                className="input"
                min="40"
                max="70"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="alertSound"
              checked={formData.alertSoundEnabled}
              onChange={(e) => handleChange('alertSoundEnabled', e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="alertSound" className="text-sm font-medium">Alert Sounds Enabled</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="caregiverShare"
              checked={formData.caregiverShareEnabled}
              onChange={(e) => handleChange('caregiverShareEnabled', e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="caregiverShare" className="text-sm font-medium">
              Share Alerts with Caregiver
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentSection({ formData, handleChange, disabled }: { formData: any; handleChange: (key: string, value: any) => void; disabled: boolean }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            <h3 className="card-title">Data Sharing & Privacy</h3>
          </div>
        </div>
        <div className="card-content space-y-4">
          <p className="text-sm text-muted-foreground">
            Control how your data is used. Compliant with India's DPDP Act 2023.
          </p>
          <div className="space-y-4">
            <ConsentItem
              title="Clinical Data Sharing"
              description="Share anonymized data with healthcare providers for treatment"
              checked={formData.dataSharingConsent}
              onChange={(checked) => handleChange('dataSharingConsent', checked)}
              disabled={disabled}
            />
            <ConsentItem
              title="Research Participation"
              description="Contribute anonymized data to T1D research studies in India"
              checked={formData.researchConsent}
              onChange={(checked) => handleChange('researchConsent', checked)}
              disabled={disabled}
            />
            <ConsentItem
              title="Marketing Communications"
              description="Receive updates about new features and health tips"
              checked={formData.marketingConsent}
              onChange={(checked) => handleChange('marketingConsent', checked)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Data Rights</h3>
        </div>
        <div className="card-content space-y-3">
          <button className="btn-outline w-full justify-start">
            Download My Data (JSON)
          </button>
          <button className="btn-outline w-full justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}

function ConsentItem({ title, description, checked, onChange, disabled }: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
    </div>
  );
}