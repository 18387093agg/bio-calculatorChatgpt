import type { TargetSet } from '../domain/types.js';
export interface TargetRangeOverride { userOptimalMin?: number; userOptimalMax?: number; }
export function thiamineTargets(energyKcal: number, rdaMg: number, override?: TargetRangeOverride): TargetSet {
 if (!Number.isFinite(energyKcal) || energyKcal < 0) throw new Error('Energy must be non-negative.');
 const rounded = (value: number) => Math.round(value * 1000) / 1000;
 if (override && ((override.userOptimalMin !== undefined && (!Number.isFinite(override.userOptimalMin) || override.userOptimalMin < 0)) || (override.userOptimalMax !== undefined && (!Number.isFinite(override.userOptimalMax) || override.userOptimalMax < 0)))) throw new Error('User target bounds must be non-negative finite numbers.');
 if (override?.userOptimalMin !== undefined && override.userOptimalMax !== undefined && override.userOptimalMin > override.userOptimalMax) throw new Error('User target minimum cannot exceed maximum.');
 return { rda: rdaMg, optimalMin: rounded(energyKcal * 0.00060), optimalMax: rounded(energyKcal * 0.00068), ...(override?.userOptimalMin === undefined ? {} : { userOptimalMin: override.userOptimalMin }), ...(override?.userOptimalMax === undefined ? {} : { userOptimalMax: override.userOptimalMax }), unit: 'mg', assumptions: ['Optimization range is a transparent project model assumption (0.60–0.68 mg/1000 kcal), not an RDA.', ...(override ? ['User override is separate from official references and the project model.'] : [])] };
}
export function progressScale(actual: number, targets: TargetSet): { scaleMax: number; actualPosition: number; markers: Record<string, number> } {
 const values = [actual, targets.rda, targets.ai, targets.pri, targets.optimalMin, targets.optimalMax, targets.ul].filter((v): v is number => v !== undefined && v >= 0);
 const scaleMax = Math.max(1, ...values) * 1.1;
 const markers = Object.fromEntries(Object.entries(targets).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, (v as number) / scaleMax]));
 return { scaleMax, actualPosition: actual / scaleMax, markers };
}
