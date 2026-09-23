import type { TargetSet } from '../domain/types.js';
export function thiamineTargets(energyKcal: number, rdaMg: number, userOverrideMg?: number): TargetSet {
 if (!Number.isFinite(energyKcal) || energyKcal < 0) throw new Error('Energy must be non-negative.');
 const rounded = (value: number) => Math.round(value * 1000) / 1000;
 return { rda: rdaMg, optimalMin: userOverrideMg ?? rounded(energyKcal * 0.00060), optimalMax: userOverrideMg ?? rounded(energyKcal * 0.00068), unit: 'mg', assumptions: userOverrideMg === undefined ? ['Optimization range is a transparent model assumption (0.60–0.68 mg/1000 kcal), not an RDA.'] : ['Optimal range is user-defined; the RDA remains unchanged.'] };
}
export function progressScale(actual: number, targets: TargetSet): { scaleMax: number; actualPosition: number; markers: Record<string, number> } {
 const values = [actual, targets.rda, targets.ai, targets.pri, targets.optimalMin, targets.optimalMax, targets.ul].filter((v): v is number => v !== undefined && v >= 0);
 const scaleMax = Math.max(1, ...values) * 1.1;
 const markers = Object.fromEntries(Object.entries(targets).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, (v as number) / scaleMax]));
 return { scaleMax, actualPosition: actual / scaleMax, markers };
}
