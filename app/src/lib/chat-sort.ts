import type { InteractiveChat } from '../types';

export type SortOption = 'recent' | 'oldest' | 'name-asc' | 'name-desc' | 'status';

export const SORT_OPTIONS: { value: SortOption; label: string; tooltip: string }[] = [
  { value: 'recent', label: 'Recently Updated', tooltip: 'Newest chats first' },
  { value: 'oldest', label: 'Oldest First', tooltip: 'Oldest chats first' },
  { value: 'name-asc', label: 'Alphabetical (A-Z)', tooltip: 'Sort by name A-Z' },
  { value: 'name-desc', label: 'Alphabetical (Z-A)', tooltip: 'Sort by name Z-A' },
  { value: 'status', label: 'Status: Running First', tooltip: 'Active chats at top' },
];

export function getSortedChats(chats: InteractiveChat[], sortBy: SortOption): InteractiveChat[] {
  const sorted = [...chats];
  switch (sortBy) {
    case 'recent':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'oldest':
      return sorted.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'status':
      return sorted.sort((a, b) => {
        if (a.isRunning === b.isRunning) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.isRunning ? -1 : 1;
      });
    default:
      return sorted;
  }
}
