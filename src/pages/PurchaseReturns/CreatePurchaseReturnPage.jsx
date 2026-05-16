import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Printer, Eye, AlertCircle, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import { purchaseOrderAPI, purchaseReturnAPI, employeeAPI } from '../../services/api';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function CreatePurchaseReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('poId');

  const [po, setPo] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [employees, setEmployees] = useState(['Võ Thành Huy', 'Nguyễn Văn A', 'Trần Thị B']);
  const [selectedEmployee, setSelectedEmployee] = useState('Võ Thành Huy');
  const [returnDate, setReturnDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });

  const [items, setItems] = useState([]);
  const [discountStr, setDiscountStr] = useState('0');
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPO = async () => {
    if (!poId) {
      toast.error('Không tìm thấy ID phiếu nhập');
      return;
    }
    try {
      const [poRes, empRes] = await Promise.all([
        purchaseOrderAPI.getById(poId),
        employeeAPI.getAll().catch(() => []),
      ]);

      if (poRes) {
        setPo(poRes);
        if (poRes.supplier) setSupplier(poRes.supplier);
        if (Array.isArray(poRes.items)) {
          setItems(poRes.items.map((it, idx) => ({
            id: it.productId || it.product?.id || it.id,
            sku: it.product?.sku || it.product_sku || `SP00${idx+1}`,
            name: it.product?.name || it.product_name || '',
            unit: it.product?.unit || it.unit || 'Cái',
            max_quantity: Number(it.quantity || 0),
            return_quantity: Number(it.quantity || 0),
            import_price: Number(it.price || it.unit_price || 0),
            return_price: Number(it.price || it.unit_price || 0),
            note: '',
          })));
        }
      }
      if (Array.isArray(empRes) && empRes.length > 0) {
        setEmployees(empRes.map(e => e.name || e.fullName || 'Võ Thành Huy'));
      }
    } catch (e) {
      toast.error('Lỗi khi tải dữ liệu phiếu nhập');
    }
  };

  useEffect(() => {
    loadPO();
  }, [poId]);

  const totalReturnGoods = items.reduce((acc, it) => acc + (it.return_quantity * it.return_price), 0);
  const actualDiscount = Number(discountStr.replace(/\D/g, '')) || 0;
  const supplierMustPay = Math.max(0, totalReturnGoods - actualDiscount);
  
  const actualPaid = paidAmountStr === '' ? supplierMustPay : (Number(paidAmountStr.replace(/\D/g, '')) || 0);
  const debtCalculation = supplierMustPay - actualPaid;

  const handleQuantityChange = (id, val) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        const num = val === '' ? 0 : Math.min(it.max_quantity, Math.max(0, Number(val) || 0));
        return { ...it, return_quantity: num };
      }
      return it;
    }));
  };

  const handlePriceChange = (id, val) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        return { ...it, return_price: Number(val.replace(/\D/g, '')) || 0 };
      }
      return it;
    }));
  };

  const handleNoteChange = (id, val) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) {
        return { ...it, note: val };
      }
      return it;
    }));
  };

  const handleRemoveItem = (id) => {
    setItems(prev => prev.map(it => {
      if (it.id === id) return { ...it, return_quantity: 0 };
      return it;
    }));
  };

  const handleSaveReturn = async (saveStatus) => {
    const validItems = items.filter(it => it.return_quantity > 0);
    if (validItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm có số lượng trả > 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        purchaseOrderId: Number(poId),
        supplierId: Number(supplier?.id || po?.supplierId),
        items: validItems.map(it => ({
          productId: it.id,
          quantity: Number(it.return_quantity),
          price: Number(it.import_price),
          returnPrice: Number(it.return_price),
        })),
        paid: actualPaid,
        discount: actualDiscount,
        note: note || '',
        status: saveStatus,
        receivedBy: selectedEmployee,
        createdBy: selectedEmployee,
      };

      const res = await purchaseReturnAPI.create(payload);
      toast.success(`Tạo phiếu trả hàng nhập thành công! Mã: ${res.code || 'THN_NEW'}`);
      navigate('/purchase-returns');
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      toast.error(`Lỗi khi lưu phiếu trả hàng: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-90px)] -m-5 bg-gray-100 font-sans">
      {/* Top Action Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/purchase-orders')}
            className="flex items-center gap-2 text-gray-700 hover:text-primary font-extrabold text-lg tracking-tight cursor-pointer transition-colors border-none bg-transparent"
          >
            <ArrowLeft size={20} className="text-gray-500" />
            <span>Trả hàng nhập</span>
          </button>

          <div className="relative w-96">
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 shadow-inner gap-2">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Tìm hàng hóa theo mã hoặc tên (F3)" 
                className="w-full bg-transparent text-sm outline-none font-medium text-gray-800"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-600">
          <button className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent" title="In phiếu"><Printer size={18} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent" title="Ẩn/hiện cột"><Eye size={18} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors text-amber-600 border-none bg-transparent" title="Thông tin trợ giúp"><AlertCircle size={18} /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Table Section */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden m-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-700 text-xs font-bold border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                  <th className="py-3.5 px-4 w-12 text-center"></th>
                  <th className="py-3.5 px-4 w-16 text-center">STT</th>
                  <th className="py-3.5 px-4 w-32">Mã hàng</th>
                  <th className="py-3.5 px-4 flex-1">Tên hàng</th>
                  <th className="py-3.5 px-4 w-24 text-center">ĐVT</th>
                  <th className="py-3.5 px-4 w-36 text-right">Số lượng</th>
                  <th className="py-3.5 px-4 w-32 text-right">Giá nhập</th>
                  <th className="py-3.5 px-4 w-32 text-right">Giá trả lại</th>
                  <th className="py-3.5 px-4 w-36 text-right font-extrabold text-primary">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-100">
                {items.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => handleRemoveItem(it.id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
                        title="Xóa dòng"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">{it.sku}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 mb-1">{it.name}</div>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text"
                          value={it.note}
                          onChange={(e) => handleNoteChange(it.id, e.target.value)}
                          placeholder="Ghi chú..." 
                          className="text-[11px] text-gray-500 italic bg-transparent border-b border-dashed border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 w-48 font-medium"
                        />
                        <Edit2 size={12} className="text-gray-400" />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-gray-600 font-medium">{it.unit}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <input 
                          type="number"
                          value={it.return_quantity}
                          onChange={(e) => handleQuantityChange(it.id, e.target.value)}
                          className="w-16 py-1 px-2 text-right font-bold text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                        />
                        <span className="text-gray-400 font-medium">/{it.max_quantity}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-600">
                      {fmt(it.import_price)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input 
                        type="text"
                        value={fmt(it.return_price)}
                        onChange={(e) => handlePriceChange(it.id, e.target.value)}
                        className="w-24 py-1 px-2 text-right font-bold text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-primary text-sm">
                      {fmt(it.return_quantity * it.return_price)}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-16 text-center text-gray-400 italic font-medium">
                      Không có sản phẩm nào trong phiếu nhập này
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel Section */}
        <div className="w-[380px] bg-white border-l border-gray-200 p-6 flex flex-col justify-between shadow-lg z-10 shrink-0 overflow-y-auto">
          <div className="space-y-5">
            {/* Employee & Date */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <select 
                  value={selectedEmployee} 
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-primary appearance-none shadow-sm cursor-pointer"
                >
                  {employees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-2.5 text-gray-400 pointer-events-none text-xs">▼</div>
              </div>
              <input 
                type="datetime-local" 
                value={returnDate} 
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-36 py-2 px-2 bg-gray-50 border border-gray-300 rounded-xl text-[11px] font-bold text-gray-700 focus:outline-none focus:border-primary shadow-sm"
              />
            </div>

            {/* Supplier Info */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Nhà cung cấp</label>
              <div className="py-2.5 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 shadow-inner">
                {supplier?.name || po?.supplier?.name || 'Nhà cung cấp lẻ'}
              </div>
            </div>

            {/* Return Code */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Mã trả hàng nhập</label>
              <input 
                type="text" 
                disabled 
                placeholder="Mã phiếu tự động" 
                className="w-full py-2 px-3.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 placeholder-gray-400 shadow-inner cursor-not-allowed"
              />
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Trạng thái</label>
              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 py-1.5 px-3.5 rounded-xl inline-block shadow-sm">
                Phiếu tạm / Đã trả hàng
              </div>
            </div>

            <hr className="border-gray-100 my-2" />

            {/* Financial Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-bold">Tổng tiền hàng</span>
                <span className="font-extrabold text-gray-900 text-sm">{fmt(totalReturnGoods)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-bold">Giảm giá</span>
                <input 
                  type="text" 
                  value={discountStr === '0' ? '' : discountStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setDiscountStr(val === '' ? '0' : fmt(Number(val)));
                  }}
                  placeholder="0"
                  className="w-28 py-1.5 px-3 text-right font-bold text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-primary shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                <span className="text-gray-800 font-extrabold">Nhà cung cấp cần trả</span>
                <span className="font-extrabold text-primary text-base">{fmt(supplierMustPay)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <span className="text-gray-800 font-extrabold">Tiền nhà cung cấp trả (F8)</span>
                  <span className="text-[10px] text-gray-400 font-medium">Tiền mặt</span>
                </div>
                <input 
                  type="text" 
                  value={paidAmountStr === '' ? fmt(supplierMustPay) : paidAmountStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPaidAmountStr(val === '' ? '0' : fmt(Number(val)));
                  }}
                  className="w-32 py-2 px-3 text-right font-extrabold text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-primary shadow-sm bg-blue-50/30 text-sm"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                <span className="text-gray-600 font-bold">Tính vào công nợ</span>
                <span className="font-extrabold text-gray-900 text-sm">{fmt(debtCalculation)}</span>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Ghi chú</label>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Ghi chú..." 
                className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-primary shadow-inner resize-none font-medium"
              />
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
            <button 
              disabled={saving}
              onClick={() => handleSaveReturn('PENDING')}
              className="px-6 py-3 border border-primary text-primary hover:bg-primary/5 rounded-xl text-sm font-extrabold transition-all cursor-pointer shadow-sm disabled:opacity-50 bg-transparent"
            >
              Lưu tạm
            </button>
            <button 
              disabled={saving}
              onClick={() => handleSaveReturn('COMPLETED')}
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-extrabold transition-all cursor-pointer shadow-md disabled:opacity-50 border-none"
            >
              {saving ? 'Đang xử lý...' : 'Hoàn thành'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
