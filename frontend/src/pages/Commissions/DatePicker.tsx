import { FC, useState, useRef, useEffect, ChangeEvent } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Commissions.module.css';

export interface DatePickerProps {
  id: string;
  label: string;
  placeholder: string;
  value: string; // ISO: YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  minDate?: string; // ISO: YYYY-MM-DD
  maxDate?: string; // ISO: YYYY-MM-DD
}

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const WEEKDAY_NAMES = ['do', '2º', '3º', '4º', '5º', '6º', 'sá'];

export const DatePicker: FC<DatePickerProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  required = false,
  minDate,
  maxDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Formata ISO YYYY-MM-DD para DD/MM/AAAA exibido no input (Figma #839:1109)
  const formatToDisplay = (isoStr: string): string => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  const [displayValue, setDisplayValue] = useState(formatToDisplay(value));

  // Determina o mês inicial do calendário
  const getInitialMonth = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    if (minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate)) {
      const [y, m, d] = minDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState<Date>(getInitialMonth);

  // Atualiza o display quando o valor externo mudar
  useEffect(() => {
    setDisplayValue(formatToDisplay(value));
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      setViewDate(new Date(y, m - 1, d));
    } else if (!value && minDate && /^\d{4}-\d{2}-\d{2}$/.test(minDate)) {
      const [y, m, d] = minDate.split('-').map(Number);
      setViewDate(new Date(y, m - 1, d));
    }
  }, [value, minDate]);

  // Fecha o popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value;
    setDisplayValue(typed);

    // Se o usuário digitar ou limpar diretamente (ex: nos testes automatizados)
    if (!typed.trim()) {
      onChange('');
      return;
    }

    // Suporta formato ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(typed)) {
      onChange(typed);
      return;
    }

    // Suporta formato pt-BR (DD/MM/AAAA)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(typed)) {
      const [day, month, year] = typed.split('/');
      onChange(`${year}-${month}-${day}`);
    }
  };

  // Navegação de meses
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Seleciona um dia na grade do calendário
  const handleSelectDay = (day: number) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const isoString = `${year}-${month}-${dayStr}`;

    if (minDate && isoString < minDate) {
      return;
    }
    if (maxDate && isoString > maxDate) {
      return;
    }

    onChange(isoString);
    setDisplayValue(`${dayStr}/${month}/${year}`);
    setIsOpen(false);
  };

  // Montagem da grade do mês (Figma #839:823)
  const currentYear = viewDate.getFullYear();
  const currentMonthIdx = viewDate.getMonth();
  const monthTitle = `${MONTH_NAMES[currentMonthIdx]} ${currentYear}`;

  const firstDayIndex = new Date(currentYear, currentMonthIdx, 1).getDay(); // 0 = do, 1 = 2º, ...
  const daysInCurrentMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonthIdx, 0).getDate();

  const calendarDays: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

  // Dias do mês anterior
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      dateStr: '',
    });
  }

  // Dias do mês corrente
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const mm = String(currentMonthIdx + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    calendarDays.push({
      day: d,
      isCurrentMonth: true,
      dateStr: `${currentYear}-${mm}-${dd}`,
    });
  }

  // Dias do próximo mês para preencher a grade (35 ou 42 células)
  const totalSlots = calendarDays.length > 35 ? 42 : 35;
  const remaining = totalSlots - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      dateStr: '',
    });
  }

  return (
    <div className={styles.datePickerContainer} ref={containerRef}>
      <div
        className={`${styles.dateInputWrapper} ${isOpen ? styles.inputFocused : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <input
          id={id}
          type="text"
          className={styles.dateInput}
          placeholder={placeholder}
          aria-label={label}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          required={required}
          min={minDate}
          max={maxDate}
        />
        <button
          type="button"
          className={styles.calendarIconBtn}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          aria-label="Abrir seletor de calendário"
          tabIndex={-1}
        >
          <CalendarIcon size={16} />
        </button>
      </div>

      {/* POPOVER DO CALENDÁRIO (Figma #839:823) */}
      {isOpen && (
        <div className={styles.calendarPopover} role="dialog" aria-label="Seletor de data">
          {/* Cabeçalho do Mês e Ano com Setas */}
          <div className={styles.calendarHeader}>
            <span className={styles.monthTitle}>{monthTitle}</span>
            <div className={styles.navArrows}>
              <button
                type="button"
                className={styles.arrowBtn}
                onClick={handlePrevMonth}
                aria-label="Mês anterior"
                title="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className={styles.arrowBtn}
                onClick={handleNextMonth}
                aria-label="Próximo mês"
                title="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Cabeçalho dos Dias da Semana (do, 2º, 3º, 4º, 5º, 6º, sá) */}
          <div className={styles.weekdaysRow}>
            {WEEKDAY_NAMES.map((name) => (
              <span key={name} className={styles.weekdayName}>
                {name}
              </span>
            ))}
          </div>

          {/* Grade dos Dias */}
          <div className={styles.daysGrid}>
            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <span key={idx} className={styles.dimmedDay}>
                    {item.day}
                  </span>
                );
              }

              const isSelected = item.dateStr === value;
              const isDisabled =
                Boolean(minDate && item.dateStr && item.dateStr < minDate) ||
                Boolean(maxDate && item.dateStr && item.dateStr > maxDate);

              return (
                <button
                  key={idx}
                  type="button"
                  className={`${styles.dayButton} ${isSelected ? styles.selectedDay : ''} ${isDisabled ? styles.disabledDay : ''}`}
                  onClick={() => !isDisabled && handleSelectDay(item.day)}
                  aria-selected={isSelected}
                  disabled={isDisabled}
                  aria-disabled={isDisabled}
                >
                  {item.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
