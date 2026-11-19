-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'CAREGIVER', 'CLINICIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "DiabetesType" AS ENUM ('T1D', 'T2D', 'LADA', 'MODY', 'OTHER');

-- CreateEnum
CREATE TYPE "InsulinRegimen" AS ENUM ('BASAL_BOLUS', 'NPH_REGULAR', 'PREMIXED_30_70', 'PREMIXED_50_50', 'PUMP', 'OTHER');

-- CreateEnum
CREATE TYPE "CGMType" AS ENUM ('DEXCOM_G6', 'DEXCOM_G7', 'LIBRE_2', 'LIBRE_3', 'MEDTRONIC_G3', 'MEDTRONIC_G4', 'NONE');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT', 'BEDTIME');

-- CreateEnum
CREATE TYPE "InputMethod" AS ENUM ('TEXT_SEARCH', 'VOICE', 'PHOTO_OCR', 'PHOTO_ML', 'BARCODE', 'COMPOSITE_SELECT', 'MANUAL');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('HOME', 'WORK', 'SCHOOL', 'RESTAURANT', 'TRAVEL', 'OTHER');

-- CreateEnum
CREATE TYPE "InsulinType" AS ENUM ('RAPID_LISPRO', 'RAPID_ASPART', 'RAPID_GLULISINE', 'REGULAR_HUMAN', 'NPH_HUMAN', 'PREMIXED_30_70', 'PREMIXED_50_50', 'PREMIXED_25_75', 'GLARGINE_U100', 'GLARGINE_U300', 'DEGLUDEC_U100', 'DEGLUDEC_U200', 'BASAL_PUMP');

-- CreateEnum
CREATE TYPE "InjectionSite" AS ENUM ('ABDOMEN', 'THIGH', 'ARM', 'BUTTOCK', 'PUMP_SITE');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('PEN', 'SYRINGE', 'PUMP', 'INHALER');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('WARNING', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "CGMSource" AS ENUM ('DEXCOM_API', 'LIBRE_API', 'MEDTRONIC_API', 'BLUETOOTH', 'MANUAL', 'SIMULATED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "user_id" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "height_cm" DECIMAL(5,2),
    "weight_kg" DECIMAL(5,2),
    "diabetes_type" "DiabetesType" NOT NULL,
    "diagnosis_date" TIMESTAMP(3),
    "hba1c_latest" DECIMAL(3,1),
    "hba1c_date" TIMESTAMP(3),
    "insulin_regimen" "InsulinRegimen" NOT NULL,
    "icr_g_per_u" DECIMAL(5,2),
    "isf_mg_dl_per_u" DECIMAL(5,1),
    "target_glucose_mg_dl" INTEGER NOT NULL DEFAULT 110,
    "basal_rate_u_per_hr" DECIMAL(4,2),
    "nph_morning_u" DECIMAL(4,1),
    "nph_evening_u" DECIMAL(4,1),
    "regular_breakfast_u" DECIMAL(4,1),
    "regular_lunch_u" DECIMAL(4,1),
    "regular_dinner_u" DECIMAL(4,1),
    "cgm_type" "CGMType",
    "cgm_serial_hash" TEXT,
    "pump_type" TEXT,
    "hypo_threshold_mg_dl" INTEGER NOT NULL DEFAULT 70,
    "severe_hypo_threshold_mg_dl" INTEGER NOT NULL DEFAULT 54,
    "alert_sound_enabled" BOOLEAN NOT NULL DEFAULT true,
    "caregiver_share_enabled" BOOLEAN NOT NULL DEFAULT false,
    "data_sharing_consent" BOOLEAN NOT NULL DEFAULT false,
    "research_consent" BOOLEAN NOT NULL DEFAULT false,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "foods" (
    "id" TEXT NOT NULL,
    "fdc_id" INTEGER,
    "nin_code" TEXT,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "name_regional" JSONB NOT NULL DEFAULT '{}',
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "region_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "energy_kcal" DECIMAL(6,2),
    "carbs_g" DECIMAL(6,2) NOT NULL,
    "protein_g" DECIMAL(6,2),
    "fat_g" DECIMAL(6,2),
    "fiber_g" DECIMAL(6,2),
    "sugar_g" DECIMAL(6,2),
    "sodium_mg" DECIMAL(6,2),
    "potassium_mg" DECIMAL(6,2),
    "glycemic_index" INTEGER,
    "glycemic_load_per_serving" DECIMAL(5,2),
    "typical_serving_g" DECIMAL(7,2),
    "serving_description" TEXT,
    "reference_objects" JSONB NOT NULL DEFAULT '{}',
    "prep_methods" JSONB NOT NULL DEFAULT '{}',
    "source" TEXT NOT NULL,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "confidence_score" DECIMAL(3,2) NOT NULL DEFAULT 0.8,
    "is_composite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "composite_meals" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT,
    "name_regional" JSONB NOT NULL DEFAULT '{}',
    "description" TEXT,
    "region_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "meal_type_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "occasion_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "components" JSONB NOT NULL,
    "total_carbs_g" DECIMAL(7,2) NOT NULL,
    "total_protein_g" DECIMAL(7,2),
    "total_fat_g" DECIMAL(7,2),
    "total_fiber_g" DECIMAL(7,2),
    "total_energy_kcal" DECIMAL(7,2),
    "estimated_gi" INTEGER,
    "estimated_gl" DECIMAL(5,2),
    "servings" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "confidence_score" DECIMAL(3,2) NOT NULL DEFAULT 0.75,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "composite_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meal_time" TIMESTAMP(3) NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "input_method" "InputMethod" NOT NULL,
    "items" JSONB NOT NULL,
    "total_carbs_g" DECIMAL(7,2) NOT NULL,
    "total_protein_g" DECIMAL(7,2),
    "total_fat_g" DECIMAL(7,2),
    "total_fiber_g" DECIMAL(7,2),
    "absorption_profile" JSONB,
    "location_type" "LocationType",
    "hunger_level" INTEGER,
    "mood_tag" TEXT,
    "notes" TEXT,
    "synced_at" TIMESTAMP(3),
    "client_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_components" (
    "id" TEXT NOT NULL,
    "food_id" TEXT NOT NULL,
    "meal_log_id" TEXT NOT NULL,
    "quantity_g" DECIMAL(7,2) NOT NULL,
    "prep_method" TEXT,
    "carbs_g" DECIMAL(7,2) NOT NULL,
    "protein_g" DECIMAL(7,2),
    "fat_g" DECIMAL(7,2),

    CONSTRAINT "meal_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insulin_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "administered_at" TIMESTAMP(3) NOT NULL,
    "insulin_type" "InsulinType" NOT NULL,
    "dose_u" DECIMAL(4,2) NOT NULL,
    "injection_site" "InjectionSite" NOT NULL,
    "related_meal_log_id" TEXT,
    "glucose_at_injection" INTEGER,
    "carb_estimate_g" DECIMAL(6,2),
    "calculator_recommended_u" DECIMAL(4,2),
    "override_reason" TEXT,
    "delivery_method" "DeliveryMethod" NOT NULL,
    "device_id" TEXT,
    "synced_at" TIMESTAMP(3),
    "client_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insulin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgm_readings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "time" TIMESTAMPTZ(6) NOT NULL,
    "glucose_mg_dl" INTEGER NOT NULL,
    "trend" INTEGER,
    "trend_arrow" TEXT,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "noise_level" TEXT,
    "signal_loss" BOOLEAN NOT NULL DEFAULT false,
    "source" "CGMSource" NOT NULL,
    "device_timestamp" TIMESTAMP(3),
    "client_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cgm_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hypo_predictions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "predicted_at" TIMESTAMP(3) NOT NULL,
    "prediction_horizon_min" INTEGER NOT NULL,
    "glucose_p10" INTEGER,
    "glucose_p50" INTEGER,
    "glucose_p90" INTEGER,
    "hypo_probability" DECIMAL(4,3) NOT NULL,
    "severe_hypo_probability" DECIMAL(4,3) NOT NULL,
    "top_features" JSONB,
    "model_version" TEXT NOT NULL,
    "actual_glucose_30min" INTEGER,
    "actual_glucose_60min" INTEGER,
    "was_hypo_30min" BOOLEAN,
    "was_hypo_60min" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hypo_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hypo_alerts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prediction_id" TEXT,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alert_level" "AlertLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "recommended_action" TEXT,
    "indian_carb_options" JSONB,
    "acknowledged_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "dismiss_reason" TEXT,
    "escalated_to_caregiver_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hypo_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'staging',
    "deployed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration_ms" DOUBLE PRECISION,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "foods_fdc_id_key" ON "foods"("fdc_id");

-- CreateIndex
CREATE UNIQUE INDEX "foods_nin_code_key" ON "foods"("nin_code");

-- CreateIndex
CREATE INDEX "foods_category_idx" ON "foods"("category");

-- CreateIndex
CREATE INDEX "foods_region_tags_idx" ON "foods"("region_tags");

-- CreateIndex
CREATE INDEX "composite_meals_region_tags_idx" ON "composite_meals"("region_tags");

-- CreateIndex
CREATE INDEX "composite_meals_meal_type_tags_idx" ON "composite_meals"("meal_type_tags");

-- CreateIndex
CREATE INDEX "meal_logs_user_id_meal_time_idx" ON "meal_logs"("user_id", "meal_time" DESC);

-- CreateIndex
CREATE INDEX "meal_components_meal_log_id_idx" ON "meal_components"("meal_log_id");

-- CreateIndex
CREATE INDEX "insulin_logs_user_id_administered_at_idx" ON "insulin_logs"("user_id", "administered_at" DESC);

-- CreateIndex
CREATE INDEX "insulin_logs_related_meal_log_id_idx" ON "insulin_logs"("related_meal_log_id");

-- CreateIndex
CREATE INDEX "cgm_readings_user_id_time_idx" ON "cgm_readings"("user_id", "time" DESC);

-- CreateIndex
CREATE INDEX "cgm_readings_user_id_time_is_valid_idx" ON "cgm_readings"("user_id", "time" DESC, "is_valid");

-- CreateIndex
CREATE INDEX "hypo_predictions_user_id_predicted_at_idx" ON "hypo_predictions"("user_id", "predicted_at" DESC);

-- CreateIndex
CREATE INDEX "hypo_alerts_user_id_triggered_at_idx" ON "hypo_alerts"("user_id", "triggered_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ml_models_name_key" ON "ml_models"("name");

-- CreateIndex
CREATE INDEX "ml_models_name_version_idx" ON "ml_models"("name", "version");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_components" ADD CONSTRAINT "meal_components_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insulin_logs" ADD CONSTRAINT "insulin_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insulin_logs" ADD CONSTRAINT "insulin_logs_related_meal_log_id_fkey" FOREIGN KEY ("related_meal_log_id") REFERENCES "meal_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgm_readings" ADD CONSTRAINT "cgm_readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hypo_predictions" ADD CONSTRAINT "hypo_predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hypo_alerts" ADD CONSTRAINT "hypo_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hypo_alerts" ADD CONSTRAINT "hypo_alerts_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "hypo_predictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
