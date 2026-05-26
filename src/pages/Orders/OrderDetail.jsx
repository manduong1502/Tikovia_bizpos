import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Copy, Download, Pencil, Save, RotateCcw, Printer, Receipt, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { orderAPI } from '../../services/api';
import { copyToClipboard, printHTML } from '../../utils/exportUtils';
import Button from '../../components/ui/Button';

const fmt = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
const PAY_LABEL = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Quẹt thẻ' };

function Badge({ status }) {
  const map = { completed: 'bg-green-100 text-green-700 border border-green-200', paid: 'bg-green-100 text-green-700 border border-green-200', cancelled: 'bg-gray-100 text-gray-500 border border-gray-200', partial: 'bg-yellow-100 text-yellow-700 border border-yellow-200', unpaid: 'bg-red-100 text-red-600 border border-red-200' };
  const labels = { completed: 'Hoàn thành', paid: 'Hoàn thành', cancelled: 'Đã hủy', partial: '1 phần', unpaid: 'Chưa TT' };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold ${map[status] || 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{labels[status] || status}</span>;
}

export default function OrderDetail({ order, onReload, onClose, colSpan = 11 }) {
  const o = order;
  const [tab, setTab] = useState('info');
  const items = o._items || o.items || [];
  const navigate = useNavigate();

  const handleCancel = async () => {
    if (o.status === 'cancelled') return toast.error('Đã hủy rồi');
    if (!confirm(`Hủy hóa đơn ${o.order_code}?`)) return;
    try { 
      await orderAPI.cancel(o.id); 
      toast.success('Hủy thành công'); 
      onReload(); 
      onClose(); 
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi hủy hóa đơn');
    }
  };

  const handleCopy = async () => {
    await copyToClipboard(o.order_code);
    toast.success(`Đã sao chép: ${o.order_code}`);
  };

  const handleSaveNote = async () => {
    const note = document.querySelector(`textarea[data-oid="${o.id}"]`)?.value || '';
    try { 
      await orderAPI.update(o.id, { note }); 
      toast.success('Lưu ghi chú thành công'); 
      onReload();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi lưu ghi chú');
    }
  };

  const handleReturn = async () => {
    if (o.status === 'cancelled') return toast.error('Không thể trả hàng');
    navigate(`/returns/new/${o.id}`);
  };

  const handlePrint = () => {
    const f = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
    const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : '';
    const customerName = o.customer_name || 'Khách lẻ';

    const remainingDebt = Math.max(0, o.total - (o.paid_amount || 0));
    const paidAmount = o.paid_amount || 0;

    const invoiceHTML = `
        <style>
          .inv-wrap { width: 70mm; margin: 0 auto; font-family: Arial, sans-serif; color: #000; line-height: 1.4; padding: 10px 2mm 0 2mm; box-sizing: border-box; }
          .inv-logo-container { text-align: center; margin-bottom: 5px; }
          .inv-logo-img { width: 220px; max-width: 100%; object-fit: contain; }
          .inv-info { text-align: center; font-size: 11px; margin: 2px 0; }
          .inv-stk { text-align: center; font-size: 11px; font-weight: bold; margin: 2px 0; }
          .inv-title { text-align: center; font-size: 14px; font-weight: bold; margin: 15px 0 2px; }
          .inv-code-date { text-align: center; font-size: 10px; margin-bottom: 10px; color: #333; }
          .inv-customer-info { font-size: 11px; margin-bottom: 8px; line-height: 1.5; }
          .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
          .inv-table th, .inv-table td { border: 1px solid #000 !important; padding: 4px 2px; }
          .inv-table th { font-weight: bold; text-align: center; }
          .inv-summary { width: 100%; font-size: 11px; margin-bottom: 15px; border-collapse: collapse; }
          .inv-summary td { padding: 3px 0; border: none !important; }
          .inv-summary .label { text-align: right; padding-right: 15px; }
          .inv-summary .value { text-align: right; width: 70px; }
          .inv-footer { font-size: 11px; line-height: 1.5; font-weight: bold; margin-bottom: 15px; }
          .inv-thanks { text-align: center; font-size: 11px; font-style: italic; margin-top: 20px; }
          @media print {
            @page { margin: 0; }
            body { margin: 0; padding: 0; }
            .inv-wrap { padding: 5mm 4mm 0 4mm; width: 70mm; margin: 0 auto; }
          }
        </style>
        <div class="inv-wrap">
          <div class="inv-logo-container">
            <img src="${window.location.origin}/logovuong.png" class="inv-logo-img" alt="TIKOVIA" />
          </div>
          <div class="inv-info" style="margin-top: 10px;">ĐC: 82 Trần Tử Bình, Hòa Châu, Hòa Vang, ĐN</div>
          <div class="inv-info">Điện Thoại: 0796.637.194</div>
          <div class="inv-stk">STK : 8282688686</div>
          <div class="inv-stk">Ngân hàng: TMCP Quân Đội (MB<br/>Bank)</div>

          <div class="inv-title">HÓA ĐƠN BÁN HÀNG</div>
          <div class="inv-code-date">${o.order_code} - ${dateStr}</div>

          <div class="inv-customer-info">
            <div>Khách hàng: ${customerName}</div>
            <div>SĐT: ${o.customer?.phone || ''}</div>
            <div>ĐC: ${o.customer?.address || ''}</div>
          </div>

          <table class="inv-table">
            <thead>
              <tr>
                <th style="text-align: left;">Mặt hàng</th>
                <th style="width: 20px;">SL</th>
                <th style="width: 25px;">ĐVT</th>
                <th style="text-align: right;">Giá</th>
                <th style="text-align: right;">CK</th>
                <th style="text-align: right;">Thành<br/>tiền</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => {
                const price = Number(it.unit_price || 0) - Number(it.discount || 0);
                const itemTotal = Number(it.total || price * it.quantity);
                return `
                <tr>
                  <td>${it.product_name || ''}</td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: center;">${it.unit || 'cái'}</td>
                  <td style="text-align: right;">${f(it.unit_price || 0)}</td>
                  <td style="text-align: right;">${f(it.discount || 0)}</td>
                  <td style="text-align: right;">${f(itemTotal)}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <table class="inv-summary">
            <tr>
              <td class="label">Tổng đơn hàng:</td>
              <td class="value">${f(o.total)}</td>
            </tr>
            <tr>
              <td class="label">Khách đã trả:</td>
              <td class="value">${f(paidAmount)}</td>
            </tr>
            <tr>
              <td class="label">Dư nợ sau khi trả:</td>
              <td class="value">${f(remainingDebt)}</td>
            </tr>
          </table>

          <div class="inv-footer">
            <div>Chữ ký Khách Hàng :</div>
            <div style="margin-top: 5px;">Ghi chú: ${o.note || ''}</div>
          </div>

          <div class="inv-thanks">
            Cảm ơn và hẹn gặp lại!
          </div>
        </div>
      `;
    printHTML(invoiceHTML, 'In Hóa Đơn');
  };

  return (
    <td colSpan={colSpan} className="p-0 border-x-2 border-b-2 border-primary/20 bg-white shadow-xl animate-fade-in max-w-full" onClick={e => e.stopPropagation()}>
      <div className="p-3 sm:p-6 max-w-full overflow-x-hidden">
        {/* Top Tabs */}
        <div className="flex gap-4 sm:gap-4 border-b border-gray-200 mb-6 px-1 sm:px-2 overflow-x-auto custom-scrollbar">
          {['info', 'payment'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-1.5 px-0.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t === 'info' ? 'Thông tin' : 'Lịch sử thanh toán'}
            </button>
          ))}
        </div>

        {tab === 'info' ? (
          <div className="flex flex-col gap-4 max-w-full">
            {/* Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 p-2 px-3 rounded-lg border border-blue-100 text-xs">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="text-lg sm:text-sm font-bold text-gray-800 tracking-tight">{o.customer_name || 'Khách lẻ'}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full border border-primary/20">
                  {o.order_code}
                </span>
                <Badge status={o.payment_status || o.status} />
              </div>
              <span className="text-xs font-bold text-primary bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm w-fit sm:w-auto">
                Chi nhánh trung tâm
              </span>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-4 p-2 sm:p-2.5 bg-gray-50/50 rounded-lg border border-gray-200 text-[11px]">
              <div><span className="text-gray-500 font-medium block mb-1">Ngày bán</span><span className="font-bold text-gray-800 truncate block">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</span></div>
              <div><span className="text-gray-500 font-medium block mb-1">Kênh bán</span><span className="font-bold text-gray-800 truncate block">Bán trực tiếp</span></div>
              <div><span className="text-gray-500 font-medium block mb-1">Bảng giá</span><span className="font-bold text-gray-800 truncate block">Bảng giá chung</span></div>
            </div>

            {/* Items Table Section */}
            <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm max-w-full w-full max-h-40 overflow-y-auto">
              {items.length > 0 ? (
                <table className="w-full text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                      <th className="p-3">Mã hàng</th>
                      <th className="p-3">Tên hàng</th>
                      <th className="p-3 text-right">Số.Lượng</th>
                      <th className="p-3 text-right">Đơn giá</th>
                      <th className="p-3 text-right">Giảm giá</th>
                      <th className="p-3 text-right">Giá bán</th>
                      <th className="p-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 text-primary font-bold">{it.product_sku}</td>
                        <td className="p-3 text-gray-800">{it.product_name}</td>
                        <td className="p-3 text-right text-gray-800 font-bold">{it.quantity}</td>
                        <td className="p-3 text-right text-gray-600">{fmt(it.unit_price)}</td>
                        <td className="p-3 text-right text-gray-600">{it.discount > 0 ? fmt(it.discount) : '0'}</td>
                        <td className="p-3 text-right text-gray-800 font-bold">{fmt((it.unit_price || 0) - (it.discount || 0))}</td>
                        <td className="p-3 text-right text-primary font-bold">{fmt(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-400 font-medium min-w-[700px]">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Đang tải chi tiết hàng hóa...
                </div>
              )}
            </div>

            {/* Bottom Section: Note & Summary Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 items-start">
              <div className="sm:col-span-2">
                <textarea
                  data-oid={o.id}
                  placeholder="Ghi chú..."
                  className="w-full h-12 sm:h-16 border border-gray-300 rounded-lg p-2 text-xs text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-none"
                  defaultValue={o.note || ''}
                />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 flex flex-col gap-1.5 text-[11px] shadow-sm">
                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng tiền hàng ({items.reduce((s, it) => s + (it.quantity || 0), 0)})</span><span className="font-bold text-gray-800">{fmt(o.subtotal || o.total)}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Giảm giá hóa đơn</span><span className="font-bold text-gray-800">{fmt(o.discount_amount)}</span></div>
                <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-1.5"><span className="font-bold text-gray-800">Khách cần trả</span><span className="font-extrabold text-primary">{fmt(o.total)}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="font-bold text-gray-800">Khách đã trả</span><span className="font-extrabold text-green-600">{fmt(o.paid_amount)}</span></div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-200 pt-3 mt-1.5">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {o.status !== 'cancelled' && (
                  <Button variant="danger" onClick={handleCancel} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-[11px] py-1 px-2.5 shadow-sm font-bold whitespace-nowrap">
                    <Trash2 size={14} /> Hủy
                  </Button>
                )}
                <Button variant="secondary" onClick={handleCopy} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-[11px] py-1 px-2.5 shadow-sm font-bold whitespace-nowrap">
                  <Copy size={14} /> Sao chép
                </Button>
                <Button variant="secondary" className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-[11px] py-1 px-2.5 shadow-sm font-bold whitespace-nowrap">
                  <Download size={14} /> Xuất file
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  variant="primary"
                  onClick={() => navigate('/pos', { state: { editOrder: { id: o.id, code: o.order_code, items: items, customer: o.customer_name ? { id: o.customerId, name: o.customer_name } : null, note: o.note } } })}
                  className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-[11px] py-1 px-3.5 shadow-md font-bold bg-primary hover:bg-primary-hover whitespace-nowrap"
                >
                  <Pencil size={14} /> Chỉnh sửa
                </Button>
                <Button variant="secondary" onClick={handleSaveNote} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-[11px] py-1 px-2.5 shadow-sm font-bold whitespace-nowrap">
                  <Save size={14} /> Lưu
                </Button>
                {o.status !== 'cancelled' && (
                  <Button variant="secondary" onClick={handleReturn} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-[11px] py-1 px-2.5 shadow-sm font-bold whitespace-nowrap">
                    <RotateCcw size={14} /> Trả hàng
                  </Button>
                )}
                <Button variant="secondary" onClick={handlePrint} className="flex-1 sm:flex-none justify-center items-center gap-1.5 text-[11px] py-1 px-2.5 shadow-sm font-bold whitespace-nowrap">
                  <Printer size={14} /> In
                </Button>
                <Button variant="secondary" className="p-2 shadow-sm flex-none">
                  <MoreHorizontal size={14} />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200 overflow-x-auto max-w-full">
            <Receipt size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-bold text-gray-700 mb-1">Lịch sử thanh toán</p>
            <table className="w-full text-xs mt-4 min-w-[500px]">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                  <th className="py-2">Thời gian</th>
                  <th className="py-2">Phương thức</th>
                  <th className="py-2 text-right">Số tiền</th>
                  <th className="py-2 pl-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-blue-50/30 transition-colors font-medium">
                  <td className="py-3 text-gray-700">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''}</td>
                  <td className="py-3 text-gray-800">{PAY_LABEL[o.payment_method] || 'Tiền mặt'}</td>
                  <td className="py-3 text-right font-extrabold text-primary">{fmt(o.paid_amount)}</td>
                  <td className="py-3 pl-4"><Badge status="completed" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </td>
  );
}
