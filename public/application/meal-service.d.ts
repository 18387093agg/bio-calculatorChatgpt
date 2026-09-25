export interface FormAbsorption { min:number;max:number;unit:string;modelKey:string;assumption:string }
export function estimateFormAbsorption(key:string,origin:string,foodBound:boolean,amount:number,gastricAcid?:'normal'|'low'|'absent'):FormAbsorption|null;
