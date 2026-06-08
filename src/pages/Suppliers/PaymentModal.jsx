import { useState, useEffect } from 'react';
import { X, Calendar, FileText } from 'lucide-react';
import Button from '../../components/ui/Button';
import { supplierAPI, cashbookAPI, purchaseOrderAPI } from '../../services/api';
import api from '../../services/api'; // using default api
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Number(n || 0));

const toLocalISOString = (dateOrStr) => {
  const d = dateOrStr ? new Date(dateOrStr) : new Date();
  if (isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function PaymentModal({ open, onClose, supplier, purchaseOrders = [], onSaved }) {
  const [paymentDate, setPaymentDate] = useState('');
  const [createdBy, setCreatedBy] = useState('Võ Thành Huy');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [allocate, setAllocate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState({});

  useEffect(() => {
    if (open && supplier) {
      setAmount('');
      setNote('');
      setPaymentDate(toLocalISOString(new Date()));
      setAllocate(true);
      setAllocations({});
    }
  }, [open, supplier]);

  // Auto-allocate when amount changes or allocate is toggled
  useEffect(() => {
    if (open && supplier && allocate) {
      let remaining = Number(amount || 0);
      const newAlloc = {};
      purchaseOrders.forEach(po => {
        const poDebt = po.total - (po.paid_amount || po.paid || 0);
        if (remaining > 0 && poDebt > 0) {
          const alloc = Math.min(remaining, poDebt);
          newAlloc[po.id] = alloc;
          remaining -= alloc;
        } else {
          newAlloc[po.id] = 0;
        }
      });
      setAllocations(newAlloc);
    } else {
      setAllocations({});
    }
  }, [amount, allocate, purchaseOrders, open, supplier]);

  const handleAllocationChange = (poId, value) => {
    let num = Number(value.replace(/[^0-9.-]+/g, '')) || 0;
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    const poDebt = po.total - (po.paid_amount || po.paid || 0);
    if (num < 0) num = 0;
    if (num > poDebt) num = poDebt;

    const newAlloc = { ...allocations, [poId]: num };
    setAllocations(newAlloc);

    const newTotal = Object.values(newAlloc).reduce((sum, val) => sum + val, 0);
    setAmount(newTotal > 0 ? String(newTotal) : '');
  };

  if (!open || !supplier) return null;

  const currentDebt = Number(supplier.debt || supplier.totalDebt || 0);
  const payAmount = Number(amount || 0);
  const remainingDebt = currentDebt - payAmount;

  const handleSave = async (shouldPrint = false) => {
    if (!payAmount || payAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    setLoading(true);
    try {
      let allocatedSum = 0;

      // Update allocated purchase orders first
      if (allocate && purchaseOrders.length > 0) {
        for (const po of purchaseOrders) {
          const alloc = Number(allocations[po.id] || 0);
          if (alloc > 0) {
            allocatedSum += alloc;
            const newPaid = (po.paid_amount || po.paid || 0) + alloc;
            await purchaseOrderAPI.update(po.id, {
              ...po,
              paid: newPaid,
              status: newPaid >= po.total ? 'COMPLETED' : po.status
            });
          }
        }
      }

      // Calculate the unallocated remainder
      const unallocatedAmount = payAmount - allocatedSum;
      const cashbookCode = `PTM${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 100)}`;

      // Create a cashbook entry for the payment
      // If we are online, the backend updates to purchase orders will automatically generate cashbook entries for those POs.
      // So we only manually create a cashbook entry for the unallocated portion.
      if (unallocatedAmount > 0 || !allocate) {
        const payload = {
          code: cashbookCode,
          type: 'EXPENSE',
          amount: allocate ? unallocatedAmount : payAmount,
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
          await cashbookAPI.create(payload);
        } catch(e) {
          console.warn('Cashbook API might not exist yet:', e);
        }
      }

      // Update supplier debt to the exact final debt amount absolutely.
      // This is safe in both online and offline modes since it overwrites the absolute debt value.
      await supplierAPI.update(supplier.id, {
        ...supplier,
        debt: currentDebt - payAmount
      });

      toast.success('Thanh toán thành công');
      onSaved();

      if (shouldPrint) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Phiếu chi - ${cashbookCode}</title>
                <style>
                  body { font-family: sans-serif; padding: 20px; color: #333; }
                  h2 { border-bottom: 2px solid #ef4444; padding-bottom: 8px; color: #b91c1c; text-align: center; }
                  .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                  .info-table td { padding: 8px 12px; border: 1px solid #e5e7eb; }
                  .info-table td.label { font-weight: bold; background-color: #f9fafb; width: 30%; }
                  .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
                  .signature-box { text-align: center; width: 45%; }
                </style>
              </head>
              <body>
                <h2>PHIẾU CHI</h2>
                <div style="text-align: center; margin-bottom: 20px;">Mã phiếu: ${cashbookCode} | Ngày chi: ${new Date(paymentDate || new Date()).toLocaleString('vi-VN')}</div>
                <table class="info-table">
                  <tr><td class="label">Người nhận</td><td>${supplier.name}</td></tr>
                  <tr><td class="label">Địa chỉ</td><td>${supplier.address || '---'}</td></tr>
                  <tr><td class="label">Số tiền</td><td><strong>${fmt(payAmount)} VNĐ</strong></td></tr>
                  <tr><td class="label">Phương thức</td><td>${paymentMethod === 'cash' ? 'Tiền mặt' : paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Thẻ tín dụng'}</td></tr>
                  <tr><td class="label">Lý do chi</td><td>${note || `Thanh toán nợ cho nhà cung cấp ${supplier.name}`}</td></tr>
                  <tr><td class="label">Người lập phiếu</td><td>${createdBy}</td></tr>
                </table>
                <div class="signatures">
                  <div class="signature-box">
                    <strong>Người nhận</strong><br/>(Ký, họ tên)
                  </div>
                  <div class="signature-box">
                    <strong>Thủ quỹ</strong><br/>(Ký, họ tên)
                  </div>
                </div>
                <script>
                  window.onload = function() { window.print(); window.close(); }
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      }
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
                      const poDebt = po.total - (po.paid_amount || po.paid || 0);
                      const allocVal = allocations[po.id] || 0;
                      const remainingPoDebt = poDebt - allocVal;
                      return (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 text-primary font-bold">{po.po_code || po.code}</td>
                        <td className="p-3 text-gray-500">
                          {po.created_at || po.createdAt
                            ? new Date(po.created_at || po.createdAt).toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : '---'}
                        </td>
                        <td className="p-3 text-right">{fmt(po.total)}</td>
                        <td className="p-3 text-right">{fmt(po.paid_amount || po.paid || 0)}</td>
                        <td className="p-3 text-right text-gray-800 font-bold">{fmt(poDebt)}</td>
                        <td className="p-3 text-right">
                          <input
                            type="text"
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-xs text-right focus:border-primary outline-none font-bold text-primary bg-blue-50/30"
                            value={allocVal > 0 ? fmt(allocVal) : ''}
                            onChange={(e) => handleAllocationChange(po.id, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-red-600">{fmt(remainingPoDebt)}</td>
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
          <Button variant="secondary" onClick={() => handleSave(true)} disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white cursor-pointer hover:bg-gray-50 border-gray-200">
            Tạo phiếu chi & In
          </Button>
          <Button variant="primary" onClick={() => handleSave(false)} disabled={loading} className="px-8 py-2.5 rounded-xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer border-none bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? 'Đang lưu...' : 'Tạo phiếu chi'}
          </Button>
        </div>
      </div>
    </div>
  );
}
