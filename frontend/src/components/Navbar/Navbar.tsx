import { FC, MouseEvent, ReactNode } from 'react';
import { ShoppingBag, FileText, PlusCircle, Percent } from 'lucide-react';
import styles from './Navbar.module.css';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: ReactNode;
}

export interface NavbarProps {
  activePath?: string;
  onNavigate?: (path: string) => void;
  brandName?: string;
  brandSubtitle?: string;
}

export const Navbar: FC<NavbarProps> = ({
  activePath = '/vendas',
  onNavigate,
  brandName = 'SPASSU',
  brandSubtitle = 'Sistema de Vendas & Comissões',
}) => {
  const navItems: NavItem[] = [
    {
      id: 'sales-list',
      label: 'Vendas',
      path: '/vendas',
      icon: <FileText size={18} />,
    },
    {
      id: 'sale-create',
      label: 'Nova Venda',
      path: '/vendas/nova',
      icon: <PlusCircle size={18} />,
    },
    {
      id: 'commissions',
      label: 'Comissões',
      path: '/comissoes',
      icon: <Percent size={18} />,
    },
  ];

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <div
          className={styles.brand}
          onClick={(e) => handleLinkClick(e as unknown as MouseEvent<HTMLAnchorElement>, '/vendas')}
          role="button"
          tabIndex={0}
        >
          <div className={styles.logoIcon}>
            <ShoppingBag size={20} />
          </div>
          <div className={styles.brandTitle}>
            <span className={styles.brandName}>{brandName}</span>
            <span className={styles.brandSubtitle}>{brandSubtitle}</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Navegação Principal">
          {navItems.map((item) => {
            const isActive =
              activePath === item.path ||
              (item.path === '/vendas' && (activePath === '/' || activePath === ''));

            return (
              <a
                key={item.id}
                href={item.path}
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                onClick={(e) => handleLinkClick(e, item.path)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
