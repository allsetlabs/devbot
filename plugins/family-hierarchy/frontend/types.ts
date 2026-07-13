export interface Person {
  id: string;
  name: string;
  translit: string;
  note: string;
  marker: string; // 'A' (adult) | 'M' (minor) | ''
  uncertain: boolean;
  uncertainReason: string;
  parentUncertain: boolean;
  parent: string | null;
  children: string[];
  sourcePages: number[];
  sourceIds?: string[];
}

export interface FamilyMeta {
  title: string;
  titleTranslit: string;
  subtitle: string;
  authors: string[];
  year: string;
  printedDate: string;
  legend: Record<string, string>;
  note: string;
  generatedAt: string;
}

export interface FamilyTree {
  meta: FamilyMeta;
  rootId: string;
  people: Record<string, Person>;
}
