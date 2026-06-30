import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Trash2, User, X, Printer, Eye, AlertCircle, Scan, Upload, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
// Dynamic imports will be used for XLSX to speed up route loading
import Button from '../../components/ui/Button';
import NumericInput from '../../components/ui/NumericInput';
import { purchaseOrderAPI, supplierAPI, productAPI, employeeAPI } from '../../services/api';
import ProductModal from '../Products/ProductModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

const toLocalISOString = (dateOrStr) => {
  const d = dateOrStr ? new Date(dateOrStr) : new Date();
  if (isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function CreatePurchaseOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const updateId = searchParams.get('id');
  const isUpdate = searchParams.get('type') === 'update';

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  // States cho đơn nhập hàng
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [importDate, setImportDate] = useState(() => toLocalISOString(new Date()));
  
  const [poCode, setPoCode] = useState('');
  const [orderCode, setOrderCode] = useState('');
  const [status, setStatus] = useState('COMPLETED'); // PENDING | COMPLETED
  const [items, setItems] = useState([]);
  
  const [discountStr, setDiscountStr] = useState('0');
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [note, setNote] = useState('');
  
  // UI States
  const [productSearch, setProductSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Load danh mục sản phẩm, nhà cung cấp, nhân viên
  const loadData = async () => {
    try {
      const [prodRes, suppRes, empRes] = await Promise.all([
        productAPI.getAll().catch(() => []),
        supplierAPI.getAllSimple().catch(() => []),
        employeeAPI.getAll().catch(() => []),
      ]);
      const prodList = Array.isArray(prodRes) ? prodRes : (prodRes?.data || []);
      const suppList = Array.isArray(suppRes) ? suppRes : [];
      setProducts(prodList);
      setSuppliers(suppList);
      if (isUpdate && updateId) {
        const poRes = await purchaseOrderAPI.getById(updateId).catch(() => null);
        if (poRes) {
          if (poRes.supplier) setSelectedSupplier(poRes.supplier);
          if (poRes.code || poRes.po_code) setPoCode(poRes.code || poRes.po_code);
          if (poRes.note) {
            setNote(poRes.note);
          }
          if (poRes.status) setStatus(poRes.status);
          if (poRes.discount) setDiscountStr(String(poRes.discount));
          if (poRes.paid) setPaidAmountStr(String(poRes.paid));
          if (poRes.createdAt) setImportDate(toLocalISOString(poRes.createdAt));
          if (Array.isArray(poRes.items)) {
            setItems(poRes.items.map(it => ({
              id: it.productId || it.product?.id || it.id,
              sku: it.product?.sku || it.product_sku || '',
              name: it.product?.name || it.product_name || '',
              unit: it.product?.unit || it.unit || 'Cái',
              quantity: Number(it.quantity || 1),
              unit_price: Number(it.price || it.unit_price || 0),
              discount: Number(it.discount || 0),
            })));
          }
        }
      }
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu ban đầu', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [isUpdate, updateId]);

  useEffect(() => {
    if (location.state?.cloneFrom) {
      const po = location.state.cloneFrom;
      
      // Khôi phục nhà cung cấp
      if (po.supplier) {
        setSelectedSupplier(po.supplier);
      } else if (po.supplierId || po.supplier_id) {
        const matchedSup = suppliers.find(s => s.id === (po.supplierId || po.supplier_id));
        if (matchedSup) setSelectedSupplier(matchedSup);
        else setSelectedSupplier({ id: po.supplierId || po.supplier_id, name: po.supplier_name || 'NCC cũ', code: po.supplier_code || '' });
      } else if (po.supplier_name) {
        setSelectedSupplier({ name: po.supplier_name, code: po.supplier_code || '' });
      }

      // Khôi phục ghi chú, giảm giá
      if (po.note) setNote(po.note);
      if (po.discount_amount !== undefined) setDiscountStr(String(po.discount_amount));
      else if (po.discount !== undefined) setDiscountStr(String(po.discount));

      // Khôi phục items
      if (Array.isArray(po.items)) {
        setItems(po.items.map(it => ({
          id: it.productId || it.product?.id || it.id,
          sku: it.product_sku || it.product?.sku || it.sku || '',
          name: it.product_name || it.product?.name || it.name || '',
          unit: it.unit || it.product?.unit || 'Cái',
          quantity: Number(it.quantity || 1),
          unit_price: Number(it.unit_price || it.price || 0),
          discount: Number(it.discount || 0),
        })));
      }
      
      // Xoá state để không bị khôi phục lại khi reload/back
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, suppliers]);

  // Lọc sản phẩm
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products.filter(p => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [productSearch, products]);

  // Lọc nhà cung cấp
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return [];
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(s => 
      (s.name || '').toLowerCase().includes(q) || 
      (s.code || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [supplierSearch, suppliers]);

  // Thêm sản phẩm vào bảng
  const handleAddProduct = (prod) => {
    setItems(prev => {
      const ex = prev.find(i => i.id === prod.id);
      if (ex) {
        return prev.map(i => i.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        unit: prod.unit || 'Cái',
        quantity: 1,
        unit_price: prod.costPrice || prod.cost_price || 0,
        discount: 0,
      }];
    });
    setProductSearch('');
  };

  // Cập nhật dòng sản phẩm
  const handleUpdateItem = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      let num = Number(value);
      if (Number.isNaN(num) || num < 0) num = 0;
      return { ...item, [field]: num };
    }));
  };

  // Xóa dòng sản phẩm
  const handleRemoveItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Tính toán tổng tiền
  const totalGoods = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price - item.discount), 0);
  }, [items]);

  const discountVal = useMemo(() => {
    let num = Number(discountStr.replace(/[^0-9.-]+/g, ''));
    if (Number.isNaN(num)) num = 0;
    return num;
  }, [discountStr]);

  const needToPay = useMemo(() => {
    return Math.max(0, totalGoods - discountVal);
  }, [totalGoods, discountVal]);

  // Tiền trả nhà cung cấp, mặc định là 0 nếu bỏ trống
  const actualPaid = useMemo(() => {
    if (paidAmountStr === '') return 0;
    let num = Number(paidAmountStr.replace(/[^0-9.-]+/g, ''));
    if (Number.isNaN(num)) return 0;
    return num;
  }, [paidAmountStr]);

  // Xử lý import Excel
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(event.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const skuKeys = ['sku', 'ma_hang', 'mã hàng', 'ma hang', 'mã_hàng'];
        const qtyKeys = ['so_luong', 'số lượng', 'quantity', 'qty', 'sl'];
        const priceKeys = ['don_gia', 'đơn giá', 'price', 'cost_price', 'gia_nhap', 'giá nhập'];

        const normalizeKey = (k) => String(k || '').trim().toLowerCase();

        let added = 0;
        const newItems = [];

        rows.forEach(r => {
          const keys = Object.keys(r);
          const skuKey = keys.find(k => skuKeys.includes(normalizeKey(k)));
          const qtyKey = keys.find(k => qtyKeys.includes(normalizeKey(k)));
          const priceKey = keys.find(k => priceKeys.includes(normalizeKey(k)));

          if (!skuKey) return;
          const sku = String(r[skuKey] || '').trim();
          const qty = Number(r[qtyKey]) || 1;
          const price = Number(String(r[priceKey] || '').replace(/[^0-9.-]/g, ''));

          if (!sku) return;

          // Tìm sản phẩm trong danh sách
          const matched = products.find(p => (p.sku || '').toLowerCase() === sku.toLowerCase());
          if (matched) {
            added++;
            newItems.push({
              id: matched.id,
              sku: matched.sku,
              name: matched.name,
              unit: matched.unit || 'Cái',
              quantity: qty > 0 ? qty : 1,
              unit_price: !Number.isNaN(price) ? price : matched.costPrice || matched.cost_price || 0,
              discount: 0,
            });
          }
        });

        if (added > 0) {
          setItems(prev => [...prev, ...newItems]);
          toast.success(`Import thành công ${added} sản phẩm!`);
        } else {
          toast.error('Không tìm thấy mã hàng nào khớp trong hệ thống');
        }
      } catch (err) {
        toast.error('Lỗi khi đọc file Excel');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Tải file mẫu Excel
  const handleDownloadSample = async () => {
    const XLSX = await import('xlsx');
    const sampleData = [
      { 'Mã hàng': 'SP001', 'Số lượng': 10, 'Đơn giá': 7000 },
      { 'Mã hàng': 'SP002', 'Số lượng': 20, 'Đơn giá': 7000 },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MauNhapHang');
    XLSX.writeFile(wb, 'FileMau_NhapHang.xlsx');
    toast.success('Đã tải file mẫu');
  };

  // Tạo nhà cung cấp nhanh
  const handleCreateSupplier = async () => {
    const name = window.prompt('Nhập tên nhà cung cấp mới:');
    if (!name || !name.trim()) return;
    try {
      const res = await supplierAPI.create({ 
        name: name.trim(), 
        code: `NCC${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        phone: '0901234567',
        address: 'Hà Nội'
      });
      setSuppliers(prev => [...prev, res]);
      setSelectedSupplier(res);
      setSupplierSearch('');
      toast.success('Đã tạo nhà cung cấp mới');
    } catch (e) {
      toast.error('Lỗi khi tạo nhà cung cấp');
    }
  };

  // Submit Lưu tạm / Hoàn thành hoặc Lưu cập nhật
  const handleSaveOrder = async (saveStatus) => {
    if (!selectedSupplier) {
      toast.error('Vui lòng chọn nhà cung cấp');
      return;
    }
    if (items.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 sản phẩm vào phiếu nhập');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplierId: Number(selectedSupplier.id),
        items: items.map(it => ({
          productId: it.id,
          quantity: Number(it.quantity),
          price: Number(it.unit_price),
        })),
        paid: actualPaid,
        note: note || '',
        status: saveStatus, // PENDING | COMPLETED
      };

      if (isUpdate && updateId) {
        await purchaseOrderAPI.update(updateId, payload);
        toast.success(`Cập nhật phiếu nhập thành công!`);
      } else {
        const res = await purchaseOrderAPI.create(payload);
        toast.success(`Tạo phiếu nhập thành công! Mã phiếu: ${res.code || res.po_code || 'PN_NEW'}`);
      }
      navigate('/purchase-orders');
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      toast.error(`Lỗi khi lưu phiếu nhập: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintDraftPO = () => {
    if (items.length === 0) {
      toast.error('Vui lòng thêm sản phẩm trước khi in');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Bản nháp phiếu nhập hàng</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h2 { border-bottom: 2px solid #3b82f6; padding-bottom: 8px; color: #1e3a8a; text-align: center; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .items-table th, .items-table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            .items-table th { background-color: #f3f4f6; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h2>PHIẾU NHẬP HÀNG (BẢN NHÁP)</h2>
          <div style="margin-bottom: 10px;">Nhà cung cấp: <strong>${selectedSupplier?.name || 'Chưa chọn'}</strong></div>
          <div style="margin-bottom: 10px;">Ngày lập: ${new Date(importDate).toLocaleString('vi-VN')}</div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>Mã hàng</th>
                <th>Tên hàng</th>
                <th class="text-right">SL</th>
                <th class="text-right">Giá</th>
                <th class="text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => `
                <tr>
                  <td>${it.sku}</td>
                  <td>${it.name} ${it.unit ? `(${it.unit})` : ''}</td>
                  <td class="text-right">${it.quantity}</td>
                  <td class="text-right">${fmt(it.unit_price)}</td>
                  <td class="text-right">${fmt(it.quantity * it.unit_price - it.discount)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #f9fafb;">
                <td colspan="4" class="text-right">Cần trả NCC:</td>
                <td class="text-right" style="color: #1d4ed8;">${fmt(needToPay)} đ</td>
              </tr>
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Tìm hàng hóa"]');
        input?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Tìm nhà cung cấp"]');
        input?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Tiền trả nhà cung cấp"]');
        input?.focus();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleSaveOrder('COMPLETED');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, selectedSupplier, items, needToPay, paidAmountStr, note, status]);

  return (
    <div className="flex flex-col h-[calc(100vh-90px)] -m-5 bg-gray-100 font-sans">
      {/* Top Action Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/purchase-orders')}
            className="flex items-center gap-2 text-gray-700 hover:text-primary font-extrabold text-lg tracking-tight cursor-pointer transition-colors border-none bg-transparent"
          >
            <ArrowLeft size={20} /> Nhập hàng
          </button>

          {/* Product Search Bar */}
          <div className="relative w-96">
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 shadow-inner gap-2">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Tìm hàng hóa theo mã hoặc tên (F3)"
                className="w-full bg-transparent text-sm outline-none font-medium text-gray-800"
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
              <button
                onClick={() => {
                  const bc = window.prompt('Nhập hoặc quét mã vạch sản phẩm:');
                  if (!bc) return;
                  const matched = products.find(p => p.barcode === bc || p.sku === bc);
                  if (matched) {
                    handleAddProduct(matched);
                    toast.success(`Đã thêm ${matched.name}`);
                  } else {
                    toast.error('Không tìm thấy sản phẩm có mã vạch/SKU này');
                  }
                }}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer border-none bg-transparent"
                title="Quét mã vạch"
              >
                <Scan size={18} />
              </button>
              <button 
                onClick={() => setProductModalOpen(true)}
                className="p-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg cursor-pointer transition-colors border-none bg-transparent"
                title="Thêm hàng hóa mới"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Product Suggestions Dropdown */}
            {filteredProducts.length > 0 && (
              <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto z-50 divide-y divide-gray-50">
                {filteredProducts.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => handleAddProduct(p)}
                    className="p-3 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-gray-800">{p.name}</span>
                      <span className="text-xs text-primary font-bold">{p.sku} {p.barcode ? ` - ${p.barcode}` : ''}</span>
                    </div>
                    <span className="font-extrabold text-sm text-gray-700">{fmt(p.costPrice || p.cost_price || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Utility Icons */}
        <div className="flex items-center gap-2 text-gray-600">
          <button onClick={handlePrintDraftPO} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent" title="In phiếu"><Printer size={18} /></button>
          <button onClick={() => toast.success('Cột SKU, Tên, ĐVT, Số lượng, Đơn giá, Giảm giá, Thành tiền đang hiển thị mặc định')} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent" title="Ẩn/hiện cột"><Eye size={18} /></button>
          <button onClick={() => alert('Phím tắt hỗ trợ:\n- F3: Tìm hàng hóa\n- F4: Tìm nhà cung cấp\n- F8: Tiền trả nhà cung cấp\n- F9: Hoàn thành')} className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent" title="Thông tin trợ giúp"><AlertCircle size={18} /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Table / Empty State Area */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden m-4 rounded-2xl shadow-sm border border-gray-200">
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/30">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 border border-blue-100 shadow-inner">
                <FileSpreadsheet size={48} className="text-primary" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-800 mb-2 tracking-tight">Thêm sản phẩm từ file excel</h3>
              <button 
                onClick={handleDownloadSample}
                className="text-sm text-primary font-bold hover:underline mb-8 cursor-pointer bg-transparent border-none"
              >
                (Tải về file mẫu: Excel file)
              </button>

              <Button 
                variant="primary" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 py-3 px-8 text-base font-extrabold rounded-xl shadow-lg bg-primary hover:bg-primary-hover transition-all cursor-pointer"
              >
                <Upload size={20} /> Chọn file dữ liệu
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleImportExcel} 
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky top-0 z-10">
                    <th className="p-4 w-12 text-center">STT</th>
                    <th className="p-4 w-28 font-extrabold">Mã hàng</th>
                    <th className="p-4 font-extrabold">Tên hàng</th>
                    <th className="p-4 w-20 font-extrabold">ĐVT</th>
                    <th className="p-4 w-32 text-right font-extrabold">Số lượng</th>
                    <th className="p-4 w-36 text-right font-extrabold">Đơn giá</th>
                    <th className="p-4 w-32 text-right font-extrabold">Giảm giá</th>
                    <th className="p-4 w-36 text-right font-extrabold">Thành tiền</th>
                    <th className="p-4 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-center text-gray-500 font-bold">{idx + 1}</td>
                      <td className="p-4 font-bold text-primary hover:underline cursor-pointer">
                        <a href={`/products?editSku=${item.sku}`} target="_blank" rel="noopener noreferrer">
                          {item.sku}
                        </a>
                      </td>
                      <td className="p-4 font-bold text-gray-800">{item.name} {item.unit ? `(${item.unit})` : ''}</td>
                      <td className="p-4 text-gray-600">{item.unit}</td>
                      <td className="p-4 text-right">
                        <NumericInput
                          allowDecimal={true}
                          className="w-20 text-right border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm"
                          value={item.quantity}
                          onChange={e => handleUpdateItem(item.id, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="p-4 text-right">
                        <NumericInput
                          className="w-28 text-right border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm"
                          value={item.unit_price}
                          onChange={e => handleUpdateItem(item.id, 'unit_price', e.target.value)}
                        />
                      </td>
                      <td className="p-4 text-right">
                        <NumericInput
                          className="w-24 text-right border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm"
                          value={item.discount}
                          onChange={e => handleUpdateItem(item.id, 'discount', e.target.value)}
                        />
                      </td>
                      <td className="p-4 text-right font-extrabold text-primary text-base">
                        {fmt(item.quantity * item.unit_price - item.discount)}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors text-gray-400 hover:text-red-500 border-none bg-transparent"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar Area */}
        <div className="w-[360px] bg-white border-l border-gray-200 p-6 flex flex-col justify-between shadow-sm overflow-y-auto shrink-0">
          <div className="flex flex-col gap-5">
            {/* Date Row */}
            <div>
              <input 
                type="datetime-local" 
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:border-primary shadow-sm bg-white"
                value={importDate}
                onChange={e => setImportDate(e.target.value)}
              />
            </div>

            {/* Supplier Selector Box */}
            <div className="relative">
              {selectedSupplier ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-blue-50/60 border border-blue-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold shadow-md">
                        <User size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-sm text-gray-800">{selectedSupplier.name}</span>
                        <span className="text-xs text-gray-500 font-medium">{selectedSupplier.phone || selectedSupplier.code}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedSupplier(null)}
                      className="p-1.5 hover:bg-blue-100 rounded-xl cursor-pointer transition-colors text-gray-500 border-none bg-transparent"
                      title="Xóa nhà cung cấp"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="text-sm font-bold text-gray-700 px-1 mt-1">
                    Nợ: <span className={Number(selectedSupplier.debt || selectedSupplier.totalDebt || 0) !== 0 ? "text-red-600" : "text-gray-800"}>
                      {fmt(selectedSupplier.debt || selectedSupplier.totalDebt)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 shadow-inner gap-2">
                  <Search size={16} className="text-gray-400 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Tìm nhà cung cấp (F4)" 
                    className="w-full bg-transparent text-sm outline-none font-medium text-gray-800"
                    value={supplierSearch}
                    onChange={e => setSupplierSearch(e.target.value)}
                  />
                  <button 
                    onClick={handleCreateSupplier}
                    className="p-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg cursor-pointer transition-colors"
                    title="Thêm nhà cung cấp mới"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}

              {/* Supplier Suggestions Dropdown */}
              {!selectedSupplier && filteredSuppliers.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto z-50 divide-y divide-gray-50">
                  {filteredSuppliers.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => { setSelectedSupplier(s); setSupplierSearch(''); }}
                      className="p-3 hover:bg-blue-50/60 cursor-pointer flex flex-col transition-colors"
                    >
                      <span className="font-extrabold text-sm text-gray-800">{s.name}</span>
                      <span className="text-xs text-gray-500 font-medium">{s.phone} - {s.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary Fields */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Mã phiếu nhập</span>
                <input 
                  type="text" 
                  placeholder="Mã phiếu tự động" 
                  className="w-44 border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-right outline-none focus:border-primary font-bold"
                  value={poCode}
                  onChange={e => setPoCode(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Mã đặt hàng nhập</span>
                <input 
                  type="text" 
                  placeholder="" 
                  className="w-44 border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-right outline-none focus:border-primary font-bold"
                  value={orderCode}
                  onChange={e => setOrderCode(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Trạng thái</span>
                <select 
                  className="w-44 border border-gray-300 rounded px-3 py-1.5 text-xs font-bold text-primary outline-none focus:border-primary shadow-sm cursor-pointer bg-white text-right"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  <option value="COMPLETED">Hoàn thành</option>
                  <option value="PENDING">Phiếu tạm</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-gray-700">Tổng tiền hàng</span>
                <span className="font-extrabold text-base text-gray-800">{fmt(totalGoods)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Giảm giá</span>
                <NumericInput 
                  className="w-32 text-right border border-gray-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary font-bold"
                  value={discountStr}
                  onChange={e => setDiscountStr(String(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs font-extrabold text-gray-800">Cần trả nhà cung cấp</span>
                <span className="font-extrabold text-lg text-primary">{fmt(needToPay)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">Tiền trả nhà cung cấp</span>
                <NumericInput 
                  placeholder={fmt(needToPay)}
                  className="w-36 text-right border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary font-extrabold text-primary shadow-sm"
                  value={paidAmountStr === '' ? '' : paidAmountStr}
                  onChange={e => setPaidAmountStr(String(e.target.value))}
                />
              </div>

              <div>
                <textarea 
                  placeholder="Ghi chú" 
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:border-primary shadow-sm resize-none font-medium"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100 mt-4">
            {isUpdate ? (
              <button 
                onClick={() => handleSaveOrder(status)}
                disabled={saving}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-extrabold transition-all cursor-pointer shadow-md disabled:opacity-50 border-none"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            ) : (
              <>
                <button 
                  onClick={() => handleSaveOrder('PENDING')}
                  disabled={saving}
                  className="px-6 py-3 border border-primary text-primary hover:bg-primary/5 rounded-xl text-sm font-extrabold transition-all cursor-pointer shadow-sm disabled:opacity-50 bg-transparent"
                >
                  Lưu tạm
                </button>
                <button 
                  onClick={() => handleSaveOrder('COMPLETED')}
                  disabled={saving}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-extrabold transition-all cursor-pointer shadow-md disabled:opacity-50 border-none"
                >
                  {saving ? 'Đang xử lý...' : 'Hoàn thành'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal tạo hàng hóa mới */}
      <ProductModal 
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSaved={() => {
          loadData();
          toast.success('Đã thêm hàng hóa mới');
        }}
      />
    </div>
  );
}
