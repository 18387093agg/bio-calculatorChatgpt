# Known limitations
This is an estimation framework, not a metabolic simulation, laboratory measurement, or diagnostic tool. Quantitative absorption is intentionally limited to source-aware iron and B12 ranges. Systemic-pool, intracellular, active-form, generic pathology, and unsupported interaction stages remain unavailable rather than zero.

The local browser bundle contains the canonical 87-food dataset acquired from official USDA FoodData Central responses. Its deterministic resolution report retains the selected FDC identifiers, candidate reasoning, and value-level nutrient provenance. Re-running acquisition requires a locally supplied USDA API key; no key or fallback composition is shipped.

Browser persistence is local storage only. The Supabase schema and RLS are ready for an authenticated adapter, but no cross-device/authenticated client is claimed and no service-role credential is shipped. Preparation-specific retention/yield is calculated only when an evidence-linked record exists; selecting a preparation label in the calculator does not invent a universal cooking factor.
