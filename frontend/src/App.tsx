import { SaleCreate } from './pages/SaleCreate';

function App() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-subtle)' }}>
      <SaleCreate onSuccess={(id) => console.log('Venda criada:', id)} />
    </main>
  );
}

export default App;
