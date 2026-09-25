# Scientific model audit

This ledger describes executable behavior, not clinical advice. **A** = experimentally derived, **B** = clinical guideline/reference derived, **C** = fitted/calibrated, **D** = mechanistic approximation, **E** = heuristic, and **F** = unsupported/not modeled. SQL is the canonical persistence structure; `src/calculation/engine.ts` contains only pure execution of the explicitly named models.

| Model key | Equation / stage / population | Class | Evidence, confidence, and limitation |
|---|---|---:|---|
| `zinc.miller.phytate.saturation.v1` | `0.5*(Amax + TDZ + Kr*(1+TDP/Kp)-sqrt(...))`, converted mmol/day to mg/day; **absorption**, adult dietary datasets | C | Miller et al. 2007, DOI 10.1093/jn/137.1.135; low. `Amax=0.091`, `Kr=0.680`, `Kp=0.033` mmol/day model parameters. Requires daily dietary zinc (mg/day) and phytate (mg/day). It is a population fit, does not measure a user’s ZIP4 expression, and is not enabled from one meal unless the caller explicitly supplies day scope. |
| `iron.heme.absorption_range.v1` | gross heme × 0.15–0.35; **absorption**, food iron | D | Hurrell & Egli 2010; low. Population range; not personal absorption. |
| `iron.nonheme.absorption_range.v1` | gross non-heme × 0.03–0.12; **absorption**, food iron | D | Hurrell & Egli 2010; low. Status and meal modifiers are not individualized. |
| `b12.food_bound.absorption_range.v1` | food-bound gross × 0.30–0.60; **absorption**, bounded dietary dose | D | National Academies B12 DRI; low. Does not model intrinsic factor or high-dose kinetics. |
| `b12.free.absorption_range.v1` | free/crystalline gross × 0.30–0.60; **absorption**, bounded dietary dose | D | National Academies B12 DRI; low. Does not model high-dose passive diffusion. |
| `thiamine.energy.optimization.v1` | energy × 0.60–0.68 mg/1000 kcal | E | Project heuristic, low; explicitly not an official population reference. |
| `pral.remer_manz.v1` | 0.49 protein + 0.037 phosphorus − 0.021 potassium − 0.026 magnesium − 0.013 calcium | C | Published fitted renal-acid-load estimate; does not predict blood pH. |
| preparation yield/retention | food × record-specific yield × nutrient-specific retention | A when evidence-linked; otherwise unavailable | Source-specific records only; no universal cooking coefficient. |
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

## Condition-specific evidence audit: low gastric acid / hypochlorhydria

No condition-specific numerical adjustment is enabled. This is an executable scientific boundary, rather than a missing fallback multiplier.

| Nutrient/form and context | What human evidence measures | Classification in this calculator | Reason no coefficient is applied |
|---|---|---|---|
| Food-bound B12; pharmacological acid suppression | Marcuard et al. (1994, PubMed 8276393) used an acute protein-bound cobalamin absorption test in 10 healthy volunteers during omeprazole exposure. | Qualitative absorption mechanism; `b12.food_bound.pii_acid_suppression.v1` is disabled (F, low confidence). | It is a small, acute medication study, not documented spontaneous hypochlorhydria/achlorhydria; its test dose and baseline are not compatible with this app's 30–60% healthy dietary range. It does not measure free/crystalline B12 or long-term nutrient status. Medication exposure is therefore a distinct context, not a diagnosis. |
| Food-bound B12; suspected, documented, or achlorhydric state | Authoritative DRI/review evidence supports acid/protein release as a prerequisite before intrinsic-factor binding. | Qualitative absorption mechanism; no modelled target. | Deficiency prevalence and mechanistic release cannot be converted into an individual absorption fraction. Suspected state never enables a number. |
| Free/crystalline B12 | The food-protein release step is bypassed. | No condition penalty. | There is no direct evidence here for a low-acid coefficient; intrinsic-factor capacity is separately unmodelled. |
| Non-heme iron; suspected, documented, or achlorhydric state | Human nutrition literature supports acid-dependent solubilization/reduction of non-heme iron. | Qualitative absorption mechanism; `iron.nonheme.hypochlorhydria.v1` is disabled (F, low confidence). | No validated nutrient/form-specific human low-acid dietary absorption range suitable for an individual calculator was identified. Serum iron/ferritin and deficiency prevalence are not absorption coefficients. |
| Heme iron | No direct low-acid quantitative coefficient identified. | Unchanged healthy heme range. | The model deliberately does not extrapolate the non-heme mechanism to heme iron. |

The UI accepts **suspected**, **documented hypochlorhydria**, **documented achlorhydria**, and a separate **acid-suppressing medication** context. All retain the mechanism notice, but none changes gross intake, the healthy absorption estimate, official RDA, or creates a personalized modeled requirement. Betaine HCl remains only a clinician-discussion item: evidence that it transiently changes gastric pH does not establish a dose, treatment claim, or B12/iron restoration percentage.

## Condition-specific evidence audit: celiac disease

The UI distinguishes **active/untreated** from **treated/adherent gluten-free diet**. No nutrient-specific numerical celiac coefficient is enabled, and no personalized modeled requirement is derived. The 2023 ACG guideline and adult celiac nutrition reviews support assessing iron, folate, B12, vitamin D, calcium, zinc, and magnesium, but they provide clinical-risk/serum/intake and heterogeneous recovery evidence—not a nutrient-form-specific meal absorption fraction.

| State | Nutrients reviewed | Physiological interpretation | Executable classification |
|---|---|---|---|
| Active/untreated | iron, folate, vitamin B12, vitamin D, calcium, zinc, magnesium | Villous mucosal injury can affect **absorption**. The cited evidence does not quantify each nutrient's absorbed fraction from a defined oral dose against healthy controls. | One qualitative, provenance-preserving absorption mechanism (`celiac.active.mucosal-malabsorption`); disabled F model `celiac.active.mucosal-malabsorption.v1`. |
| Treated/adherent | iron, folate, vitamin B12, vitamin D, calcium, zinc, magnesium | Gluten-free treatment can allow mucosal recovery; residual abnormal status may also reflect dietary intake, time to healing, adherence, or other causes. | One qualitative recovery/monitoring mechanism (`celiac.treated.recovery-monitoring`); disabled F model `celiac.treated.recovery.v1`. No permanent penalty and no assumed normalization percentage. |

Thus none of these evidence records is treated as an absorption, loss, requirement, conversion, utilization, storage, or turnover coefficient unless it actually measures that stage. Official RDA/AI/EAR/UL records are unchanged; a “Personalized modeled requirement” is unavailable because the denominator (condition-adjusted absorption) is unavailable.

## Combined low-acid and celiac selections

Condition effects are selected by mechanism ID and state, then exposed together as provenance. They do **not** modify the healthy B12/iron ranges and therefore cannot be multiplied. In particular, low-acid food release and active-celiac mucosal absorption are distinct upstream mechanisms, but evidence does not establish independence or a joint coefficient; the combined result remains the healthy numeric range with two qualitative mechanism notices. This prevents both generic pathology multipliers and unsupported double counting.

## Condition-specific evidence audit: Crohn’s disease

**No Crohn’s numerical model is enabled.** The audit found human clinical and observational evidence for nutrient risk, but no nutrient-form-specific, transferable oral absorption fraction, daily blood-loss amount, requirement increment, or vitamin-D conversion equation that can be safely applied to an individual meal. Each candidate is stored as a disabled class-F assumption in `202609250009_crohn_uc_evidence_audit.sql`; it cannot affect the calculation pipeline.

| Context and nutrient | Measured/claimed physiological issue | Executable result | Source and limitation |
| --- | --- | --- | --- |
| Active Crohn’s; iron, vitamin D, folate, calcium, magnesium, zinc, vitamins A/E/K | Intake, status, inflammation, disease location, treatment and sometimes malabsorption risk; not a consistent oral-dose absorption endpoint. | Qualitative `crohn.active.mucosal-nutrient-handling` at **absorption** only; no coefficient. | Crohn nutrition review (2020), `crohn.active.mucosal-absorption.v1` disabled (F, low). Deficiency prevalence and serum values are not absorbed fractions. |
| Crohn’s with documented terminal-ileal involvement; B12 | Ileal involvement is associated with B12 deficiency/status risk. | Qualitative `crohn.ileal.b12-absorption-risk` at **absorption**. It applies only to `active_ileal` or `remission_ileal`; it does not apply to non-ileal states. | IBD B12 observational study (2014), `crohn.ileal.b12-absorption.v1` disabled (F, moderate). It does not measure food-dose B12 absorption and does **not** model ileal resection. |
| Active Crohn’s; iron | Gastrointestinal blood loss and inflammatory iron restriction are clinically distinct from absorption. | Qualitative `crohn.active.iron-loss-and-regulation` at **loss**. It does not change heme or non-heme absorption, dietary requirement, or gross intake. | ECCO iron/anemia consensus (2015), `crohn.active.iron-loss.v1` disabled (F, moderate): no reliable personal blood-loss volume. |
| Crohn’s; vitamin D | 25-OH-D/status, intake, inflammation, and sometimes fat-malabsorption context—not an established oral absorption or conversion fraction. | No vitamin-D absorption, metabolism, or target coefficient; qualitative active-state context only. | Crohn nutrition review (2020), `crohn.vitamin-d-absorption.v1` disabled (F, low). |
| Remission | Residual status reflects prior activity, intake, healing, treatment, and anatomy. | Qualitative `crohn.remission.nutrition-monitoring` at **systemic** stage; no persistent penalty and no assumed recovery percentage. | AGA IBD nutrition update (2024). |

The UI asks for one clinician-documented combined activity/anatomy state: active or remission, with or without reported ileal involvement. It neither infers anatomy from symptoms nor asks about/reuses ileal resection in this run. A clinician-discussion recommendation is limited to evaluation of B12 status with ileal involvement and active-disease iron/anemia assessment; it is not a supplement or treatment recommendation.

## Condition-specific evidence audit: ulcerative colitis

**No ulcerative-colitis numerical model is enabled.** UC evidence was audited independently; no Crohn coefficient is reused. The active/remission input controls only UC’s own provenance records.

| Context and nutrient | Measured/claimed physiological issue | Executable result | Source and limitation |
| --- | --- | --- | --- |
| Active UC; iron | Colonic bleeding and inflammatory iron restriction; anemia prevalence is not absorption impairment. | Qualitative `uc.active.iron-gastrointestinal-loss` at **loss**. No daily blood-loss amount, increased requirement, or heme/non-heme absorption multiplier. | ECCO iron/anemia consensus (2015), `uc.active.iron-loss.v1` disabled (F, moderate). |
| Active UC; vitamin D, folate, calcium, magnesium, zinc | Serum/status, intake, inflammation, and treatment findings. | Qualitative `uc.active.nutrient-status` at **systemic** stage. No absorption, conversion, or target coefficient. | UC nutrition review (2021), `uc.vitamin-d-absorption.v1` and `uc.micronutrient-status.v1` disabled (F, low). |
| UC remission | Monitoring context; no evidence supports either a continuing generic penalty or a normalization percentage. | Qualitative `uc.remission.nutrition-monitoring` at **systemic** stage. | AGA IBD nutrition update (2024). |

Fat-soluble vitamins other than vitamin D have no UC executable model in this release: the reviewed evidence did not provide a transferable stage-matched coefficient. Official RDA/AI/EAR/UL values remain unchanged for both conditions, and because no quantitative condition model exists there is no “personalized modeled requirement” or estimated gap.

## Crohn’s/UC combination behavior

Crohn’s and UC have independent mechanism IDs, sources, disease-state requirements, and disabled model keys. Selecting either with hypochlorhydria or celiac preserves all applicable qualitative notices as provenance but leaves the healthy B12/iron absorption ranges unchanged. Nothing is multiplied: independence between mechanisms was not established, and every IBD candidate coefficient is disabled. The resolver deduplicates by mechanism ID; iron loss and absorption remain distinct stages so anemia/bleeding cannot silently become an absorption penalty.

## Condition-specific evidence audit: pancreatic exocrine insufficiency (PEI)

**No PEI numerical model is enabled.** The executable PEI state requires a documented diagnosis, not symptoms; it deliberately has no fecal-elastase severity slider because no reviewed human severity-response coefficient transfers to this meal model. In untreated-context PEI, `pei.exocrine-fat-digestion` records impaired **digestion** (not an arbitrary intestinal absorption or requirement penalty) for vitamins A, D, E, and K. The AGA update defines PEI as impaired enzyme activity causing maldigestion, but neither it nor the nutrition review supplies a food-form-specific dietary-fat or fat-soluble-vitamin fraction compatible with the app. B12, calcium, magnesium, and zinc are status-monitoring contexts only: deficiency prevalence/status can reflect intake, etiology, inflammation, and treatment and is not a coefficient.

The UI distinguishes documented PEI without an enzyme-replacement context from documented PEI with one. `pei.pert-clinical-context` is still qualitative: AGA guidance supports clinician-managed pancreatic enzyme replacement therapy (PERT) for documented PEI but does **not** establish a nutrient/form-specific restoration percentage, so it does not restore digestion/absorption to 100%, change the healthy estimate, or prescribe a dose. Official references and personalized modeled requirements remain unavailable. Sources and disabled class-F candidates are recorded in `202609250010_pei_bariatric_evidence_audit.sql` (`aga-epi-update-2023`; `pei-nutrition-review-2019`).

## Condition-specific evidence audit: bariatric surgery

**No bariatric numerical model is enabled.** The catalog accepts only a documented procedure and keeps three independent anatomy-specific records; it has no generic “bariatric surgery × multiplier,” no inferred postoperative time curve, and no altered official RDA/AI/EAR/UL.

| Procedure | Qualitative mechanisms and stage | Boundary |
| --- | --- | --- |
| RYGB | Iron gastric/duodenal handling and B12 gastric processing (**absorption**); calcium proximal-intestinal handling (**absorption**); vitamin D, folate, thiamine, A/E/K, zinc, copper, and magnesium status monitoring (**systemic**) | Bypassed anatomy, acid/intrinsic-factor changes, status studies, and clinical guidance do not give a transferable food-form meal coefficient. |
| Sleeve gastrectomy | B12 and iron gastric processing (**absorption**); calcium, vitamin D, folate, thiamine, A/E/K, zinc, copper, and magnesium status monitoring (**systemic**) | Sleeve is not given RYGB intestinal-bypass effects. Reduced volume, intake changes, status, and guidance are not absorption coefficients. |
| BPD/DS | Fat-soluble vitamin handling (**digestion**) and iron, calcium, B12, zinc, copper, magnesium handling (**absorption**) | Its food/biliopancreatic anatomy is recorded independently; no RYGB coefficient, dietary-fat fraction, or vitamin A/D/E/K fraction is transferred. |

The ASMBS 2016 update and BOMSS 2020 guidance are stored as sources. Their procedure-specific screening and supplementation recommendations are available only as clinical-follow-up considerations; recommended supplement amounts and deficiency prevalence are **not** converted into physiology, a personalized target, or a dose recommendation. In RYGB or sleeve plus hypochlorhydria, the resolver suppresses the overlapping gastric-acid food-release/non-heme-solubilization notices and retains the surgery anatomy provenance, preventing a second unproven penalty. Celiac, Crohn’s, and UC retain their independently named qualitative provenance; nothing is multiplied.

## Gastrectomy (2026-09 evidence audit)

**States and stage.** The calculator has distinct `partial` and `total` gastrectomy states. Both are qualitative, absorption-stage gastric mechanisms: partial gastrectomy retains variable gastric tissue, whereas total gastrectomy removes gastric acid, pepsin, and gastric intrinsic-factor production. The model deliberately does not turn this anatomical difference into a ratio, time-since-surgery curve, reconstruction adjustment, residual-tissue percentage, or personalized target.

**B12.** Partial gastrectomy records reduced food-bound B12 release and potentially reduced intrinsic-factor capacity. Total gastrectomy records loss of gastric processing and intrinsic factor. Free/crystalline B12 is not given a food-protein release penalty. Passive diffusion at pharmacological high doses is documented as a treatment mechanism, not applied to ordinary meal or supplement intake. Human status, supplementation, and heterogeneous absorption literature did not yield a transferable food-form-specific meal coefficient. Source: `gastrectomy-b12-review-2023` (J Gastric Cancer review; DOI recorded in the ledger migration).

**Iron and other nutrients.** Partial and total states separately record acid-dependent *non-heme* iron handling; neither imposes an acid penalty on heme iron. Deficiency prevalence, bleeding, dietary intake, and supplement guidance remain outside absorption and requirement arithmetic. Folate, calcium, and vitamin D are systemic monitoring contexts only. Sources: `gastrectomy-iron-review-2021` and `gastrectomy-nutrition-review-2020`.

**Overlap safeguards.** Each gastrectomy B12 mechanism suppresses the overlapping hypochlorhydria food-release/acid-medication notice, and each iron mechanism suppresses the hypochlorhydria non-heme-solubilization notice. This retains one anatomy-specific provenance record rather than multiplying the same gastric-acid pathway. Gastrectomy and bariatric procedures are mutually exclusive in the UI and resolver unless a future evidence-backed conversion/revision model is supplied.

## Ileal resection (2026-09 evidence audit)

**Anatomical context.** `documented_resection` is the only state. The model does not infer terminal-ileal length, remaining ileum, colon continuity, underlying disease, adaptation/time since surgery, or clinically defined short bowel syndrome. Those factors materially affect outcomes but do not have a transferable equation in the reviewed evidence.

**B12.** A qualitative absorption-stage mechanism records loss of terminal-ileal intrinsic-factor–B12 uptake. Resection-length/B12-status findings are not converted into a threshold, linear scale, absorption fraction, or modeled requirement. It suppresses the overlapping Crohn ileal B12 risk notice when both conditions are selected, while leaving independent Crohn mechanisms intact. Source: `ileal-resection-b12-review-2024`.

**A/D/E/K and minerals.** Ileal bile-acid reclamation is recorded at the digestion stage for A, D, E, and K separately—not as one fat-soluble-vitamin multiplier. Calcium and magnesium are qualitative systemic monitoring contexts. Steatorrhea and serum-status evidence does not establish oral vitamin/mineral absorption coefficients. This is intentionally distinct from the future short-bowel syndrome model. Source: `ileal-resection-nutrition-review-2022`.

## SBS, CKD, and chronic liver disease final audit

SBS requires a documented anatomy/intestinal-failure state. No-colon losses, colon energy/fluid salvage, absent-terminal-ileum B12 uptake, bile-acid/fat handling, adaptation, and nutrition support are separate stages. SBS B12 and bile pathways suppress overlapping ileal-resection/Crohn provenance. Remaining length, adaptation time, and support prescriptions have disabled class-F candidates, not coefficients.

CKD separates early non-dialysis, stages 3–5 non-dialysis, hemodialysis, and peritoneal dialysis. Renal vitamin-D activation is **conversion**; calcium/phosphorus/magnesium/potassium are **renal handling**; CKD anemia/iron is **systemic**; dialysis removal is **loss context**; restrictions are **clinical targets**. None is routed through absorption or changes official references.

Chronic liver disease separates stable/decompensated non-cholestatic disease from cholestasis. Hepatic conversion/storage/transport, iron regulation, and trace-mineral status are not absorption. Only documented cholestasis adds bile-mediated A/D/E/K digestion provenance. All liver candidate coefficients are disabled class F.

Across all 11 conditions, qualitative mechanisms coexist unless an explicit anatomy-specific suppression applies. They are never multiplied. Regression coverage includes gastric acid plus celiac/Crohn/gastrectomy/RYGB/sleeve; Crohn plus ileal resection/SBS; ileal resection plus SBS; PEI plus BPD/DS/SBS/liver disease; CKD vitamin-D/mineral/iron paths; chronic liver A/D and cholestasis; celiac plus Crohn; and multiple independent qualitative mechanisms.
