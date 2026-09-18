import { FC, HTMLAttributes, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import styles from './Table.module.css';

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
  emptyText?: string;
  isEmpty?: boolean;
}

export const Table: FC<TableProps> = ({
  children,
  className = '',
  wrapperClassName = '',
  emptyText,
  isEmpty = false,
  ...props
}) => {
  return (
    <div className={`${styles.tableWrapper} ${wrapperClassName}`}>
      <table className={`${styles.table} ${className}`} {...props}>
        {children}
      </table>
      {isEmpty && emptyText && (
        <div className={styles.emptyState}>{emptyText}</div>
      )}
    </div>
  );
};

export const TableHeader: FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  );
};

export const TableBody: FC<HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow: FC<HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <tr className={className} {...props}>
      {children}
    </tr>
  );
};

export const TableHead: FC<ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <th className={className} {...props}>
      {children}
    </th>
  );
};

export const TableCell: FC<TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <td className={className} {...props}>
      {children}
    </td>
  );
};

export default Table;
