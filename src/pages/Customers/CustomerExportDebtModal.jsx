import { useState } from 'react';
import { X } from 'lucide-react';

export default function CustomerExportDebtModal({ open, onClose, onExport }) {
  const [timeRange, setTimeRange] = useState('all');
  const [columns, setColumns] = useState({
    detail: true,
    unit: true,
    quantity: true,
    price: true,
    discount: true,
    importPrice: true,
    total: true,
    note: true
  });

  if (!open) return null;

  const toggleColumn = (key) => {
    setColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    onExport(timeRange, columns);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-800 tracking-tight">Xuất file công nợ</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          {/* Time Range */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Thời gian</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'today', label: 'Hôm nay' },
                { key: 'this_week', label: 'Tuần này' },
                { key: 'this_month', label: 'Tháng này' },
                { key: 'last_month', label: 'Tháng trước' },
                { key: 'all', label: 'Toàn thời gian' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTimeRange(t.key)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    timeRange === t.key
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Column Selection */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">Thông tin xuất file</h3>
            <p className="text-xs text-gray-500 mb-3">Dữ liệu tổng quan (luôn có): Thời gian, Mã, Ghi nợ, Ghi có</p>

            <label className="flex items-center gap-3 p-3 bg-blue-50/40 border border-blue-100 rounded-xl mb-3 cursor-pointer">
              <input type="checkbox" checked={columns.detail} onChange={() => toggleColumn('detail')} className="w-4 h-4 text-primary rounded border-gray-300" />
              <div>
                <span className="text-sm font-bold text-gray-800">Chi tiết từng hàng giao dịch</span>
                <p className="text-xs text-gray-500">Diễn giải chi tiết từng dòng sản phẩm/dịch vụ</p>
              </div>
            </label>

            <div className="grid grid-cols-1 gap-2 pl-4">
              {[
                { key: 'unit', label: 'ĐVT' },
                { key: 'quantity', label: 'Số lượng' },
                { key: 'price', label: 'Đơn giá' },
                { key: 'discount', label: 'Giảm giá' },
                { key: 'total', label: 'Thành tiền' },
                { key: 'note', label: 'Ghi chú' },
              ].map(col => (
                <label key={col.key} className="flex items-center gap-3 cursor-pointer py-1">
                  <input type="checkbox" checked={columns[col.key]} onChange={() => toggleColumn(col.key)} className="w-4 h-4 text-primary rounded border-gray-300" />
                  <span className="text-sm text-gray-700 font-medium">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
          <button onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            Bỏ qua
          </button>
          <button onClick={handleExport} className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-lg shadow-md transition-all cursor-pointer">
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
