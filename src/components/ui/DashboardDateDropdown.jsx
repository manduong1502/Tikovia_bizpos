import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check, Clock, RotateCcw } from 'lucide-react';
import PortalPopover from './PortalPopover';

const PRESET_GROUPS = {
  'Theo ngày': ['Hôm nay', 'Hôm qua'],
  'Theo tuần': ['Tuần này', 'Tuần trước', '7 ngày qua'],
  'Theo tháng': ['Tháng này', 'Tháng trước', '30 ngày qua'],
  'Theo quý': ['Quý này', 'Quý trước'],
  'Theo năm': ['Năm nay', 'Toàn thời gian'],
};

function formatDateVN(d) {
  if (!d || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDateVN(str) {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900 && month >= 0 && month < 12 && day > 0 && day <= 31) {
      const d = new Date(year, month, day);
      if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
        return d;
      }
    }
  }
  return null;
}

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
        type="button"
        onClick={() => onSelectDay(new Date(year, month, i))}
        className={`text-center py-1 text-xs rounded-md cursor-pointer transition-all font-medium
          ${sel ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-gray-100 text-gray-700'}
          ${(st || en) ? '!bg-primary !text-white !font-bold rounded-lg shadow-xs' : ''}
          ${td && !sel ? 'text-primary font-extrabold ring-1 ring-primary/40' : ''}
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
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {days.map(d => <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>
    </div>
  );
}

export default function DashboardDateDropdown({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('preset'); // 'preset' | 'custom'
  const triggerRef = useRef(null);

  // Parse current value
  const currentValueObj = typeof value === 'string' 
    ? { mode: 'all', label: value, start: null, end: null }
    : (value || { mode: 'all', label: 'Tháng này', start: null, end: null });

  const isCustomMode = currentValueObj.mode === 'custom';
  const displayLabel = currentValueObj.label || 'Tháng này';

  // Calendar states
  const [calDate, setCalDate] = useState(() => currentValueObj.start ? new Date(currentValueObj.start) : new Date());
  const [startDate, setStartDate] = useState(() => currentValueObj.start ? new Date(currentValueObj.start) : null);
  const [endDate, setEndDate] = useState(() => currentValueObj.end ? new Date(currentValueObj.end) : null);
  const [startInput, setStartInput] = useState(() => currentValueObj.start ? formatDateVN(new Date(currentValueObj.start)) : '');
  const [endInput, setEndInput] = useState(() => currentValueObj.end ? formatDateVN(new Date(currentValueObj.end)) : '');

  useEffect(() => {
    if (currentValueObj.mode === 'custom') {
      setActiveTab('custom');
      if (currentValueObj.start) {
        const s = new Date(currentValueObj.start);
        setStartDate(s);
        setStartInput(formatDateVN(s));
        setCalDate(s);
      }
      if (currentValueObj.end) {
        const e = new Date(currentValueObj.end);
        setEndDate(e);
        setEndInput(formatDateVN(e));
      }
    } else {
      setActiveTab('preset');
    }
  }, [value]);

  const handleSelectPreset = (presetLabel) => {
    onChange({
      mode: 'all',
      label: presetLabel,
      start: null,
      end: null
    });
    setOpen(false);
  };

  const handleSelectDay = (date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setStartInput(formatDateVN(date));
      setEndDate(null);
      setEndInput('');
    } else {
      if (date < startDate) {
        setEndDate(startDate);
        setEndInput(formatDateVN(startDate));
        setStartDate(date);
        setStartInput(formatDateVN(date));
      } else {
        setEndDate(date);
        setEndInput(formatDateVN(date));
      }
    }
  };

  const handleApplyCustom = () => {
    if (!startDate) return;
    const finalEnd = endDate || startDate;
    const lbl = `${formatDateVN(startDate)} - ${formatDateVN(finalEnd)}`;
    onChange({
      mode: 'custom',
      label: lbl,
      start: startDate,
      end: finalEnd
    });
    setOpen(false);
  };

  const handleClearCustom = () => {
    setStartDate(null);
    setEndDate(null);
    setStartInput('');
    setEndInput('');
  };

  const curMonth = calDate.getMonth();
  const curYear = calDate.getFullYear();
  const nextMonthDate = new Date(curYear, curMonth + 1, 1);

  return (
    <div className={`relative inline-block ${className}`} ref={triggerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs sm:text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-all cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-[130px]"
        title="Chọn thời gian lọc"
      >
        <span className="truncate max-w-[180px]">{displayLabel}</span>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-primary' : ''}`} />
      </button>

      {/* Popover */}
      <PortalPopover anchorEl={triggerRef.current} open={open} onClose={() => setOpen(false)} widthMatch={false}>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl z-[10000] p-0 w-full max-w-[560px] max-h-[88vh] overflow-hidden flex flex-col font-sans animate-fade-in text-left">
          
          {/* Header Mode Switcher */}
          <div className="flex items-center border-b border-gray-100 bg-gray-50/70 p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('preset')}
              className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'preset'
                  ? 'bg-white text-primary shadow-xs border border-gray-200/80'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Clock size={14} />
              <span>Tùy chọn có sẵn</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'custom'
                  ? 'bg-white text-primary shadow-xs border border-gray-200/80'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Calendar size={14} />
              <span>Tùy chỉnh theo lịch</span>
            </button>
          </div>

          {/* Content Area */}
          {activeTab === 'preset' ? (
            /* Presets Grid */
            <div className="p-4 overflow-y-auto max-h-[420px] custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Object.entries(PRESET_GROUPS).map(([groupTitle, items]) => (
                  <div key={groupTitle} className="flex flex-col gap-1.5">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 pb-1 border-b border-gray-100">
                      {groupTitle}
                    </div>
                    {items.map(item => {
                      const isSelected = !isCustomMode && displayLabel === item;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleSelectPreset(item)}
                          className={`w-full text-center px-2 py-1.5 text-xs rounded-xl transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-primary text-white font-extrabold shadow-sm border-primary ring-2 ring-primary/20'
                              : 'bg-white text-gray-700 border-gray-200/90 hover:border-primary/60 hover:text-primary hover:bg-blue-50/50 font-semibold'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Custom Calendar Range Picker */
            <div className="flex flex-col overflow-y-auto max-h-[460px] custom-scrollbar">
              {/* Inputs */}
              <div className="p-3 bg-gray-50/40 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Từ ngày</label>
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      className="w-full px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-gray-800"
                      value={startInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStartInput(val);
                        const parsed = parseDateVN(val);
                        if (parsed) {
                          setStartDate(parsed);
                          setCalDate(parsed);
                        }
                      }}
                    />
                  </div>
                  <span className="text-gray-400 font-bold mt-4">→</span>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Đến ngày</label>
                    <input
                      type="text"
                      placeholder="dd/mm/yyyy"
                      className="w-full px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-xl bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-gray-800"
                      value={endInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEndInput(val);
                        const parsed = parseDateVN(val);
                        if (parsed) {
                          setEndDate(parsed);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Dual Month Calendar */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left Month */}
                <div className="p-2 border border-gray-100 rounded-xl bg-white">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <button
                      type="button"
                      onClick={() => setCalDate(new Date(curYear, curMonth - 1, 1))}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-extrabold text-gray-800">
                      Tháng {curMonth + 1}, {curYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalDate(new Date(curYear, curMonth + 1, 1))}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <CalendarGrid
                    year={curYear}
                    month={curMonth}
                    startDate={startDate}
                    endDate={endDate}
                    onSelectDay={handleSelectDay}
                  />
                </div>

                {/* Right Month */}
                <div className="p-2 border border-gray-100 rounded-xl bg-white hidden sm:block">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <button
                      type="button"
                      onClick={() => setCalDate(new Date(curYear, curMonth, 1))}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-extrabold text-gray-800">
                      Tháng {nextMonthDate.getMonth() + 1}, {nextMonthDate.getFullYear()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalDate(new Date(curYear, curMonth + 2, 1))}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <CalendarGrid
                    year={nextMonthDate.getFullYear()}
                    month={nextMonthDate.getMonth()}
                    startDate={startDate}
                    endDate={endDate}
                    onSelectDay={handleSelectDay}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/60 mt-auto">
                <button
                  type="button"
                  onClick={handleClearCustom}
                  className="text-xs font-bold text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  Xóa chọn
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200/70 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    disabled={!startDate}
                    className={`px-4 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs ${
                      startDate
                        ? 'bg-primary hover:bg-blue-700 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PortalPopover>
    </div>
  );
}
