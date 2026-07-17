import { X, Printer, RotateCcw, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { purchaseOrderAPI } from '../../services/api';
import toast from 'react-hot-toast';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function PurchaseOrderDetailModal({ open, onClose, data, partnerName, onRefresh }) {
  const navigate = useNavigate();
  if (!open || !data) return null;

  const handleCancel = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy phiếu nhập ${data.code} này? Giao dịch này sẽ bị hủy hoàn toàn, tồn kho và công nợ sẽ được hoàn lại.`)) {
      return;
    }
    try {
      const realId = typeof data.id === 'string' ? parseInt(data.id.split('-')[0], 10) : data.id;
      await purchaseOrderAPI.cancel(realId);
      toast.success('Hủy phiếu nhập hàng thành công');
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Hủy phiếu nhập hàng thất bại');
    }
  };

  const items = data.items || [];
  const statusLabels = {
    'paid': { text: 'Đã thanh toán', bg: 'bg-green-100', color: 'text-green-700' },
    'COMPLETED': { text: 'Hoàn thành', bg: 'bg-green-100', color: 'text-green-700' },
    'partial': { text: 'Thanh toán 1 phần', bg: 'bg-yellow-100', color: 'text-yellow-700' },
    'PENDING': { text: 'Phiếu tạm', bg: 'bg-yellow-100', color: 'text-yellow-700' },
    'unpaid': { text: 'Chưa thanh toán', bg: 'bg-red-100', color: 'text-red-700' },
    'CANCELLED': { text: 'Đã hủy', bg: 'bg-red-100', color: 'text-red-700' },
  };

  const status = statusLabels[data.status] || { text: data.status, bg: 'bg-gray-100', color: 'text-gray-700' };
  const totalQty = items.reduce((s, it) => s + (it.quantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold text-gray-800 tracking-tight">Phiếu nhập hàng</h2>
            <span className="font-bold text-gray-600">{data.code}</span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded ${status.bg} ${status.color}`}>
              {status.text}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"><X size={20} className="text-gray-400" /></button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[13px]">
            <div><span className="text-gray-500 block">Ngày nhập:</span><span className="font-bold text-gray-800">{new Date(data.date || data.createdAt || data.created_at).toLocaleString('vi-VN')}</span></div>
            <div><span className="text-gray-500 block">Tên NCC:</span><span className="font-bold text-primary">{partnerName || '---'}</span></div>
            <div><span className="text-gray-500 block">Chi nhánh:</span><span className="font-bold text-gray-800">Chi nhánh trung tâm</span></div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3">Mã hàng</th>
                  <th className="p-3">Tên hàng</th>
                  <th className="p-3 text-right">Số lượng</th>
                  <th className="p-3 text-right">Đơn giá</th>
                  <th className="p-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30">
                    <td className="p-3 text-center text-gray-400">{idx + 1}</td>
                    <td className="p-3 text-primary font-bold">{it.product?.sku || it.product_sku || it.sku || '---'}</td>
                    <td className="p-3 text-gray-800">{it.product?.name || it.product_name || it.name || '---'} {it.product?.unit || it.unit ? `(${it.product?.unit || it.unit})` : ''}</td>
                    <td className="p-3 text-right">{fmt(it.quantity)}</td>
                    <td className="p-3 text-right">{fmt(it.unit_price || it.price)}</td>
                    <td className="p-3 text-right font-bold text-primary">{fmt((it.quantity || 0) * (it.unit_price || it.price || 0))}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-400">Không có mặt hàng nào</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-16 text-[13px]">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between gap-8"><span className="text-gray-500">Số lượng mặt hàng</span><span className="font-bold">{items.length}</span></div>
              <div className="flex justify-between gap-8"><span className="text-gray-500">Tổng số lượng</span><span className="font-bold">{totalQty}</span></div>
              <div className="flex justify-between gap-8"><span className="text-gray-500">Tổng tiền hàng</span><span className="font-bold">{fmt(Math.abs(data.total))}</span></div>
              <div className="flex justify-between gap-8"><span className="text-gray-500">Tiền đã trả NCC</span><span className="font-bold text-primary">{fmt(data.paid)}</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
          <div>
            {data.status !== 'CANCELLED' && data.status !== 'cancelled' && (
              <button 
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md border-none"
              >
                Hủy phiếu
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {data.status !== 'CANCELLED' && (
              <Button
                variant="secondary"
                className="flex items-center gap-1.5 font-bold shadow-sm text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  onClose();
                  navigate(`/purchase-returns/create?poId=${data.id}`);
                }}
              >
                <RotateCcw size={16} /> Trả hàng
              </Button>
            )}
            <Button
              variant="primary"
              className="flex items-center gap-1.5 font-bold shadow-sm bg-primary hover:bg-primary-hover text-white border-none"
              onClick={() => {
                onClose();
                navigate('/purchase-orders', { state: { openOrderCode: data.code } });
              }}
            >
              <FolderOpen size={16} /> Mở phiếu
            </Button>
            <Button variant="secondary" className="flex items-center gap-1.5 font-bold shadow-sm" onClick={onClose}><Printer size={16} /> In phiếu</Button>
            <Button variant="primary" onClick={onClose} className="shadow-md bg-gradient-to-r from-primary to-blue-600 border-none px-6">Đóng</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
