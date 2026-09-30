export const CLIENT = 'Northwind Studio';

export interface Project {
  id: string;
  name: string;
  status: string;
  due: string;
}

export const STATS = [
  { label: 'Open projects', value: '5' },
  { label: 'Outstanding invoices', value: '2' },
  { label: 'Lifetime value', value: '$48,200' },
];

export const PROJECTS: Project[] = [
  { id: 'brand-refresh', name: 'Brand refresh', status: 'In progress', due: '2026-10-14' },
  { id: 'marketing-site', name: 'Marketing site', status: 'In review', due: '2026-10-28' },
  { id: 'client-portal', name: 'Client portal', status: 'Planned', due: '2026-11-18' },
  { id: 'annual-report', name: 'Annual report', status: 'In progress', due: '2026-12-02' },
  { id: 'packaging', name: 'Packaging', status: 'On hold', due: '2027-01-20' },
];
