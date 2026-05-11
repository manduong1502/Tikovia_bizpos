import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const EXPECTED_PRESETS = {
  'Theo ngày': ['Ngày mai', 'Ngày kia', '3 ngày tới', '5 ngày tới', '7 ngày tới'],
  'Theo tuần': ['Tuần này', 'Tuần tới', '2 tuần tới'],
  'Theo tháng': ['Tháng này', 'Tháng tới', '30 ngày tới', '2 tháng tới', '3 tháng tới'],
};

const CREATED_PRESETS = {
  'Theo ngày': ['Hôm nay', 'Hôm qua'],
  'Theo tuần': ['Tuần này', 'Tuần trước', '7 ngày qua'],
  'Theo tháng': ['Tháng này', 'Tháng trước', '30 ngày qua'],
  'Theo quý': ['Quý này', 'Quý trước'],
  'Theo năm': ['Năm nay', 'Năm trước'],
};

function CalendarGrid({ year, month, startDate, endDate, onSelectDay }) {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const today = new Date();

  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (d) => {
    const date = new Date(year, month, d);
    if (startDate && !endDate) return date.getTime() === startDate.getTime();
    if (startDate && endDate) return date >= startDate && date <= endDate;
    return false;
  };
  const isStart = (d) => startDate && new Date(year, month, d).getTime() === startDate.getTime();
  const isEnd = (d) => endDate && new Date(year, month, d).getTime() === endDate.getTime();

  const cells = [];
  for (let i = 0; i < offset; i++) {
    cells.push(<div key={`prev-${i}`} className="text-center py-1 text-xs text-gray-300">{prevDays - offset + i + 1}</div>);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const sel = isSelected(i);
    const st = isStart(i);
    const en = isEnd(i);
    const td = isToday(i);
    cells.push(
      <button
        key={i}
        onClick={() => onSelectDay(new Date(year, month, i))}
        className={`text-center py-1 text-xs rounded cursor-pointer transition-colors
          ${sel ? 'bg-primary/10' : 'hover:bg-gray-100'}
          ${(st || en) ? 'bg-primary text-white rounded-full font-semibold' : ''}
          ${td && !sel ? 'text-primary font-bold' : ''}
          ${!sel && !td ? 'text-gray-700' : ''}
        `}
      >
        {i}
      </button>
    );
  }
  const rem = (offset + daysInMonth) % 7;
  if (rem > 0) {
    for (let i = 1; i <= 7 - rem; i++) {
      cells.push(<div key={`next-${i}`} className="text-center py-1 text-xs text-gray-300">{i}</div>);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-0 mb-1">
        {days.map(d => <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0">{cells}</div>
    </div>
  );
}

export default function DateFilter({ label, type = 'created', value, onChange }) {
  const [mode, setMode] = useState(value?.mode || 'all'); // 'all' | 'custom'
  const [popover, setPopover] = useState(null); // 'preset' | 'calendar'
  const [calDate, setCalDate] = useState(new Date());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const ref = useRef(null);

  const presets = type === 'expected' ? EXPECTED_PRESETS : CREATED_PRESETS;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setPopover(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayLabel = value?.label || 'Toàn thời gian';

  const selectPreset = (lbl) => {
    onChange({ mode: 'all', label: lbl, start: null, end: null });
    setMode('all');
    setPopover(null);
  };

  const handleSelectDay = (date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else {
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const applyCustom = () => {
    if (startDate) {
      const fmt = (d) => d.toLocaleDateString('vi-VN');
      const lbl = endDate ? `${fmt(startDate)} - ${fmt(endDate)}` : fmt(startDate);
      onChange({ mode: 'custom', label: lbl, start: startDate, end: endDate || startDate });
    }
    setPopover(null);
  };

  const curMonth = calDate.getMonth();
  const curYear = calDate.getFullYear();
  const nextDate = new Date(curYear, curMonth + 1, 1);

  return (
    <div className="relative" ref={ref}>
      {/* Preset Radio */}
      <button
        onClick={() => { setMode('all'); setPopover(popover === 'preset' ? null : 'preset'); }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded border mb-1.5 text-sm transition-colors cursor-pointer ${
          mode === 'all' ? 'border-primary bg-blue-50/50' : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          mode === 'all' ? 'border-primary' : 'border-gray-300'
        }`}>
          {mode === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
        <span className="flex-1 text-left text-gray-700 truncate">
          {mode === 'all' ? displayLabel : 'Toàn thời gian'}
        </span>
        <ChevronRight size={12} className="text-gray-400" />
      </button>

      {/* Custom Radio */}
      <button
        onClick={() => { setMode('custom'); setPopover(popover === 'calendar' ? null : 'calendar'); }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors cursor-pointer ${
          mode === 'custom' ? 'border-primary bg-blue-50/50' : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          mode === 'custom' ? 'border-primary' : 'border-gray-300'
        }`}>
          {mode === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
        <span className="flex-1 text-left text-gray-700 truncate">
          {mode === 'custom' && value?.label !== 'Toàn thời gian' ? value?.label : 'Tùy chỉnh'}
        </span>
        <Calendar size={14} className="text-gray-400" />
      </button>

      {/* Preset Popover */}
      {popover === 'preset' && (
        <div className="absolute left-full top-0 ml-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex p-3 gap-4 min-w-[360px]">
          {Object.entries(presets).map(([title, items]) => (
            <div key={title} className="min-w-[100px]">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</div>
              {items.map(item => (
                <button
                  key={item}
                  onClick={() => selectPreset(item)}
                  className="block w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-primary/10 hover:text-primary rounded transition-colors cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
          ))}
          <div className="flex flex-col justify-end">
            <button
              onClick={() => selectPreset('Toàn thời gian')}
              className="bg-primary text-white text-xs px-3 py-1.5 rounded hover:bg-primary-hover transition-colors"
            >
              Toàn thời gian
            </button>
          </div>
        </div>
      )}

      {/* Calendar Popover */}
      {popover === 'calendar' && (
        <div className="absolute left-full top-0 ml-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-[480px]">
          {/* Header range display */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-600 rounded-t-lg">
            Từ ngày: {startDate ? startDate.toLocaleDateString('vi-VN') : '--/--/----'} - Đến ngày: {endDate ? endDate.toLocaleDateString('vi-VN') : '--/--/----'}
          </div>

          {/* Dual Calendar */}
          <div className="flex gap-4 p-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCalDate(new Date(curYear, curMonth - 1, 1))} className="p-1 rounded hover:bg-gray-100 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-semibold text-gray-700">Tháng {curMonth + 1} {curYear}</span>
                <button onClick={() => setCalDate(new Date(curYear, curMonth + 1, 1))} className="p-1 rounded hover:bg-gray-100 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
              <CalendarGrid year={curYear} month={curMonth} startDate={startDate} endDate={endDate} onSelectDay={handleSelectDay} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCalDate(new Date(curYear, curMonth, 1))} className="p-1 rounded hover:bg-gray-100 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-semibold text-gray-700">Tháng {nextDate.getMonth() + 1} {nextDate.getFullYear()}</span>
                <button onClick={() => setCalDate(new Date(curYear, curMonth + 2, 1))} className="p-1 rounded hover:bg-gray-100 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>
              <CalendarGrid year={nextDate.getFullYear()} month={nextDate.getMonth()} startDate={startDate} endDate={endDate} onSelectDay={handleSelectDay} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
            <button onClick={() => { const t = new Date(); t.setHours(0,0,0,0); setStartDate(t); setEndDate(t); }} className="text-primary text-xs font-medium hover:underline">
              Hôm nay
            </button>
            <div className="flex gap-2">
              <button onClick={() => setPopover(null)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded transition-colors">Bỏ qua</button>
              <button onClick={applyCustom} className="bg-primary text-white text-xs px-4 py-1.5 rounded hover:bg-primary-hover transition-colors">Áp dụng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
