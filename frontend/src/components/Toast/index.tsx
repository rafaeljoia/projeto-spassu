import { FC, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './Toast.module.css';

export interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: FC<ToastProps> = ({ message, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={styles.toastContainer} role="status" aria-live="polite">
      <span className={styles.message}>{message}</span>
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Fechar notificação"
        title="Fechar notificação"
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default Toast;
