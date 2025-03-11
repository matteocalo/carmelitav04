
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary ha catturato un errore:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Qualcosa è andato storto</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Si è verificato un errore durante il caricamento di questa pagina. 
            {this.state.error && (
              <span className="block mt-2 text-sm font-mono bg-muted p-2 rounded">
                {this.state.error.toString().substring(0, 150)}
                {this.state.error.toString().length > 150 ? '...' : ''}
              </span>
            )}
          </p>
          <Button onClick={this.handleReset}>Riprova</Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
