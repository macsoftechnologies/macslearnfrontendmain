import React from 'react';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Check if it's a dynamic import (chunk load) error
      const isChunkLoadError = this.state.error?.message?.includes('Failed to fetch dynamically imported module') || this.state.error?.name === 'ChunkLoadError';

      if (isChunkLoadError) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)', padding: '24px', textAlign: 'center' }}>
            <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', maxWidth: '480px' }}>
              <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '16px' }} />
              <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Update Available</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                A new version of the application is available, but your browser is using an older cached version. Please refresh the page to update.
              </p>
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            </div>
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-app)', padding: '24px', textAlign: 'center' }}>
          <div style={{ background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: 'var(--shadow-lg)', maxWidth: '480px' }}>
            <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '16px' }} />
            <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              We're sorry, but an unexpected error occurred. Please try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
