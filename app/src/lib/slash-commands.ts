export interface SlashCommand {
  command: string;
  description: string;
  action: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: '/help', description: 'Show available commands and input features', action: 'openHelp' },
  { command: '/clear', description: 'Clear all messages with confirmation', action: 'openClearConfirm' },
  { command: '/mode', description: 'Open permission mode selector', action: 'openModeDrawer' },
  { command: '/model', description: 'Open model selector', action: 'openModelDrawer' },
  { command: '/info', description: 'Display session statistics', action: 'showInfo' },
  { command: '/compact', description: 'Compact conversation to save context', action: 'sendCompact' },
  { command: '/fast', description: 'Toggle fast output mode', action: 'toggleFastMode' },
  { command: '/config', description: 'Open settings page', action: 'openConfig' },
];
