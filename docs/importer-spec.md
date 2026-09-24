# Importer specification

The importer follows parse → explicit mapping → validation → preview/dry run → caller-owned database transaction → report. It never guesses an unfamiliar nutrient column or silently converts an unsupported unit.

`previewUsdaRows` validates known food IDs, known nutrient-form IDs, supported units, finite non-negative amounts, and duplicate food/form pairs. It returns accepted rows and row/field/reason issues while keeping `dryRun: true`; persistence must occur only after review in one database transaction. This preserves the distinction between USDA/FDC food identifiers and the application's canonical nutrient-form identifiers.
