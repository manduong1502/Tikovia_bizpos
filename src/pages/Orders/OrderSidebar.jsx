import { useState } from 'react';
import { ChevronRight, Calendar } from 'lucide-react';

export default function OrderSidebar({ filters, onFilterChange }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const set = (key, val) => onFilterChange({ ...filters, [key]: val });

  const applyDate = () => {
    set('dateFrom', dateFrom);
    onFilterChange(f => ({ ...f, dateTo }));
    setShowDatePicker(false);
  };

  return (
    <div className="w-[220px] shrink-0 flex flex-col gap-0 text-[13px]">
      {/* Thời gian */}
      <div className="mb-4">
        <span className="font-bold text-gray-800 text-sm block mb-2">Thời gian</span>
        <label className="flex items-center gap-2 cursor-pointer text-gray-700 mb-1.5 hover:text-blue-600">
          <input type="radio" name="time" checked={filters.timeMode === 'month'} onChange={() => set('timeMode', 'month')} className="accent-blue-600" />
          <span>Tháng này</span><ChevronRight size={14} className="ml-auto text-gray-400" />
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-blue-600">
          <input type="radio" name="time" checked={filters.timeMode === 'custom'} onChange={() => { set('timeMode', 'custom'); setShowDatePicker(true); }} className="accent-blue-600" />
          <span>Tùy chỉnh</span>
          <Calendar size={14} className="ml-auto text-gray-400 cursor-pointer" onClick={() => setShowDatePicker(!showDatePicker)} />
        </label>
        {showDatePicker && (
          <div className="mt-2 p-3 bg-white border rounded-lg shadow-lg text-xs">
            <div className="flex gap-2 mb-2">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded px-2 py-1 flex-1 text-xs" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded px-2 py-1 flex-1 text-xs" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDatePicker(false)} className="px-3 py-1 text-gray-500 border rounded hover:bg-gray-50">Bỏ qua</button>
              <button onClick={applyDate} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Áp dụng</button>
            </div>
          </div>
        )}
      </div>
      <hr className="border-gray-100 mb-3" />

      {/* Loại hóa đơn */}
      <div className="mb-4">
        <span className="font-bold text-gray-800 text-sm block mb-2">Loại hóa đơn</span>
        {['Không giao hàng', 'Giao hàng'].map(label => (
          <label key={label} className="flex items-center gap-2 mb-1.5 cursor-pointer text-gray-700">
            <input type="checkbox" defaultChecked className="accent-blue-600 rounded" />{label}
          </label>
        ))}
      </div>
      <hr className="border-gray-100 mb-3" />

      {/* Trạng thái hóa đơn */}
      <div className="mb-4">
        <span className="font-bold text-gray-800 text-sm block mb-2">Trạng thái hóa đơn</span>
        {[
          { label: 'Đang xử lý', val: 'processing' },
          { label: 'Hoàn thành', val: 'completed', checked: true },
          { label: 'Không giao được', val: 'failed' },
          { label: 'Đã hủy', val: 'cancelled' },
        ].map(s => (
          <label key={s.val} className="flex items-center gap-2 mb-1.5 cursor-pointer text-gray-700">
            <input type="checkbox" defaultChecked={s.checked} className="accent-blue-600 rounded"
              onChange={e => {
                if (e.target.checked && s.val === 'completed') set('status', '');
                else if (!e.target.checked && s.val === 'completed') set('status', 'cancelled');
              }}
            />{s.label}
          </label>
        ))}
      </div>
      <hr className="border-gray-100 mb-3" />

      {/* Trạng thái giao hàng */}
      <div className="mb-4">
        <span className="font-bold text-gray-800 text-sm block mb-2">Trạng thái giao hàng</span>
        <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-[13px] bg-white" onChange={e => set('deliveryStatus', e.target.value)}>
          <option value="">Chọn trạng thái</option>
          <option value="pending">Chờ giao</option>
          <option value="shipping">Đang giao</option>
          <option value="delivered">Đã giao</option>
        </select>
      </div>
      <hr className="border-gray-100 mb-3" />

      {/* Đối tác giao hàng */}
      <div className="mb-4">
        <span className="font-bold text-gray-800 text-sm block mb-2">Đối tác giao hàng</span>
        <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-[13px] bg-white">
          <option>Chọn đối tác giao hàng</option>
        </select>
      </div>
      <hr className="border-gray-100 mb-3" />

      {/* Thời gian giao hàng */}
      <div className="mb-2">
        <span className="font-bold text-gray-800 text-sm block mb-2">Thời gian giao hàng</span>
        <label className="flex items-center gap-2 mb-1.5 cursor-pointer text-gray-700">
          <input type="radio" name="delivery_time" defaultChecked className="accent-blue-600" />
          <span>Toàn thời gian</span><ChevronRight size={14} className="ml-auto text-gray-400" />
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-gray-700">
          <input type="radio" name="delivery_time" className="accent-blue-600" />
          <span>Tùy chỉnh</span><Calendar size={14} className="ml-auto text-gray-400" />
        </label>
      </div>
    </div>
  );
}
