import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-light flex flex-col items-center justify-center px-6 text-center">
          <div className="text-6xl mb-4">😿</div>
          <h1 className="text-2xl font-extrabold text-gray-800 mb-2">
            Oups, quelque chose a planté
          </h1>
          <p className="text-gray-500 text-sm max-w-sm mb-6">
            Une erreur inattendue est survenue. Pas de panique, vos données sont en sécurité.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white font-semibold text-sm px-6 py-3 rounded-xl
                         hover:bg-primary/90 transition-colors"
            >
              🔄 Rafraîchir la page
            </button>
            <a
              href="/"
              className="bg-gray-100 text-gray-700 font-semibold text-sm px-6 py-3 rounded-xl
                         hover:bg-gray-200 transition-colors"
            >
              Retour à l'accueil
            </a>
          </div>
          {this.state.error?.message && (
            <p className="text-gray-300 text-xs mt-6 max-w-md break-all">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
