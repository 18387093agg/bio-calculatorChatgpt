/** Remer & Manz PRAL estimate (mEq/day): dietary acid load, not blood pH or a diagnosis. */
export function calculatePral(nutrients: { proteinG: number; phosphorusMg: number; potassiumMg: number; magnesiumMg: number; calciumMg: number }): number {
 const { proteinG, phosphorusMg, potassiumMg, magnesiumMg, calciumMg } = nutrients;
 if ([proteinG, phosphorusMg, potassiumMg, magnesiumMg, calciumMg].some(x => !Number.isFinite(x) || x < 0)) throw new Error('PRAL inputs must be non-negative finite values.');
 return 0.49 * proteinG + 0.037 * phosphorusMg - 0.021 * potassiumMg - 0.026 * magnesiumMg - 0.013 * calciumMg;
}
