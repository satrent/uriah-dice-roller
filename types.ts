export type DieType = 4 | 6 | 8 | 10 | 12 | 20;

export interface RolledDiceGroup {
  die: DieType;
  count: number;
  modifier: number;
  results: number[];
}

export interface Roll {
  id: string;
  user: string;
  userColor: string;
  groups: RolledDiceGroup[];
  total: number;
  timestamp: number;
}

export interface SavedCombination {
  id:string;
  name: string;
  // FIX: Changed from Record to Partial<Record> to align with the change in the Roll interface and reflect actual usage.
  dice: Partial<Record<DieType, number>>;
}

export interface User {
  id: string;
  name: string;
  color: string;
}