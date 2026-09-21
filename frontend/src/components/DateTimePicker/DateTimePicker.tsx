import { FC, useState, useRef, useEffect, ChangeEvent } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import styles from './DateTimePicker.module.css';

export interface DateTimePickerProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string; // Formato esperado: YYYY-MM-DDTHH:mm ou ISO UTC
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  minDate?: string;
  maxDate?: string;
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

// Formata ISO ou YYYY-MM-DDTHH:mm para DD/MM/AAAA - HH:mm (Figma #834:499 node EL-b990c8ba)
export const formatDateTimeToDisplay = (val: string): string => {
  if (!val) return '';
  try {
    // Se for formato simples YYYY-MM-DDTHH:mm
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      const [datePart, timePart] = val.split('T');
      const [year, month, day] = datePart.split('-');
      const time = timePart.slice(0, 5);
      return `${day}/${month}/${year} - ${time}`;
    }

    // Se for Date parseável
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      return val;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  } catch {
    return val;
  }
};

// Extrai componentes YYYY-MM-DD e HH:mm do valor
const extractDateAndTime = (val: string): { dateStr: string; hoursStr: string; minutesStr: string } => {
  if (!val) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return { dateStr: `${yyyy}-${mm}-${dd}`, hoursStr: hh, minutesStr: min };
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
    const [d, t] = val.split('T');
    const [hh, min] = t.slice(0, 5).split(':');
    return { dateStr: d, hoursStr: hh || '12', minutesStr: min || '00' };
  }

  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return { dateStr: `${yyyy}-${mm}-${dd}`, hoursStr: hh, minutesStr: min };
  }

  return { dateStr: '', hoursStr: '12', minutesStr: '00' };
};

export const DateTimePicker: FC<DateTimePickerProps> = ({
  id,
  label,
  placeholder = 'DD/MM/AAAA - HH:mm',
  value,
  onChange,
  required = false,
  disabled = false,
  readOnly = false,
  minDate,
  maxDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isFieldDisabled = Boolean(disabled || readOnly);

  const [displayValue, setDisplayValue] = useState(() => formatDateTimeToDisplay(value));

  const { dateStr: initialDate, hoursStr: initialH, minutesStr: initialM } = extractDateAndTime(value);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [hours, setHours] = useState<string>(initialH);
  const [minutes, setMinutes] = useState<string>(initialM);

  // Mês inicial de exibição do calendário
  const getInitialViewDate = (): Date => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState<Date>(getInitialViewDate);

  // Sincroniza estado interno quando o valor externo mudar
  useEffect(() => {
    setDisplayValue(formatDateTimeToDisplay(value));
    const { dateStr, hoursStr, minutesStr } = extractDateAndTime(value);
    if (dateStr) {
      setSelectedDate(dateStr);
      setHours(hoursStr);
      setMinutes(minutesStr);
      const [y, m, d] = dateStr.split('-').map(Number);
      setViewDate(new Date(y, m - 1, d));
    }
  }, [value]);

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

  // Atualiza data/hora e notifica componente pai
  const emitChange = (newDateStr: string, newH: string, newM: string) => {
    const safeH = String(Math.min(23, Math.max(0, parseInt(newH, 10) || 0))).padStart(2, '0');
    const safeM = String(Math.min(59, Math.max(0, parseInt(newM, 10) || 0))).padStart(2, '0');
    const combinedValue = `${newDateStr}T${safeH}:${safeM}`;
    onChange(combinedValue);
    setDisplayValue(formatDateTimeToDisplay(combinedValue));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const typed = e.target.value;
    setDisplayValue(typed);

    if (!typed.trim()) {
      onChange('');
      return;
    }

    // Suporta formato ISO (YYYY-MM-DDTHH:mm)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(typed)) {
      onChange(typed.slice(0, 16));
      return;
    }

    // Suporta formato "DD/MM/AAAA - HH:mm" ou "DD/MM/AAAA HH:mm"
    const ddmmyyyyWithTime = /^(\d{2})\/(\d{2})\/(\d{4})(?:(?:\s*-\s*|\s+)(\d{2}):(\d{2}))?$/;
    const match = typed.match(ddmmyyyyWithTime);
    if (match) {
      const [, d, m, y, h, min] = match;
      const targetH = h ? h.padStart(2, '0') : hours;
      const targetMin = min ? min.padStart(2, '0') : minutes;
      const combined = `${y}-${m}-${d}T${targetH}:${targetMin}`;
      onChange(combined);
      setSelectedDate(`${y}-${m}-${d}`);
      setHours(targetH);
      setMinutes(targetMin);
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
    const dateStr = `${year}-${month}-${dayStr}`;

    if (minDate && dateStr < minDate) return;
    if (maxDate && dateStr > maxDate) return;

    setSelectedDate(dateStr);
    emitChange(dateStr, hours, minutes);
  };

  // Alteração de horário
  const handleHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHours(val);
    if (selectedDate && val !== '') {
      emitChange(selectedDate, val, minutes);
    }
  };

  const handleMinutesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMinutes(val);
    if (selectedDate && val !== '') {
      emitChange(selectedDate, hours, val);
    }
  };

  // Montagem da grade do mês
  const currentYear = viewDate.getFullYear();
  const currentMonthIdx = viewDate.getMonth();
  const monthTitle = `${MONTH_NAMES[currentMonthIdx]} ${currentYear}`;

  const firstDayIndex = new Date(currentYear, currentMonthIdx, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonthIdx, 0).getDate();

  const calendarDays: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      dateStr: '',
    });
  }

  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const mm = String(currentMonthIdx + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    calendarDays.push({
      day: d,
      isCurrentMonth: true,
      dateStr: `${currentYear}-${mm}-${dd}`,
    });
  }

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
        className={`${styles.dateInputWrapper} ${isOpen ? styles.inputFocused : ''} ${
          isFieldDisabled ? styles.disabledWrapper : ''
        }`}
        onClick={() => {
          if (!isFieldDisabled) {
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <input
          id={id}
          type="text"
          className={styles.dateInput}
          placeholder={placeholder}
          aria-label={label}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (!isFieldDisabled) setIsOpen(true);
          }}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
        />
        <button
          type="button"
          className={styles.calendarIconBtn}
          onClick={(e) => {
            e.stopPropagation();
            if (!isFieldDisabled) {
              setIsOpen((prev) => !prev);
            }
          }}
          aria-label="Abrir seletor de data e hora"
          tabIndex={-1}
          disabled={isFieldDisabled}
        >
          <CalendarIcon size={16} />
        </button>
      </div>

      {/* POPOVER DO CALENDÁRIO COM DATA E HORA */}
      {isOpen && !isFieldDisabled && (
        <div className={styles.calendarPopover} role="dialog" aria-label="Seletor de data e hora">
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

              const isSelected = item.dateStr === selectedDate;
              const isDisabled =
                Boolean(minDate && item.dateStr && item.dateStr < minDate) ||
                Boolean(maxDate && item.dateStr && item.dateStr > maxDate);

              return (
                <button
                  key={idx}
                  type="button"
                  className={`${styles.dayButton} ${isSelected ? styles.selectedDay : ''} ${
                    isDisabled ? styles.disabledDay : ''
                  }`}
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

          {/* Seção de Horário */}
          <div className={styles.timeSection}>
            <div className={styles.timeLabelWrapper}>
              <Clock size={15} className={styles.timeIcon} />
              <span>Horário:</span>
            </div>
            <div className={styles.timeInputsWrapper}>
              <input
                type="number"
                min={0}
                max={23}
                aria-label="Horas"
                className={styles.timeUnitInput}
                value={hours}
                onChange={handleHoursChange}
              />
              <span className={styles.timeSeparator}>:</span>
              <input
                type="number"
                min={0}
                max={59}
                aria-label="Minutos"
                className={styles.timeUnitInput}
                value={minutes}
                onChange={handleMinutesChange}
              />
            </div>
            <button
              type="button"
              className={styles.timeConfirmBtn}
              onClick={() => setIsOpen(false)}
              aria-label="Confirmar data e hora"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
