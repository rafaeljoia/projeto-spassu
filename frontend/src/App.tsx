import { useState, useEffect } from 'react';
import { Navbar } from './components';
import { SalesList } from './pages/SalesList';
import { SaleCreate } from './pages/SaleCreate';
import { Commissions } from './pages/Commissions';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/vendas/nova' || path === '/comissoes') {
        return path;
      }
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
        const path = window.location.pathname;
        if (path === '/vendas/nova' || path === '/comissoes') {
          setCurrentPath(path);
        } else {
          setCurrentPath('/vendas');
        }
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
        ) : currentPath === '/comissoes' ? (
          <Commissions />
        ) : (
          <SalesList onNavigateNewSale={() => navigate('/vendas/nova')} />
        )}
      </main>
    </div>
  );
}

export default App;
