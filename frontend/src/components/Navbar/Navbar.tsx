import { FC, useState, ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { BarsIcon, CashRegisterIcon, CalculatorIcon, AngleRightIcon } from './MenuIcons';
import styles from './Navbar.module.css';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: ReactNode;
}

export interface NavbarProps {
  activePath?: string;
  onNavigate?: (path: string) => void;
  brandName?: string;
  title?: string;
}

/**
 * Mapeia o pathname atual para o título da página exibido centralizado no cabeçalho.
 */
export const getTitleForPath = (path: string, invoiceNumber?: string): string => {
  if (path === '/vendas/nova') {
    return 'Nova Venda';
  }
  const editMatch = path.match(/^\/vendas\/([^/]+)\/editar\/?$/);
  if (editMatch) {
    return invoiceNumber ? `Alterar Venda - Nº ${invoiceNumber}` : 'Alterar Venda';
  }
  if (path === '/comissoes') {
    return 'Relatório de Comissões';
  }
  if (path === '/vendas' || path === '/') {
    return 'Listagem de Vendas';
  }
  return 'SPASSU';
};

export const Navbar: FC<NavbarProps> = ({
  activePath,
  onNavigate,
  brandName = 'SPASSU',
  title: customTitle,
}) => {
  // Hook useLocation do react-router-dom para obter a rota atual
  const location = useLocation();
  const currentPath = activePath || location.pathname || '/vendas';

  // State para controlar abertura e fechamento da Sidebar / Drawer
  const [isOpen, setIsOpen] = useState(false);

  // Extrai o número da nota fiscal caso tenha sido transmitido no state da navegação
  const invoiceNumberFromState = (location.state as { invoiceNumber?: string } | null)?.invoiceNumber;

  // Título oficial centralizado no cabeçalho
  const displayTitle = customTitle || getTitleForPath(currentPath, invoiceNumberFromState);

  // Módulos principais do sistema segundo o Figma (#830:124)
  // REGRA ESTRITA: Apenas "Vendas" e "Comissões" (Nova Venda removida do menu lateral)
  const navItems: NavItem[] = [
    {
      id: 'sales-list',
      label: 'Vendas',
      path: '/vendas',
      icon: <CashRegisterIcon size={15} />,
    },
    {
      id: 'commissions',
      label: 'Comissões',
      path: '/comissoes',
      icon: <CalculatorIcon size={15} />,
    },
  ];

  const handleLinkClick = (path: string) => {
    setIsOpen(false);
    if (onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.inner}`}>
          {/* Lado Esquerdo: Menu Sanduíche (Figma #830:149) + Logo */}
          <div className={styles.leftSection}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label="Abrir menu de navegação"
              aria-expanded={isOpen}
            >
              <BarsIcon size={25} />
            </button>

            <Link
              to="/vendas"
              className={styles.brand}
              onClick={() => handleLinkClick('/vendas')}
            >
              <div className={styles.brandIcon}>
                <ShoppingBag size={22} />
              </div>
              <span className={styles.brandName}>{brandName}</span>
            </Link>
          </div>

          {/* Centro: TÍTULO CENTRALIZADO NO MEIO DO CABEÇALHO (Figma #833:7) */}
          <div className={styles.centerSection}>
            <h1 className={styles.pageTitle}>{displayTitle}</h1>
          </div>

          {/* Lado Direito: Espaçador para simetria e alinhamento central */}
          <div className={styles.rightSection} />
        </div>
      </header>

      {/* Overlay Backdrop do Drawer Lateral */}
      <div
        className={`${styles.drawerOverlay} ${isOpen ? styles.drawerOverlayVisible : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      {/* Sidebar / Drawer Lateral Deslizante (Figma Component #830:124) */}
      <aside
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        aria-label="Menu Lateral"
      >
        <nav className={styles.drawerNav} aria-label="Navegação Principal">
          {navItems.map((item) => {
            const isActive =
              currentPath === item.path ||
              (item.path === '/vendas' && (currentPath === '/' || currentPath === ''));

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`}
                onClick={() => handleLinkClick(item.path)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles.drawerItemIcon}>{item.icon}</span>
                <span className={styles.drawerItemLabel}>{item.label}</span>
                <span className={styles.drawerItemChevron}>
                  <AngleRightIcon size={25} />
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Navbar;
