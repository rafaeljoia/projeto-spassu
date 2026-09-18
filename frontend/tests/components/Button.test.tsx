import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../../src/components/Button';

describe('Componente Button', () => {
  it('renderiza o texto do botão corretamente', () => {
    render(<Button>Salvar Venda</Button>);
    expect(screen.getByRole('button', { name: /salvar venda/i })).toBeInTheDocument();
  });

  it('aplica o atributo disabled quando desabilitado', () => {
    render(<Button disabled>Ação Desabilitada</Button>);
    const button = screen.getByRole('button', { name: /ação desabilitada/i });
    expect(button).toBeDisabled();
  });

  it('renderiza estado de carregamento com spinner', () => {
    render(<Button isLoading>Processando</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Processando')).toBeInTheDocument();
  });
});
