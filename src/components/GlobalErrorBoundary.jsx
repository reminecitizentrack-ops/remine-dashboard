// components/GlobalErrorBoundary.jsx
import React from 'react';

export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 ERREUR GLOBALE CAPTURÉE:', error);
    console.error('📋 Stack:', errorInfo.componentStack);
    
    // Identifier le composant problématique
    const componentStack = errorInfo.componentStack;
    const componentMatch = componentStack.match(/at (\w+)/);
    const componentName = componentMatch ? componentMatch[1] : 'Composant inconnu';
    
    console.error(`🔍 Composant problématique: ${componentName}`);
    
    this.setState({
      errorInfo,
      componentName
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4">
          <h2 className="text-lg font-bold text-red-800 mb-2">
            🚨 Erreur dans {this.state.componentName || 'un composant'}
          </h2>
          <p className="text-red-700 mb-4">
            {this.state.error?.message}
          </p>
          <details className="text-sm text-red-600">
            <summary>Détails techniques</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}