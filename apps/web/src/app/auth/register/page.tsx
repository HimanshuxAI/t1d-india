'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Syringe, Loader2, Eye, EyeOff, AlertCircle, CheckCircle, Shield, User, Mail, Lock, Calendar, Scale, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DIABETES_TYPES = ['T1D', 'T2D', 'LADA', 'MODY', 'OTHER'] as const;
const REGIMENS = ['BASAL_BOLUS', 'NPH_REGULAR', 'PREMIXED_30_70', 'PREMIXED_50_50', 'PUMP'] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Step 1: Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('male');

  // Step 3: Diabetes
  const [diabetesType, setDiabetesType] = useState('T1D');
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  // Step 4: Insulin
  const [insulinRegimen, setInsulinRegimen] = useState('NPH_REGULAR');
  const [icrGPerU, setIcrGPerU] = useState('10');
  const [isfMgDlPerU, setIsfMgDlPerU] = useState('50');
  const [targetGlucose, setTargetGlucose] = useState('110');

  const steps = [
    { number: 1, title: 'Account', icon: Mail },
    { number: 2, title: 'Profile', icon: User },
    { number: 3, title: 'Diabetes', icon: Heart },
    { number: 4, title: 'Insulin', icon: Syringe },
  ];

  const validateStep = (stepNum: number): boolean => {
    setFormError('');
    switch (stepNum) {
      case 1:
        if (!email || !email.includes('@')) { setFormError('Valid email required'); return false; }
        if (password.length < 8) { setFormError('Password must be at least 8 characters'); return false; }
        if (password !== confirmPassword) { setFormError('Passwords do not match'); return false; }
        return true;
      case 2:
        if (!firstName || !lastName) { setFormError('Name required'); return false; }
        if (!dateOfBirth) { setFormError('Date of birth required'); return false; }
        const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
        if (age < 1) { setFormError('Must be at least 1 year old'); return false; }
        return true;
      case 3:
        if (!diagnosisDate) { setFormError('Diagnosis date required'); return false; }
        if (!heightCm || !weightKg) { setFormError('Height and weight required'); return false; }
        return true;
      case 4:
        if (!icrGPerU || !isfMgDlPerU) { setFormError('ICR and ISF required'); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setIsLoading(true);
    try {
      // Simulate registration
      await new Promise(resolve => setTimeout(resolve, 1500));

      const userData = {
        email,
        firstName,
        lastName,
        dateOfBirth,
        gender,
        diabetesType,
        diagnosisDate,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        insulinRegimen,
        icrGPerU: Number(icrGPerU),
        isfMgDlPerU: Number(isfMgDlPerU),
        targetGlucose: Number(targetGlucose),
      };

      localStorage.setItem('t1d-auth', JSON.stringify({
        user: { email, name: `${firstName} ${lastName}`, ...userData },
        token: 'demo-token-' + Date.now(),
      }));

      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (error) {
      setFormError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s, i) => (
              <div key={s.number} className="flex flex-col items-center flex-1">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 text-sm font-medium transition-colors',
                  i + 1 < step ? 'bg-primary-600 text-white' :
                  i + 1 === step ? 'bg-primary-600 text-white' :
                  'bg-gray-200 dark:bg-gray-700 text-gray-500'
                )}>
                  {i + 1 < step ? <CheckCircle className="w-5 h-5" /> : s.icon}
                </div>
                <span className={cn('text-xs font-medium', i + 1 <= step ? 'text-gray-900 dark:text-white' : 'text-gray-400')}>
                  {s.title}
                </span>
              </div>
            ))}
            <div className="absolute top-5 left-1/4 right-1/4 h-1 bg-gray-200 dark:bg-gray-700 z-0">
              <div className={cn(
                'h-full bg-primary-600 transition-all duration-300',
                step === 1 ? 'w-0' :
                step === 2 ? 'w-1/3' :
                step === 3 ? 'w-2/3' : 'w-full'
              )} />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
            <Syringe className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h1>
          <p className="text-muted-foreground mt-2">Step {step} of 4</p>
        </div>

        {/* Form Error */}
        {formError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Account */}
          {step === 1 && (
            <div className="space-y-4" data-step="1">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5" /> Account Details
              </h3>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="input pr-10"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">At least 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="input pr-10"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">By creating an account, you agree to our Terms of Service and Privacy Policy.</p>
            </div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <div className="space-y-4" data-step="2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5" /> Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="input" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className="input" required max={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className="input" required>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Diabetes */}
          {step === 3 && (
            <div className="space-y-4" data-step="3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5" /> Diabetes Details
              </h3>
              <div>
                <label className="block text-sm font-medium mb-1">Diabetes Type</label>
                <select value={diabetesType} onChange={e => setDiabetesType(e.target.value)} className="input" required>
                  <option value="T1D">Type 1 Diabetes</option>
                  <option value="T2D">Type 2 Diabetes</option>
                  <option value="LADA">LADA</option>
                  <option value="MODY">MODY</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Diagnosis Date</label>
                  <input type="date" value={diagnosisDate} onChange={e => setDiagnosisDate(e.target.value)} className="input" required max={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Height (cm)</label>
                  <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} className="input" required min="50" max="250" step="0.1" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} className="input" required min="2" max="200" step="0.1" />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Insulin */}
          {step === 4 && (
            <div className="space-y-4" data-step="4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Syringe className="w-5 h-5" /> Insulin Regimen
              </h3>
              <div>
                <label className="block text-sm font-medium mb-2">Insulin Regimen</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { value: 'BASAL_BOLUS', label: 'Basal-Bolus', desc: 'Rapid + Long-acting' },
                    { value: 'NPH_REGULAR', label: 'NPH + Regular', desc: 'Human insulin (common in India)' },
                    { value: 'PREMIXED_30_70', label: 'Premixed 30/70', desc: '30% Regular + 70% NPH' },
                    { value: 'PREMIXED_50_50', label: 'Premixed 50/50', desc: '50% Regular + 50% NPH' },
                    { value: 'PUMP', label: 'Insulin Pump', desc: 'Continuous infusion' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setInsulinRegimen(opt.value)}
                      className={cn(
                        'p-4 rounded-lg border-2 text-left transition-colors',
                        insulinRegimen === opt.value
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ICR (g/U)</label>
                  <input type="number" value={icrGPerU} onChange={e => setIcrGPerU(e.target.value)} className="input" step="0.1" min="1" max="100" required placeholder="10" />
                  <p className="text-xs text-muted-foreground mt-1">Carbs per unit of rapid insulin</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ISF (mg/dL/U)</label>
                  <input type="number" value={isfMgDlPerU} onChange={e => setIsfMgDlPerU(e.target.value)} className="input" step="1" min="10" max="200" required placeholder="50" />
                  <p className="text-xs text-muted-foreground mt-1">mg/dL drop per unit of insulin</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Glucose (mg/dL)</label>
                  <input type="number" value={targetGlucose} onChange={e => setTargetGlucose(e.target.value)} className="input" min="70" max="180" required />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">You can adjust these later in Profile → Insulin Settings.</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            {step > 1 && (
              <button type="button" onClick={handleBack} className="btn-outline">
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={handleNext} className="btn-primary ml-auto">
                Next
              </button>
            ) : (
              <button type="submit" disabled={isLoading} className="btn-primary ml-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            )}
          </div>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <a href="/auth/login" className="text-primary-600 hover:underline font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}