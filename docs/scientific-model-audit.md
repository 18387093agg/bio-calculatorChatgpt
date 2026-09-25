# Scientific model audit

This ledger describes executable behavior, not clinical advice. **A** = experimentally derived, **B** = clinical guideline/reference derived, **C** = fitted/calibrated, **D** = mechanistic approximation, **E** = heuristic, and **F** = unsupported/not modeled. SQL is the canonical persistence structure; `src/calculation/engine.ts` contains only pure execution of the explicitly named models.

| Model key | Equation / stage / population | Class | Evidence, confidence, and limitation |
|---|---|---:|---|
| `zinc.miller.phytate.saturation.v1` | `0.5*(Amax + TDZ + Kr*(1+TDP/Kp)-sqrt(...))`, converted mmol/day to mg/day; **absorption**, adult dietary datasets | C | Miller et al. 2007, DOI 10.1093/jn/137.1.135; low. `Amax=0.091`, `Kr=0.680`, `Kp=0.033` mmol/day model parameters. Requires daily dietary zinc (mg/day) and phytate (mg/day). It is a population fit, does not measure a user’s ZIP4 expression, and is not enabled from one meal unless the caller explicitly supplies day scope. |
| `iron.heme.absorption_range.v1` | gross heme × 0.15–0.35; **absorption**, food iron | D | Hurrell & Egli 2010; low. Population range; not personal absorption. |
| `iron.nonheme.absorption_range.v1` | gross non-heme × 0.03–0.12; **absorption**, food iron | D | Hurrell & Egli 2010; low. Status and meal modifiers are not individualized. |
| `b12.food_bound.absorption_range.v1` | food-bound gross × 0.30–0.60; **absorption**, bounded dietary dose | D | National Academies B12 DRI; low. Does not model intrinsic factor or high-dose kinetics. |
| `b12.free.absorption_range.v1` | free/crystalline gross × 0.30–0.60; **absorption**, bounded dietary dose | D | National Academies B12 DRI; low. Does not model high-dose passive diffusion. |
| `hypochlorhydria` condition effects | food-bound B12 release and non-heme iron solubilization; **absorption** | B, qualitative | Clinical/mechanistic literature supports the mechanisms. No validated nutrient-specific low-acid multiplier is applied, so personalized absorbed amount and personalized target remain unavailable beyond the healthy population ranges. Free/crystalline B12 and heme iron are excluded from this mechanism. |
| `zinc.copper.high_supplement.qualitative.v1` | sustained supplemental zinc ≥ 50 mg/day flags possible altered **copper absorption** | B, qualitative | National Academies zinc DRI; low. The conservative threshold reflects intake above the adult UL (40 mg/day), not a dose-response coefficient. Normal dietary zinc creates no flag. Gross copper is never subtracted and copper status is not inferred. |
| `magnesium.vitamin_d.activation.qualitative.v1` | magnesium availability may affect vitamin-D **conversion/activation** | B, qualitative | Human/mechanistic reviews; low. No magnesium drain and no intake-to-calcitriol coefficient. |
| `magnesium.thiamine.utilization.qualitative.v1` | magnesium availability may affect thiamine-dependent **utilization** | B, qualitative | Human/mechanistic reviews; low. This is not evidence that TTFD/fursultiamine drains magnesium. |
| `ttfd.potassium.drain.v1` | unavailable | F | No direct human quantitative TTFD→potassium depletion evidence was identified; numerical drain remains disabled. |
| `methylation.stoichiometry.v1` | unavailable | F | One-carbon pathway models require biochemical pools, fluxes, genotype and clinical inputs. Dietary intake alone cannot predict SAM/SAH/homocysteine, so no fixed depletion stoichiometry is used. |
| `systemic_pool.conversion.v1`, `intracellular.conversion.v1`, `active_form.conversion.v1` | unavailable downstream stages | F | Absorbed meal amount cannot be universally converted to systemic, intracellular, or active pools. Results are `null` with a reason, never zero. |
| `pathology.malabsorption.generic.v1` | unavailable | F | A generic multiplier is scientifically invalid and remains prohibited. |

The legacy identifiers `zip4.saturation.v1`, `zinc.copper.drain.v1`, `vitamin_d.magnesium.drain.v1`, `ttfd.magnesium.drain.v1`, `ttfd.potassium.drain.v1`, `methylation.stoichiometry.v1`, `intracellular.conversion.v1`, `systemic_pool.conversion.v1`, and `active_form.conversion.v1` remain disabled audit records. `zinc.miller.phytate.saturation.v1` replaces only the former ZIP4 placeholder; the copper and magnesium/thiamine mechanisms are retained qualitatively rather than as drains.

## Condition database and combination behavior

`CONDITION_CATALOG` exposes hypochlorhydria, celiac disease, Crohn’s disease, ulcerative colitis, pancreatic exocrine insufficiency, bariatric bypass, ileal resection, gastrectomy, short bowel syndrome, chronic kidney disease, and chronic liver disease. Each row defines its physiological mechanism, affected nutrients, model stage, effect type, source, confidence class, and applicable state inputs. Except for the zinc population model above, these are currently **qualitative clinical considerations**: deficiency association is never misrepresented as a numerical absorption coefficient.

The default selected-condition list is empty: this is the healthy baseline. Effects are collected by mechanism ID and deduplicated. In particular, a gastrectomy selection does not stack a second food-release effect when the hypochlorhydria food-release mechanism is already present. The application keeps official RDA/AI/UL values separate from model outputs; it does not generate a personalized requirement where no numerical model exists.

## Recommendations and safety

Hypochlorhydria includes a clinician-discussion recommendation for **Betaine HCl**. A human pharmacological study found temporary gastric pH lowering in pharmacologically induced hypochlorhydria (DOI 10.1021/mp500532c). That does not establish a treatment, diagnosis, dose, or restoration percentage for B12/iron absorption. The UI explicitly cautions about ulcers, gastritis, reflux/esophageal disease, medication interactions, and symptom-based self-diagnosis.

## Unchanged supporting models

`thiamine.energy.optimization.v1` remains an **E** project target of 0.60–0.68 mg/1000 kcal, separate from official references. `pral.remer_manz.v1` remains a **C** fitted estimate of renal acid load. Preparation yield/retention are **A** only when record-specific USDA evidence is provided. Official RDA/AI/EAR/PRI/AR/UL records are **B** reference values, not physiology coefficients.
