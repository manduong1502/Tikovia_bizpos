import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalPopover from './PortalPopover';

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
  const [popover, setPopover] = useState(null); // 'preset' | 'calendar'
  const [calDate, setCalDate] = useState(new Date());
  const [startDate, setStartDate] = useState(value?.start ? new Date(value.start) : null);
  const [endDate, setEndDate] = useState(value?.end ? new Date(value.end) : null);
  const ref = useRef(null);

  const presets = type === 'expected' ? EXPECTED_PRESETS : CREATED_PRESETS;
  const isCustomMode = value?.mode === 'custom';

  const selectPreset = (lbl) => {
    onChange({ mode: 'all', label: lbl, start: null, end: null });
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
    <div className="relative w-full" ref={ref}>
      {/* Preset Radio */}
      <button
        type="button"
        onClick={() => { setPopover(popover === 'preset' ? null : 'preset'); }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border mb-2 text-xs font-medium transition-all cursor-pointer ${
          !isCustomMode ? 'border-primary bg-blue-50/60 text-primary font-bold shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
        }`}
      >
        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          !isCustomMode ? 'border-primary' : 'border-gray-300'
        }`}>
          {!isCustomMode && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
        <span className="flex-1 text-left truncate">
          {!isCustomMode ? (value?.label || 'Toàn thời gian') : 'Chọn khoảng thời gian...'}
        </span>
        <ChevronRight size={14} className="text-gray-400 shrink-0" />
      </button>

      {/* Custom Radio */}
      <button
        type="button"
        onClick={() => { setPopover(popover === 'calendar' ? null : 'calendar'); }}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
          isCustomMode ? 'border-primary bg-blue-50/60 text-primary font-bold shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
        }`}
      >
        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
          isCustomMode ? 'border-primary' : 'border-gray-300'
        }`}>
          {isCustomMode && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </div>
        <span className="flex-1 text-left truncate">
          {isCustomMode ? value?.label : 'Tùy chỉnh ngày...'}
        </span>
        <Calendar size={14} className="text-gray-400 shrink-0" />
      </button>

      {/* Preset Popover */}
      <PortalPopover anchorEl={ref.current} open={popover === 'preset'} onClose={() => setPopover(null)} widthMatch={false}>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl z-[10000] p-4 max-w-[92vw] w-[360px] sm:w-[420px] max-h-[80vh] overflow-y-auto custom-scrollbar flex flex-col gap-4">
          {Object.entries(presets).map(([title, items]) => (
            <div key={title} className="flex flex-col gap-2">
              <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider text-left">{title}</div>
              <div className="flex flex-wrap gap-1.5">
                {items.map(item => {
                  const isSelected = value?.label === item && !isCustomMode;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => selectPreset(item)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer font-medium ${
                        isSelected
                          ? 'bg-primary text-white font-bold shadow-sm'
                          : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-primary'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => selectPreset('Toàn thời gian')}
              className={`w-full text-center py-2 text-xs rounded-lg transition-all cursor-pointer font-semibold ${
                value?.label === 'Toàn thời gian' || !value?.label
                  ? 'bg-primary text-white font-bold shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toàn thời gian
            </button>
          </div>
        </div>
      </PortalPopover>

      {/* Calendar Popover */}
      <PortalPopover anchorEl={ref.current} open={popover === 'calendar'} onClose={() => setPopover(null)} widthMatch={false}>
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl z-[10000] w-[92vw] sm:w-[480px] max-w-full p-3 sm:p-4 overflow-y-auto max-h-[85vh]">
          {/* Header range display */}
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 rounded-lg mb-3 text-center">
            Từ: <span className="text-primary font-bold">{startDate ? startDate.toLocaleDateString('vi-VN') : '--/--/----'}</span> - Đến: <span className="text-primary font-bold">{endDate ? endDate.toLocaleDateString('vi-VN') : '--/--/----'}</span>
          </div>

          {/* Dual Calendar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
            <div>
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => setCalDate(new Date(curYear, curMonth - 1, 1))} className="p-1 rounded hover:bg-gray-100 text-gray-600">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-bold text-gray-800">Tháng {curMonth + 1}/{curYear}</span>
                <button type="button" onClick={() => setCalDate(new Date(curYear, curMonth + 1, 1))} className="p-1 rounded hover:bg-gray-100 text-gray-600">
                  <ChevronRight size={14} />
                </button>
              </div>
              <CalendarGrid year={curYear} month={curMonth} startDate={startDate} endDate={endDate} onSelectDay={handleSelectDay} />
            </div>

            <div className="hidden sm:block">
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={() => setCalDate(new Date(curYear, curMonth, 1))} className="p-1 rounded hover:bg-gray-100 text-gray-600">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-bold text-gray-800">Tháng {nextDate.getMonth() + 1}/{nextDate.getFullYear()}</span>
                <button type="button" onClick={() => setCalDate(new Date(curYear, curMonth + 2, 1))} className="p-1 rounded hover:bg-gray-100 text-gray-600">
                  <ChevronRight size={14} />
                </button>
              </div>
              <CalendarGrid year={nextDate.getFullYear()} month={nextDate.getMonth()} startDate={startDate} endDate={endDate} onSelectDay={handleSelectDay} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
            <button type="button" onClick={() => { const t = new Date(); t.setHours(0,0,0,0); setStartDate(t); setEndDate(t); }} className="text-primary text-xs font-bold hover:underline">
              Hôm nay
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPopover(null)} className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-all font-medium cursor-pointer">Bỏ qua</button>
              <button type="button" onClick={applyCustom} className="bg-primary hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer">Áp dụng</button>
            </div>
          </div>
        </div>
      </PortalPopover>
    </div>
  );
}
