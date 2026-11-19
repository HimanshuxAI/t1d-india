'use client';

import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  Utensils, Camera, Mic2, Search, Plus, X, Trash2,
  Clock, Calendar, MapPin, Smile, Loader2, CheckCircle
} from 'lucide-react';
import { useAuth } from '@/app/providers';

interface MealItem {
  id: string;
  foodId?: string;
  name: string;
  quantityG: number;
  prepMethod: string;
  carbsG: number;
  proteinG?: number;
  fatG?: number;
}

interface MealLoggingFormProps {
  onSuccess?: () => void;
  initialMealType?: string;
}

const PREP_METHODS = [
  'raw', 'boiled', 'steamed', 'fried', 'roasted', 'baked', 'pressure_cooked', 'sautéed'
] as const;

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout', 'bedtime'] as const;

const LOCATION_TYPES = ['home', 'work', 'school', 'restaurant', 'travel', 'other'] as const;

const INDIAN_REFERENCES = [
  { key: 'katori', label: 'Katori (150g)', grams: 150 },
  { key: 'small_katori', label: 'Small Katori (100g)', grams: 100 },
  { key: 'chapati', label: 'Chapati (30g)', grams: 30 },
  { key: 'small_chapati', label: 'Small Chapati (20g)', grams: 20 },
  { key: 'large_chapati', label: 'Large Chapati (40g)', grams: 40 },
  { key: 'tablespoon', label: 'Tablespoon (15g)', grams: 15 },
  { key: 'teaspoon', label: 'Teaspoon (5g)', grams: 5 },
  { key: 'ladle', label: 'Ladle (60g)', grams: 60 },
  { key: 'glass', label: 'Glass (200ml)', grams: 200 },
  { key: 'small_glass', label: 'Small Glass (150ml)', grams: 150 },
] as const;

export function MealLoggingForm({ onSuccess, initialMealType }: MealLoggingFormProps) {
  const { user } = useAuth();
  const [inputMethod, setInputMethod] = useState<'text' | 'voice' | 'photo' | 'composite'>('text');
  const [mealType, setMealType] = useState(initialMealType || 'lunch');
  const [mealTime, setMealTime] = useState(new Date().toISOString().slice(0, 16));
  const [locationType, setLocationType] = useState('home');
  const [hungerLevel, setHungerLevel] = useState(5);
  const [moodTag, setMoodTag] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<MealItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compositeMeals, setCompositeMeals] = useState<any[]>([]);
  const [showComposite, setShowComposite] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Search foods
  const searchFoods = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/foods/search?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setSearchResults(data);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, []);

  // Search composite meals
  const searchComposites = useCallback(async (q: string) => {
    if (!q.trim()) return;
    try {
      const res = await fetch(`/api/v1/foods/composite/list?mealType=${mealType}&limit=10`);
      const data = await res.json();
      setCompositeMeals(data);
    } catch (error) {
      console.error('Composite search failed:', error);
    }
  }, [mealType]);

  // Add food item
  const addItem = (food: any, quantityG?: number) => {
    const carbsPer100g = food.carbsPer100g || food.carbs_per_100g || 0;
    const proteinPer100g = food.proteinG || food.protein_per_100g || 0;
    const fatPer100g = food.fatG || food.fat_per_100g || 0;

    const qty = quantityG || food.typicalServingG || food.typical_serving_g || 100;
    const multiplier = qty / 100;

    const newItem: MealItem = {
      id: crypto.randomUUID(),
      foodId: food.id,
      name: food.nameLocalized || food.nameEn || food.name_en || food.name,
      quantityG: qty,
      prepMethod: 'boiled',
      carbsG: Math.round(carbsPer100g * multiplier * 10) / 10,
      proteinG: Math.round(proteinPer100g * multiplier * 10) / 10,
      fatG: Math.round(fatPer100g * multiplier * 10) / 10,
    };

    setItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    searchInputRef.current?.focus();
  };

  // Add composite meal
  const addCompositeMeal = (meal: any) => {
    if (!meal.components) return;

    meal.components.forEach((comp: any) => {
      const newItem: MealItem = {
        id: crypto.randomUUID(),
        foodId: comp.foodId,
        name: comp.name,
        quantityG: comp.quantityG,
        prepMethod: comp.prepMethod || 'boiled',
        carbsG: comp.carbsG,
        proteinG: comp.proteinG,
        fatG: comp.fatG,
      };
      setItems(prev => [...prev, newItem]);
    });
    setShowComposite(false;
    toast.success(`Added ${meal.nameEn || meal.name_en}`);
  });

  // Remove item
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Update item quantity
  const updateQuantity = (id: string, quantityG: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const food = searchResults.find(f => f.id === item.foodId) ||
                   compositeMeals.find(m => m.components?.some((c: any) => c.foodId === item.foodId))?.components?.find((c: any) => c.foodId === item.foodId);
      const carbsPer100g = food?.carbsPer100g || food?.carbs_per_100g || 0;
      const proteinPer100g = food?.proteinG || food?.protein_per_100g || 0;
      const fatPer100g = food?.fatG || food?.fat_per_100g || 0;
      const multiplier = quantityG / 100;
      return {
        ...item,
        quantityG,
        carbsG: Math.round(carbsPer100g * multiplier * 10) / 10,
        proteinG: Math.round(proteinPer100g * multiplier * 10) / 10,
        fatG: Math.round(fatPer100g * multiplier * 10) / 10,
      };
    }));
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        formData.append('language', 'hi-IN');

        try {
          const res = await fetch('/api/v1/meals/voice', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.items) {
            data.items.forEach((item: any) => addItem(item));
          }
          toast.success('Voice logged!');
        } catch (error) {
          toast.error('Voice recognition failed');
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // Photo capture
  const handlePhotoCapture = async (file: File) => {
    setPhotoPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/v1/meals/photo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.items) {
        data.items.forEach((item: any) => addItem(item));
      }
      toast.success('Photo analyzed!');
    } catch (error) {
      toast.error('Photo analysis failed');
    } finally {
      setPhotoPreview(null);
    }
  };

  // Submit meal
  const submitMutation = useMutation({
    mutationFn: async () => {
      const totalCarbs = items.reduce((sum, item) => sum + item.carbsG, 0);
      const totalProtein = items.reduce((sum, item) => sum + (item.proteinG || 0), 0);
      const totalFat = items.reduce((sum, item) => sum + (item.fatG || 0), 0);

      const res = await fetch('/api/v1/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealTime,
          mealType,
          items: items.map(item => ({
            foodId: item.foodId,
            name: item.name,
            quantityG: item.quantityG,
            prepMethod: item.prepMethod,
            carbsOverrideG: item.carbsG,
          })),
          inputMethod: inputMethod === 'text' ? 'TEXT_SEARCH' :
                       inputMethod === 'voice' ? 'VOICE' :
                       inputMethod === 'photo' ? 'PHOTO_ML' :
                       'COMPOSITE_SELECT',
          locationType,
          hungerLevel,
          moodTag,
          notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to log meal');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Meal logged!');
      setItems([]);
      setNotes('');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = () => {
    if (items.length === 0) {
      toast.error('Add at least one food item');
      return;
    }
    submitMutation.mutate();
  };

  const resetForm = () => {
    setItems([]);
    setNotes('');
  };

  // Totals
  const totalCarbs = items.reduce((sum, item) => sum + item.carbsG, 0);
  const totalProtein = items.reduce((sum, item) => sum + (item.proteinG || 0), 0);
  const totalFat = items.reduce((sum, item) => sum + (item.fatG || 0), 0);

  return (
    <div className="space-y-6">
      {/* Input method tabs */}
      <div className="flex gap-1 bg-surface-soft rounded-xl p-1">
        {[
          { id: 'text', label: 'Search', icon: Search },
          { id: 'voice', label: 'Voice', icon: Mic2 },
          { id: 'photo', label: 'Photo', icon: Camera },
          { id: 'composite', label: 'Thali', icon: Utensils },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setInputMethod(tab.id as any);
              if (tab.id === 'composite') searchComposites('');
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              inputMethod === tab.id
                ? 'bg-card text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Meal details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Meal Type</label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="input"
          >
            {MEAL_TYPES.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time</label>
          <input
            type="datetime-local"
            value={mealTime}
            onChange={(e) => setMealTime(e.target.value)}
            className="input"
            max={new Date().toISOString().slice(0, 16)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <select
            value={locationType}
            onChange={(e) => setLocationType(e.target.value))
            className="input"
          >
            {LOCATION_TYPES.map(loc => (
              <option key={loc} value={loc}>
                {loc.charAt(0).toUpperCase() + loc.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Input method content */}
      <div className="card">
        <div className="card-content pt-0">
          {inputMethod === 'text' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchFoods(e.target.value);
                  }}
                  onFocus={() => setShowSearchResults(searchQuery.length >= 2)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  placeholder="Search foods (rajma, dosa, चावल, રોટલી...)"
                  className="input pl-10"
                  autoComplete="off"
                />
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 max-h-60 overflow-y-auto bg-card rounded-lg border border-border shadow-lg">
                    {searchResults.map((food) => (
                      <button
                        key={food.id}
                        onClick={() => addItem(food)}
                        className="w-full px-4 py-3 text-left hover:bg-surface-soft transition-colors flex items-center justify-between border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">{food.name}</p>
                          <p className="text-sm text-text-muted">
                            {food.category} • {food.carbsPer100g}g carbs/100g
                            {food.typicalServingG && ` • ${food.typicalServingG}g serving`}
                          </p>
                        </div>
                        <span className="text-primary font-bold">{food.carbsPer100g}g</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick reference objects */}
              <div>
                <label className="block text-sm font-medium mb-2">Quick Portion</label>
                <div className="flex flex-wrap gap-2">
                  {INDIAN_REFERENCES.map((ref) => (
                    <button
                      key={ref.key}
                      type="button"
                      onClick={() => {
                        const food = searchResults[0];
                        if (food) addItem(food, ref.grams);
                      }}
                      disabled={searchResults.length === 0}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-sm transition-colors',
                        searchResults.length === 0
                          ? 'border-border text-text-muted cursor-not-allowed'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      )}
                    >
                      {ref.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {inputMethod === 'voice' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center transition-all',
                isRecording
                  ? 'bg-glucose-very-low/10 animate-pulse ring-4 ring-glucose-very-low/30'
                  : 'bg-surface-soft'
              )}>
                <Mic2 className={cn('w-12 h-12', isRecording ? 'text-glucose-very-low' : 'text-text-muted')} />
              </div>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  'btn-primary px-8 py-3 text-lg',
                  isRecording && 'bg-glucose-very-low hover:bg-glucose-very-low/90'
                )}
              >
                {isRecording ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Stop Recording
                  </>
                ) : (
                  'Start Recording'
                )}
              </button>
              <p className="text-sm text-text-muted text-center max-w-xs">
                {isRecording
                  ? 'Speak your meal in Hindi/English/Hinglish...'
                  : 'Say things like "ek plate rajma chawal" or "two chapatis with dal"'}
              </p>
              <p className="text-xs text-text-muted">
                Supports Hindi, English, and Hinglish
              </p>
            </div>
          )}

          {inputMethod === 'photo' && (
            <div className="space-y-4">
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                  photoPreview ? 'border-primary border-solid bg-primary/5' : 'border-dashed'
                )}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) handlePhotoCapture(e.dataTransfer.files[0]);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => e.target.files[0] && handlePhotoCapture(e.target.files[0])}
                  className="hidden"
                  id="photo-input"
                />
                {photoPreview ? (
                  <div className="relative max-w-xs mx-auto">
                    <img src={photoPreview} alt="Meal preview" className="rounded-lg max-h-64" />
                    <button
                      onClick={() => setPhotoPreview(null)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-glucose-very-low text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Camera className="w-12 h-12 mx-auto text-text-muted mb-3" />
                    <p className="text-lg font-medium">Take a photo of your meal</p>
                    <p className="text-sm text-text-muted">Or tap to choose from gallery</p>
                    <button
                      onClick={() => document.getElementById('photo-input')?.click()}
                      className="mt-4 btn-outline"
                    >
                      Choose Photo
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {inputMethod === 'composite' && (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Select a complete thali/meal combo
              </p>
              {compositeMeals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                  {compositeMeals.map((meal) => (
                    <button
                      key={meal.id}
                      onClick={() => addCompositeMeal(meal)}
                      className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-left transition-colors"
                    >
                      <p className="font-medium">{meal.nameEn || meal.name_en}</p>
                      {meal.nameHi && <p className="text-sm text-text-muted">({meal.nameHi})</p>}
                      <p className="text-sm text-primary mt-1">
                        {meal.totalCarbsG}g carbs • {meal.servings} serving
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-text-muted py-8">No composite meals for this meal type</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Current items */}
      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Your Meal ({items.length} items)</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-primary font-bold">{totalCarbs}g</span>
              <span className="text-text-muted">carbs</span>
              <span className="text-secondary font-medium">{totalProtein.toFixed(1)}g</span>
              <span className="text-text-muted">protein</span>
              <span className="text-warning font-medium">{totalFat.toFixed(1)}g</span>
              <span className="text-text-muted">fat</span>
            </div>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-surface-soft flex items-center justify-center">
                  <span className="text-xl">{getInputMethodIcon(item.source || 'manual')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-sm text-text-muted">
                    {item.quantityG}g • {item.prepMethod} • {item.carbsG}g carbs
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantityG - 10))}
                    className="w-8 h-8 rounded border hover:bg-surface-soft transition-colors"
                  >
                    <span className="text-lg">−</span>
                  </button>
                  <span className="w-16 text-center font-medium">{item.quantityG}g</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantityG + 10)}
                    className="w-8 h-8 rounded border hover:bg-surface-soft transition-colors"
                  >
                    <span className="text-lg">+</span>
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-2 p-1 text-glucose-very-low hover:bg-glucose-very-low/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional context */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Hunger Level</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="10"
              value={hungerLevel}
              onChange={(e) => setHungerLevel(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-8 text-center font-medium">{hungerLevel}/10</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mood</label>
          <input
            type="text"
            value={moodTag}
            onChange={(e) => setMoodTag(e.target.value))
            placeholder="happy, stressed, tired..."
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value))
          placeholder="Anything else? (ate late, felt sick, etc.)"
          rows={3}
          className="input"
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleSubmit}
          disabled={submitMutation.isPending || items.length === 0}
          className="flex-1 btn-primary py-3"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Logging...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Log Meal ({totalCarbs}g carbs)
            </>
          )}
        </button>
        <button
          type="button"
          onClick={resetForm}
          className="btn-outline px-6"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function getInputMethodIcon(method: string): string {
  switch (method) {
    case 'PHOTO_ML':
    case 'PHOTO_OCR':
      return '📷';
    case 'VOICE':
      return '🎤';
    case 'COMPOSITE_SELECT':
      return '🍽️';
    case 'BARCODE':
      return '📱';
    default:
      return '✏️';
  }
}