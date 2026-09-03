import { Component, type ErrorInfo, type ReactNode } from 'react';
import StatusPage from './StatusPage';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message?.trim() || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Aura Fresh UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <StatusPage
        kind="unexpected"
        detail={this.state.message}
      />
    );
  }
}
