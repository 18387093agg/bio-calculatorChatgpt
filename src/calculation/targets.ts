import type { TargetSet } from '../domain/types.js';
import { progressScale as canonicalProgress, thiamineTarget } from './engine.js';
export interface TargetRangeOverride { userOptimalMin?: number; userOptimalMax?: number; }
export function thiamineTargets(energyKcal: number, rdaMg: number, override?: TargetRangeOverride): TargetSet {
 if (!Number.isFinite(energyKcal) || energyKcal < 0) throw new Error('Energy must be non-negative.');
 if (override && ((override.userOptimalMin !== undefined && (!Number.isFinite(override.userOptimalMin) || override.userOptimalMin < 0)) || (override.userOptimalMax !== undefined && (!Number.isFinite(override.userOptimalMax) || override.userOptimalMax < 0)))) throw new Error('User target bounds must be non-negative finite numbers.');
 if (override?.userOptimalMin !== undefined && override.userOptimalMax !== undefined && override.userOptimalMin > override.userOptimalMax) throw new Error('User target minimum cannot exceed maximum.');
 const model=thiamineTarget(energyKcal);return { rda: rdaMg, optimalMin:model.min, optimalMax:model.max, ...(override?.userOptimalMin === undefined ? {} : { userOptimalMin: override.userOptimalMin }), ...(override?.userOptimalMax === undefined ? {} : { userOptimalMax: override.userOptimalMax }), unit: 'mg', assumptions: [`Optimization range is project model ${model.modelKey}, not an RDA.`, ...(override ? ['User override is separate from official references and the project model.'] : [])] };
}
export function progressScale(actual: number, targets: TargetSet): { scaleMax: number; actualPosition: number; markers: Record<string, number> } {
 const result=canonicalProgress(actual,targets as unknown as Record<string,unknown>);return{scaleMax:result.scale,actualPosition:result.actual/100,markers:Object.fromEntries(Object.entries(result.markers).map(([k,v])=>[k,v/100]))};
}
