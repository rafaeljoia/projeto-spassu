/**
 * Configuração e inicialização do ambiente de testes Vitest e React Testing Library.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Limpeza automática do DOM do React após cada execução de teste
afterEach(() => {
  cleanup();
});
