import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Copy, Download, Pencil, Save, RotateCcw, Printer, MoreHorizontal, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { orderAPI, cashbookAPI } from '../../services/api';
import { copyToClipboard, printHTML } from '../../utils/exportUtils';
import Button from '../../components/ui/Button';

const fmt = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
const PAY_LABEL = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Quẹt thẻ' };

function Badge({ status }) {
  const map = { completed: 'bg-green-100 text-green-700 border border-green-200', paid: 'bg-green-100 text-green-700 border border-green-200', cancelled: 'bg-gray-100 text-gray-500 border border-gray-200', partial: 'bg-yellow-100 text-yellow-700 border border-yellow-200', unpaid: 'bg-red-100 text-red-600 border border-red-200', shipping: 'bg-blue-100 text-blue-700 border border-blue-200' };
  const labels = { completed: 'Hoàn thành', paid: 'Hoàn thành', cancelled: 'Đã hủy', partial: '1 phần', unpaid: 'Chưa TT', shipping: 'Đang giao' };
  return <span className={`px-3 py-1 rounded-full text-xs font-bold ${map[status] || 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{labels[status] || status}</span>;
}

export default function OrderDetail({ order, onReload, onClose, colSpan = 11 }) {
  const o = order;
  const [tab, setTab] = useState('info');
  const [orderPayments, setOrderPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const items = o._items || o.items || [];
  const navigate = useNavigate();

  useEffect(() => {
    if (tab === 'payment' && (o.id || o.order_code || o.code)) {
      setLoadingPayments(true);
      const code = o.order_code || o.code;
      cashbookAPI.getAll({ limit: 1000 })
        .then(r => {
          const list = r.data || (Array.isArray(r) ? r : []);
          const matched = list.filter(cb => {
            if (cb.status === 'cancelled') return false;
            if (cb.orderId && String(cb.orderId) === String(o.id)) return true;
            if (cb.order_id && String(cb.order_id) === String(o.id)) return true;
            if (code) {
              if (cb.note && cb.note.includes(code)) return true;
              if (cb.description && cb.description.includes(code)) return true;
              if (cb.code && cb.code.includes(code)) return true;
            }
            return false;
          });
          setOrderPayments(matched);
        })
        .catch(() => setOrderPayments([]))
        .finally(() => setLoadingPayments(false));
    }
  }, [tab, o.id, o.order_code, o.code]);

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

  const handleCopy = () => {
    const custId = o.customerId || o.customer_id || o.customer?.id;
    const copyData = {
      id: o.id,
      code: o.order_code || o.code,
      items: items,
      customer: (o.customer_name && o.customer_name !== 'Khách lẻ') ? {
        id: custId,
        name: o.customer_name,
        phone: o.customer_phone || o.customer?.phone || '',
        debt: o.customer_debt || o.customer?.debt || o.customer?.totalDebt || 0
      } : null,
      note: o.note,
      deliveryAddress: o.deliveryAddress || '',
      receiverName: o.receiverName || '',
      receiverPhone: o.receiverPhone || '',
      driverId: o.driverId || '',
      driverName: o.deliveryAddress ? (o.driverName || 'Chưa gán') : '',
      deliveryStatus: o.deliveryAddress ? (o.deliveryStatus || 'ASSIGNED') : ''
    };
    const orderCode = o.order_code || o.code || o.id;
    sessionStorage.setItem(`copy_order_${orderCode}`, JSON.stringify(copyData));
    window.open(`/pos?copyOrderCode=${encodeURIComponent(orderCode)}`, '_blank');
    toast.success('Đã mở đơn sao chép ở tab mới');
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

  const handleExportSingleInvoice = async () => {
    try {
      const { exportSingleInvoiceExcel } = await import('../../utils/exportCSV');
      exportSingleInvoiceExcel(o);
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi xuất file hóa đơn');
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

    const paidAmount = o.paid_amount ?? o.paid ?? 0;
    let oldDebt = 0;
    let remainingDebt = 0;
    if (o.oldDebt !== undefined && o.oldDebt !== null) {
      oldDebt = Number(o.oldDebt);
      remainingDebt = o.newDebt !== undefined && o.newDebt !== null ? Number(o.newDebt) : (oldDebt + Number(o.total || 0) - paidAmount);
    } else {
      // Fallback for legacy orders created before the migration
      const custDebt = o.customer ? Number(o.customer.totalDebt || o.customer.debt || 0) : 0;
      oldDebt = o.customer ? Math.max(0, custDebt - (Number(o.total || 0) - paidAmount)) : 0;
      remainingDebt = oldDebt + Number(o.total || 0) - paidAmount;
    }
    const totalDebt = oldDebt + Number(o.total || 0);

    const invoiceHTML = `
        <style>
          .inv-wrap { width: 70mm; margin: 0 auto; font-family: Arial, sans-serif; color: #000; line-height: 1.4; padding: 10px 2mm 0 2mm; box-sizing: border-box; }
          .inv-logo-container { text-align: center; margin-bottom: 2px; }
          .inv-logo-img { width: 90px; max-height: 40px; object-fit: contain; margin: 0 auto; display: block; }
          .inv-company { text-align: center; font-size: 14px; font-weight: bold; margin: 8px 0 4px; text-transform: uppercase; }
          .inv-info { text-align: center; font-size: 12px; margin: 2px 0; }
          .inv-stk { text-align: center; font-size: 12px; font-weight: bold; margin: 2px 0; }
          .inv-title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0 2px; }
          .inv-code-date { text-align: center; font-size: 11px; margin-bottom: 10px; color: #333; }
          .inv-customer-info { font-size: 12px; margin-bottom: 8px; line-height: 1.5; }
          .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
          .inv-table th, .inv-table td { border: 1px solid #000 !important; padding: 4px 2px; }
          .inv-table th { font-weight: bold; text-align: center; }
          .inv-summary { width: 100%; font-size: 12px; margin-bottom: 15px; border-collapse: collapse; }
          .inv-summary td { padding: 3px 0; border: none !important; }
          .inv-summary .label { text-align: right; padding-right: 15px; }
          .inv-summary .value { text-align: right; width: 90px; }
          .inv-footer { font-size: 12px; line-height: 1.5; font-weight: bold; margin-bottom: 15px; }
          .inv-thanks { text-align: center; font-size: 12px; font-style: italic; margin-top: 20px; }
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
          <div class="inv-company">CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ TIKOVIA</div>
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
              ${items.map((it, idx) => {
                const isFirstOfProduct = idx === 0 || String(it.productId || it.product_id || it.product?.id) !== String(items[idx - 1]?.productId || items[idx - 1]?.product_id || items[idx - 1]?.product?.id);
                const price = Number(it.unit_price || it.price || 0) - Number(it.discount || 0);
                const itemTotal = Number(it.total || price * it.quantity);
                return `
                <tr>
                  <td>${isFirstOfProduct ? `${it.product_name || it.product?.name || ''} ${it.product?.unit || it.unit ? `(${it.product?.unit || it.unit})` : ''}` : ''}</td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: center;">${it.unit || it.product?.unit || 'cái'}</td>
                  <td style="text-align: right;">${f(it.unit_price || it.price || 0)}</td>
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
              <td class="label">Nợ cũ:</td>
              <td class="value">${f(oldDebt)}</td>
            </tr>
            <tr>
              <td class="label">Tổng Nợ:</td>
              <td class="value">${f(totalDebt)}</td>
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

          <div class="inv-footer" style="text-align: right; font-size: 12px; font-weight: bold; margin-top: 10px;">
            <div style="margin-bottom: 5px;">Chữ ký Khách Hàng :</div>
            <div style="white-space: pre-wrap;">Ghi chú: ${o.note || ''}</div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/50 p-2.5 px-3 rounded-xl border border-blue-100 text-xs">
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {o.customer_name && o.customer_name !== 'Khách lẻ' ? (
                  <a 
                    href={`/customers?search=${encodeURIComponent(o.customer_name || '')}&code=${encodeURIComponent(o.customer_code || '')}&id=${o.customerId || o.customer_id || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-base sm:text-sm font-extrabold text-primary hover:underline cursor-pointer p-0 text-left inline-flex items-center gap-1 no-underline"
                    title="Mở chi tiết khách hàng trong tab mới"
                  >
                    <span>{o.customer_name}</span>
                    <ExternalLink size={14} className="text-primary shrink-0" />
                  </a>
                ) : (
                  <span className="text-base sm:text-sm font-extrabold text-gray-800 tracking-tight">{o.customer_name || 'Khách lẻ'}</span>
                )}
                <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full border border-primary/20">
                  {o.order_code}
                </span>
                <Badge status={o.payment_status || o.status} />
              </div>
              <span className="text-xs font-bold text-primary bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-sm w-fit sm:w-auto">
                Chi nhánh trung tâm
              </span>
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 p-2.5 sm:p-3 bg-gray-50/50 rounded-xl border border-gray-200 text-[11px]">
              <div><span className="text-gray-500 font-medium block mb-0.5">Ngày bán</span><span className="font-bold text-gray-800 block leading-tight">{o.created_at ? new Date(new Date(o.created_at).getTime() - 7 * 3600 * 1000).toLocaleString('vi-VN') : ''}</span></div>
              <div><span className="text-gray-500 font-medium block mb-0.5">Kênh bán</span><span className="font-bold text-gray-800 block leading-tight">Bán trực tiếp</span></div>
              <div><span className="text-gray-500 font-medium block mb-0.5">Bảng giá</span><span className="font-bold text-gray-800 block leading-tight">Bảng giá chung</span></div>
            </div>

            {o.delivery_status && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-blue-50/30 rounded-xl border border-blue-100 text-[11px]">
                <div>
                  <span className="text-gray-500 font-medium block mb-1">Người nhận</span>
                  <span className="font-bold text-gray-800 block">{o.receiver_name || o.customer_name || 'Khách lẻ'}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block mb-1">Số điện thoại nhận</span>
                  <span className="font-bold text-gray-800 block">{o.receiver_phone || '---'}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block mb-1">Tài xế giao hàng</span>
                  <span className="font-bold text-primary block">{o.driver_name || 'Chưa gán'}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium block mb-1">Trạng thái giao nhận</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    o.delivery_status === 'DELIVERED' ? 'bg-green-100 text-green-700 border border-green-200' :
                    o.delivery_status === 'DELIVERING' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                    o.delivery_status === 'ARRIVED' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                    o.delivery_status === 'CANCELED' ? 'bg-red-100 text-red-700 border border-red-200' :
                    'bg-yellow-100 text-yellow-700 border border-yellow-200'
                  }`}>
                    {o.delivery_status === 'DELIVERED' ? 'Đã giao' :
                     o.delivery_status === 'DELIVERING' ? 'Đang giao' :
                     o.delivery_status === 'ARRIVED' ? 'Đã đến' :
                     o.delivery_status === 'CANCELED' ? 'Đã hủy' :
                     'Chờ nhận'}
                  </span>
                </div>
                {o.delivery_address && (
                  <div className="col-span-2 sm:col-span-4 mt-1 border-t border-blue-50/50 pt-2">
                    <span className="text-gray-500 font-medium block mb-1">Địa chỉ nhận hàng</span>
                    <span className="font-bold text-gray-800 block">{o.delivery_address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Items Section: Mobile Card List vs Desktop Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm max-w-full w-full">
              <div className="p-3 bg-gray-50 border-b border-gray-100 text-xs font-extrabold text-gray-700 flex justify-between items-center">
                <span>Danh sách hàng hóa ({items.length})</span>
              </div>

              {/* Mobile View: No horizontal scroll */}
              <div className="block md:hidden divide-y divide-gray-100 bg-white max-h-60 overflow-y-auto custom-scrollbar">
                {items.map((it, idx) => {
                  const sku = it.product_sku || it.product?.sku || it.sku || `SP${it.productId || ''}`;
                  const name = it.product_name || it.product?.name || 'Sản phẩm';
                  const unit = it.product?.unit || it.unit || '';
                  const unitPrice = Number(it.unit_price || it.price || 0);
                  const discount = Number(it.discount || 0);
                  const itemTotal = Number(it.total || (it.quantity * unitPrice - discount));

                  return (
                    <div key={idx} className="p-3 flex flex-col gap-1 hover:bg-gray-50/50 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <a href={`/products?editSku=${sku}`} target="_blank" rel="noopener noreferrer" className="font-extrabold text-primary hover:underline">
                          {sku}
                        </a>
                        <span className="font-extrabold text-primary">{fmt(itemTotal)}</span>
                      </div>
                      <div className="font-bold text-gray-800">
                        {name} {unit ? `(${unit})` : ''}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-gray-500 pt-0.5">
                        <span>Số lượng: <strong className="text-gray-800">{it.quantity}</strong></span>
                        <span>Đơn giá: {fmt(unitPrice)} {discount > 0 ? `(Giảm ${fmt(discount)})` : ''}</span>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-xs">Hóa đơn không có sản phẩm nào</div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
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
                      {items.map((it, idx) => {
                        const sku = it.product_sku || it.product?.sku || it.sku || `SP${it.productId || ''}`;
                        const name = it.product_name || it.product?.name || 'Sản phẩm';
                        const unit = it.product?.unit || it.unit || '';
                        const unitPrice = Number(it.unit_price || it.price || 0);
                        const discount = Number(it.discount || 0);
                        const itemTotal = Number(it.total || (it.quantity * unitPrice - discount));

                        return (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-3 font-bold text-primary hover:underline cursor-pointer">
                              <a href={`/products?editSku=${sku}`} target="_blank" rel="noopener noreferrer">
                                {sku}
                              </a>
                            </td>
                            <td className="p-3 text-gray-800">{name} {unit ? `(${unit})` : ''}</td>
                            <td className="p-3 text-right text-gray-800 font-bold">{it.quantity}</td>
                            <td className="p-3 text-right text-gray-600">{fmt(unitPrice)}</td>
                            <td className="p-3 text-right text-gray-600">{discount > 0 ? fmt(discount) : '0'}</td>
                            <td className="p-3 text-right text-gray-800 font-bold">{fmt(unitPrice - discount)}</td>
                            <td className="p-3 text-right text-primary font-bold">{fmt(itemTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-6 text-gray-400 font-medium min-w-[700px]">
                    Hóa đơn không có sản phẩm nào
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section: Note & Summary Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-8 items-start">
              <div className="sm:col-span-2">
                <textarea
                  data-oid={o.id}
                  placeholder="Ghi chú..."
                  className="w-full h-14 sm:h-16 border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-none"
                  defaultValue={o.note || ''}
                />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-1.5 text-[11px] shadow-sm">
                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Tổng tiền hàng ({items.reduce((s, it) => s + (it.quantity || 0), 0)})</span><span className="font-bold text-gray-800">{fmt(o.subtotal || o.total)}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Giảm giá hóa đơn</span><span className="font-bold text-gray-800">{fmt(o.discount_amount)}</span></div>
                <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-1.5"><span className="font-bold text-gray-800">Khách cần trả</span><span className="font-extrabold text-primary">{fmt(o.total)}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="font-bold text-gray-800">Khách đã trả</span><span className="font-extrabold text-green-600">{fmt(o.paid_amount)}</span></div>
              </div>
            </div>

            {/* Bottom Action Bar: Clean Flex-wrap Bar */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-3 mt-3 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
              {o.status !== 'cancelled' && (
                <Button variant="danger" onClick={handleCancel} className="justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold">
                  <Trash2 size={14} /> Hủy
                </Button>
              )}
              <Button variant="secondary" onClick={handleCopy} className="justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold">
                <Copy size={14} /> Sao chép
              </Button>
              <Button variant="secondary" onClick={handleExportSingleInvoice} className="justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold">
                <Download size={14} /> Xuất file
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/pos', { state: { editOrder: { id: o.id, code: o.order_code, items: items, customer: o.customer_name ? { id: o.customerId, name: o.customer_name } : null, note: o.note, createdAt: o.created_at || o.createdAt || o.date } } })}
                className="justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-md font-bold bg-primary hover:bg-primary-hover"
              >
                <Pencil size={14} /> Sửa
              </Button>
              <Button variant="secondary" onClick={handleSaveNote} className="justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold">
                <Save size={14} /> Lưu
              </Button>
              {o.status !== 'cancelled' && (
                <Button variant="secondary" onClick={handleReturn} className="justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold">
                  <RotateCcw size={14} /> Trả hàng
                </Button>
              )}
              <Button variant="secondary" onClick={handlePrint} className="justify-center items-center gap-1.5 text-xs py-1.5 px-3 shadow-sm font-bold">
                <Printer size={14} /> In bill
              </Button>
            </div>
          </div>
        ) : (
          (() => {
            const paidVal = Number(o.paid !== undefined && o.paid !== null ? o.paid : (o.paid_amount || 0));
            const hasCashbooks = orderPayments.length > 0;

            if (loadingPayments) {
              return (
                <div className="text-center py-8 text-gray-500 font-bold border border-gray-200 rounded-lg bg-gray-50/50">
                  Đang tải lịch sử thanh toán...
                </div>
              );
            }

            if (hasCashbooks) {
              return (
                <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm w-full max-w-full">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                        <th className="p-3">Mã phiếu</th>
                        <th className="p-3">Thời gian</th>
                        <th className="p-3">Loại thanh toán</th>
                        <th className="p-3 text-right">Số tiền</th>
                        <th className="p-3 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {orderPayments.map((p, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-3 font-bold text-primary">{p.code || `TT${p.id}`}</td>
                          <td className="p-3 text-gray-700">{p.createdAt || p.created_at || p.date ? new Date(p.createdAt || p.created_at || p.date).toLocaleString('vi-VN') : ''}</td>
                          <td className="p-3 text-gray-800">{p.category || (p.paymentMethod === 'bank' ? 'Chuyển khoản' : 'Tiền mặt')}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">+{fmt(p.amount)}</td>
                          <td className="p-3 text-center"><Badge status="completed" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }

            if (paidVal > 0) {
              return (
                <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white shadow-sm w-full max-w-full">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-100/80 text-gray-600 border-b border-gray-200 text-left font-bold uppercase tracking-wider">
                        <th className="p-3">Thời gian</th>
                        <th className="p-3">Phương thức</th>
                        <th className="p-3 text-right">Số tiền</th>
                        <th className="p-3 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      <tr className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3 text-gray-700">{o.created_at || o.createdAt ? new Date(o.created_at || o.createdAt).toLocaleString('vi-VN') : ''}</td>
                        <td className="p-3 text-gray-800">{PAY_LABEL[o.payment_method || o.paymentMethod] || 'Tiền mặt'}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">+{fmt(paidVal)}</td>
                        <td className="p-3 text-center"><Badge status="completed" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            }

            return (
              <div className="text-center py-10 text-gray-400 font-medium border border-gray-200 rounded-lg bg-gray-50/30">
                Hóa đơn này chưa được thanh toán (Khách đã trả: 0đ).
              </div>
            );
          })()
        )}
      </div>
    </td>
  );
}
