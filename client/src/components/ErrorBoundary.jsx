import { Component } from 'react';

/**
 * Catches render errors in children and shows a fallback so the app doesn't show a blank page.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 text-center text-danger">
          <p className="mb-2">Something went wrong.</p>
          {this.props.fallbackAction}
        </div>
      );
    }
    return this.props.children;
  }
}
