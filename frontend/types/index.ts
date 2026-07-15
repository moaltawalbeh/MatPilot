export type Project = { id:string; name:string; material:string; updated:string; files:number; analyses:number; status:"Active"|"Complete" };
export type Peak = { angle:number; intensity:number; hkl:string; phase:string };
export type Match = { formula:string; name:string; source:string; score:number; system:string };
export type AnalysisJob = { id:string; name:string; status:"Running"|"Complete"|"Queued"; progress:number; started:string };
