import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function CustomerExportDebtModal({ open, onClose, onExport }) {
  const [timeRange, setTimeRange] = useState('all'); // all, today, this_week, this_month, last_month, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [columns, setColumns] = useState({
    detail: true, // Chi tiết từng hàng giao dịch
    unit: true, // ĐVT
    quantity: true, // Số lượng
    price: true, // Đơn giá
    discount: true, // Giảm giá
    importPrice: true, // Giá nhập/trả
    total: true, // Thành tiền
    note: true, // Ghi chú
  });

  if (!open) return null;

  const handleToggleColumn = (key) => {
    setColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    if (timeRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        toast.error('Vui lòng chọn đầy đủ thời gian Từ ngày và Đến ngày');
        return;
      }
      onExport({
        mode: 'custom',
        start: new Date(customStartDate),
        end: new Date(customEndDate)
      }, columns);
    } else {
      onExport(timeRange, columns);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-800">Xuất file công nợ</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-500 border-none bg-transparent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Time Range */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Thời gian</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: 'this_week', label: 'Tuần này' },
                { id: 'this_month', label: 'Tháng này' },
                { id: 'last_month', label: 'Tháng trước' },
                { id: 'all', label: 'Toàn thời gian' },
                { id: 'custom', label: 'Lựa chọn khác' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTimeRange(opt.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer border ${
                    timeRange === opt.id 
                      ? 'bg-primary text-white border-primary shadow-sm' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {timeRange === 'custom' && (
              <div className="mt-4 flex items-center gap-4 animate-fade-in p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Từ ngày</label>
                  <input 
                    type="date" 
                    value={customStartDate} 
                    onChange={e => setCustomStartDate(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Đến ngày</label>
                  <input 
                    type="date" 
                    value={customEndDate} 
                    onChange={e => setCustomEndDate(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export Info Selection */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">Thông tin xuất file</h3>
            <div className="text-xs text-gray-500 mb-4">
              Dữ liệu tổng quan (luôn có): Thời gian, Mã, Ghi nợ, Ghi có
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                <input type="checkbox" checked readOnly className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                <div>
                  <div className="text-sm font-bold text-gray-800">Chi tiết từng hàng giao dịch</div>
                  <div className="text-xs text-gray-500">Diễn giải chi tiết từng dòng sản phẩm/dịch vụ</div>
                </div>
              </div>
              
              <div className="p-4 pl-12 space-y-3 bg-white">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={columns.unit} onChange={() => handleToggleColumn('unit')} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">ĐVT</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={columns.quantity} onChange={() => handleToggleColumn('quantity')} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Số lượng</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={columns.price} onChange={() => handleToggleColumn('price')} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Đơn giá</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={columns.discount} onChange={() => handleToggleColumn('discount')} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Giảm giá</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={columns.importPrice} onChange={() => handleToggleColumn('importPrice')} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Giá nhập/trả</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={columns.total} onChange={() => handleToggleColumn('total')} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Thành tiền</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={columns.note} onChange={() => handleToggleColumn('note')} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">Ghi chú</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
          <Button variant="secondary" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white cursor-pointer hover:bg-gray-50 border-gray-200">
            Bỏ qua
          </Button>
          <Button variant="primary" onClick={handleExport} className="px-8 py-2.5 rounded-xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer border-none">
            Đồng ý
          </Button>
        </div>
      </div>
    </div>
  );
}
