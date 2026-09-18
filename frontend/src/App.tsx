import { useState, useEffect } from 'react';
import { Navbar } from './components';
import { SalesList } from './pages/SalesList';
import { SaleCreate } from './pages/SaleCreate';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/vendas/nova') {
      return '/vendas/nova';
    }
    return '/vendas';
  });

  const navigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname === '/vendas/nova' ? '/vendas/nova' : '/vendas';
        setCurrentPath(path);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-subtle)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar activePath={currentPath} onNavigate={navigate} />

      <main style={{ flex: 1 }}>
        {currentPath === '/vendas/nova' ? (
          <SaleCreate
            onSuccess={() => navigate('/vendas')}
            onCancel={() => navigate('/vendas')}
          />
        ) : (
          <SalesList onNavigateNewSale={() => navigate('/vendas/nova')} />
        )}
      </main>
    </div>
  );
}

export default App;
