import { X, Printer } from 'lucide-react';
import Button from '../ui/Button';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function PaymentDetailModal({ open, onClose, data, partnerName }) {
  if (!open || !data) return null;

  const isIncome = data.cashbookType === 'INCOME';
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold text-gray-800 tracking-tight">{isIncome ? 'Phiếu thu' : 'Phiếu chi'}</h2>
            <span className="font-bold text-gray-600">{data.code}</span>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-100 text-green-700">Đã thanh toán</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"><X size={20} className="text-gray-400" /></button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-[13px] bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div><span className="text-gray-500 block mb-1">Mã phiếu:</span><span className="font-bold text-gray-800">{data.code}</span></div>
            <div><span className="text-gray-500 block mb-1">Thời gian:</span><span className="font-bold text-gray-800">{new Date(data.date).toLocaleString('vi-VN')}</span></div>
            <div><span className="text-gray-500 block mb-1">Phương thức:</span><span className="font-bold text-gray-800">Tiền mặt</span></div>
            <div><span className="text-gray-500 block mb-1">Đối tác:</span><span className="font-bold text-primary">{partnerName || '---'}</span></div>
            <div><span className="text-gray-500 block mb-1">Tổng tiền:</span><span className="font-extrabold text-primary text-base">{fmt(Math.abs(data.total || data.paid))}</span></div>
          </div>
          
          <div>
            <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Ghi chú</label>
            <div className="w-full min-h-[60px] border border-gray-200 rounded-lg px-3.5 py-2.5 text-[13px] text-gray-600 bg-gray-50 cursor-not-allowed">
              Thanh toán công nợ
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 mt-auto">
          <Button variant="secondary" className="flex items-center gap-1.5 font-bold shadow-sm" onClick={onClose}><Printer size={16} /> In phiếu</Button>
          <Button variant="primary" onClick={onClose} className="shadow-md bg-gradient-to-r from-primary to-blue-600 border-none px-6">Đóng</Button>
        </div>
      </div>
    </div>
  );
}
