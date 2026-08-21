import React, { useState, useRef } from 'react';
import PortalPopover from './PortalPopover';
import { ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react';

function formatDateVN(d) {
  if (!d || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateYMD(d) {
  if (!d || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

export default function ReportTimeFilter({
  timeRangeType = 'date',
  setTimeRangeType,
  selectedSingleDate = new Date(),
  setSelectedSingleDate,
  timeFrom = '',
  setTimeFrom,
  timeTo = '',
  setTimeTo,
  customFromDate = '',
  setCustomFromDate,
  customToDate = '',
  setCustomToDate
}) {
  const [openSingleCal, setOpenSingleCal] = useState(false);
  const [calViewDate, setCalViewDate] = useState(() => selectedSingleDate ? new Date(selectedSingleDate) : new Date());
  const singleDateRef = useRef(null);

  const [openCustomCal, setOpenCustomCal] = useState(false);
  const customDateRef = useRef(null);
  
  const [rangeStartDate, setRangeStartDate] = useState(() => {
    if (customFromDate) {
      const parts = customFromDate.split('-');
      if (parts.length === 3) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  });
  
  const [rangeEndDate, setRangeEndDate] = useState(() => {
    if (customToDate) {
      const parts = customToDate.split('-');
      if (parts.length === 3) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  });

  const [leftCalMonth, setLeftCalMonth] = useState(() => new Date());
  const [rightCalMonth, setRightCalMonth] = useState(() => {
    const nextM = new Date();
    nextM.setMonth(nextM.getMonth() + 1);
    return nextM;
  });

  // Single Calendar Cell Generator
  const renderSingleCalendarGrid = (viewDate, activeDate, onSelect) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const today = new Date();

    const cells = [];
    for (let i = 0; i < offset; i++) {
      cells.push(<div key={`prev-${i}`} className="text-center py-1.5 text-xs text-gray-300">{prevDays - offset + i + 1}</div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const cur = new Date(year, month, i);
      const isSelected = activeDate && cur.getDate() === activeDate.getDate() && cur.getMonth() === activeDate.getMonth() && cur.getFullYear() === activeDate.getFullYear();
      const isToday = cur.getDate() === today.getDate() && cur.getMonth() === today.getMonth() && cur.getFullYear() === today.getFullYear();
      cells.push(
        <button
          key={i}
          type="button"
          onClick={() => onSelect(cur)}
          style={isSelected ? { backgroundColor: '#1890ff', color: '#ffffff' } : {}}
          className={`w-8 h-8 mx-auto flex items-center justify-center text-xs cursor-pointer transition-all ${
            isSelected 
              ? 'bg-blue-600 text-white font-extrabold shadow-md rounded-full' 
              : isToday 
              ? 'border border-blue-500 text-blue-600 font-bold hover:bg-blue-50 rounded-full' 
              : 'text-gray-700 hover:bg-gray-100 rounded-full'
          }`}
        >
          {i}
        </button>
      );
    }
    const rem = (offset + daysInMonth) % 7;
    if (rem > 0) {
      for (let i = 1; i <= 7 - rem; i++) {
        cells.push(<div key={`next-${i}`} className="text-center py-1.5 text-xs text-gray-300">{i}</div>);
      }
    }
    return cells;
  };

  // Range Calendar Cell Generator
  const renderRangeCalendarGrid = (viewDate, startDate, endDate, onSelectDay) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = 0; i < offset; i++) {
      cells.push(<div key={`prev-${i}`} className="text-center py-1.5 text-xs text-gray-300">{prevDays - offset + i + 1}</div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const cur = new Date(year, month, i);

      const isStart = startDate && cur.getFullYear() === startDate.getFullYear() && cur.getMonth() === startDate.getMonth() && cur.getDate() === startDate.getDate();
      const isEnd = endDate && cur.getFullYear() === endDate.getFullYear() && cur.getMonth() === endDate.getMonth() && cur.getDate() === endDate.getDate();
      
      let inRange = false;
      if (startDate && endDate) {
        const cTime = new Date(year, month, i).getTime();
        const sTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
        const eTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
        const min = Math.min(sTime, eTime);
        const max = Math.max(sTime, eTime);
        inRange = cTime >= min && cTime <= max;
      }

      const isSelected = isStart || isEnd;

      cells.push(
        <button
          key={i}
          type="button"
          onClick={() => onSelectDay(cur)}
          style={
            isSelected 
              ? { backgroundColor: '#1890ff', color: '#ffffff', borderRadius: '9999px' } 
              : inRange 
              ? { backgroundColor: '#e6f7ff', color: '#1890ff' } 
              : {}
          }
          className={`w-8 h-8 mx-auto flex items-center justify-center text-xs font-semibold cursor-pointer transition-all ${
            isSelected
              ? 'bg-blue-600 text-white font-extrabold shadow-md rounded-full'
              : inRange
              ? 'bg-blue-100 text-blue-600 font-bold rounded-none'
              : 'text-gray-700 hover:bg-gray-100 rounded-full'
          }`}
        >
          {i}
        </button>
      );
    }
    const rem = (offset + daysInMonth) % 7;
    if (rem > 0) {
      for (let i = 1; i <= 7 - rem; i++) {
        cells.push(<div key={`next-${i}`} className="text-center py-1.5 text-xs text-gray-300">{i}</div>);
      }
    }
    return cells;
  };

  return (
    <div className="flex flex-col gap-2 select-none">
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Thời gian</label>
      
      {/* Radio 1: Theo ngày */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <input 
            type="radio" 
            name="reportTimeRangeType" 
            checked={timeRangeType === 'date'} 
            onChange={() => setTimeRangeType('date')}
            className="w-4 h-4 text-[#0077CC] focus:ring-[#0077CC] border-gray-300 cursor-pointer shrink-0"
          />
          
          {/* Single Date Picker Input Box */}
          <div className="relative flex-1" ref={singleDateRef}>
            <button 
              type="button"
              onClick={() => {
                setTimeRangeType('date');
                setOpenSingleCal(!openSingleCal);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded border text-xs font-semibold text-gray-700 transition-all cursor-pointer ${timeRangeType === 'date' ? 'border-[#0077CC] ring-1 ring-[#0077CC]/20 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <span>{formatDateVN(selectedSingleDate)}</span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>

            {/* Popover Single Date Calendar */}
            {openSingleCal && (
              <PortalPopover anchorEl={singleDateRef.current} open={openSingleCal} onClose={() => setOpenSingleCal(false)} widthMatch={false}>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 w-[290px] z-[10000] font-sans">
                  <div className="text-xs font-bold text-slate-800 border-b border-gray-100 pb-2.5 mb-3">
                    Chọn ngày: {formatDateVN(selectedSingleDate)}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <button 
                      type="button" 
                      onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() - 1, 1))}
                      className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs font-bold text-gray-800">
                      Tháng {calViewDate.getMonth() + 1} {calViewDate.getFullYear()}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setCalViewDate(new Date(calViewDate.getFullYear(), calViewDate.getMonth() + 1, 1))}
                      className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  
                  {/* Calendar Grid Header */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 mb-1">
                    <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {renderSingleCalendarGrid(calViewDate, selectedSingleDate, (d) => {
                      setSelectedSingleDate(d);
                      setCalViewDate(d);
                      setOpenSingleCal(false);
                    })}
                  </div>
                </div>
              </PortalPopover>
            )}
          </div>
        </div>

        {/* Side-by-side Time Pickers (Từ --:-- 🕒  Đến --:-- 🕒) */}
        {timeRangeType === 'date' && setTimeFrom && setTimeTo && (
          <div className="flex gap-2 items-center pl-6 animate-fade-in">
            <div className="flex-1 border border-gray-200 rounded px-2 py-1 bg-white flex items-center justify-between focus-within:border-[#0077CC]">
              <input 
                type="time" 
                value={timeFrom} 
                onChange={e => setTimeFrom(e.target.value)} 
                placeholder="Từ"
                className="w-full text-xs font-medium bg-transparent outline-none cursor-pointer text-center text-gray-700" 
              />
              <Clock size={13} className="text-gray-400 shrink-0 ml-0.5" />
            </div>
            <div className="flex-1 border border-gray-200 rounded px-2 py-1 bg-white flex items-center justify-between focus-within:border-[#0077CC]">
              <input 
                type="time" 
                value={timeTo} 
                onChange={e => setTimeTo(e.target.value)} 
                placeholder="Đến"
                className="w-full text-xs font-medium bg-transparent outline-none cursor-pointer text-center text-gray-700" 
              />
              <Clock size={13} className="text-gray-400 shrink-0 ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Radio 2: Tùy chỉnh */}
      <div className="flex items-center gap-2">
        <input 
          type="radio" 
          name="reportTimeRangeType" 
          checked={timeRangeType === 'custom'} 
          onChange={() => setTimeRangeType('custom')}
          className="w-4 h-4 text-[#0077CC] focus:ring-[#0077CC] border-gray-300 cursor-pointer shrink-0"
        />
        <div className="relative flex-1" ref={customDateRef}>
          <button 
            type="button"
            onClick={() => {
              setTimeRangeType('custom');
              if (customFromDate) {
                const parts = customFromDate.split('-');
                if (parts.length === 3) {
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                  setRangeStartDate(d);
                  setLeftCalMonth(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
                }
              }
              if (customToDate) {
                const parts = customToDate.split('-');
                if (parts.length === 3) {
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                  setRangeEndDate(d);
                  setRightCalMonth(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
                }
              }
              setOpenCustomCal(!openCustomCal);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded border text-xs font-semibold text-gray-700 transition-all cursor-pointer ${timeRangeType === 'custom' ? 'border-[#0077CC] ring-1 ring-[#0077CC]/20 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <span className="truncate">
              {customFromDate && customToDate 
                ? `${customFromDate.split('-').reverse().join('/')} - ${customToDate.split('-').reverse().join('/')}` 
                : 'Tùy chỉnh'}
            </span>
            <Calendar size={14} className="text-gray-400 shrink-0" />
          </button>

          {/* Popover Custom Range Dual Calendar */}
          {openCustomCal && (
            <PortalPopover anchorEl={customDateRef.current} open={openCustomCal} onClose={() => setOpenCustomCal(false)} widthMatch={false}>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 w-[560px] max-w-[95vw] z-[10000] font-sans">
                
                {/* Header text */}
                <div className="text-xs font-bold text-slate-700 mb-4">
                  Từ ngày: <span className="text-slate-900 font-extrabold">{formatDateVN(rangeStartDate)}</span> - Đến ngày: <span className="text-slate-900 font-extrabold">{formatDateVN(rangeEndDate)}</span>
                </div>

                {/* Dual Side-by-Side Calendars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                  
                  {/* Left Calendar Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <button 
                        type="button" 
                        onClick={() => setLeftCalMonth(new Date(leftCalMonth.getFullYear(), leftCalMonth.getMonth() - 1, 1))}
                        className="p-1 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs font-bold text-gray-800">
                        Tháng {leftCalMonth.getMonth() + 1} {leftCalMonth.getFullYear()}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setLeftCalMonth(new Date(leftCalMonth.getFullYear(), leftCalMonth.getMonth() + 1, 1))}
                        className="p-1 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 mb-1">
                      <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {renderRangeCalendarGrid(leftCalMonth, rangeStartDate, rangeEndDate, (d) => {
                        if (!rangeStartDate || (rangeStartDate && rangeEndDate && rangeStartDate.getTime() !== rangeEndDate.getTime())) {
                          setRangeStartDate(d);
                          setRangeEndDate(d);
                        } else if (d < rangeStartDate) {
                          setRangeEndDate(rangeStartDate);
                          setRangeStartDate(d);
                        } else {
                          setRangeEndDate(d);
                        }
                      })}
                    </div>
                  </div>

                  {/* Right Calendar Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <button 
                        type="button" 
                        onClick={() => setRightCalMonth(new Date(rightCalMonth.getFullYear(), rightCalMonth.getMonth() - 1, 1))}
                        className="p-1 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs font-bold text-gray-800">
                        Tháng {rightCalMonth.getMonth() + 1} {rightCalMonth.getFullYear()}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setRightCalMonth(new Date(rightCalMonth.getFullYear(), rightCalMonth.getMonth() + 1, 1))}
                        className="p-1 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 mb-1">
                      <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {renderRangeCalendarGrid(rightCalMonth, rangeStartDate, rangeEndDate, (d) => {
                        if (!rangeStartDate || (rangeStartDate && rangeEndDate && rangeStartDate.getTime() !== rangeEndDate.getTime())) {
                          setRangeStartDate(d);
                          setRangeEndDate(d);
                        } else if (d < rangeStartDate) {
                          setRangeEndDate(rangeStartDate);
                          setRangeStartDate(d);
                        } else {
                          setRangeEndDate(d);
                        }
                      })}
                    </div>
                  </div>

                </div>

                {/* Footer Bar matching KiotViet exact buttons */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3.5 mt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setRangeStartDate(now);
                      setRangeEndDate(now);
                    }}
                    style={{ color: '#1890ff' }}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    Hôm nay
                  </button>

                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setOpenCustomCal(false)}
                      className="px-3.5 py-1.5 rounded border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 cursor-pointer"
                    >
                      Bỏ qua
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (rangeStartDate && rangeEndDate) {
                          const sStr = formatDateYMD(rangeStartDate);
                          const eStr = formatDateYMD(rangeEndDate);
                          setCustomFromDate(sStr <= eStr ? sStr : eStr);
                          setCustomToDate(sStr <= eStr ? eStr : sStr);
                        }
                        setOpenCustomCal(false);
                      }}
                      style={{ backgroundColor: '#1890ff' }}
                      className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>

              </div>
            </PortalPopover>
          )}
        </div>
      </div>
    </div>
  );
}
export { formatDateVN, formatDateYMD };
