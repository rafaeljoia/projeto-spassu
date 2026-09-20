import { FC, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Navbar } from './components';
import { SalesList } from './pages/SalesList';
import { SaleCreate } from './pages/SaleCreate';
import { SaleEdit } from './pages/SaleEdit';
import { Commissions } from './pages/Commissions';

const AppContent: FC = () => {
  const navigate = useNavigate();
  const [editTitle, setEditTitle] = useState<string | undefined>(undefined);

  const handleTitleChange = useCallback((title: string) => {
    setEditTitle((prev) => (prev === title ? prev : title));
  }, []);

  const handleEditSuccess = useCallback(() => {
    setEditTitle(undefined);
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditTitle(undefined);
    navigate('/vendas');
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-subtle)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar
        onNavigate={(path) => {
          setEditTitle(undefined);
          navigate(path);
        }}
        title={editTitle}
      />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route
            path="/"
            element={<SalesList onNavigateNewSale={() => navigate('/vendas/nova')} />}
          />
          <Route
            path="/vendas"
            element={<SalesList onNavigateNewSale={() => navigate('/vendas/nova')} />}
          />
          <Route
            path="/vendas/nova"
            element={
              <SaleCreate
                onCancel={() => navigate('/vendas')}
              />
            }
          />
          <Route
            path="/vendas/:id/editar"
            element={
              <SaleEdit
                onSuccess={handleEditSuccess}
                onCancel={handleEditCancel}
                onTitleChange={handleTitleChange}
              />
            }
          />
          <Route path="/comissoes" element={<Commissions />} />
        </Routes>
      </main>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
