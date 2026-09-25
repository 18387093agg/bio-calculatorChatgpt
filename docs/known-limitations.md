# Known limitations
This is an estimation framework, not a metabolic simulation, laboratory measurement, or diagnostic tool. Quantitative absorption is intentionally limited to source-aware iron and B12 ranges. Systemic-pool, intracellular, active-form, generic pathology, and unsupported interaction stages remain unavailable rather than zero.

The local browser bundle contains the canonical 87-food dataset acquired from official USDA FoodData Central responses. Its deterministic resolution report retains the selected FDC identifiers, candidate reasoning, and value-level nutrient provenance. Re-running acquisition requires a locally supplied USDA API key; no key or fallback composition is shipped.

Browser persistence is local storage only. The Supabase schema and RLS are ready for an authenticated adapter, but no cross-device/authenticated client is claimed and no service-role credential is shipped. Preparation-specific retention/yield is calculated only when an evidence-linked record exists; selecting a preparation label in the calculator does not invent a universal cooking factor.

## Low gastric acid and celiac disease

For this release, hypochlorhydria and celiac disease are state-aware qualitative mechanisms, not numerical disease multipliers. No defensible human coefficient compatible with the calculator's food-form, dose, stage, and healthy comparison was identified for food-bound B12 or non-heme iron in documented low acid, or for iron, folate, B12, vitamin D, calcium, zinc, or magnesium in active versus treated celiac disease. Consequently, the application does not change the healthy absorption range, official reference value, or dietary target for either condition. A condition-specific “personalized modeled requirement” is deliberately unavailable.

An acute PPI/protein-bound-B12 study is recorded as a separate medication context, not as proof that PPI use equals hypochlorhydria and not as a transferable coefficient. Heme iron and free/crystalline B12 are not penalized. When both conditions are selected, their named qualitative mechanisms are preserved without multiplying or otherwise combining unsupported effects.
