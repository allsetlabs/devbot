import type { CLIProvider } from '../types';

interface ProviderIconProps {
  provider: CLIProvider;
  className?: string;
  /** Size in pixels (default 20) */
  size?: number;
}

/** Claude — stylized asterisk/sparkle mark */
function ClaudeIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Claude Code"
    >
      <path
        d="M16.274 3.004a1.248 1.248 0 0 0-2.34.004L10.292 13.02a.625.625 0 0 1-1.17-.002L5.49 3.008a1.248 1.248 0 0 0-2.34-.004c-1.713 4.592-2.706 7.781-3.12 9.232A5.397 5.397 0 0 0 3.742 18.2l5.896 2.762a1.248 1.248 0 0 0 1.068-.002L16.636 18.2a5.398 5.398 0 0 0 3.334-5.964c-.415-1.451-1.407-4.64-3.12-9.232h.424Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** OpenAI Codex — hexagonal/circular logo shape */
function CodexIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="OpenAI Codex"
    >
      <path
        d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.042 6.042 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.04 6.04 0 0 0 6.51 2.9A5.99 5.99 0 0 0 13.275 24a6.043 6.043 0 0 0 5.725-4.13 5.99 5.99 0 0 0 3.997-2.9 6.04 6.04 0 0 0-.715-7.149Zm-9.022 12.6a4.482 4.482 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494ZM3.86 18.07a4.484 4.484 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.974 19.75a4.5 4.5 0 0 1-6.114-1.68ZM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872v.024Zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667Zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66v.018ZM8.32 12.228l-2.023-1.162a.07.07 0 0 1-.038-.052V5.427a4.497 4.497 0 0 1 7.375-3.455l-.142.08L8.704 4.82a.785.785 0 0 0-.393.676l-.004 6.733h.013Zm1.093-2.368L12 8.269l2.582 1.49v2.982L12 14.232l-2.582-1.49v-2.884h-.004Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Kimi Code — crescent moon (Moonshot AI) */
function KimiIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Kimi Code"
    >
      <path
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 0 1-1.5-15.86A9 9 0 0 0 14 12a9 9 0 0 0-3.5 7.86A8 8 0 0 1 12 20Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Cursor — cursor/pointer arrow */
function CursorIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Cursor"
    >
      <path
        d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z"
        fill="currentColor"
      />
      <path
        d="M13.64 15.14 17.78 22l2.1-1.14-3.93-6.53 2.55-.19-9-8.56v11.96l3.07-3.07a.47.47 0 0 1 .34-.14l.73.01Z"
        fill="currentColor"
        opacity={0.5}
      />
    </svg>
  );
}

const ICON_COMPONENTS: Record<CLIProvider, React.FC<{ size?: number; className?: string }>> = {
  claude: ClaudeIcon,
  codex: CodexIcon,
  kimi: KimiIcon,
  cursor: CursorIcon,
};

const PROVIDER_COLORS: Record<CLIProvider, string> = {
  claude: 'text-orange-500',
  codex: 'text-green-600 dark:text-green-400',
  kimi: 'text-blue-500',
  cursor: 'text-purple-500',
};

export function ProviderIcon({ provider, className, size = 20 }: ProviderIconProps) {
  const IconComponent = ICON_COMPONENTS[provider];
  const color = PROVIDER_COLORS[provider];
  return <IconComponent size={size} className={`${color} ${className ?? ''}`} />;
}

/** Provider metadata used across the CLI Dashboard */
export const PROVIDER_META: Record<
  CLIProvider,
  { label: string; color: string; bgColor: string }
> = {
  claude: {
    label: 'Claude',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  codex: {
    label: 'Codex',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  kimi: {
    label: 'Kimi',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  cursor: {
    label: 'Cursor',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

export function ProviderBadge({ provider }: { provider: CLIProvider }) {
  const meta = PROVIDER_META[provider];
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.bgColor} ${meta.color}`}
    >
      <ProviderIcon provider={provider} size={12} className={meta.color} />
      {meta.label}
    </span>
  );
}
