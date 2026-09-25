# Importer specification

The importer follows parse → explicit mapping → validation → preview/dry run → caller-owned database transaction → report. It never guesses an unfamiliar nutrient column or silently converts an unsupported unit.

`previewUsdaRows` validates known food IDs, known nutrient-form IDs, supported units, finite non-negative amounts, and duplicate food/form pairs. It returns accepted rows and row/field/reason issues while keeping `dryRun: true`; persistence must occur only after review in one database transaction. This preserves the distinction between USDA/FDC food identifiers and the application's canonical nutrient-form identifiers.

`importFdcFood` is the canonical USDA FoodData Central boundary. It requires an explicit FDC-nutrient-to-canonical-form map, verifies units without implicit conversion, rejects duplicate canonical forms, and emits value-level FDC provenance plus explicit preparation and raw/cooked basis. Unknown columns are ignored rather than guessed. Phytate, oxalate, fibre, and other modifiers are mapped only if an identified source value exists; missing values stay unavailable.

`data/fdc-food-manifest.json` provides 87 reviewed search descriptors for production. It contains no composition. The authenticated importer resolves each descriptor against Foundation, SR Legacy, or Survey/FNDDS records, records the deterministic decision in `data/fdc-resolution-report.json`, and atomically publishes `public/canonical-foods.json`. The browser has no composition fallback.
