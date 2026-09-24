# Calculation model

The canonical pipeline is portion normalization → food/method preparation yield → nutrient retention → chemical form → gross intake → qualified meal interactions → bioaccessibility → absorption → systemic pool → conversion → active pool → target comparison. It is orchestrated by `calculateNutrientPipeline`; unsupported stages are `null`, never fabricated zeroes.

Yield and retention remain distinct. Form-aware iron and B12 ranges are marked as modeled estimates with evidence/assumptions; unsupported nutrients stop at gross intake. The thiamine project optimization model is energy-based (0.60–0.68 mg/1000 kcal), separate from official references and explicitly a model assumption.
