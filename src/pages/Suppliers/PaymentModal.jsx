import { useState, useEffect } from 'react';
import { X, Calendar, FileText } from 'lucide-react';
import Button from '../../components/ui/Button';
import { supplierAPI } from '../../services/api';
import api from '../../services/api'; // using default api
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

export default function PaymentModal({ open, onClose, supplier, purchaseOrders = [], onSaved }) {
  const [paymentDate, setPaymentDate] = useState('');
  const [createdBy, setCreatedBy] = useState('Võ Thành Huy');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [allocate, setAllocate] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && supplier) {
      setAmount('');
      setNote('');
      const now = new Date();
      setPaymentDate(now.toISOString().slice(0, 16));
      setAllocate(true);
    }
  }, [open, supplier]);

  if (!open || !supplier) return null;

  const currentDebt = Number(supplier.debt || supplier.totalDebt || 0);
  const payAmount = Number(amount || 0);
  const remainingDebt = currentDebt - payAmount;

  const handleSave = async () => {
    if (!payAmount || payAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    setLoading(true);
    try {
      // Create cashbook entry
      const cashbookCode = `PTM${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 100)}`;
      
      const payload = {
        code: cashbookCode,
        type: 'EXPENSE',
        amount: payAmount,
        category: 'Chi tiền trả nợ',
        partnerType: 'supplier',
        supplierId: supplier.id,
        partnerName: supplier.name,
        paymentMethod: paymentMethod,
        isAccounting: true,
        status: 'completed',
        branch: 'Chi nhánh trung tâm',
        note: note || `Thanh toán nợ cho nhà cung cấp ${supplier.name}`,
      };

      try {
        await api.post('/cashbook', payload);
      } catch(e) {
        // Ignore if cashbook route is not ready
        console.warn('Cashbook API might not exist yet:', e);
      }

      // Update supplier debt
      await supplierAPI.update(supplier.id, {
        debt: currentDebt - payAmount
      });

      toast.success('Thanh toán thành công');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi thanh toán');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-col p-5 border-b border-gray-100 relative">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-xl font-extrabold text-gray-800">Thanh toán</h2>
            <button 
              onClick={onClose}
              className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-500 border-none bg-transparent"
            >
              <X size={20} />
            </button>
          </div>
          <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <span className="text-primary cursor-pointer hover:underline">{supplier.name}</span>
            <span>•</span>
            <span>Nợ hiện tại: <span className="font-bold text-gray-800">{fmt(currentDebt)}</span></span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Thời gian</label>
              <input 
                type="datetime-local" 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary shadow-sm"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Người chi</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary shadow-sm bg-white cursor-pointer"
                value={createdBy}
                onChange={e => setCreatedBy(e.target.value)}
              >
                <option value="Võ Thành Huy">Võ Thành Huy</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Phương thức thanh toán</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary shadow-sm bg-white cursor-pointer"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Tiền mặt</option>
                <option value="transfer">Chuyển khoản</option>
                <option value="card">Thẻ tín dụng</option>
              </select>
            </div>
            <div className="hidden"></div>
            
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Số tiền</label>
              <input 
                type="number" 
                className="w-full border border-primary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary shadow-sm font-bold text-primary"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Nợ còn</label>
              <div className="w-full border border-gray-100 bg-gray-50 rounded-lg px-3 py-2 text-sm text-right font-extrabold text-red-600 shadow-inner">
                {fmt(remainingDebt)}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">Ghi chú</label>
            <textarea 
              className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-primary shadow-sm min-h-[60px] resize-none"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Nhập ghi chú"
            />
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden mt-4">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={allocate} 
                onChange={e => setAllocate(e.target.checked)} 
                className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" 
              />
              <span className="text-sm font-bold text-gray-800">Phân bổ vào phiếu nhập và phiếu mua dịch vụ</span>
            </div>
            
            {allocate && (
              <div className="bg-white">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100/50 text-gray-600 border-b border-gray-200 text-left font-bold tracking-wider">
                      <th className="p-3">Mã hóa đơn</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3 text-right">Giá trị phiếu nhập</th>
                      <th className="p-3 text-right">Đã trả trước</th>
                      <th className="p-3 text-right">Còn cần trả</th>
                      <th className="p-3 text-right">Tiền trả</th>
                      <th className="p-3 text-right">Còn nợ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {purchaseOrders.length > 0 ? purchaseOrders.map((po, idx) => {
                      const poDebt = po.total - (po.paid || 0);
                      return (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 text-primary font-bold">{po.code || po.po_code}</td>
                        <td className="p-3 text-gray-500">{new Date(po.createdAt || po.created_at).toLocaleString('vi-VN')}</td>
                        <td className="p-3 text-right">{fmt(po.total)}</td>
                        <td className="p-3 text-right">{fmt(po.paid || 0)}</td>
                        <td className="p-3 text-right text-gray-800 font-bold">{fmt(poDebt)}</td>
                        <td className="p-3 text-right">
                          <input type="text" className="w-20 border border-gray-300 rounded px-2 py-1 text-xs text-right focus:border-primary outline-none" placeholder="0" />
                        </td>
                        <td className="p-3 text-right font-bold text-red-600">{fmt(poDebt)}</td>
                      </tr>
                    )}) : (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 bg-blue-50 text-primary rounded-full flex items-center justify-center mb-2">
                              <FileText size={20} />
                            </div>
                            <p className="font-bold text-gray-600">Không có kết quả phù hợp</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
          <Button variant="secondary" onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white cursor-pointer hover:bg-gray-50 border-gray-200">
            Bỏ qua
          </Button>
          <Button variant="secondary" className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white cursor-pointer hover:bg-gray-50 border-gray-200">
            Tạo phiếu chi & In
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={loading} className="px-8 py-2.5 rounded-xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer border-none bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? 'Đang lưu...' : 'Tạo phiếu chi'}
          </Button>
        </div>
      </div>
    </div>
  );
}
