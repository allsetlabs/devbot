export const KEYBOARD_SHORTCUTS = [
  {
    keys: '⏎',
    description: 'Send message',
  },
  {
    keys: '⌘⏎ / Ctrl+Enter',
    description: 'Alternative send',
  },
  {
    keys: '⌘K / Ctrl+K',
    description: 'Focus input field',
  },
  {
    keys: '⌘⇧K / Ctrl+Shift+K',
    description: 'Clear input & attached files',
  },
  {
    keys: 'Escape',
    description: 'Stop execution (interrupt)',
  },
  {
    keys: 'Up/Down Arrow',
    description: 'Navigate message history',
  },
];

export { SLASH_COMMANDS } from './slash-commands';

export const INPUT_FEATURES = [
  {
    feature: '@file',
    description: 'Type @ to browse and attach files with autocomplete',
  },
  {
    feature: '/command',
    description: 'Type / to see available commands and built-in features',
  },
];

export const PERMISSION_MODES = [
  {
    mode: 'Plan',
    description: 'Claude plans before executing — you approve each step',
  },
  {
    mode: 'Auto-Accept',
    description: 'Claude auto-approves safe operations, asks on risky ones',
  },
  {
    mode: 'Full Auto',
    description: 'Claude executes everything without asking',
  },
];

export const STATUS_BAR_ITEMS = [
  { key: 'C', description: 'Characters in input' },
  { key: 'T', description: 'Estimated tokens (~4 chars = 1 token)' },
];
