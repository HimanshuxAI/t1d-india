/**
 * Internationalization (i18n) for T1D India
 * Supports 10+ Indian languages with proper RTL support, number formatting, and cultural adaptations.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false, locale: 'en-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false, locale: 'hi-IN', script: 'Devanagari' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', rtl: false, locale: 'ta-IN', script: 'Tamil' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', rtl: false, locale: 'te-IN', script: 'Telugu' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', rtl: false, locale: 'mr-IN', script: 'Devanagari' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', rtl: false, locale: 'gu-IN', script: 'Gujarati' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false, locale: 'bn-IN', script: 'Bengali' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', rtl: false, locale: 'pa-IN', script: 'Gurmukhi' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', rtl: false, locale: 'kn-IN', script: 'Kannada' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', rtl: false, locale: 'ml-IN', script: 'Malayalam' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', rtl: false, locale: 'or-IN', script: 'Odia' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', rtl: false, locale: 'as-IN', script: 'Assamese' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

// Translation keys
type TranslationKeys = 
  // Common
  | 'app.name'
  | 'app.tagline'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.add'
  | 'common.search'
  | 'common.filter'
  | 'common.sort'
  | 'common.loading'
  | 'common.error'
  | 'common.success'
  | 'common.warning'
  | 'common.info'
  | 'common.confirm'
  | 'common.yes'
  | 'common.no'
  | 'common.ok'
  | 'common.close'
  | 'common.back'
  | 'common.next'
  | 'common.previous'
  | 'common.done'
  | 'common.skip'
  | 'common.retry'
  | 'common.offline'
  | 'common.online'
  | 'common.sync'
  | 'common.settings'
  | 'common.profile'
  | 'common.logout'
  | 'common.login'
  | 'common.register'
  | 'common.welcome'
  | 'common.language'
  | 'common.theme'
  | 'common.notifications'
  | 'common.help'
  | 'common.about'
  | 'common.version'
  
  // Auth
  | 'auth.email'
  | 'auth.password'
  | 'auth.confirm_password'
  | 'auth.forgot_password'
  | 'auth.reset_password'
  | 'auth.sign_in'
  | 'auth.sign_up'
  | 'auth.sign_out'
  | 'auth.remember_me'
  | 'auth.verification_code'
  | 'auth.resend_code'
  | 'auth.invalid_credentials'
  | 'auth.account_locked'
  | 'auth.session_expired'
  
  // Dashboard
  | 'dashboard.title'
  | 'dashboard.current_glucose'
  | 'dashboard.time_in_range'
  | 'dashboard.average_glucose'
  | 'dashboard.gmi'
  | 'dashboard.variability'
  | 'dashboard.trend'
  | 'dashboard.last_updated'
  | 'dashboard.quick_actions'
  | 'dashboard.recent_meals'
  | 'dashboard.insulin_calculator'
  | 'dashboard.hypo_alerts'
  | 'dashboard.cgm_connection'
  
  // Glucose/CGM
  | 'glucose.mg_dl'
  | 'glucose.mmol_l'
  | 'glucose.current'
  | 'glucose.trend'
  | 'glucose.trend_double_up'
  | 'glucose.trend_single_up'
  | 'glucose.trend_stable'
  | 'glucose.trend_single_down'
  | 'glucose.trend_double_down'
  | 'glucose.time_in_range'
  | 'glucose.very_low'
  | 'glucose.low'
  | 'glucose.in_range'
  | 'glucose.high'
  | 'glucose.very_high'
  | 'glucose.low_alert'
  | 'glucose.high_alert'
  | 'glucose.rapid_rise'
  | 'glucose.rapid_fall'
  | 'glucose.signal_loss'
  | 'glucose.calibration_needed'
  | 'glucose.sensor_warmup'
  | 'glucose.sensor_expired'
  | 'glucose.no_data'
  | 'glucose.last_reading'
  | 'glucose.ago'
  | 'glucose.now'
  
  // Meals
  | 'meals.title'
  | 'meals.log_meal'
  | 'meals.meal_type'
  | 'meals.breakfast'
  | 'meals.lunch'
  | 'meals.dinner'
  | 'meals.snack'
  | 'meals.pre_workout'
  | 'meals.post_workout'
  | 'meals.bedtime'
  | 'meals.search_food'
  | 'meals.scan_photo'
  | 'meals.voice_input'
  | 'meals.composite_meals'
  | 'meals.favorites'
  | 'meals.recent'
  | 'meals.history'
  | 'meals.analytics'
  | 'meals.add_item'
  | 'meals.remove_item'
  | 'meals.quantity'
  | 'meals.preparation'
  | 'meals.carbs'
  | 'meals.protein'
  | 'meals.fat'
  | 'meals.fiber'
  | 'meals.total_carbs'
  | 'meals.total_nutrition'
  | 'meals.absorption_profile'
  | 'meals.rapid_absorption'
  | 'meals.intermediate_absorption'
  | 'meals.slow_absorption'
  | 'meals.glycemic_index'
  | 'meals.glycemic_load'
  | 'meals.portion_estimation'
  | 'meals.reference_objects'
  | 'meals.katori'
  | 'meals.chapati'
  | 'meals.tablespoon'
  | 'meals.teaspoon'
  | 'meals.ladle'
  | 'meals.glass'
  
  // Insulin
  | 'insulin.title'
  | 'insulin.calculator'
  | 'insulin.history'
  | 'insulin.summary'
  | 'insulin.log_dose'
  | 'insulin.current_glucose'
  | 'insulin.carbs'
  | 'insulin.icr'
  | 'insulin.isf'
  | 'insulin.target_glucose'
  | 'insulin.meal_bolus'
  | 'insulin.correction_bolus'
  | 'insulin.total_bolus'
  | 'insulin.max_bolus'
  | 'insulin.iob'
  | 'insulin.iob_rapid'
  | 'insulin.iob_regular'
  | 'insulin.iob_nph'
  | 'insulin.regimen'
  | 'insulin.regimen_basal_bolus'
  | 'insulin.regimen_nph_regular'
  | 'insulin.regimen_premixed'
  | 'insulin.regimen_pump'
  | 'insulin.insulin_type'
  | 'insulin.rapid_acting'
  | 'insulin.regular_human'
  | 'insulin.nph_human'
  | 'insulin.premixed'
  | 'insulin.glarvine'
  | 'insulin.degludec'
  | 'insulin.dose'
  | 'insulin.injection_site'
  | 'insulin.abdomen'
  | 'insulin.thigh'
  | 'insulin.arm'
  | 'insulin.buttock'
  | 'insulin.pump_site'
  | 'insulin.delivery_method'
  | 'insulin.pen'
  | 'insulin.syringe'
  | 'insulin.pump'
  | 'insulin.inhaler'
  | 'insulin.recent_hypo_warning'
  | 'insulin.high_iob_warning'
  | 'insulin.predicted_low_warning'
  | 'insulin.safety_check'
  | 'insulin.explanation'
  | 'insulin.warnings'
  
  // Alerts
  | 'alerts.title'
  | 'alerts.hypo_warning'
  | 'alerts.hypo_urgent'
  | 'alerts.hypo_emergency'
  | 'alerts.hyper_warning'
  | 'alerts.rapid_drop'
  | 'alerts.rapid_rise'
  | 'alerts.signal_loss'
  | 'alerts.action_required'
  | 'alerts.eat_carbs'
  | 'alerts.check_glucose'
  | 'alerts.contact_emergency'
  | 'alerts.acknowledge'
  | 'alerts.dismiss'
  | 'alerts.snooze'
  | 'alerts.carbs_options'
  | 'alerts.glucose_tablets'
  | 'alerts.fruit_juice'
  | 'alerts.sugar'
  | 'alerts.honey'
  | 'alerts.soda'
  | 'alerts.banana'
  | 'alerts.dates'
  | 'alerts.raisins'
  | 'alerts.acknowledged_by'
  | 'alerts.acknowledged_at'
  | 'alerts.escalated'
  | 'alerts.resolved'
  
  // Family
  | 'family.title'
  | 'family.members'
  | 'family.invite_member'
  | 'family.relationship'
  | 'family.parent'
  | 'family.child'
  | 'family.spouse'
  | 'family.sibling'
  | 'family.grandparent'
  | 'family.caregiver'
  | 'family.doctor'
  | 'family.nurse'
  | 'family.other'
  | 'family.permissions'
  | 'family.escalation_level'
  | 'family.primary_caregiver'
  | 'family.emergency_contact'
  | 'family.invite_sent'
  | 'family.invite_accepted'
  | 'family.invite_pending'
  | 'family.remove_member'
  | 'family.alerts'
  | 'family.checkins'
  | 'family.schedule_checkin'
  | 'family.complete_checkin'
  | 'family.missed_checkin'
  | 'family.settings'
  | 'family.auto_escalate'
  | 'family.escalation_timeout'
  | 'family.emergency_services'
  | 'family.share_glucose'
  | 'family.share_insulin'
  | 'family.share_meals'
  | 'family.share_activity'
  
  // Profile
  | 'profile.title'
  | 'profile.clinical'
  | 'profile.insulin'
  | 'profile.devices'
  | 'profile.preferences'
  | 'profile.consent'
  | 'profile.personal_info'
  | 'profile.date_of_birth'
  | 'profile.gender'
  | 'profile.height'
  | 'profile.weight'
  | 'profile.diabetes_type'
  | 'profile.diagnosis_date'
  | 'profile.hba1c'
  | 'profile.hba1c_date'
  | 'profile.insulin_regimen'
  | 'profile.icr'
  | 'profile.isf'
  | 'profile.target_glucose'
  | 'profile.basal_rate'
  | 'profile.nph_doses'
  | 'profile.regular_doses'
  | 'profile.cgm_type'
  | 'profile.cgm_serial'
  | 'profile.pump_type'
  | 'profile.hypo_threshold'
  | 'profile.severe_hypo_threshold'
  | 'profile.alert_sound'
  | 'profile.caregiver_share'
  | 'profile.data_sharing'
  | 'profile.research_consent'
  | 'profile.marketing_consent'
  | 'profile.export_data'
  | 'profile.delete_account'
  
  // Settings
  | 'settings.title'
  | 'settings.general'
  | 'settings.notifications'
  | 'settings.appearance'
  | 'settings.data_sync'
  | 'settings.security'
  | 'settings.about'
  | 'settings.language'
  | 'settings.timezone'
  | 'settings.units'
  | 'settings.date_format'
  | 'settings.time_format'
  | 'settings.auto_sync'
  | 'settings.sync_frequency'
  | 'settings.wifi_only_sync'
  | 'settings.data_retention'
  | 'settings.export_format'
  | 'settings.theme'
  | 'settings.compact_mode'
  | 'settings.high_contrast'
  | 'settings.large_text'
  | 'settings.reduced_motion'
  | 'settings.push_enabled'
  | 'settings.email_enabled'
  | 'settings.hypo_alerts'
  | 'settings.hyper_alerts'
  | 'settings.meal_reminders'
  | 'settings.insulin_reminders'
  | 'settings.weekly_report'
  | 'settings.theme_light'
  | 'settings.theme_dark'
  | 'settings.theme_system'
  | 'settings.biometric_auth'
  | 'settings.two_factor'
  | 'settings.session_timeout'
  | 'settings.change_password'
  | 'settings.manage_sessions'
  | 'settings.delete_account'
  | 'settings.privacy_policy'
  | 'settings.terms_of_service'
  | 'settings.documentation'
  | 'settings.report_bug'
  | 'settings.feature_request'
  | 'settings.acknowledgments'
  | 'settings.licenses'
  
  // Foods
  | 'foods.title'
  | 'foods.search'
  | 'foods.categories'
  | 'foods.composite_meals'
  | 'foods.favorites'
  | 'foods.nutrition_info'
  | 'foods.glycemic_index'
  | 'foods.glycemic_load'
  | 'foods.serving_size'
  | 'foods.reference_objects'
  | 'foods.preparation_methods'
  | 'foods.raw'
  | 'foods.boiled'
  | 'foods.steamed'
  | 'foods.fried'
  | 'foods.roasted'
  | 'foods.baked'
  | 'foods.pressure_cooked'
  | 'foods.sauteed'
  | 'foods.grilled'
  
  // Units
  | 'units.mg_dl'
  | 'units.mmol_l'
  | 'units.grams'
  | 'units.kilograms'
  | 'units.centimeters'
  | 'units.units'
  | 'units.minutes'
  | 'units.hours'
  | 'units.days'
  | 'units.weeks'
  | 'units.months'
  
  // Time
  | 'time.now'
  | 'time.minute_ago'
  | 'time.minutes_ago'
  | 'time.hour_ago'
  | 'time.hours_ago'
  | 'time.yesterday'
  | 'time.days_ago'
  | 'time.week_ago'
  | 'time.month_ago'
  | 'time.just_now'
  
  // Accessibility
  | 'a11y.skip_to_main'
  | 'a11y.skip_to_navigation'
  | 'a11y.open_menu'
  | 'a11y.close_menu'
  | 'a11y.loading'
  | 'a11y.error'
  | 'a11y.required_field'
  | 'a11y.optional_field'
  | 'a11y.invalid_input'
  | 'a11y.password_visible'
  | 'a11y.password_hidden';

type Translations = Record<TranslationKeys, string>;

const translations: Record<LanguageCode, Partial<Translations>> = {
  en: {},
  
  hi: {
    'app.name': 'T1D इंडिया',
    'app.tagline': 'भारतीय T1D आहार के लिए AI-संचालित हाइपोग्लाइसीमिया पूर्वानुमान और कार्ब-काउंटिंग',
    'common.save': 'सेव करें',
    'common.cancel': 'रद्द करें',
    'common.delete': 'हटाएं',
    'common.edit': 'संपादित करें',
    'common.add': 'जोड़ें',
    'common.search': 'खोजें',
    'common.filter': 'फिल्टर',
    'common.sort': 'क्रमबद्ध करें',
    'common.loading': 'लोड हो रहा है...',
    'common.error': 'त्रुटि',
    'common.success': 'सफलता',
    'common.warning': 'चेतावनी',
    'common.info': 'जानकारी',
    'common.confirm': 'पुष्टि करें',
    'common.yes': 'हाँ',
    'common.no': 'नहीं',
    'common.ok': 'ठीक है',
    'common.close': 'बंद करें',
    'common.back': 'वापस',
    'common.next': 'आगे',
    'common.previous': 'पिछला',
    'common.done': 'पूर्ण',
    'common.skip': 'छोड़ें',
    'common.retry': 'पुनः प्रयास करें',
    'common.offline': 'ऑफ़लाइन',
    'common.online': 'ऑनलाइन',
    'common.sync': 'सिंक',
    'common.settings': 'सेटिंग्स',
    'common.profile': 'प्रोफाइल',
    'common.logout': 'लॉगआउट',
    'common.login': 'लॉगिन',
    'common.register': 'रजिस्टर',
    'common.welcome': 'स्वागत है',
    'common.language': 'भाषा',
    'common.theme': 'थीम',
    'common.notifications': 'सूचनाएं',
    'common.help': 'मदद',
    'common.about': 'के बारे में',
    'common.version': 'संस्करण',
    
    'auth.email': 'ईमेल',
    'auth.password': 'पासवर्ड',
    'auth.confirm_password': 'पासवर्ड की पुष्टि करें',
    'auth.forgot_password': 'पासवर्ड भूल गए?',
    'auth.reset_password': 'पासवर्ड रीसेट करें',
    'auth.sign_in': 'साइन इन करें',
    'auth.sign_up': 'साइन अप करें',
    'auth.sign_out': 'साइन आउट',
    'auth.remember_me': 'मुझे याद रखें',
    'auth.verification_code': 'सत्यापन कोड',
    'auth.resend_code': 'कोड फिर से भेजें',
    'auth.invalid_credentials': 'अमान्य क्रेडेंशियल्स',
    'auth.account_locked': 'खाता लॉक्ड',
    'auth.session_expired': 'सत्र समाप्त',
    
    'dashboard.title': 'डैशबोर्ड',
    'dashboard.current_glucose': 'वर्तमान ग्लूकोज',
    'dashboard.time_in_range': 'रेंज में समय',
    'dashboard.average_glucose': 'औसत ग्लूकोज',
    'dashboard.gmi': 'GMI',
    'dashboard.variability': 'वेरिएबिलिटी',
    'dashboard.trend': 'ट्रेंड',
    'dashboard.last_updated': 'अंतिम अपडेट',
    'dashboard.quick_actions': 'त्वरित कार्य',
    'dashboard.recent_meals': 'हाल के भोजन',
    'dashboard.insulin_calculator': 'इंसुलिन कैलकुलेटर',
    'dashboard.hypo_alerts': 'हाइपो अलर्ट',
    'dashboard.cgm_connection': 'CGM कनेक्शन',
    
    'glucose.mg_dl': 'मिलीग्राम/डीएल',
    'glucose.mmol_l': 'मिलीमोल/लीटर',
    'glucose.current': 'वर्तमान',
    'glucose.trend': 'ट्रेंड',
    'glucose.trend_double_up': 'तेजी से बढ़ रहा',
    'glucose.trend_single_up': 'बढ़ रहा',
    'glucose.trend_stable': 'स्थिर',
    'glucose.trend_single_down': 'घट रहा',
    'glucose.trend_double_down': 'तेजी से घट रहा',
    'glucose.time_in_range': 'रेंज में समय',
    'glucose.very_low': 'बहुत कम',
    'glucose.low': 'कम',
    'glucose.in_range': 'रेंज में',
    'glucose.high': 'उच्च',
    'glucose.very_high': 'बहुत उच्च',
    'glucose.low_alert': 'कम ग्लूकोज अलर्ट',
    'glucose.high_alert': 'उच्च ग्लूकोज अलर्ट',
    'glucose.rapid_rise': 'तेजी से वृद्धि',
    'glucose.rapid_fall': 'तेजी से गिरावट',
    'glucose.signal_loss': 'सिग्नल हानि',
    'glucose.calibration_needed': 'कैलिब्रेशन आवश्यक',
    'glucose.sensor_warmup': 'सेंसर वार्मअप',
    'glucose.sensor_expired': 'सेंसर समाप्त',
    'glucose.no_data': 'कोई डेटा नहीं',
    'glucose.last_reading': 'अंतिम रीडिंग',
    'glucose.ago': 'पहले',
    'glucose.now': 'अभी',
    
    'meals.title': 'भोजन',
    'meals.log_meal': 'भोजन लॉग करें',
    'meals.meal_type': 'भोजन का प्रकार',
    'meals.breakfast': 'नाश्ता',
    'meals.lunch': 'दोपहर का भोजन',
    'meals.dinner': 'रात का खाना',
    'meals.snack': 'स्नैक',
    'meals.pre_workout': 'प्री-वर्कआउट',
    'meals.post_workout': 'पोस्ट-वर्कआउट',
    'meals.bedtime': 'सोने से पहले',
    'meals.search_food': 'खाना खोजें',
    'meals.scan_photo': 'फोटो स्कैन करें',
    'meals.voice_input': 'आवाज से इनपुट',
    'meals.composite_meals': 'मिश्रित भोजन',
    'meals.favorites': 'पसंदीदा',
    'meals.recent': 'हाल के',
    'meals.history': 'इतिहास',
    'meals.analytics': 'विश्लेषण',
    'meals.add_item': 'आइटम जोड़ें',
    'meals.remove_item': 'हटाएं',
    'meals.quantity': 'मात्रा',
    'meals.preparation': 'तैयारी',
    'meals.carbs': 'कार्ब्स',
    'meals.protein': 'प्रोटीन',
    'meals.fat': 'वसा',
    'meals.fiber': 'फाइबर',
    'meals.total_carbs': 'कुल कार्ब्स',
    'meals.total_nutrition': 'कुल पोषण',
    'meals.absorption_profile': 'अवशोषण प्रोफाइल',
    'meals.rapid_absorption': 'तीव्र अवशोषण',
    'meals.intermediate_absorption': 'मध्यम अवशोषण',
    'meals.slow_absorption': 'धीमा अवशोषण',
    'meals.glycemic_index': 'ग्लाइसेमिक इंडेक्स',
    'meals.glycemic_load': 'ग्लाइसेमिक लोड',
    'meals.portion_estimation': 'भाग का अनुमान',
    'meals.reference_objects': 'संदर्भ वस्तुएं',
    'meals.katori': 'कटोरी',
    'meals.chapati': 'रोटी',
    'meals.tablespoon': 'बड़ा चम्मच',
    'meals.teaspoon': 'छोटा चम्मच',
    'meals.ladle': 'छलनी/कलछी',
    'meals.glass': 'गिलास',
    
    'insulin.title': 'इंसुलिन',
    'insulin.calculator': 'कैलकुलेटर',
    'insulin.history': 'इतिहास',
    'insulin.summary': 'सारांश',
    'insulin.log_dose': 'डोज लॉग करें',
    'insulin.current_glucose': 'वर्तमान ग्लूकोज',
    'insulin.carbs': 'कार्ब्स',
    'insulin.icr': 'ICR (कार्ब-इंसुलिन अनुपात)',
    'insulin.isf': 'ISF (इंसुलिन संवेदनशीलता कारक)',
    'insulin.target_glucose': 'लक्ष्य ग्लूकोज',
    'insulin.meal_bolus': 'भोजन बोलस',
    'insulin.correction_bolus': 'सुधार बोलस',
    'insulin.total_bolus': 'कुल बोलस',
    'insulin.max_bolus': 'अधिकतम बोलस',
    'insulin.iob': 'IOB (सक्रिय इंसुलिन)',
    'insulin.iob_rapid': 'तेज़ इंसुलिन IOB',
    'insulin.iob_regular': 'रेगुलर इंसुलिन IOB',
    'insulin.iob_nph': 'NPH इंसुलिन IOB',
    'insulin.regimen': 'इंसुलिन रेजिमेन',
    'insulin.regimen_basal_bolus': 'बेसल-बोलस',
    'insulin.regimen_nph_regular': 'NPH + रेगुलर',
    'insulin.regimen_premixed': 'प्रीमिक्स्ड',
    'insulin.regimen_pump': 'इंसुलिन पंप',
    'insulin.insulin_type': 'इंसुलिन प्रकार',
    'insulin.rapid_acting': 'तेज़ असर वाला',
    'insulin.regular_human': 'मानव रेगुलर',
    'insulin.nph_human': 'मानव NPH',
    'insulin.premixed': 'प्रीमिक्स्ड',
    'insulin.glarvine': 'ग्लार्गिन',
    'insulin.degludec': 'डिग्लूडेक',
    'insulin.dose': 'डोज',
    'insulin.injection_site': 'इंजेक्शन साइट',
    'insulin.abdomen': 'पेट',
    'insulin.thigh': 'जांघ',
    'insulin.arm': 'बांह',
    'insulin.buttock': 'नितंब',
    'insulin.pump_site': 'पंप साइट',
    'insulin.delivery_method': 'डिलीवरी विधि',
    'insulin.pen': 'पेन',
    'insulin.syringe': 'सिरिंज',
    'insulin.pump': 'पंप',
    'insulin.inhaler': 'इनहेलर',
    'insulin.recent_hypo_warning': 'हाल ही में हाइपो की चेतावनी',
    'insulin.high_iob_warning': 'उच्च IOB की चेतावनी',
    'insulin.predicted_low_warning': 'अनुमानित कम ग्लूकोज की चेतावनी',
    'insulin.safety_check': 'सुरक्षा जांच',
    'insulin.explanation': 'व्याख्या',
    'insulin.warnings': 'चेतावनियां',
    
    'alerts.title': 'अलर्ट',
    'alerts.hypo_warning': 'हाइपोग्लाइसीमिया चेतावनी',
    'alerts.hypo_urgent': 'तत्काल हाइपोग्लाइसीमिया',
    'alerts.hypo_emergency': 'आपातकालीन हाइपोग्लाइसीमिया',
    'alerts.hyper_warning': 'हाइपरग्लाइसीमिया चेतावनी',
    'alerts.rapid_drop': 'तेजी से गिरावट',
    'alerts.rapid_rise': 'तेजी से वृद्धि',
    'alerts.signal_loss': 'सिग्नल हानि',
    'alerts.action_required': 'कार्रवाई आवश्यक',
    'alerts.eat_carbs': 'कार्ब्स खाएं',
    'alerts.check_glucose': 'ग्लूकोज जांचें',
    'alerts.contact_emergency': 'आपातकालीन संपर्क करें',
    'alerts.acknowledge': 'स्वीकार करें',
    'alerts.dismiss': 'खारिज करें',
    'alerts.snooze': 'स्नूज़',
    'alerts.carbs_options': 'कार्ब्स विकल्प',
    'alerts.glucose_tablets': 'ग्लूकोज टैबलेट',
    'alerts.fruit_juice': 'फलों का रस',
    'alerts.sugar': 'चीनी',
    'alerts.honey': 'शहद',
    'alerts.soda': 'सोडा',
    'alerts.banana': 'केला',
    'alerts.dates': 'खजूर',
    'alerts.raisins': 'किशमिश',
    'alerts.acknowledged_by': 'द्वारा स्वीकार किया गया',
    'alerts.acknowledged_at': 'स्वीकार किया गया समय',
    'alerts.escalated': 'एस्केलेटेड',
    'alerts.resolved': 'हल किया गया',
    
    'family.title': 'परिवार',
    'family.members': 'सदस्य',
    'family.invite_member': 'सदस्य आमंत्रित करें',
    'family.relationship': 'रिश्ता',
    'family.parent': 'माता-पिता',
    'family.child': 'बच्चा',
    'family.spouse': 'पति/पत्नी',
    'family.sibling': 'भाई/बहन',
    'family.grandparent': 'दादा-दादी/नाना-नानी',
    'family.caregiver': 'देखभालकर्ता',
    'family.doctor': 'डॉक्टर',
    'family.nurse': 'नर्स',
    'family.other': 'अन्य',
    'family.permissions': 'अनुमतियां',
    'family.escalation_level': 'एस्केलेशन स्तर',
    'family.primary_caregiver': 'प्राथमिक देखभालकर्ता',
    'family.emergency_contact': 'आपातकालीन संपर्क',
    'family.invite_sent': 'आमंत्रण भेजा गया',
    'family.invite_accepted': 'स्वीकार किया गया',
    'family.invite_pending': 'लंबित',
    'family.remove_member': 'सदस्य हटाएं',
    'family.alerts': 'अलर्ट',
    'family.checkins': 'चेक-इन',
    'family.schedule_checkin': 'चेक-इन शेड्यूल करें',
    'family.complete_checkin': 'चेक-इन पूरा करें',
    'family.missed_checkin': 'चेक-इन छूटा',
    'family.settings': 'सेटिंग्स',
    'family.auto_escalate': 'स्वचालित एस्केलेशन',
    'family.escalation_timeout': 'एस्केलेशन टाइमआउट',
    'family.emergency_services': 'आपातकालीन सेवाएं',
    'family.share_glucose': 'ग्लूकोज साझा करें',
    'family.share_insulin': 'इंसुलिन साझा करें',
    'family.share_meals': 'भोजन साझा करें',
    'family.share_activity': 'गतिविधि साझा करें',
    
    'profile.title': 'प्रोफाइल',
    'profile.clinical': 'क्लिनिकल',
    'profile.insulin': 'इंसुलिन',
    'profile.devices': 'डिवाइस',
    'profile.preferences': 'वरीयताएं',
    'profile.consent': 'सहमति',
    'profile.personal_info': 'व्यक्तिगत जानकारी',
    'profile.date_of_birth': 'जन्म तिथि',
    'profile.gender': 'लिंग',
    'profile.height': 'ऊंचाई',
    'profile.weight': 'वजन',
    'profile.diabetes_type': 'मधुमेह का प्रकार',
    'profile.diagnosis_date': 'निदान तिथि',
    'profile.hba1c': 'HbA1c',
    'profile.hba1c_date': 'HbA1c तिथि',
    'profile.insulin_regimen': 'इंसुलिन रेजिमेन',
    'profile.icr': 'ICR',
    'profile.isf': 'ISF',
    'profile.target_glucose': 'लक्ष्य ग्लूकोज',
    'profile.basal_rate': 'बेसल दर',
    'profile.nph_doses': 'NPH डोज',
    'profile.regular_doses': 'रेगुलर डोज',
    'profile.cgm_type': 'CGM प्रकार',
    'profile.cgm_serial': 'CGM सीरियल',
    'profile.pump_type': 'पंप प्रकार',
    'profile.hypo_threshold': 'हाइपो थ्रेशोल्ड',
    'profile.severe_hypo_threshold': 'गंभीर हाइपो थ्रेशोल्ड',
    'profile.alert_sound': 'अलर्ट ध्वनि',
    'profile.caregiver_share': 'देखभालकर्ता साझा करें',
    'profile.data_sharing': 'डेटा साझा करना',
    'profile.research_consent': 'शोध सहमति',
    'profile.marketing_consent': 'मार्केटिंग सहमति',
    'profile.export_data': 'डेटा निर्यात करें',
    'profile.delete_account': 'खाता हटाएं',
    
    'settings.title': 'सेटिंग्स',
    'settings.general': 'सामान्य',
    'settings.notifications': 'सूचनाएं',
    'settings.appearance': 'दिखावट',
    'settings.data_sync': 'डेटा सिंक',
    'settings.security': 'सुरक्षा',
    'settings.about': 'के बारे में',
    'settings.language': 'भाषा',
    'settings.timezone': 'टाइमज़ोन',
    'settings.units': 'इकाइयां',
    'settings.date_format': 'तिथि प्रारूप',
    'settings.time_format': 'समय प्रारूप',
    'settings.auto_sync': 'स्वचालित सिंक',
    'settings.sync_frequency': 'सिंक आवृत्ति',
    'settings.wifi_only_sync': 'केवल वाईफाई पर सिंक',
    'settings.data_retention': 'डेटा प्रतिधारण',
    'settings.export_format': 'निर्यात प्रारूप',
    'settings.theme': 'थीम',
    'settings.compact_mode': 'कॉम्पैक्ट मोड',
    'settings.high_contrast': 'उच्च कंट्रास्ट',
    'settings.large_text': 'बड़ा टेक्स्ट',
    'settings.reduced_motion': 'कम मोशन',
    'settings.push_enabled': 'पुश सक्षम',
    'settings.email_enabled': 'ईमेल सक्षम',
    'settings.hypo_alerts': 'हाइपो अलर्ट',
    'settings.hyper_alerts': 'हाइपर अलर्ट',
    'settings.meal_reminders': 'भोजन रिमाइंडर',
    'settings.insulin_reminders': 'इंसुलिन रिमाइंडर',
    'settings.weekly_report': 'साप्ताहिक रिपोर्ट',
    'settings.theme_light': 'हल्का',
    'settings.theme_dark': 'गहरा',
    'settings.theme_system': 'सिस्टम',
    'settings.biometric_auth': 'बायोमेट्रिक प्रमाणीकरण',
    'settings.two_factor': 'दो-कारक प्रमाणीकरण',
    'settings.session_timeout': 'सत्र टाइमआउट',
    'settings.change_password': 'पासवर्ड बदलें',
    'settings.manage_sessions': 'सत्र प्रबंधित करें',
    'settings.delete_account': 'खाता हटाएं',
    'settings.privacy_policy': 'गोपनीयता नीति',
    'settings.terms_of_service': 'सेवा की शर्तें',
    'settings.documentation': 'दस्तावेज़ीकरण',
    'settings.report_bug': 'बग रिपोर्ट करें',
    'settings.feature_request': 'फीचर अनुरोध',
    'settings.acknowledgments': 'धन्यवाद',
    'settings.licenses': 'लाइसेंस',
    
    'foods.title': 'खाद्य पदार्थ',
    'foods.search': 'खोजें',
    'foods.categories': 'श्रेणियां',
    'foods.composite_meals': 'मिश्रित भोजन',
    'foods.favorites': 'पसंदीदा',
    'foods.nutrition_info': 'पोषण जानकारी',
    'foods.glycemic_index': 'ग्लाइसेमिक इंडेक्स',
    'foods.glycemic_load': 'ग्लाइसेमिक लोड',
    'foods.serving_size': 'सर्विंग आकार',
    'foods.reference_objects': 'संदर्भ वस्तुएं',
    'foods.preparation_methods': 'तैयारी विधियां',
    'foods.raw': 'कच्चा',
    'foods.boiled': 'उबला हुआ',
    'foods.steamed': 'भाप में पका',
    'foods.fried': 'तला हुआ',
    'foods.roasted': 'भुना हुआ',
    'foods.baked': 'बेक किया हुआ',
    'foods.pressure_cooked': 'प्रेशर कुक्ड',
    'foods.sauteed': 'सॉते किया हुआ',
    'foods.grilled': 'ग्रिल किया हुआ',
    
    'units.mg_dl': 'मिलीग्राम/डीएल',
    'units.mmol_l': 'मिलीमोल/लीटर',
    'units.grams': 'ग्राम',
    'units.kilograms': 'किलोग्राम',
    'units.centimeters': 'सेंटीमीटर',
    'units.units': 'यूनिट',
    'units.minutes': 'मिनट',
    'units.hours': 'घंटे',
    'units.days': 'दिन',
    'units.weeks': 'सप्ताह',
    'units.months': 'महीने',
    
    'time.now': 'अभी',
    'time.minute_ago': '1 मिनट पहले',
    'time.minutes_ago': '{{count}} मिनट पहले',
    'time.hour_ago': '1 घंटा पहले',
    'time.hours_ago': '{{count}} घंटे पहले',
    'time.yesterday': 'कल',
    'time.days_ago': '{{count}} दिन पहले',
    'time.week_ago': '1 सप्ताह पहले',
    'time.month_ago': '1 महीना पहले',
    'time.just_now': 'अभी-अभी',
    
    'a11y.skip_to_main': 'मुख्य सामग्री पर जाएं',
    'a11y.skip_to_navigation': 'नेविगेशन पर जाएं',
    'a11y.open_menu': 'मेनू खोलें',
    'a11y.close_menu': 'मेनू बंद करें',
    'a11y.loading': 'लोड हो रहा है',
    'a11y.error': 'त्रुटि',
    'a11y.required_field': 'आवश्यक फ़ील्ड',
    'a11y.optional_field': 'वैकल्पिक फ़ील्ड',
    'a11y.invalid_input': 'अमान्य इनपुट',
    'a11y.password_visible': 'पासवर्ड दिखाएं',
    'a11y.password_hidden': 'पासवर्ड छुपाएं',
  },
  
  ta: {
    'app.name': 'T1D இந்தியா',
    'app.tagline': 'இந்திய T1D உணவுகளுக்கான AI-இயக்கப்பட்ட হাইபோக்ளைசீமியா முன்னறிவிப்பு மற்றும் கார்ப்-கவுண்டிங்',
    'common.save': 'சேமிக்கவும்',
    'common.cancel': 'ரத்து செய்யவும்',
    'common.delete': 'அழிக்கவும்',
    'common.edit': 'திருத்தவும்',
    'common.add': 'சேர்க்கவும்',
    'common.search': 'தேடுங்கள்',
    'common.filter': 'வடிகranu',
    'common.sort': 'வரிசைப்படுத்தவும்',
    'common.loading': 'ஏற்றுகிறது...',
    'common.error': 'பிழை',
    'common.success': 'வெற்றி',
    'common.warning': 'எச்சரிக்கை',
    'common.info': 'தகவல்',
    'common.confirm': 'உறுதிசெய்யவும்',
    'common.yes': 'ஆம்',
    'common.no': 'இல்லை',
    'common.ok': 'சரி',
    'common.close': 'தவிர்க்கவும்',
    'common.back': 'பின்னால்',
    'common.next': 'அடுத்தது',
    'common.previous': 'முந்தைய',
    'common.done': 'முடிக்கவும்',
    'common.skip': 'விட்டுவிடுங்கள்',
    'common.retry': 'மళ opnieuw முயற்சிக்கவும்',
    'common.offline': 'ஆஃப்லைன்',
    'common.online': 'ஆன்லைன்',
    'common.sync': 'சிங்க்',
    'common.settings': 'அமைப்புகள்',
    'common.profile': 'சுயவிவரம்',
    'common.logout': 'வெளியேறு',
    'common.login': 'உள்நுழை',
    'common.register': 'பதிவு செய்யவும்',
    'common.welcome': 'வரவேற்கிறோம்',
    'common.language': 'மொழி',
    'common.theme': 'தீம்',
    'common.notifications': 'அறிவிப்புகள்',
    'common.help': 'உதவி',
    'common.about': 'பற்றி',
    'common.version': 'எக்சென்றன்',
    
    'dashboard.title': 'டாஷ்போர்டு',
    'dashboard.current_glucose': 'தற்போதைய குளுக்கோஸ்',
    'dashboard.time_in_range': 'வரம்பில் நேரம்',
    'dashboard.average_glucose': 'சராசரி குளுக்கோஸ்',
    'dashboard.gmi': 'GMI',
    'dashboard.variability': 'மாற்றம்',
    'dashboard.trend': 'முன்னேற்றம்',
    'dashboard.last_updated': 'கடைசி புதுப்பிப்பு',
    'dashboard.quick_actions': 'விரைவு செயல்கள்',
    'dashboard.recent_meals': 'அ சமீபத்திய உணவுகள்',
    'dashboard.insulin_culator': 'இன்சுலின் കੈல்குலேറ്റർ',
    'dashboard.hypo_alerts': 'ஹைபோ அலெர்டுகள்',
    'dashboard.cgm_connection': 'CGM இணைப்பு',
    
    'glucose.mg_dl': 'மிக்ரோகிராம்/டிசிலீட்டர்',
    'glucose.mmol_l': 'மில்லிமோல்/லிட்டர்',
    'glucose.current': 'தற்போது',
    'glucose.trend': 'பிரெண்ட்',
    'glucose.trend_double_up': 'விரைவாக அதிகரிக்கிறது',
    'glucose.trend_single_up': 'அதிகரிக்கிறது',
    'glucose.trend_stable': 'நிறுத்தம்',
    'glucose.trend_single_down': 'குறைகிறது',
    'glucose.trend_double_down': 'விரைவாக குறைகிறது',
    'glucose.time_in_range': 'வரம்பில் நேரம்',
    'glucose.very_low': 'மிகவும் குறைவு',
    'glucose.low': 'குறைவு',
    'glucose.in_range': 'வரம்பில்',
    'glucose.high': 'அதிகம்',
    'glucose.very_high': 'மிகவும் அதிகம்',
    'glucose.low_alert': 'குறைவான குளுக்கோஸ் எச்சரிக்கை',
    'glucose.high_alert': 'அதிக குளுக்கோஸ் எச்சரிக்கை',
    'glucose.rapid_rise': 'விரைவு வளர்ச்சி',
    'glucose.rapid_fall': 'விரைவு இடிதல்',
    'glucose.signal_loss': 'சிக்னல் இழப்பு',
    'glucose.calibration_needed': 'க್ಯாலிப்ரேஷன் தேவை',
    'glucose.sensor_warmup': 'சென்சர் வேறுகை',
    'glucose.sensor_expired': 'சென்சர் காலாவதி',
    'glucose.no_data': 'ததவு இல்லை',
    'glucose.last_reading': 'கடைசி அளவீடு',
    'glucose.ago': 'முன்னர்',
    'glucose.now': 'இப்போது',
    
    'meals.title': 'உணவுகள்',
    'meals.log_meal': 'உணவு பதிவு',
    'meals.meal_type': 'உணவு வகை',
    'meals.breakfast': 'காலை உணவு',
    'meals.lunch': 'மதிய உணவு',
    'meals.dinner': 'இரவு உணவு',
    'meals.snack': 'சநாக்',
    'meals.search_food': 'உணவு தேடு',
    'meals.scan_photo': 'புகைப்படம் ஸ்கேன் செய்க',
    'meals.voice_input': 'குரல் உள்ளீடு',
    'meals.composite_meals': 'கலப்ப உணவு',
    'meals.favorites': 'விருப்பமானவை',
    'meals.recent': 'அ சமீபத்திய',
    'meals.history': 'வரலாறு',
    'meals.analytics': 'வெளிப்படுத்தல்',
    'meals.add_item': 'தொகுப்பு சேர்க்கவும்',
    'meals.remove_item': 'அழிக்கவும்',
    'meals.quantity': 'அளவு',
    'meals.preparation': 'தயாரிப்பு',
    'meals.carbs': 'கர்ப்',
    'meals.protein': 'புரொட்டீன்',
    'meals.fat': 'கொழுப்பு',
    'meals.fiber': 'நார்',
    'meals.total_carbs': 'மொத்த কার்ப்ஸ்',
    'meals.total_nutrition': 'மொத்த ஊட்டச்சத்து',
    'meals.absorption_profile': 'உறிஞ்சல் தனிச்சிறப்பு',
    'meals.rapid_absorption': 'விரைவு உறிஞ்சல்',
    'meals.intermediate_absorption': 'நடுத்தர உறிஞ்சல்',
    'meals.slow_absorption': 'மெதுவான உறிஞ்சல்',
    'meals.glycemic_index': 'கிளைசெமிக் إندெக்ஸ்',
    'meals.glycemic_load': 'கிளைசெமிக் லோடு',
    'meals.portion_estimation': 'அளவு கணக்கீடு',
    'meals.reference_objects': 'உரிமை பொருட்கள்',
    'meals.katori': 'கிண்ணம்',
    'meals.chapati': 'சப்பாத்தி',
    'meals.tablespoon': 'பெரிய காக்கரண்டி',
    'meals.teaspoon': 'சிறிய காக்கரண்டி',
    'meals.ladle': 'தூவி',
    'meals.glass': 'கிளாஸ்',
    
    'insulin.title': 'இன்சுலின்',
    'meals.carbs': 'கர்ப்',
    'meals.protein': 'புரொட்டீன்',
    'meals.fat': 'கொழுப்பு',
    'meals.fiber': 'நார்',
    'meals.total_carbs': 'மொத்த கார்ப்ஸ்',
    'meals.total_nutrition': 'மொத்த ஊட்டச்சத்து',
    'meals.absorption_profile': 'உறிஞ்சல் தனிச்சிறப்பு',
    'meals.rapid_absorption': 'விரைவு உறிஞ்சல்',
    'meals.intermediate_absorption': 'நடுத்தர உறிஞ்சல்',
    'meals.slow_absorption': 'மெதுவான உறிஞ்சல்',
    'meals.glycemic_index': 'கிளைசெமிக் இந்தெக்ஸ்',
    'meals.glycemic_load': 'கிளைசெமிக் லோடு',
    'meals.portion_estimation': 'அளவு கணக்கீடு',
    'meals.reference_objects': 'உரிமை பொருட்கள்',
    'meals.katori': 'கிண்ணம்',
    'meals.chapati': 'சப்பாத்தி',
    'meals.tablespoon': 'பெரிய காக்கரண்டி',
    'meals.teaspoon': 'சிறிய காக்கரண்டி',
    'meals.ladle': 'தூவி',
    'meals.glass': 'கிளாஸ்',
    
    'insulin.title': 'இன்சுலின்',
    'insulin.calculator': 'கேல்குலேட்டர்',
    'insulin.history': 'வரலாறு',
    'insulin.summary': 'சுருக்கம்',
    'insulin.log_dose': 'டோஸ் பதிவு',
    'insulin.current_glucose': 'தற்போதைய குளுக்கோஸ்',
    'insulin.carbs': 'கர்ப்ஸ்',
    'insulin.icr': 'ICR (கர்ப்-இன்சுலின் விகிதம்)',
    'insulin.isf': 'ISF (இன்சுலின் உணர்திறன் உதவி)',
    'insulin.target_glucose': 'நிழல் குளுக்கோஸ்',
    'insulin.meal_bolus': 'உணவு போலஸ்',
    'insulin.correction_bolus': 'திருத்து போலஸ்',
    'insulin.total_bolus': 'மொத்த போலஸ்',
    'insulin.max_bolus': 'அதிகபட்ச போலஸ்',
    'insulin.iob': 'IOB (செயல்படும் இன்சுலின்)',
    'insulin.iob_rapid': 'விரைவு இன்சுலின் IOB',
    'insulin.iob_regular': 'வழக்கம் இன்சுலின் IOB',
    'insulin.iob_nph': 'NPH இன்சுலின் IOB',
    'insulin.regimen': 'இன்சுலின் திட்டம்',
    'insulin.regimen_basal_bolus': 'பேசல்-போலஸ்',
    'insulin.regimen_nph_regular': 'NPH + வழக்கம்',
    'insulin.regimen_premixed': 'முன்கலப்பு',
    'insulin.regimen_pump': 'இன்சுலின் பம்ப்',
    'insulin.insulin_type': 'இன்சுலின் வகை',
    'insulin.rapid_acting': 'விரைவு செயல்பாடு',
    'insulin.regular_human': 'மனித வழக்கம்',
    'insulin.nph_human': 'மனித NPH',
    'insulin.premixed': 'முன்கலப்பு',
    'insulin.glarvine': 'கிளார்ஜின்',
    'insulin.degludec': 'டெக்ளுடெக்',
    'insulin.dose': 'டோஸ்',
    'insulin.injection_site': 'உTTம் இடம்',
    'insulin.abdomen': 'வயிறு',
    'insulin.thigh': 'தொடை',
    'insulin.arm': 'கை',
    'insulin.buttock': 'மூட்டு',
    'insulin.pump_site': 'பம்ப் இடம்',
    'insulin.delivery_method': 'விநியோக முறை',
    'insulin.pen': 'பென்',
    'insulin.syringe': 'சிரிஞ்சி',
    'insulin.pump': 'பம்ப்',
    'insulin.inhaler': 'உச்சவாசி',
    
    'alerts.title': 'எச்சரிப்புகள்',
    'alerts.hypo_warning': 'குறைந்த சர்க்கரை எச்சரிக்கை',
    'alerts.hypo_urgent': 'அவசர குறைந்த சர்க்கரை',
    'alerts.hypo_emergency': 'அவசரநிலை குறைந்த சர்க்கரை',
    'alerts.hyper_warning': 'உயர் சர்க்கரை எச்சரிக்கை',
    'alerts.rapid_drop': 'விரைவு சொர்வு',
    'alerts.rapid_rise': 'விரைவு உயர்வு',
    'alerts.signal_loss': 'சிக்னல் இழப்பு',
    'alerts.action_required': 'நடவடிக்கை தேவை',
    'alerts.eat_carbs': 'கர்ப் சாப்பிடுங்கள்',
    'alerts.check_glucose': 'குளுக்கோஸ் பார்க்கவும்',
    'alerts.contact_emergency': 'அவசரநிலை தொடர்பு',
    
    'family.title': 'குடும்பம்',
    'family.members': 'உறுப்பினர்கள்',
    'family.invite_member': 'உறுப்பினர் அழைக்கவும்',
    'family.relationship': 'பேராசை',
    'family.parent': 'பேர்',
    'family.child': 'குழந்தை',
    'family.spouse': 'திருமண உடன்பாடி',
    'family.sibling': 'சகோதரர்',
    'family.grandparent': 'தாத்தா/பாட்டி',
    'family.caregiver': 'ਚिंता करनेवाला',
    'family.doctor': 'மருத்துவர்',
    'family.nurse': 'நர்ச்',
    'family.other': 'மற்றவை',
    
    'profile.title': 'சுயவிவரம்',
    'profile.clinical': 'கிளினிக்கல்',
    'profile.insulin': 'இன்சுலின்',
    'profile.devices': 'கருவிகள்',
    'profile.preferences': 'விருப்பங்கள்',
    'profile.consent': 'உறுதி',
    'profile.personal_info': 'தனிப்பட்ட தகவல்',
    'profile.date_of_birth': 'பிறந்த தேதி',
    'profile.gender': 'பாலினம்',
    'profile.height': 'உயரம்',
    'profile.weight': 'நிலை',
    'profile.diabetes_type': 'நீரிழிவு வகை',
    'profile.diagnosis_date': 'றிதல் தேதி',
    'profile.hba1c': 'HbA1c',
    'insulin.icr': 'ICR',
    'insulin.isf': 'ISF',
    'insulin.target_glucose': 'நிழல் குளுக்கோஸ்',
    'insulin.basal_rate': 'அடிப்படை விகிதம்',
    'insulin.nph_doses': 'NPH டோஸ்',
    'insulin.regular_doses': 'வழக்கம் டோஸ்',
    'insulin.cgm_type': 'CGM வகை',
    'insulin.cgm_serial': 'CGM சீரியல்',
    'insulin.pump_type': 'பம்ப் வகை',
    'insulin.hypo_threshold': 'குறைவு தீர்ப்பு',
    'insulin.severe_hypo_threshold': 'தீவிர குறைவு தீர்ப்பு',
    'insulin.alert_sound': 'எச்சரிக்கை ஒலி',
    'insulin.caregiver_share': 'பராமரிப்பாளர் பகிர்வு',
    'insulin.data_sharing': 'தரவு பகிர்வு',
    'insulin.research_consent': 'அनुसंधान सहमति',
    'insulin.marketing_consent': 'विपणन सहमति',
    'profile.export_data': 'ததவு ஏற்றுமதி',
    'profile.delete_account': 'கணக்கு அழிக்கவும்',
    
    'settings.title': 'அமைப்புகள்',
    'settings.general': 'பொது',
    'settings.notifications': 'அறிவிப்புகள்',
    'settings.appearance': 'வெளிப்பாடுகள்',
    'settings.data_sync': 'ததவுச் சிங்க்',
    'settings.security': 'பாதுகாப்பு',
    'settings.about': 'பற்றி',
    'settings.language': 'மொழி',
    'settings.timezone': 'நேர மண்டலம்',
    'settings.units': 'அலகுகள்',
    'settings.date_format': 'தேதி வடிவம்',
    'settings.time_format': 'நேர வடிவம்',
    'settings.auto_sync': 'தானியங்கி சிங்க்',
    'settings.sync_frequency': 'சிங்க் akibatம்',
    'settings.wifi_only_sync': 'வேறியாக வை-ஃபை சிங்க்',
    'settings.data_retention': 'ததவு பராமரிப்பு',
    'settings.export_format': 'ஏற்றுமதி வடிவம்',
    'settings.theme': 'தீம்',
    'settings.compact_mode': 'க adib ட் மொட்',
    'settings.high_contrast': 'உயர் தீவிர விதம்',
    'settings.large_text': 'பெரிய உரை',
    'settings.reduced_motion': 'குறைந்த இயக்கம்',
    'settings.push_enabled': 'பஷ் இயக்கப்பட்டுள்ளது',
    'settings.email_enabled': 'மின்னஞ்சல் இயக்கப்பட்டுள்ளது',
    'settings.hypo_alerts': 'குறைவு எச்சரிக்கைகள்',
    'settings.hyper_alerts': 'உயர் எச்சரிக்கைகள்',
    'settings.meal_reminders': 'உணவு நினைவூட்டல்கள்',
    'settings.insulin_reminders': 'இன்சுலின் நினைவூட்டல்கள்',
    'settings.weekly_report': 'வாராந்திர அறிக்கை',
    
    'foods.title': 'உணவுப் பொருட்கள்',
    'foods.search': 'தேடு',
    'foods.categories': 'வகைகள்',
    'foods.composite_meals': 'கலப்ப உணவுகள்',
    'foods.favorites': 'விருப்பமானவை',
    'foods.nutrition_info': 'ஊட்டச் செயல்பாடு தகவல்',
    'foods.glycemic_index': 'கிளைசெமிக் انڈெக்ஸ்',
    'foods.glycemic_load': 'கிளைசெமிக் லோடு',
    'foods.serving_size': 'சேவைக்கு அளவு',
    'foods.reference_objects': 'உரிமை பொருட்கள்',
    'foods.preparation_methods': 'தயாரிப்பு முறைகள்',
    'foods.raw': 'இயல்',
    'foods.boiled': 'வதைத்தது',
    'foods.steamed': 'அவியம்',
    'foods.fried': 'வறுத்தது',
    'foods.roasted': 'பொரித்தது',
    'foods.baked': 'ஒப்பிட்டது',
    'foods.pressure_cooked': 'அழுத்த சமையல்',
  },
  
  te: {
    'app.name': 'T1D इंडिया',
    'app.tagline': 'భారతీయ T1D आहारांशसाठी AI-शक्तिमान हायपोग्लाइसेमिया पूर्वानुमान आणि कार्ब-काउंटिंग',
    'common.save': 'सेव्ह करा',
    'common.cancel': 'रद्द करा',
    'common.delete': 'हटवा',
    'common.edit': 'संपादन करा',
    'common.add': 'जोडा',
    'common.search': 'शोधा',
    'common.filter': 'फिल्टर',
    'common.sort': 'क्रमवार लावा',
    'common.loading': 'लोड होत आहे...',
    'common.error': 'त्रुटी',
    'common.success': 'यश',
    'common.warning': 'चेतावणी',
    'common.info': 'माहिती',
    'common.confirm': 'पुष्टी करा',
    'common.yes': 'होय',
    'common.no': 'नाही',
    'common.ok': 'ठीक आहे',
    'common.close': 'बंद करा',
    'common.back': 'मागे',
    'common.next': 'पुढील',
    'common.previous': 'मागील',
    'common.done': 'पूर्ण झाले',
    'common.skip': 'बाजूला करा',
    'common.retry': 'पुन्हा प्रयत्न करा',
    'common.offline': 'ऑफलाइन',
    'common.online': 'ऑनलाइन',
    'common.sync': 'सिंक',
    'common.settings': 'सेटिंग्ज',
    'common.profile': 'प्रोफाइल',
    'common.logout': 'लॉगआउट',
    'common.login': 'लॉगिन',
    'common.register': 'नोंदणी करा',
    'common.welcome': 'स्वागत आहे',
    'common.language': 'भाषा',
    'common.theme': 'थीम',
    'common.notifications': 'सूचनां',
    'common.help': 'मदत',
    'common.about': 'विषयी',
    'common.version': 'संस्करण',
    
    'dashboard.title': 'डॅशबोर्ड',
    'dashboard.current_glucose': 'सध्याची ग्लुकोज',
    'dashboard.time_in_range': 'रेंजमध्ये वेळ',
    'dashboard.average_glucose': 'सरासरी ग्लुकोज',
    'dashboard.gmi': 'GMI',
    'dashboard.variability': 'विविधता',
    'dashboard.trend': 'ट्रेंड',
    'dashboard.last_updated': 'शेवटचा अपडेट',
    'dashboard.quick_actions': 'त्वरित कृती',
    'dashboard.recent_meals': 'अलीकडील जेवण',
    'dashboard.insulin_calculator': 'इन्सुलिन कॅल्क्युलेटर',
    'dashboard.hypo_alerts': 'हायपो अलर्ट्स',
    'dashboard.cgm_connection': 'CGM कनेक्शन',
    
    'glucose.mg_dl': 'mg/dL',
    'glucose.mmol_l': 'mmol/L',
    'glucose.current': 'सध्या',
    'glucose.trend': 'ट्रेंड',
    'glucose.trend_double_up': 'दुहेरी वाढ',
    'glucose.trend_single_up': 'वाढ',
    'glucose.trend_stable': 'स्थिर',
    'glucose.trend_single_down': 'कमी होत आहे',
    'glucose.trend_double_down': 'दुहेरी कमी',
    'glucose.time_in_range': 'रेंजमध्ये वेळ',
    'glucose.very_low': 'खूप कमी',
    'glucose.low': 'कमी',
    'glucose.in_range': 'रेंजमध्ये',
    'glucose.high': 'उंच',
    'glucose.very_high': 'खूप उंच',
    'glucose.low_alert': 'कमी ग्लुकोज सावध',
    'glucose.high_alert': 'उंच ग्लुकोज सावध',
    'glucose.rapid_rise': 'वेगाने वाढ',
    'glucose.rapid_fall': 'वेगाने कमी',
    'glucose.signal_loss': 'सिग्नल हानि',
    'glucose.calibration_needed': 'कॅलिब्रेशन आवश्यक',
    'glucose.sensor_warmup': 'सेंसर वॉर्मअप',
    'glucose.sensor_expired': 'सेंसर एक्सपायर्ड',
    'glucose.no_data': 'डेटा नाही',
    'glucose.last_reading': 'शेवटचा वाचन',
    'glucose.ago': 'आधी',
    'glucose.now': 'आता',
    
    'meals.title': 'भोजन',
    'meals.log_meal': 'भोजन लॉग करा',
    'meals.meal_type': 'भोजन प्रकार',
    'meals.breakfast': 'सकाळचे जेवण',
    'meals.lunch': 'दुपारीचे जेवण',
    'meals.dinner': 'रात्रीचे जेवण',
    'meals.snack': 'स्नॅक',
    'meals.pre_workout': 'प्री-वर्कआउट',
    'meals.post_workout': 'पोस्ट-वर्कआउट',
    'meals.bedtime': 'झोपीपर्यंत',
    'meals.search_food': 'अन्न शोधा',
    'meals.scan_photo': 'फोटो स्कॅन करा',
    'meals.voice_input': 'आवाज इनपुट',
    'meals.composite_meals': 'मिश्रित भोजन',
    'meals.favorites': 'आवडते',
    'meals.recent': 'अलीकडील',
    'meals.history': 'इतिहास',
    'meals.analytics': 'विश्लेषण',
    'meals.add_item': 'आइटम जोडा',
    'meals.remove_item': 'काढा टाका',
    'meals.quantity': 'प्रमाण',
    'meals.preparation': 'तयारी',
    'meals.carbs': 'कार्ब्स',
    'meals.protein': 'प्रोटीन',
    'meals.fat': 'फॅट',
    'meals.fiber': 'फायबर',
    'meals.total_carbs': 'एकूण कार्ब्स',
    'meals.total_nutrition': 'एकूण पोषण',
    'meals.absorption_profile': 'अवशोषण प्रोफाइल',
    'meals.rapid_absorption': 'द्रुत अवशोषण',
    'meals.intermediate_absorption': 'मध्यवर्ती अवशोषण',
    'meals.slow_absorption': 'सावकस अवशोषण',
    'meals.glycemic_index': 'ग्लायसेमिक इंडेक्स',
    'meals.glycemic_load': 'ग्लायसेमिक लोड',
    'meals.portion_estimation': 'भाग अंदाज',
    'meals.reference_objects': 'संदर्भ वस्तू',
    'meals.katori': 'कटोरी',
    'meals.chapati': 'चपाती',
    'meals.tablespoon': 'टेबलस्पून',
    'meals.teaspoon': 'टीस्पून',
    'meals.ladle': 'चमचा',
    'meals.glass': 'ग्लास',
    
    'insulin.title': 'इन्सुलिन',
    'insulin.calculator': 'कॅल्क्युलेटर',
    'insulin.history': 'इतिहास',
    'insulin.summary': 'सारांश',
    'insulin.log_dose': 'डोस लॉग करा',
    'insulin.current_glucose': 'सध्याची ग्लुकोज',
    'insulin.carbs': 'कार्ब्स',
    'insulin.icr': 'ICR (कार्ब-इन्सुलिन अनुपात)',
    'insulin.isf': 'ISF (इन्सुलिन सेंसिटिव्हिटी फॅक्टर)',
    'insulin.target_glucose': 'लक्ष्य ग्लुकोज',
    'insulin.meal_bolus': 'भोजन बोलस',
    'insulin.correction_bolus': 'सुधारणा बोलस',
    'insulin.total_bolus': 'एकूण बोलस',
    'insulin.max_bolus': 'अधिकतम बोलस',
    'insulin.iob': 'IOB (सक्रिय इन्सुलिन)',
    'insulin.iob_rapid': 'द्रुत इन्सुलिन IOB',
    'insulin.iob_regular': 'रेग्युलर इन्सुलिन IOB',
    'insulin.iob_nph': 'NPH इन्सुलिन IOB',
    'insulin.regimen': 'इन्सुलिन रेजिमेन',
    'insulin.regimen_basal_bolus': 'बेसल-बोलस',
    'insulin.regimen_nph_regular': 'NPH + रेग्युलर',
    'insulin.regimen_premixed': 'प्रीमिक्स्ड',
    'insulin.regimen_pump': 'इन्सुलिन पंप',
    'insulin.insulin_type': 'इन्सुलिन प्रकार',
    'insulin.rapid_acting': 'त्वरित कार्यरत',
    'insulin.regular_human': 'मानवी रेग्युलर',
    'insulin.nph_human': 'मानवी NPH',
    'insulin.premixed': 'प्रीमिक्स्ड',
    'insulin.glarvine': 'ग्लार्गिन',
    'insulin.degludec': 'डेग्लुडेक',
    'insulin.dose': 'डोस',
    'insulin.injection_site': 'इंजेक्शन साईट',
    'insulin.abdomen': 'उदर',
    'insulin.thigh': 'उरू',
    'insulin.arm': 'हात',
    'insulin.buttock': 'नितंब',
    'insulin.pump_site': 'पंप साईट',
    'insulin.delivery_method': 'वितरण पद्धत',
    'insulin.pen': 'पेन',
    'insulin.syringe': 'सिरिंज',
    'insulin.pump': 'पंप',
    'insulin.inhaler': 'इनहेलर',
    'insulin.recent_hypo_warning': 'अलीकडील हायपो चेतावणी',
    'insulin.high_iob_warning': 'उंच IOB चेतावणी',
    'insulin.predicted_low_warning': 'अंदाजित कमी चेतावणी',
    'insulin.safety_check': 'सुरक्षा तपासणी',
    'insulin.explanation': 'स्पष्टीकरण',
    'insulin.warnings': 'चेतावणी',
    
    'alerts.title': 'सूचना',
    'alerts.hypo_warning': 'हायपोग्लायसेमिया चेतावणी',
    'alerts.hypo_urgent': 'अवघड हायपोग्लायसेमिया',
    'alerts.hypo_emergency': 'आपत्कालीन हायपोग्लायसेमिया',
    'alerts.hyper_warning': 'हायपरग्लायसेमिया चेतावणी',
    'alerts.rapid_drop': 'वेगाने घसरणे',
    'alerts.rapid_rise': 'वेगाने वाढ',
    'alerts.signal_loss': 'सिग्नल गमावणे',
    'alerts.action_required': 'कारवाई आवश्यक',
    'alerts.eat_carbs': 'कार्ब्स खा',
    'alerts.check_glucose': 'ग्लुकोज तपासा',
    'alerts.contact_emergency': 'आपत्कालीन संपर्क करा',
    'alerts.acknowledge': 'स्वीकार करा',
    'alerts.dismiss': 'नाकार द्या',
    'alerts.snooze': 'स्नूझ',
    'alerts.carbs_options': 'कार्ब्स पर्याय',
    'alerts.glucose_tablets': 'ग्लुकोज टॅब्लेट्स',
    'alerts.fruit_juice': 'फळाचे रस',
    'alerts.sugar': 'साखर',
    'alerts.honey': 'मध',
    'alerts.soda': 'सोडा',
    'alerts.banana': 'केळी',
    'alerts.dates': 'खजूर',
    'alerts.raisins': 'बेडणे',
    'alerts.acknowledged_by': 'द्वारे मान्य',
    'alerts.acknowledged_at': 'स्वीकारलेला वेळ',
    'alerts.escalated': 'एस्केलेटेड',
    'alerts.resolved': 'निराकृत',
    
    'family.title': 'कुटुंब',
    'family.members': 'सदस्य',
    'family.invite_member': 'सदस्य आमंत्रित करा',
    'family.relationship': 'नाते',
    'family.parent': 'पालक',
    'family.child': 'मुलगा/मुलगी',
    'family.spouse': 'पती/पत्नी',
    'family.sibling': 'भाऊ/बहीण',
    'family.grandparent': 'आजोबा/आजी',
    'family.caregiver': 'काळजी घेणारा',
    'family.doctor': 'डॉक्टर',
    'family.nurse': 'नर्स',
    'family.other': 'इतर',
    'family.permissions': 'परवानगी',
    'family.escalation_level': 'एस्केलेशन लेव्हल',
    'family.primary_caregiver': 'प्राथमिक काळजी घेणारा',
    'family.emergency_contact': 'आपत्कालीन संपर्क',
    'family.invite_sent': 'आमंत्रण पाठवले',
    'family.invite_accepted': 'स्वीकारले',
    'family.invite_pending': 'प्रलंबित',
    'family.remove_member': 'सदस्य काढा टाका',
    'family.alerts': 'सूचना',
    'family.checkins': 'चेक-इन',
    'family.schedule_checkin': 'चेक-इन शेड्यूल करा',
    'family.complete_checkin': 'चेक-इन पूर्ण करा',
    'family.missed_checkin': 'चेक-इन चुकले',
    'family.settings': 'सेटिंग्ज',
    'family.auto_escalate': 'स्वयंचलित एस्केलेशन',
    'family.escalation_timeout': 'एस्केलेशन टाइमआउट',
    'family.emergency_services': 'आपत्कालीन सेवा',
    'family.share_glucose': 'ग्लुकोज शेअर करा',
    'family.share_insulin': 'इन्सुलिन शेअर करा',
    'family.share_meals': 'भोजन शेअर करा',
    'family.share_activity': 'क्रियाकलाप शेअर करा',
    
    'profile.title': 'प्रोफाइल',
    'profile.clinical': 'क्लिनिकल',
    'profile.insulin': 'इन्सुलिन',
    'profile.devices': 'उपकरणे',
    'profile.preferences': 'प्राधान्ये',
    'profile.consent': 'परवानगी',
    'profile.personal_info': 'वैयक्तिक माहिती',
    'profile.date_of_birth': 'जन्म तारीख',
    'profile.gender': 'लिंग',
    'profile.height': 'उंची',
    'profile.weight': 'वजन',
    'profile.diabetes_type': 'मधुमेह प्रकार',
    'profile.diagnosis_date': 'निदान तारीख',
    'profile.hba1c': 'HbA1c',
    'profile.hba1c_date': 'HbA1c तारीख',
    'profile.insulin_regimen': 'इन्सुलिन रेजिमेन',
    'profile.icr': 'ICR',
    'profile.isf': 'ISF',
    'profile.target_glucose': 'लक्ष्य ग्लुकोज',
    'profile.basal_rate': 'बेसल दर',
    'profile.nph_doses': 'NPH डोस',
    'profile.regular_doses': 'रेग्युलर डोस',
    'profile.cgm_type': 'CGM प्रकार',
    'profile.cgm_serial': 'CGM सीरियल',
    'profile.pump_type': 'पंप प्रकार',
    'profile.hypo_threshold': 'हायपो थ्रेशोल्ड',
    'profile.severe_hypo_threshold': 'तीव्र हायपो थ्रेशोल्ड',
    'profile.alert_sound': 'अलर्ट आवाज',
    'profile.caregiver_share': 'काळजी घेणारा शेअर करा',
    'profile.data_sharing': 'डेटा शेअर करा',
    'profile.research_consent': 'संशोधन परवानगी',
    'profile.marketing_consent': 'विपणन परवानगी',
    'profile.export_data': 'डेटा एक्सपोर्ट करा',
    'profile.delete_account': 'खाते हटवा',
    
    'settings.title': 'सेटिंग्ज',
    'settings.general': 'सामान्य',
    'settings.notifications': 'सूचना',
    'settings.appearance': 'दिसणारा',
    'settings.data_sync': 'डेटा सिंक',
    'settings.security': 'सुरक्षा',
    'settings.about': 'विषयी',
    'settings.language': 'भाषा',
    'settings.timezone': 'टाइमझोन',
    'settings.units': 'एकक',
    'settings.date_format': 'तारीख फॉर्मॅट',
    'settings.time_format': 'वेळ फॉर्मॅट',
    'settings.auto_sync': 'ऑटो सिंक',
    'settings.sync_frequency': 'सिंक अंतर',
    'settings.wifi_only_sync': 'फक्त वायफायवर सिंक',
    'settings.data_retention': 'डेटा रिटेन्शन',
    'settings.export_format': 'एक्सपोर्ट फॉर्मॅट',
    'settings.theme': 'थीम',
    'settings.compact_mode': 'कॉम्पॅक्ट मोड',
    'settings.high_contrast': 'उच्च कंट्रास्ट',
    'settings.large_text': 'मोठे अक्षरे',
    'settings.reduced_motion': 'कमी चाल',
    'settings.push_enabled': 'पुश सक्षम',
    'settings.email_enabled': 'ईमेल सक्षम',
    'settings.hypo_alerts': 'हायपो अलर्ट्स',
    'settings.hyper_alerts': 'हायपर अलर्ट्स',
    'settings.meal_reminders': 'भोजन स्मरणपत्रे',
    'settings.insulin_reminders': 'इन्सुलिन स्मरणपत्रे',
    'settings.weekly_report': 'साप्ताहिक अहवाल',
    
    'foods.title': 'अन्न पदार्थ',
    'foods.search': 'शोधा',
    'foods.categories': 'श्रेणी',
    'foods.composite_meals': 'संयुक्त भोजन',
    'foods.favorites': 'आवडते',
    'foods.nutrition_info': 'पोषण माहिती',
    'foods.glycemic_index': 'ग्लायसेमिक इंडेक्स',
    'foods.glycemic_load': 'ग्लायसेमिक लोड',
    'foods.serving_size': 'सर्व्हिंग आकार',
    'foods.reference_objects': 'संदर्भ वस्तू',
    'foods.preparation_methods': 'तयारी पद्धती',
    'foods.raw': 'कच्चे',
    'foods.boiled': 'उकळलेले',
    'foods.steamed': 'भापांत पकवलेले',
    'foods.fried': 'तलेले',
    'foods.roasted': 'भाजलेले',
    'foods.baked': 'बेक केलेले',
    'foods.pressure_cooked': 'प्रेशर कुक्ड',
    'foods.sauteed': 'सॉटेड',
    'foods.grilled': 'ग्रिल केलेले',
    
    'units.mg_dl': 'mg/dL',
    'units.mmol_l': 'mmol/L',
    'units.grams': 'ग्रॅम',
    'units.kilograms': 'किलोग्रॅम',
    'units.centimeters': 'सेंटीमीटर',
    'units.units': 'युनिट',
    'units.minutes': 'मिनिटे',
    'units.hours': 'तास',
    'units.days': 'दिवस',
    'units.weeks': 'आठवडे',
    'units.months': 'महिने',
    
    'time.now': 'आता',
    'time.minute_ago': '1 मिनिट आधी',
    'time.minutes_ago': '{{count}} मिनिटे आधी',
    'time.hour_ago': '1 तास आधी',
    'time.hours_ago': '{{count}} तास आधी',
    'time.yesterday': 'काल',
    'time.days_ago': '{{count}} दिवस आधी',
    'time.week_ago': '1 आठवडा आधी',
    'time.month_ago': '1 महिना आधी',
    'time.just_now': 'आताच',
    
    'a11y.skip_to_main': 'मुख्य सामग्रीला जा',
    'a11y.skip_to_navigation': 'नेव्हिगेशनला जा',
    'a11y.open_menu': 'मेनू उघडा',
    'a11y.close_menu': 'मेनू बंद करा',
    'a11y.loading': 'लोड होत आहे',
    'a11y.error': 'त्रुटी',
    'a11y.required_field': 'आवश्यक फील्ड',
    'a11y.optional_field': 'पर्यायी फील्ड',
    'a11y.invalid_input': 'अवैध इनपुट',
    'a11y.password_visible': 'पासवर्ड दाखवा',
    'a11y.password_hidden': 'पासवर्ड लपवा',
  },
};

// Language context
interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string;
  languageInfo: typeof SUPPORTED_LANGUAGES[number];
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('t1d-language') as LanguageCode) || 'en';
    }
    return 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('t1d-language', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = SUPPORTED_LANGUAGES.find(l => l.code === lang)?.rtl ? 'rtl' : 'ltr';
  };

  const t = (key: TranslationKeys, params?: Record<string, string | number>): string => {
    const langTranslations = translations[language] || {};
    const fallbackTranslations = translations.en || {};
    let translation = langTranslations[key] || fallbackTranslations[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        translation = translation.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });
    }
    
    return translation;
  };

  const languageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const isRTL = languageInfo.rtl;

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    
    // Load font for the language
    const fontMap: Record<LanguageCode, string> = {
      hi: 'Noto Sans Devanagari',
      ta: 'Noto Sans Tamil',
      te: 'Noto Sans Telugu',
      mr: 'Noto Sans Devanagari',
      gu: 'Noto Sans Gujarati',
      bn: 'Noto Sans Bengali',
      pa: 'Noto Sans Gurmukhi',
      kn: 'Noto Sans Kannada',
      ml: 'Noto Sans Malayalam',
      or: 'Noto Sans Oriya',
      as: 'Noto Sans Assamese',
    };
    
    const font = fontMap[language];
    if (font && font !== 'Noto Sans Devanagari') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = `https://fonts.googleapis.com/css2?family=${font.replace(' ', '+')}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languageInfo, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
}

// Number formatting for Indian languages
export function useNumberFormat() {
  const { language } = useTranslation();
  
  const formatNumber = (num: number, options: Intl.NumberFormatOptions = {}) => {
    const localeMap: Record<LanguageCode, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      gu: 'gu-IN',
      bn: 'bn-IN',
      pa: 'pa-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      or: 'or-IN',
      as: 'as-IN',
    };
    
    return new Intl.NumberFormat(localeMap[language] || 'en-IN', options).format(num);
  };
  
  const formatGlucose = (value: number, unit: 'mg/dL' | 'mmol/L' = 'mg/dL') => {
    return `${formatNumber(value)} ${unit}`;
  };
  
  const formatCarbs = (value: number) => {
    return `${formatNumber(value)} g`;
  };
  
  const formatInsulin = (value: number) => {
    return `${formatNumber(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} U`;
  };
  
  return { formatNumber, formatGlucose, formatCarbs, formatInsulin };
}

// Date formatting for Indian languages
export function useDateFormat() {
  const { language } = useTranslation();
  
  const formatDate = (date: Date, options: Intl.DateTimeFormatOptions = {}) => {
    const localeMap: Record<LanguageCode, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      gu: 'gu-IN',
      bn: 'bn-IN',
      pa: 'pa-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      or: 'or-IN',
      as: 'as-IN',
    };
    
    return new Intl.DateTimeFormat(localeMap[language] || 'en-IN', options).format(date);
  };
  
  const formatTimeAgo = (date: Date) => {
    const rtf = new Intl.RelativeTimeFormat(language === 'en' ? 'en-IN' : `${language}-IN`, { numeric: 'auto' });
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    
    if (diffMin < 1) return rtf.format(-diffMin, 'second') || 'just now';
    if (diffMin < 60) return rtf.format(-diffMin, 'minute');
    if (diffHr < 24) return rtf.format(-diffHr, 'hour');
    if (diffDay < 30) return rtf.format(-diffDay, 'day');
    if (diffDay < 365) return rtf.format(-Math.floor(diffDay / 30), 'month');
    return rtf.format(-Math.floor(diffDay / 365), 'year');
  };
  
  return { formatDate, formatTimeAgo };
}

// Glucose trend labels in local language
export function useGlucoseLabels() {
  const { t } = useTranslation();
  
  return {
    trend: {
      doubleUp: t('glucose.trend_double_up'),
      singleUp: t('glucose.trend_single_up'),
      stable: t('glucose.trend_stable'),
      singleDown: t('glucose.trend_single_down'),
      doubleDown: t('glucose.trend_double_down'),
    },
    range: {
      veryLow: t('glucose.very_low'),
      low: t('glucose.low'),
      inRange: t('glucose.in_range'),
      high: t('glucose.high'),
      veryHigh: t('glucose.very_high'),
    },
    alerts: {
      hypoWarning: t('alerts.hypo_warning'),
      hypoUrgent: t('alerts.hypo_urgent'),
      hypoEmergency: t('alerts.hypo_emergency'),
      hyperWarning: t('alerts.hyper_warning'),
      rapidDrop: t('alerts.rapid_drop'),
      rapidRise: t('alerts.rapid_rise'),
      signalLoss: t('alerts.signal_loss'),
    },
    carbOptions: [
      { label: 'glucose_tablets', carbs: 12 },
      { label: 'fruit_juice', carbs: 15 },
      { label: 'sugar', carbs: 12 },
      { label: 'honey', carbs: 17 },
      { label: 'soda', carbs: 15 },
      { label: 'banana', carbs: 18 },
      { label: 'dates', carbs: 15 },
      { label: 'raisins', carbs: 12 },
    ].map(opt => ({ ...opt, label: t(`alerts.${opt.label}`) })),
  };
}

export { SUPPORTED_LANGUAGES };
export type { LanguageCode, TranslationKeys };