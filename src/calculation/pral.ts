import { calculatePral as canonicalPral } from './engine.js';
/** Remer & Manz PRAL estimate (mEq/day): dietary acid load, not blood pH or a diagnosis. */
export function calculatePral(nutrients: { proteinG: number; phosphorusMg: number; potassiumMg: number; magnesiumMg: number; calciumMg: number }): number {
 const values=Object.values(nutrients);if(values.some(x=>!Number.isFinite(x)||x<0))throw new Error('PRAL inputs must be non-negative finite values.');return canonicalPral(nutrients);
}
