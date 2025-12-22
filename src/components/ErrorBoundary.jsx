import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1a1a1a] rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-white/60 mb-6">
              Don't worry, your work is safe. Try refreshing the page.
            </p>
            {this.state.error && (
              <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10 text-left">
                <p className="text-xs text-white/40 mb-1">Error Details:</p>
                <p className="text-sm text-red-400 font-mono">{this.state.error.toString()}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Go Home
              </Button>
              <Button
                onClick={this.handleReset}
                className="flex-1 btn-gradient text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}