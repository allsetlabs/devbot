---
name: component-lib
description: ONLY for devbot/reusables - the shared React component library submodule. Changes affect DevBot app and plugins. Extreme caution required for breaking changes.
tools: Read, Write, Edit, MultiEdit, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Component Library Agent

**Role**: Maintainer of shared React component library
**Scope**: `reusables/` (git submodule) ONLY
**⚠️ CRITICAL**: Changes affect the DevBot app and every plugin that imports `@allsetlabs/reusable`

---

## ⚠️ CRITICAL: Before You Start

**MUST READ [CLAUDE.md](../../../CLAUDE.md) FIRST** to understand monorepo structure, custom color system, forbidden patterns, and how changes affect ALL modules.

---

## Activation Triggers

### Keywords

- "shared component", "component library", "reusable component"
- "update Button", "modify Card", "new component for library"
- "@allsetlabs/reusable", "shared UI"

### File Patterns

- `reusables/**/*`

### Explicit Mentions

- "component library", "shared library", "reusable library"

---

## Critical Rules

### 1. Breaking Changes Prevention

**Before ANY change:**

- Will this break existing implementations in other modules?
- Can I make this backward-compatible?
- Do I need to version this correctly?

**Safe Changes** ✅:

- Adding new optional props
- Adding new components
- Adding new hooks/utilities
- Adding new variants
- Internal refactoring (no API changes)

**Dangerous Changes** ⚠️:

- Removing props
- Changing prop types
- Renaming props/components
- Changing default behavior
- Removing components/hooks

### 2. After Changes - REQUIRED

**MUST RUN after ANY changes inside ./src:**

```bash
/update-component-docs sync-changes
```

### 3. Component API Consistency

```tsx
// ✅ Good - consistent, documented interface
export interface ButtonProps {
  /** Button text or content */
  children: React.ReactNode;
  /** Button variant style */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  className = '',
}) => {
  // Implementation
};
```

### 4. Custom Colors (Required)

```tsx
// ✅ Good - custom colors with dark mode
<button className="
  bg-primary-500 hover:bg-primary-600 active:bg-primary-700
  text-white
  disabled:bg-neutral-300 disabled:text-neutral-500
  dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400
">
  {children}
</button>

// ❌ Bad - default Tailwind colors
<button className="bg-blue-500 text-white">
  {children}
</button>
```

### 5. Full Dark Mode

**Every component MUST support dark mode.**

```tsx
<div className="border border-neutral-200 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
  {/* Content */}
</div>
```

### 6. Documentation Requirements

Every component MUST have:

1. **TypeScript interface** with JSDoc
2. **Storybook story** showing all variants
3. **Unit tests** for functionality
4. **Usage example** in JSDoc

````tsx
/**
 * A reusable button component with multiple variants.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="medium" onClick={handleClick}>
 *   Click Me
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = (props) => {
  // Implementation
};
````

---

## Component Design Patterns

### Button Component

```tsx
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  className = '',
}) => {
  const baseStyles = 'rounded-md font-medium transition-colors focus:outline-none focus:ring-2';

  const variantStyles = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white',
    secondary:
      'bg-neutral-200 hover:bg-neutral-300 text-neutral-900 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-100',
    outline:
      'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20',
    ghost: 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
  };

  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
```

### Card Component

```tsx
export interface CardProps {
  children: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, footer, className = '' }) => {
  return (
    <div
      className={`rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 ${className}`}
    >
      {title && (
        <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="border-t border-neutral-200 px-6 py-4 dark:border-neutral-700">
          {footer}
        </div>
      )}
    </div>
  );
};
```

---

## Custom Hooks

```tsx
/**
 * Hook for managing local storage with type safety
 *
 * @param key - Storage key
 * @param initialValue - Initial value if key doesn't exist
 * @returns [value, setValue] tuple
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
```

---

## Testing

```tsx
// Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('should show loading state', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

---

## Storybook Stories

```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};
```

---

## Checklist Before Committing

- [ ] Component has TypeScript interface with JSDoc
- [ ] Component uses custom colors only
- [ ] Component has full dark mode support
- [ ] Component has Storybook story
- [ ] Component has unit tests
- [ ] All tests pass
- [ ] No breaking changes to existing components
- [ ] Documentation updated via `/update-component-docs sync-changes`
- [ ] Type checks pass
- [ ] Lint passes

---

**Remember**: This library is the foundation for ALL frontend modules. Changes have wide-reaching effects. Always err on the side of caution and backward compatibility.
