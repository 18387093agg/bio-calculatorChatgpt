# Scientific model audit

This ledger records every physiological coefficient currently executable by the calculator and the previously proposed coefficients that were audited but are deliberately disabled. The canonical database representation is seeded by migration `202609250003_scientific_audit_and_integrity.sql`. Classifications are: **A** experimentally derived, **B** clinical-guideline/reference derived, **C** fitted/calibrated, **D** mechanistic approximation, **E** heuristic, and **F** unsupported/not modeled.

| Model key | Formula / parameters / conditions | Class | Evidence and confidence | Limitations / disposition |
|---|---|---|---|---|
| `iron.heme.absorption_range.v1` | absorbed = gross heme × 0.15–0.35; food heme only | D | Hurrell & Egli, *Am J Clin Nutr* 2010; low | Population range, not personal absorption. |
| `iron.nonheme.absorption_range.v1` | absorbed = gross non-heme × 0.03–0.12; food non-heme only | D | Hurrell & Egli 2010; low | Meal and iron-status effects are not individualized. |
| `iron.nonheme.low_acid.v1` | non-heme range × 0.70 when gastric acid is low/absent | E | mechanistic evidence review; low | Exact penalty is not directly established; sensitivity assumption, disclosed in output. Heme is excluded. |
| `b12.food_bound.absorption_range.v1` | absorbed = food-bound gross × 0.30–0.60 | D | Institute of Medicine DRI chapter; low | Does not estimate intrinsic-factor capacity or dose saturation. |
| `b12.free.absorption_range.v1` | absorbed = free/crystalline gross × 0.30–0.60 | D | Institute of Medicine DRI chapter; low | Only the bounded dietary-dose range; passive diffusion/high-dose supplements are not modeled. |
| `b12.food_bound.low_acid.v1` | food-bound range × 0.65 when gastric acid is low/absent | E | food-cobalamin malabsorption literature; low | Sensitivity assumption, not patient-specific. Free B12 is excluded. |
| `thiamine.energy.optimization.v1` | target = energy × 0.60–0.68 mg/1000 kcal | E | project model; low | Not an official RDA and not generalized to other nutrients. |
| `pral.remer.manz.v1` | 0.49 protein + 0.037 phosphorus − 0.021 potassium − 0.026 magnesium − 0.013 calcium | C | Remer & Manz 1995; moderate | Estimates renal acid load, not blood pH. |
| `preparation.retention.food_method.v1` | retained amount = normalized amount × record-specific retention range | A | USDA Table of Nutrient Retention Factors; moderate | May run only with an evidence-linked food/method/nutrient record. No universal cooking factor exists. |
| `preparation.yield.food_method.v1` | normalized prepared mass uses record-specific yield range | A | USDA yield/retention data; moderate | Food/method specific; unavailable without a record. |
| `zip4.saturation.v1` | none | F | audit found no validated meal-level coefficient; low | Disabled; zinc absorption remains unavailable. |
| `zinc.copper.drain.v1` | none | F | interaction is clinically recognized at sustained high zinc exposure, but no defensible per-meal drain coefficient; low | Disabled; never emitted as a numeric copper loss. |
| `vitamin_d.magnesium.drain.v1` | none | F | magnesium participates in vitamin-D metabolism, but a drain coefficient is unsupported; low | Disabled. |
| `ttfd.magnesium.drain.v1` | none | F | no quantitative clinical reference located; low | Disabled. |
| `ttfd.potassium.drain.v1` | none | F | no quantitative clinical reference located; low | Disabled. |
| `methylation.stoichiometry.v1` | none | F | pathway stoichiometry cannot be translated into dietary depletion; low | Disabled. |
| `intracellular.conversion.v1` | none | F | food intake cannot support a general intracellular conversion factor; low | Stage is unavailable. |
| `systemic_pool.conversion.v1` | none | F | no general factor from absorbed dose to systemic pool; low | Stage is unavailable. |
| `active_form.conversion.v1` | none | F | nutrient- and patient-specific metabolism; low | Stage is unavailable. |
| `pathology.malabsorption.generic.v1` | none | F | disease-specific diagnosis/data required; low | No generic pathology multiplier is applied. |

Official RDA/AI/EAR/PRI/AR/UL records are **B**, must cite their jurisdiction, population, life stage, and evidence row, and are not calculation coefficients. The reference-target dataset contains US adult examples and labels them accordingly. “Optimal” values exist only for the thiamine project rule above. Missing values remain unavailable, never zero.
