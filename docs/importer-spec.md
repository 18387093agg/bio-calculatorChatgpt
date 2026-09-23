# Importer specification
Import performs parse, preview, validation, transformation, dry-run, then a caller-managed transaction. It rejects unknown IDs, bad units, negative/non-finite values, and duplicate food/form pairs. Unknown columns are not guessed or silently mapped.
