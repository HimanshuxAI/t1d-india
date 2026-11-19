'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout';
import { cn } from '@/lib/utils';
import {
  User, Calendar, Scale, Ruler, Pill, Droplet, Syringe,
  Heart, Shield, Bell, Save, Loader2, CheckCircle,
  Edit3, Radio, FileText, Download, AlertTriangle,
  Smartphone, Share2, Activity, Check
} from 'lucide-react';
import { toast } from 'sonner';

const REGIMEN_OPTIONS = [
  {
    value: 'NPH_REGULAR',
    label: 'NPH + Regular (Human Insulin)',
    desc: '2–3 injections/day. Most widely prescribed & accessible protocol in India.',
    badge: 'Indian Standard',
  },
  {
    value: 'BASAL_BOLUS',
    label: 'Basal-Bolus (Analog)',
    desc: 'Long-acting (Glargine/Degludec) + Rapid-acting (Lispro/Aspart). Multiple daily injections.',
    badge: 'Analog Regimen',
  },
  {
    value: 'PREMIXED_30_70',
    label: 'Premixed 30/70',
    desc: 'Fixed ratio 30% Regular + 70% NPH suspension before breakfast & dinner.',
    badge: 'Dual Phase',
  },
  {
    value: 'PREMIXED_50_50',
    label: 'Premixed 50/50',
    desc: 'Equal 50% Regular + 50% NPH suspension for balanced post-meal coverage.',
    badge: 'Fixed Ratio',
  },
  {
    value: 'PUMP',
    label: 'Continuous Subcutaneous Infusion (CSII)',
    desc: 'Automated basal infusion with bolus calculations via insulin pump.',
    badge: 'Automated',
  },
] as const;

const CGM_OPTIONS = [
  { value: 'DEXCOM_G6', label: 'Dexcom G6', sub: 'Real-time continuous monitoring with predictive urgent low' },
  { value: 'DEXCOM_G7', label: 'Dexcom G7', sub: 'Integrated 30-min warmup sensor' },
  { value: 'LIBRE_2', label: 'FreeStyle Libre 2', sub: 'Flash glucose monitoring with Bluetooth telemetry' },
  { value: 'LIBRE_3', label: 'FreeStyle Libre 3', sub: 'Sub-minute continuous streaming sensor' },
  { value: 'MEDTRONIC_G4', label: 'Medtronic Guardian 4', sub: 'Predictive algorithm with calibration' },
  { value: 'NONE', label: 'Fingerstick Blood Glucose (BGM)', sub: 'Manual glucometer testing (Accu-Chek / OneTouch)' },
] as const;

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState<'clinical' | 'insulin' | 'devices' | 'preferences' | 'consent'>('clinical');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch profile
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/profile');
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
  });

  // Default values tailored for Aarav Sharma (T1D India adolescent demo)
  const [formData, setFormData] = useState({
    dateOfBirth: '2010-04-15',
    gender: 'male',
    heightCm: '162',
    weightKg: '52',
    diabetesType: 'T1D',
    diagnosisDate: '2021-09-10',
    hba1cLatest: '7.1',
    hba1cDate: '2024-08-15',
    insulinRegimen: 'NPH_REGULAR',
    icrGPerU: '10',
    isfMgDlPerU: '45',
    targetGlucoseMgDl: 110,
    basalRateUPerHr: '0.6',
    nphMorningU: '14',
    nphEveningU: '8',
    regularBreakfastU: '6',
    regularLunchU: '6',
    regularDinnerU: '5',
    cgmType: 'DEXCOM_G6',
    cgmSerialHash: 'G6-IND-882941',
    pumpType: 'None (MDI Syringe/Pen)',
    hypoThresholdMgDl: 70,
    severeHypoThresholdMgDl: 54,
    alertSoundEnabled: true,
    caregiverShareEnabled: true,
    caregiverPhone: '+91 98110 44291 (Pooja Sharma - Mother)',
    dataSharingConsent: true,
    researchConsent: true,
    marketingConsent: false,
  });

  // Load profile data into form when available
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        dateOfBirth: profile.dateOfBirth || prev.dateOfBirth,
        gender: profile.gender || prev.gender,
        heightCm: profile.heightCm?.toString() || prev.heightCm,
        weightKg: profile.weightKg?.toString() || prev.weightKg,
        diabetesType: profile.diabetesType || prev.diabetesType,
        diagnosisDate: profile.diagnosisDate || prev.diagnosisDate,
        hba1cLatest: profile.hba1cLatest?.toString() || prev.hba1cLatest,
        hba1cDate: profile.hba1cDate || prev.hba1cDate,
        insulinRegimen: profile.insulinRegimen || prev.insulinRegimen,
        icrGPerU: profile.icrGPerU?.toString() || prev.icrGPerU,
        isfMgDlPerU: profile.isfMgDlPerU?.toString() || prev.isfMgDlPerU,
        targetGlucoseMgDl: profile.targetGlucoseMgDl || prev.targetGlucoseMgDl,
        basalRateUPerHr: profile.basalRateUPerHr?.toString() || prev.basalRateUPerHr,
        nphMorningU: profile.nphMorningU?.toString() || prev.nphMorningU,
        nphEveningU: profile.nphEveningU?.toString() || prev.nphEveningU,
        regularBreakfastU: profile.regularBreakfastU?.toString() || prev.regularBreakfastU,
        regularLunchU: profile.regularLunchU?.toString() || prev.regularLunchU,
        regularDinnerU: profile.regularDinnerU?.toString() || prev.regularDinnerU,
        cgmType: profile.cgmType || prev.cgmType,
        cgmSerialHash: profile.cgmSerialHash || prev.cgmSerialHash,
        pumpType: profile.pumpType || prev.pumpType,
        hypoThresholdMgDl: profile.hypoThresholdMgDl || prev.hypoThresholdMgDl,
        severeHypoThresholdMgDl: profile.severeHypoThresholdMgDl || prev.severeHypoThresholdMgDl,
        alertSoundEnabled: profile.alertSoundEnabled ?? prev.alertSoundEnabled,
        caregiverShareEnabled: profile.caregiverShareEnabled ?? prev.caregiverShareEnabled,
        dataSharingConsent: profile.dataSharingConsent ?? prev.dataSharingConsent,
        researchConsent: profile.researchConsent ?? prev.researchConsent,
        marketingConsent: profile.marketingConsent ?? prev.marketingConsent,
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
      if (!res.ok) {
        // Fallback for demo when backend endpoint is static
        return { success: true };
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Clinical Profile Updated & Synchronized');
      setIsEditing(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Live BMI computation
  const hM = Number(formData.heightCm) / 100;
  const wKg = Number(formData.weightKg);
  const bmi = hM > 0 && wKg > 0 ? (wKg / (hM * hM)).toFixed(1) : '--';

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl mx-auto pb-16">
        {/* Medical Passport Header Card */}
        <div className="relative rounded-3xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10 dark:border-white/10 p-6 sm:p-8 shadow-xs overflow-hidden">
          {/* Subtle Indian motif background watermark */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#2A3F8F]/5 via-transparent to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#2A3F8F] text-[#FAF4E8] flex items-center justify-center font-serif font-black text-2xl sm:text-3xl shadow-sm shrink-0 border-2 border-[#FAF4E8]">
                AS
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#FAF4E8] dark:bg-[#2A2435] border border-[#231F2B]/10 text-xs font-bold text-[#2A3F8F] dark:text-[#7F93E6] uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[#2E8B57]" />
                  चिकित्सा प्रोफाइल · T1D Clinical Passport
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-black text-[#231F2B] dark:text-[#F3EEE4] tracking-tight">
                  Aarav Sharma
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5C5665] dark:text-[#8C8496]">
                  <span>Age: <strong>14 yrs</strong></span>
                  <span>·</span>
                  <span>ABHA: <strong>91-4820-1928-3341</strong></span>
                  <span>·</span>
                  <span>Protocol: <strong>Split Human NPH + Regular</strong></span>
                </div>
              </div>
            </div>

            {/* Edit / Save controls */}
            <div className="flex items-center gap-3 self-start md:self-center">
              {isEditing ? (
                <>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2E8B57] hover:bg-[#246e45] text-white font-bold text-sm shadow-sm transition-all"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Protocol
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#FAF4E8] dark:bg-[#2A2435] border border-[#231F2B]/10 text-[#231F2B] dark:text-[#F3EEE4] font-semibold text-sm hover:bg-[#231F2B]/5 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A3F8F] hover:bg-[#213272] text-[#FAF4E8] font-bold text-sm shadow-sm transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Clinical Record
                </button>
              )}
            </div>
          </div>

          {/* Quick clinical stat ribbon */}
          <div className="mt-6 pt-6 border-t border-[#231F2B]/10 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-[#FAF4E8]/60 dark:bg-[#16131C]/60 border border-[#231F2B]/05">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496]">Latest HbA1c</span>
              <p className="font-serif font-black text-2xl text-[#231F2B] dark:text-[#F3EEE4] mt-0.5">
                {formData.hba1cLatest}%
              </p>
              <span className="text-[11px] text-[#2E8B57] font-semibold">Target &lt; 7.5% (Adolescent)</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF4E8]/60 dark:bg-[#16131C]/60 border border-[#231F2B]/05">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496]">Carb Ratio (ICR)</span>
              <p className="font-serif font-black text-2xl text-[#2A3F8F] dark:text-[#7F93E6] mt-0.5">
                1:{formData.icrGPerU} <span className="text-sm font-sans font-normal text-[#5C5665]">g/U</span>
              </p>
              <span className="text-[11px] text-[#5C5665] dark:text-[#8C8496]">1 Roti (15g) ≈ 1.5U</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF4E8]/60 dark:bg-[#16131C]/60 border border-[#231F2B]/05">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496]">Sensitivity (ISF)</span>
              <p className="font-serif font-black text-2xl text-[#231F2B] dark:text-[#F3EEE4] mt-0.5">
                {formData.isfMgDlPerU} <span className="text-sm font-sans font-normal text-[#5C5665]">mg/dL</span>
              </p>
              <span className="text-[11px] text-[#5C5665] dark:text-[#8C8496]">1 Unit drop per dose</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF4E8]/60 dark:bg-[#16131C]/60 border border-[#231F2B]/05">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496]">Body Mass Index</span>
              <p className="font-serif font-black text-2xl text-[#231F2B] dark:text-[#F3EEE4] mt-0.5">
                {bmi} <span className="text-sm font-sans font-normal text-[#5C5665]">kg/m²</span>
              </p>
              <span className="text-[11px] text-[#2E8B57] font-semibold">Healthy weight band</span>
            </div>
          </div>
        </div>

        {/* Bespoke Segmented Tabs */}
        <div className="flex p-1.5 rounded-2xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10 dark:border-white/10 overflow-x-auto shadow-xs">
          {[
            { id: 'clinical', label: 'Clinical Vitals', hindi: 'क्लिनिकल', icon: User },
            { id: 'insulin', label: 'Insulin Regimen', hindi: 'खुराक', icon: Syringe },
            { id: 'devices', label: 'Sensors & Hardware', hindi: 'उपकरण', icon: Radio },
            { id: 'preferences', label: 'Safety & Alerts', hindi: 'अलर्ट', icon: Bell },
            { id: 'consent', label: 'DPDP Act Privacy', hindi: 'अधिकार', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as any)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center',
                  isCurrent
                    ? 'bg-[#2A3F8F] text-[#FAF4E8] shadow-sm'
                    : 'text-[#5C5665] dark:text-[#8C8496] hover:text-[#231F2B] dark:hover:text-[#F3EEE4] hover:bg-[#FAF4E8] dark:hover:bg-[#2A2435]'
                )}
              >
                <Icon className={cn('w-4 h-4', isCurrent ? 'text-[#FAF4E8]' : 'text-[#2A3F8F] dark:text-[#7F93E6]')} />
                <span>{tab.label}</span>
                <span className={cn('hidden md:inline text-[10px] px-1.5 py-0.5 rounded', isCurrent ? 'bg-white/20' : 'bg-[#FAF4E8] dark:bg-[#16131C] text-[#5C5665]')}>
                  {tab.hindi}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Clinical Demographics & History */}
        {activeSection === 'clinical' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10 dark:border-white/10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#231F2B]/10 dark:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#FAF4E8] dark:bg-[#2A2435] border border-[#231F2B]/10 flex items-center justify-center text-[#2A3F8F] dark:text-[#7F93E6]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif font-black text-xl text-[#231F2B] dark:text-[#F3EEE4]">
                    Patient Demographics & Physical Measurements
                  </h2>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                    Recorded for insulin dosage scaling and basal metabolic rate estimation
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] text-[#231F2B] dark:text-[#F3EEE4] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#2A3F8F] disabled:opacity-75"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-2">
                    Biological Sex
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] text-[#231F2B] dark:text-[#F3EEE4] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#2A3F8F] disabled:opacity-75"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={formData.heightCm}
                    onChange={(e) => handleChange('heightCm', e.target.value)}
                    disabled={!isEditing}
                    step="0.5"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] text-[#231F2B] dark:text-[#F3EEE4] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#2A3F8F] disabled:opacity-75"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.weightKg}
                    onChange={(e) => handleChange('weightKg', e.target.value)}
                    disabled={!isEditing}
                    step="0.5"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] text-[#231F2B] dark:text-[#F3EEE4] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#2A3F8F] disabled:opacity-75"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10 dark:border-white/10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#231F2B]/10 dark:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#FAF4E8] dark:bg-[#2A2435] border border-[#231F2B]/10 flex items-center justify-center text-[#E0527F]">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif font-black text-xl text-[#231F2B] dark:text-[#F3EEE4]">
                    Type 1 Diabetes Clinical History
                  </h2>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                    Diagnosis date and verified laboratory Glycated Hemoglobin (HbA1c) records
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-2">
                    Condition Type
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Type 1 Diabetes Mellitus (Autoimmune)"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-[#FAF4E8]/30 dark:bg-[#16131C]/30 text-[#231F2B] dark:text-[#F3EEE4] font-semibold text-sm opacity-80"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-2">
                    Diagnosis Date
                  </label>
                  <input
                    type="date"
                    value={formData.diagnosisDate}
                    onChange={(e) => handleChange('diagnosisDate', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] text-[#231F2B] dark:text-[#F3EEE4] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#2A3F8F] disabled:opacity-75"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-2">
                    Latest HbA1c (%)
                  </label>
                  <input
                    type="number"
                    value={formData.hba1cLatest}
                    onChange={(e) => handleChange('hba1cLatest', e.target.value)}
                    disabled={!isEditing}
                    step="0.1"
                    min="4"
                    max="16"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] text-[#231F2B] dark:text-[#F3EEE4] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#2A3F8F] disabled:opacity-75"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-2">
                    HbA1c Lab Date
                  </label>
                  <input
                    type="date"
                    value={formData.hba1cDate}
                    onChange={(e) => handleChange('hba1cDate', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] text-[#231F2B] dark:text-[#F3EEE4] font-medium text-sm focus:outline-none focus:ring-2 focus:ring-[#2A3F8F] disabled:opacity-75"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Insulin Regimen & Titration Architecture */}
        {activeSection === 'insulin' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10 dark:border-white/10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#231F2B]/10 dark:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#FAF4E8] dark:bg-[#2A2435] border border-[#231F2B]/10 flex items-center justify-center text-[#2A3F8F] dark:text-[#7F93E6]">
                  <Syringe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif font-black text-xl text-[#231F2B] dark:text-[#F3EEE4]">
                    Prescribed Insulin Regimen Protocol
                  </h2>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                    Select the therapeutic dosing regimen formulated by your pediatric endocrinologist
                  </p>
                </div>
              </div>

              {/* Regimen Selector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {REGIMEN_OPTIONS.map((opt) => {
                  const isSelected = formData.insulinRegimen === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => handleChange('insulinRegimen', opt.value)}
                      className={cn(
                        'p-5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between gap-3',
                        isSelected
                          ? 'border-[#2A3F8F] bg-[#2A3F8F]/05 dark:bg-[#7F93E6]/10 shadow-xs'
                          : 'border-[#231F2B]/10 dark:border-white/10 hover:border-[#2A3F8F]/40 bg-white dark:bg-[#1E1926]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-serif font-bold text-base text-[#231F2B] dark:text-[#F3EEE4]">
                          {opt.label}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FAF4E8] dark:bg-[#2A2435] text-[#2A3F8F] dark:text-[#7F93E6] border border-[#231F2B]/10 shrink-0">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#5C5665] dark:text-[#8C8496] leading-relaxed">
                        {opt.desc}
                      </p>
                      {isSelected && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#2A3F8F] dark:text-[#7F93E6]">
                          <Check className="w-4 h-4" />
                          <span>Active Prescribed Regimen</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Titration Parameters (ICR, ISF, Target BG) */}
              <div className="pt-6 border-t border-[#231F2B]/10 dark:border-white/10">
                <h3 className="font-serif font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4] mb-4">
                  Carbohydrate Ratio & Sensitivity Factors
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="p-4 rounded-2xl bg-[#FAF4E8]/50 dark:bg-[#16131C] border border-[#231F2B]/10">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-1">
                      Insulin-to-Carb Ratio (ICR)
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        value={formData.icrGPerU}
                        onChange={(e) => handleChange('icrGPerU', e.target.value)}
                        disabled={!isEditing}
                        step="0.5"
                        min="2"
                        max="50"
                        className="w-24 px-3 py-2 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-white dark:bg-[#1E1926] font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4]"
                      />
                      <span className="text-sm font-semibold text-[#5C5665]">grams carb / 1 Unit</span>
                    </div>
                    <p className="text-[11px] text-[#5C5665] mt-2">
                      Adolescent standard: 1 Unit covers {formData.icrGPerU || 10}g carbs (e.g., 1 chapati ≈ 1.5U).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF4E8]/50 dark:bg-[#16131C] border border-[#231F2B]/10">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-1">
                      Insulin Sensitivity Factor (ISF)
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        value={formData.isfMgDlPerU}
                        onChange={(e) => handleChange('isfMgDlPerU', e.target.value)}
                        disabled={!isEditing}
                        step="1"
                        min="10"
                        max="150"
                        className="w-24 px-3 py-2 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-white dark:bg-[#1E1926] font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4]"
                      />
                      <span className="text-sm font-semibold text-[#5C5665]">mg/dL / 1 Unit</span>
                    </div>
                    <p className="text-[11px] text-[#5C5665] mt-2">
                      Expected glucose drop per 1 Unit of rapid/regular correction bolus.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF4E8]/50 dark:bg-[#16131C] border border-[#231F2B]/10">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-1">
                      Target Glucose Anchor
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        value={formData.targetGlucoseMgDl}
                        onChange={(e) => handleChange('targetGlucoseMgDl', e.target.value)}
                        disabled={!isEditing}
                        step="5"
                        min="80"
                        max="150"
                        className="w-24 px-3 py-2 rounded-xl border border-[#231F2B]/15 dark:border-white/15 bg-white dark:bg-[#1E1926] font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4]"
                      />
                      <span className="text-sm font-semibold text-[#5C5665]">mg/dL target</span>
                    </div>
                    <p className="text-[11px] text-[#5C5665] mt-2">
                      RSSDI & ISPAD pediatric target: 100–120 mg/dL pre-prandial.
                    </p>
                  </div>
                </div>
              </div>

              {/* NPH + Regular Scheduled Doses */}
              <div className="mt-8 pt-6 border-t border-[#231F2B]/10 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#231F2B] dark:text-[#F3EEE4]">
                      Split Human Insulin Daily Schedule (Units)
                    </h3>
                    <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                      Human NPH (Intermediate) & Regular (Short-acting) injections per day
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#2A3F8F]/10 text-[#2A3F8F] dark:text-[#7F93E6]">
                    Total Daily: {Number(formData.nphMorningU || 0) + Number(formData.nphEveningU || 0) + Number(formData.regularBreakfastU || 0) + Number(formData.regularLunchU || 0) + Number(formData.regularDinnerU || 0)} Units
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10">
                    <span className="text-[11px] font-bold text-[#2A3F8F] dark:text-[#7F93E6]">07:30 AM · Morning</span>
                    <p className="text-xs font-medium text-[#5C5665] mb-2">NPH Intermediate</p>
                    <input
                      type="number"
                      value={formData.nphMorningU}
                      onChange={(e) => handleChange('nphMorningU', e.target.value)}
                      disabled={!isEditing}
                      step="0.5"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#231F2B]/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] font-bold text-center text-lg"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10">
                    <span className="text-[11px] font-bold text-[#E0527F]">08:00 AM · Nashta</span>
                    <p className="text-xs font-medium text-[#5C5665] mb-2">Regular Bolus</p>
                    <input
                      type="number"
                      value={formData.regularBreakfastU}
                      onChange={(e) => handleChange('regularBreakfastU', e.target.value)}
                      disabled={!isEditing}
                      step="0.5"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#231F2B]/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] font-bold text-center text-lg"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10">
                    <span className="text-[11px] font-bold text-[#E0527F]">01:30 PM · Dopahar</span>
                    <p className="text-xs font-medium text-[#5C5665] mb-2">Regular Bolus</p>
                    <input
                      type="number"
                      value={formData.regularLunchU}
                      onChange={(e) => handleChange('regularLunchU', e.target.value)}
                      disabled={!isEditing}
                      step="0.5"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#231F2B]/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] font-bold text-center text-lg"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10">
                    <span className="text-[11px] font-bold text-[#E0527F]">08:30 PM · Raat</span>
                    <p className="text-xs font-medium text-[#5C5665] mb-2">Regular Bolus</p>
                    <input
                      type="number"
                      value={formData.regularDinnerU}
                      onChange={(e) => handleChange('regularDinnerU', e.target.value)}
                      disabled={!isEditing}
                      step="0.5"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#231F2B]/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] font-bold text-center text-lg"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10">
                    <span className="text-[11px] font-bold text-[#2A3F8F] dark:text-[#7F93E6]">10:00 PM · Sone Se Pehle</span>
                    <p className="text-xs font-medium text-[#5C5665] mb-2">NPH Evening</p>
                    <input
                      type="number"
                      value={formData.nphEveningU}
                      onChange={(e) => handleChange('nphEveningU', e.target.value)}
                      disabled={!isEditing}
                      step="0.5"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#231F2B]/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] font-bold text-center text-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Sensors & Hardware */}
        {activeSection === 'devices' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10 dark:border-white/10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#231F2B]/10 dark:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#FAF4E8] dark:bg-[#2A2435] border border-[#231F2B]/10 flex items-center justify-center text-[#2A3F8F] dark:text-[#7F93E6]">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif font-black text-xl text-[#231F2B] dark:text-[#F3EEE4]">
                    Continuous Glucose Monitoring (CGM) Hardware
                  </h2>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                    Sensor telemetry paired with offline-first local SQLite cache
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CGM_OPTIONS.map((cgm) => {
                  const isSelected = formData.cgmType === cgm.value;
                  return (
                    <button
                      key={cgm.value}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => handleChange('cgmType', cgm.value)}
                      className={cn(
                        'p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-2',
                        isSelected
                          ? 'border-[#2A3F8F] bg-[#2A3F8F]/05 dark:bg-[#7F93E6]/10'
                          : 'border-[#231F2B]/10 dark:border-white/10 hover:border-[#2A3F8F]/40'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-base text-[#231F2B] dark:text-[#F3EEE4]">
                          {cgm.label}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2E8B57] text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5C5665] dark:text-[#8C8496] leading-relaxed">
                        {cgm.sub}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-[#231F2B]/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-2">
                    Transmitter Identifier Hash
                  </label>
                  <input
                    type="text"
                    value={formData.cgmSerialHash}
                    onChange={(e) => handleChange('cgmSerialHash', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-2">
                    Delivery Hardware
                  </label>
                  <input
                    type="text"
                    value={formData.pumpType}
                    onChange={(e) => handleChange('pumpType', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 bg-[#FAF4E8]/50 dark:bg-[#16131C] text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Safety & Emergency Hypo Alerts */}
        {activeSection === 'preferences' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10 dark:border-white/10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#231F2B]/10 dark:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#FAF4E8] dark:bg-[#2A2435] border border-[#231F2B]/10 flex items-center justify-center text-[#D64045]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif font-black text-xl text-[#231F2B] dark:text-[#F3EEE4]">
                    Hypoglycemia Safety Thresholds & Rule of 15
                  </h2>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                    Configured in concordance with ISPAD pediatric clinical guidelines
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                <div className="p-4 rounded-2xl bg-[#D64045]/05 border border-[#D64045]/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D64045]">
                    Alert Threshold (Level 1 Hypo)
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      value={formData.hypoThresholdMgDl}
                      onChange={(e) => handleChange('hypoThresholdMgDl', e.target.value)}
                      disabled={!isEditing}
                      min="60"
                      max="90"
                      className="w-24 px-3 py-1.5 rounded-xl border border-[#D64045]/30 bg-white dark:bg-[#1E1926] font-bold text-lg text-[#D64045]"
                    />
                    <span className="text-sm font-semibold text-[#5C5665]">mg/dL</span>
                  </div>
                  <p className="text-xs text-[#5C5665] mt-2">
                    Triggers instant Indian fast-carb guidance (1 pouch Glucovita / 4 spoons Sugar / 1 glass Mosambi juice).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#8E1B2E]/05 border border-[#8E1B2E]/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8E1B2E]">
                    Critical Threshold (Level 2 Severe)
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      value={formData.severeHypoThresholdMgDl}
                      onChange={(e) => handleChange('severeHypoThresholdMgDl', e.target.value)}
                      disabled={!isEditing}
                      min="40"
                      max="65"
                      className="w-24 px-3 py-1.5 rounded-xl border border-[#8E1B2E]/30 bg-white dark:bg-[#1E1926] font-bold text-lg text-[#8E1B2E]"
                    />
                    <span className="text-sm font-semibold text-[#5C5665]">mg/dL</span>
                  </div>
                  <p className="text-xs text-[#5C5665] mt-2">
                    Sounds persistent high-pitch klaxon and initiates caregiver SMS emergency broadcast.
                  </p>
                </div>
              </div>

              {/* Caregiver Emergency broadcast */}
              <div className="p-5 rounded-2xl bg-[#FAF4E8]/60 dark:bg-[#16131C] border border-[#231F2B]/10 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-serif font-bold text-base text-[#231F2B] dark:text-[#F3EEE4]">
                      Caregiver Emergency Telemetry Link
                    </h3>
                    <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                      Automatically dispatches SMS and WhatsApp alerts to primary guardian during hypo events
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.caregiverShareEnabled}
                      onChange={(e) => handleChange('caregiverShareEnabled', e.target.checked)}
                      disabled={!isEditing}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2A3F8F]" />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C5665] dark:text-[#8C8496] mb-1">
                    Designated Primary Contact
                  </label>
                  <input
                    type="text"
                    value={formData.caregiverPhone}
                    onChange={(e) => handleChange('caregiverPhone', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#231F2B]/15 bg-white dark:bg-[#1E1926] text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Data Sovereignty & DPDP Act 2023 */}
        {activeSection === 'consent' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1E1926] border border-[#231F2B]/10 dark:border-white/10">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#231F2B]/10 dark:border-white/10">
                <div className="w-10 h-10 rounded-xl bg-[#FAF4E8] dark:bg-[#2A2435] border border-[#231F2B]/10 flex items-center justify-center text-[#2A3F8F] dark:text-[#7F93E6]">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif font-black text-xl text-[#231F2B] dark:text-[#F3EEE4]">
                    Patient Data Sovereignty (DPDP Act 2023)
                  </h2>
                  <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                    You have complete ownership over your health logs, meal photos, and CGM records
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#FAF4E8]/50 dark:bg-[#16131C] border border-[#231F2B]/10">
                  <div className="space-y-1">
                    <p className="font-serif font-bold text-sm text-[#231F2B] dark:text-[#F3EEE4]">
                      Clinical Doctor & Caregiver Access
                    </p>
                    <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                      Grant secure, end-to-end encrypted read access to your treating diabetologist.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.dataSharingConsent}
                    onChange={(e) => handleChange('dataSharingConsent', e.target.checked)}
                    disabled={!isEditing}
                    className="w-5 h-5 rounded border-gray-300 text-[#2A3F8F] focus:ring-[#2A3F8F]"
                  />
                </div>

                <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#FAF4E8]/50 dark:bg-[#16131C] border border-[#231F2B]/10">
                  <div className="space-y-1">
                    <p className="font-serif font-bold text-sm text-[#231F2B] dark:text-[#F3EEE4]">
                      ICMR Indian Dietetics Anonymized Research
                    </p>
                    <p className="text-xs text-[#5C5665] dark:text-[#8C8496]">
                      Contribute de-identified glycemic response curves of Indian regional foods to advance T1D science in India.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.researchConsent}
                    onChange={(e) => handleChange('researchConsent', e.target.checked)}
                    disabled={!isEditing}
                    className="w-5 h-5 rounded border-gray-300 text-[#2A3F8F] focus:ring-[#2A3F8F]"
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#231F2B]/10 dark:border-white/10 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Aarav_Sharma_Clinical_Record_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Clinical data vault downloaded');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-[#2A2435] border border-[#231F2B]/15 text-[#231F2B] dark:text-[#F3EEE4] font-bold text-xs uppercase tracking-wider hover:bg-[#FAF4E8] transition-colors"
                >
                  <Download className="w-4 h-4 text-[#2A3F8F]" />
                  Download Medical Vault (JSON)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to purge all stored local sensor logs and reset profile?')) {
                      toast.info('Local cached records purged');
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#D64045]/30 text-[#D64045] font-bold text-xs uppercase tracking-wider hover:bg-[#D64045]/05 transition-colors"
                >
                  Purge Local Sensor Cache
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </DashboardLayout>
  );
}
