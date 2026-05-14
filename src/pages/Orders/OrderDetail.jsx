import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Copy, Download, Pencil, Save, RotateCcw, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { orderAPI } from '../../services/api';
import { copyToClipboard, printHTML } from '../../utils/exportUtils';

const fmt = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
const PAY_LABEL = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Quẹt thẻ' };

function Badge({ status }) {
  const map = { completed: 'bg-green-100 text-green-700', paid: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500', partial: 'bg-yellow-100 text-yellow-700', unpaid: 'bg-red-100 text-red-600' };
  const labels = { completed: 'Hoàn thành', paid: 'Hoàn thành', cancelled: 'Đã hủy', partial: '1 phần', unpaid: 'Chưa TT' };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>{labels[status] || status}</span>;
}

export default function OrderDetail({ order, onReload, onClose }) {
  const o = order;
  const [tab, setTab] = useState('info');
  const items = o._items || [];
  const navigate = useNavigate();

  const handleCancel = async () => {
    if (o.status === 'cancelled') return toast.error('Đã hủy rồi');
    if (!confirm(`Hủy hóa đơn ${o.order_code}?`)) return;
    try { await orderAPI.cancel(o.id); toast.success('Hủy thành công'); onReload(); onClose(); } catch {}
  };

  const handleCopy = async () => {
    await copyToClipboard(o.order_code);
    toast.success(`Đã sao chép: ${o.order_code}`);
  };

  const handleSaveNote = async () => {
    const note = document.querySelector(`textarea[data-oid="${o.id}"]`)?.value || '';
    try { await orderAPI.update(o.id, { note }); toast.success('Lưu ghi chú thành công'); } catch {}
  };

  const handleReturn = async () => {
    if (o.status === 'cancelled') return toast.error('Không thể trả hàng');
    const reason = prompt('Lý do trả hàng:');
    if (!reason) return;
    try { await orderAPI.return(o.id, { reason }); toast.success('Trả hàng thành công'); onReload(); onClose(); } catch {}
  };

  const handlePrint = () => {
    const f = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
    const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '';
    const customerName = o.customer_name || 'Người mua không cung cấp thông tin';

    const invoiceHTML = `
      <style>
        .inv-wrap { width: 100%; max-width: 800px; margin: 0 auto; font-family: 'Inter', Arial, sans-serif; color: #000; line-height: 1.5; padding: 20px; box-sizing: border-box; }
        .inv-company { font-size: 16px; margin: 8px 0; text-transform: uppercase; }
        .inv-info { font-size: 13px; margin: 3px 0; }
        .inv-header-text { font-size: 18px; font-weight: bold; text-decoration: underline; margin: 0; }
        .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        .inv-table th, .inv-table td { padding: 8px 6px; border: 1px solid #000; }
        .inv-totals { width: 320px; border-collapse: collapse; font-size: 13px; margin-left: auto; }
        .inv-totals td { padding: 4px 0; text-align: right; }
        .inv-totals td:first-child { padding-right: 10px; }
        @media print and (max-width: 140mm) {
          .inv-wrap { padding: 0; }
          .inv-company { font-size: 13px; }
          .inv-info { font-size: 11px; }
          .inv-header-text { font-size: 15px; }
          .inv-table { font-size: 11px; }
          .inv-table th, .inv-table td { padding: 4px 2px; }
          .inv-totals { width: 100%; font-size: 11px; }
          .hide-on-narrow { display: none !important; }
        }
      </style>
      <div class="inv-wrap">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="margin-bottom: 10px;">
            <img src="${window.location.origin}/logovuong.png" alt="TIKOVIA" style="height: 60px; object-fit: contain; margin-bottom: 5px;" />
          </div>
          <h2 class="inv-company">CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ TIKOVIA</h2>
          <p class="inv-info">ĐC: Thửa đất số 382, Tờ bản đồ số 38, Thôn Quang Châu, P.Hòa Xuân, TP.Đà Nẵng, Việt Nam</p>
          <p class="inv-info">Điện Thoại : 0796.637.194</p>
          <p class="inv-info">Chủ TK : <strong>CÔNG TY TNHH TM VÀ DV TIKOVIA</strong></p>
          <p class="inv-info">Số TK : <strong>8282688686 ( MB BANK )</strong></p>
        </div>
        <div style="text-align: center; margin-bottom: 25px;">
          <h3 class="inv-header-text">HÓA ĐƠN BÁN HÀNG</h3>
          <p class="inv-info" style="font-weight: 500;">${o.order_code} - ${dateStr}</p>
        </div>
        <div style="margin-bottom: 15px;">
          <p class="inv-info">Khách hàng: ${customerName}</p>
        </div>
        <table class="inv-table">
          <thead><tr>
            <th style="text-align:left;font-weight:bold">Mặt hàng</th>
            <th style="text-align:center;font-weight:bold">SL</th>
            <th class="hide-on-narrow" style="text-align:center;font-weight:bold">ĐVT</th>
            <th style="text-align:right;font-weight:bold">Giá</th>
            <th style="text-align:right;font-weight:bold">T.Tiền</th>
          </tr></thead>
          <tbody>
            ${items.map(it => {
              const price = Number(it.unit_price || 0) - Number(it.discount || 0);
              const total = Number(it.total || price * it.quantity);
              return '<tr><td>' + (it.product_name || '') + '</td><td style="text-align:center">' + it.quantity + '</td><td class="hide-on-narrow" style="text-align:center">Cái</td><td style="text-align:right">' + f(price) + '</td><td style="text-align:right">' + f(total) + '</td></tr>';
            }).join('')}
          </tbody>
        </table>
        <div style="margin-bottom: 30px;">
          <table class="inv-totals"><tbody>
            <tr><td>Tổng đơn hàng:</td><td>${f(o.total)}</td></tr>
            <tr><td>Khách đã trả:</td><td>${f(o.paid_amount)}</td></tr>
            <tr><td style="padding-top:10px;font-weight:bold">Chữ ký Khách Hàng :</td><td></td></tr>
            <tr><td style="font-weight:bold">Ghi chú :</td><td style="font-style:italic;color:#444">${o.note || ''}</td></tr>
          </tbody></table>
        </div>
        <div style="text-align:center;margin-top:30px;font-style:italic" class="inv-info"><p>Cảm ơn và hẹn gặp lại!</p></div>
      </div>
    `;
    printHTML(invoiceHTML, 'In Hóa Đơn');
  };

  return (
    <td colSpan={10} className="p-0 border-x-2 border-b-2 border-blue-100 bg-white" onClick={e => e.stopPropagation()}>
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-100 px-6">
        {['info', 'payment'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-[13px] border-b-2 cursor-pointer ${tab === t ? 'text-blue-600 border-blue-600 font-bold' : 'text-gray-500 border-transparent hover:text-gray-800'}`}>
            {t === 'info' ? 'Thông tin' : 'Lịch sử thanh toán'}
          </button>
        ))}
      </div>

      {tab === 'info' ? (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-800">{o.customer_name || 'Khách lẻ'}</span>
              <span className="text-sm text-blue-600 font-semibold">{o.order_code}</span>
              <Badge status={o.payment_status || o.status} />
            </div>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded">Chi nhánh trung tâm</span>
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-3 gap-4 px-6 py-3 text-[13px] border-b border-gray-50 bg-gray-50/30">
            <div><span className="text-gray-500">Người tạo:</span> <span className="font-medium">{o.user_name || 'Admin'}</span></div>
            <div><span className="text-gray-500">Người bán:</span> <select className="border rounded px-2 py-0.5 text-xs ml-1"><option>{o.user_name || 'Admin'}</option></select></div>
            <div><span className="text-gray-500">Ngày bán:</span> <span className="font-medium">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</span></div>
            <div><span className="text-gray-500">Kênh bán:</span> <select className="border rounded px-2 py-0.5 text-xs ml-1"><option>Bán trực tiếp</option></select></div>
            <div><span className="text-gray-500">Bảng giá:</span> <span className="font-medium">Bảng giá chung</span></div>
          </div>

          {/* Items table */}
          {items.length > 0 ? (
            <div className="px-6 py-3">
              <table className="w-full text-[13px]">
                <thead><tr className="text-gray-500 border-b border-gray-200">
                  <th className="py-2 text-left font-semibold">Mã hàng</th>
                  <th className="py-2 text-left font-semibold">Tên hàng</th>
                  <th className="py-2 text-right font-semibold">Số lượng</th>
                  <th className="py-2 text-right font-semibold">Đơn giá</th>
                  <th className="py-2 text-right font-semibold">Giảm giá</th>
                  <th className="py-2 text-right font-semibold">Giá bán</th>
                  <th className="py-2 text-right font-semibold text-blue-600">Thành tiền</th>
                </tr></thead>
                <tbody>{items.map((it, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2.5 text-blue-600 font-medium">{it.product_sku}</td>
                    <td className="py-2.5 font-medium">{it.product_name}</td>
                    <td className="py-2.5 text-right">{it.quantity}</td>
                    <td className="py-2.5 text-right">{fmt(it.unit_price)}</td>
                    <td className="py-2.5 text-right text-gray-500">{it.discount > 0 ? fmt(it.discount) : ''}</td>
                    <td className="py-2.5 text-right">{fmt(it.unit_price - (it.discount || 0))}</td>
                    <td className="py-2.5 text-right text-blue-600 font-bold">{fmt(it.total)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="text-center py-8 text-gray-400 text-sm"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />Đang tải...</div>}

          {/* Notes + Summary */}
          <div className="flex gap-6 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
            <div className="flex-1">
              <span className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú</span>
              <textarea data-oid={o.id} className="w-full border rounded-lg px-3 py-2 text-sm resize-y min-h-[70px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ghi chú..." defaultValue={o.note || ''} />
            </div>
            <div className="min-w-[260px] text-[13px] space-y-1.5 bg-white p-3 rounded-lg border shadow-sm">
              <div className="flex justify-between"><span className="text-gray-500">Tổng tiền hàng ({items.reduce((s, it) => s + it.quantity, 0)}):</span><span className="font-semibold">{fmt(o.subtotal || o.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Giảm giá hóa đơn:</span><span>{fmt(o.discount_amount)}</span></div>
              <div className="h-px bg-gray-100 my-1" />
              <div className="flex justify-between font-bold"><span>Khách cần trả:</span><span className="text-blue-600">{fmt(o.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Khách đã trả:</span><span className="font-semibold">{fmt(o.paid_amount)}</span></div>
            </div>
          </div>
        </div>
      ) : (
        /* Payment history tab */
        <div className="px-6 py-4">
          <table className="w-full text-[13px]">
            <thead><tr className="text-gray-500 border-b">
              <th className="py-2 text-left font-semibold">Thời gian</th>
              <th className="py-2 text-left font-semibold">Phương thức</th>
              <th className="py-2 text-right font-semibold">Số tiền</th>
              <th className="py-2 text-left pl-4 font-semibold">Trạng thái</th>
            </tr></thead>
            <tbody><tr className="hover:bg-gray-50">
              <td className="py-2.5">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
              <td className="py-2.5">{PAY_LABEL[o.payment_method] || ''}</td>
              <td className="py-2.5 text-right font-bold">{fmt(o.paid_amount)}</td>
              <td className="py-2.5 pl-4"><Badge status="completed" /></td>
            </tr></tbody>
          </table>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-6 py-3 border-t border-gray-100">
        {o.status !== 'cancelled' && <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 font-medium cursor-pointer"><Trash2 size={13} />Hủy</button>}
        <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50 font-medium cursor-pointer"><Copy size={13} />Sao chép</button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50 font-medium cursor-pointer"><Download size={13} />Xuất file</button>
        <div className="flex-1" />
        <button onClick={() => navigate('/pos', { state: { editOrder: { id: o.id, code: o.order_code, items: items, customer: o.customer_name ? { id: o.customerId, name: o.customer_name } : null, note: o.note } } })} className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 font-medium cursor-pointer"><Pencil size={13} />Chỉnh sửa</button>
        <button onClick={handleSaveNote} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50 font-medium cursor-pointer"><Save size={13} />Lưu</button>
        {o.status !== 'cancelled' && <button onClick={handleReturn} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50 font-medium cursor-pointer"><RotateCcw size={13} />Trả hàng</button>}
        <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border rounded hover:bg-gray-50 font-medium cursor-pointer"><Printer size={13} />In</button>
      </div>
    </td>
  );
}
