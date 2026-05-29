import { Component } from 'react';
import { RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    const errMsg = error?.message || '';
    if (
      errMsg.includes('Failed to fetch dynamically imported module') ||
      errMsg.includes('ChunkLoadError') ||
      errMsg.includes('Loading chunk')
    ) {
      const now = Date.now();
      const lastReload = sessionStorage.getItem('last-chunk-error-reload');
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem('last-chunk-error-reload', String(now));
        console.log('Chunk load error detected, auto-reloading page...');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Đã xảy ra lỗi</h2>
          <p className="text-sm text-gray-500 mb-4 max-w-md">
            {this.state.error?.message || 'Trang này gặp sự cố. Vui lòng tải lại.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <RefreshCw size={16} />Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
