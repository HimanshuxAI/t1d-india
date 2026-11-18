# Bolus Calculation Logic (shared with API)

INSULIN_SAFETY = {
    "MAX_BOLUS_U": 15.0,
    "MAX_CORRECTION_U": 5.0,
    "MIN_GLUCOSE_FOR_CORRECTION": 90,
    "TARGET_GLUCOSE": 110,
    "MIN_PREDICTED_GLUCOSE": 70,
    "IOB_HIGH_THRESHOLD_U": 3.0,
    "RECENT_HYPO_WINDOW_MIN": 120,
    "MAX_IOB_ADJUSTMENT_FACTOR": 0.5,
}


def calculate_bolus(
    carbsG: float,
    currentGlucose: int,
    iobRapid: float,
    iobRegular: float,
    iobNph: float,
    icr: float,
    isf: float,
    regimen: str,
    recentHypo: bool,
    timeSinceLastMealMin: float | None = None,
) -> dict:
    warnings = []
    mealBolus = 0.0
    correctionBolus = 0.0

    # 1. Meal bolus
    if carbsG > 0 and icr > 0:
        mealBolus = carbsG / icr

    # 2. Correction bolus
    if (currentGlucose > INSULIN_SAFETY["TARGET_GLUCOSE"] and
        not recentHypo and
        currentGlucose >= INSULIN_SAFETY["MIN_GLUCOSE_FOR_CORRECTION"]):
        correctionBolus = (currentGlucose - INSULIN_SAFETY["TARGET_GLUCOSE"]) / isf
        correctionBolus = min(correctionBolus, INSULIN_SAFETY["MAX_CORRECTION_U"])

    # 3. IOB adjustment
    totalIob = iobRapid + iobRegular * 0.5 + iobNph * 0.3
    iobAdjustment = 0.0
    if totalIob > INSULIN_SAFETY["IOB_HIGH_THRESHOLD_U"]:
        warnings.append(f"High IOB ({totalIob:.1f}U) - consider reducing bolus")
        iobAdjustment = max(0, (totalIob - INSULIN_SAFETY["IOB_HIGH_THRESHOLD_U"]) * INSULIN_SAFETY["MAX_IOB_ADJUSTMENT_FACTOR"])

    # 4. Regimen-specific adjustments
    regimenAdjustment = 0.0
    if regimen == "NPH_REGULAR" and timeSinceLastMealMin and 240 <= timeSinceLastMealMin <= 480:
        warnings.append("Morning NPH may be peaking - consider 20% bolus reduction")
        regimenAdjustment = -0.2 * (iobRapid + iobRegular)
    elif regimen == "PREMIXED_30_70" and timeSinceLastMealMin and 180 <= timeSinceLastMealMin <= 360:
        warnings.append("Premixed NPH component active - reduced correction recommended")
        regimenAdjustment = -0.15 * iobNph

    # 5. Total bolus
    totalBolus = mealBolus + correctionBolus - iobAdjustment + regimenAdjustment
    totalBolus = max(0, totalBolus)

    # 6. Safety cap
    maxAllowed = INSULIN_SAFETY["MAX_BOLUS_U"]
    if totalBolus > maxAllowed:
        warnings.append(f"Calculated bolus ({totalBolus:.1f}U) exceeds max ({maxAllowed}U)")
        totalBolus = maxAllowed

    # 7. Predicted glucose floor check
    predictedDrop = totalBolus * isf
    predictedMin = currentGlucose - predictedDrop
    if predictedMin < INSULIN_SAFETY["MIN_PREDICTED_GLUCOSE"]:
        warnings.append(f"Predicted glucose may drop to {round(predictedMin)} mg/dL")
        safeBolus = (currentGlucose - 80) / isf
        totalBolus = min(totalBolus, max(0, safeBolus))

    # 8. Recent hypo warning
    if recentHypo:
        warnings.append("Recent hypoglycemia detected - consider reducing bolus by 25-50%")

    # Generate explanation
    explanationParts = [
        f"Meal bolus: {mealBolus:.1f}U ({carbsG}g / {icr}g/U)",
    ]
    if correctionBolus > 0:
        explanationParts.append(f"Correction: {correctionBolus:.1f}U (({currentGlucose}-{INSULIN_SAFETY['TARGET_GLUCOSE']}) / {isf})")
    else:
        explanationParts.append("No correction needed")
    if iobAdjustment > 0:
        explanationParts.append(f"IOB adjustment: -{iobAdjustment:.1f}U")
    if regimenAdjustment != 0:
        explanationParts.append(f"Regimen adjustment: {regimenAdjustment:+.1f}U")

    explanation = "; ".join(explanationParts)

    return {
        "mealBolusU": round(mealBolus, 1),
        "correctionBolusU": round(correctionBolus, 1),
        "totalBolusU": round(totalBolus, 1),
        "maxAllowedU": maxAllowed,
        "warnings": warnings,
        "explanation": explanation,
        "safetyCheck": {
            "predictedMinGlucose": round(predictedMin),
            "iobTotalU": round(totalIob, 1),
        },
    }


if __name__ == "__main__":
    # Test
    result = calculate_bolus(
        carbsG=60,
        currentGlucose=140,
        iobRapid=1.0,
        iobRegular=0.0,
        iobNph=0.0,
        icr=10.0,
        isf=50.0,
        regimen="BASAL_BOLUS",
        recentHypo=False,
    )
    print(json.dumps(result, indent=2))