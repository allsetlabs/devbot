import React from 'react';
import { useLocation } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';

interface BoundaryProps {
  resetKey: string;
  children: React.ReactNode;
}
interface BoundaryState {
  error: Error | null;
  prevKey: string;
}

/**
 * Catches render/runtime errors in ONE route so a crash there can't take down the rest
 * of DevBot. Resets automatically when the route (pathname) changes.
 */
class Boundary extends React.Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { error: null, prevKey: props.resetKey };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    if (props.resetKey !== state.prevKey) return { error: null, prevKey: props.resetKey };
    return null;
  }

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md space-y-3 text-center">
            <TriangleAlert className="mx-auto h-10 w-10 text-destructive" />
            <div className="text-lg font-semibold text-foreground">This page hit an error</div>
            <div className="text-sm text-muted-foreground">
              The rest of DevBot keeps working — pick another page from the menu, or try again.
            </div>
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <Boundary resetKey={location.pathname}>{children}</Boundary>;
}
