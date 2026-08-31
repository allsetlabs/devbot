import type { InteractiveChat } from '../types';

export type SortOption = 'recent' | 'oldest' | 'status';

export const SORT_OPTIONS: { value: SortOption; label: string; tooltip: string }[] = [
  { value: 'recent', label: 'Recently Updated', tooltip: 'Newest chats first' },
  { value: 'oldest', label: 'Oldest First', tooltip: 'Oldest chats first' },
  { value: 'status', label: 'Status: Running First', tooltip: 'Active chats at top' },
];

export function getSortedChats(chats: InteractiveChat[], sortBy: SortOption): InteractiveChat[] {
  const sorted = [...chats];
  switch (sortBy) {
    case 'recent':
      return sorted.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    case 'oldest':
      return sorted.sort(
        (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
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
