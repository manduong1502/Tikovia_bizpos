import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Printer, Eye, AlertCircle, Edit2, Plus, X, Scan, Upload, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Button from '../../components/ui/Button';
import { purchaseOrderAPI, purchaseReturnAPI, supplierAPI, productAPI, employeeAPI } from '../../services/api';
import ProductModal from '../Products/ProductModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);

export default function CreatePurchaseReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('poId');

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [employees, setEmployees] = useState(['Võ Thành Huy', 'Nguyễn Văn A', 'Trần Thị B']);
  
  const [po, setPo] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('Võ Thành Huy');
  const [returnDate, setReturnDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });

  const [items, setItems] = useState([]);
  const [discountStr, setDiscountStr] = useState('0');
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [note, setNote] = useState('');
  
  const [productSearch, setProductSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [poSearch, setPoSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const [importSummaryOpen, setImportSummaryOpen] = useState(false);
  const [importSummary, setImportSummary] = useState({
    totalRows: 0,
    validItems: [],
    invalidItems: [],
  });

  const loadData = async () => {
    try {
      const [prodRes, suppRes, empRes, poListRes] = await Promise.all([
        productAPI.getAll().catch(() => []),
        supplierAPI.getAllSimple().catch(() => []),
        employeeAPI.getAll().catch(() => []),
        purchaseOrderAPI.getAll({ limit: 500 }).catch(() => []),
      ]);
      const prodList = Array.isArray(prodRes) ? prodRes : (prodRes?.data || []);
      const suppList = Array.isArray(suppRes) ? suppRes : [];
      setProducts(prodList);
      setSuppliers(suppList);
      setPurchaseOrders(Array.isArray(poListRes) ? poListRes : (poListRes?.data || []));
      if (Array.isArray(empRes) && empRes.length > 0) {
        setEmployees(empRes.map(e => e.name || e.fullName || 'Võ Thành Huy'));
      }

      if (poId) {
        const poRes = await purchaseOrderAPI.getById(poId).catch(() => null);
        if (poRes) {
          setPo(poRes);
          if (poRes.supplier) setSelectedSupplier(poRes.supplier);
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
      }
    } catch (e) {
      toast.error('Lỗi khi tải dữ liệu ban đầu');
    }
  };

  useEffect(() => {
    loadData();
  }, [poId]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products.filter(p => {
      if (selectedSupplier) {
        const suppId = Number(selectedSupplier.id);
        const pSuppId = Number(p.supplierId || p.supplier_id || p.supplier?.id);
        if (pSuppId && pSuppId !== suppId) return false;
      }
      return (p.name || '').toLowerCase().includes(q) || 
             (p.sku || '').toLowerCase().includes(q) ||
             (p.barcode || '').toLowerCase().includes(q);
    }).slice(0, 8);
  }, [productSearch, products, selectedSupplier]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return [];
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(s => 
      (s.name || '').toLowerCase().includes(q) || 
      (s.code || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [supplierSearch, suppliers]);

  const filteredPOs = useMemo(() => {
    if (!poSearch.trim()) return [];
    const q = poSearch.toLowerCase();
    return purchaseOrders.filter(o => 
      (o.po_code || o.code || '').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [poSearch, purchaseOrders]);

  const handleSelectPO = async (poItem) => {
    setPoSearch('');
    try {
      const fullPo = await purchaseOrderAPI.getById(poItem.id);
      if (fullPo) {
        setPo(fullPo);
        if (fullPo.supplier) setSelectedSupplier(fullPo.supplier);
        if (Array.isArray(fullPo.items)) {
          setItems(fullPo.items.map((it, idx) => ({
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
        toast.success(`Đã chọn phiếu nhập ${fullPo.po_code || fullPo.code}`);
      }
    } catch (e) {
      toast.error('Lỗi khi lấy chi tiết phiếu nhập');
    }
  };

  const handleAddProduct = (prod) => {
    setItems(prev => {
      const ex = prev.find(i => i.id === prod.id);
      if (ex) {
        return prev.map(i => i.id === prod.id ? { ...i, return_quantity: i.return_quantity + 1 } : i);
      }
      return [...prev, {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        unit: prod.unit || 'Cái',
        max_quantity: 999999, // Đơn độc lập không giới hạn số lượng
        return_quantity: 1,
        import_price: prod.costPrice || prod.cost_price || 0,
        return_price: prod.costPrice || prod.cost_price || 0,
        note: '',
      }];
    });
    setProductSearch('');
  };

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

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const skuKeys = ['sku', 'ma_hang', 'mã hàng', 'ma hang', 'mã_hàng'];
        const qtyKeys = ['so_luong', 'số lượng', 'quantity', 'qty', 'sl'];
        const priceKeys = ['don_gia', 'đơn giá', 'price', 'cost_price', 'gia_nhap', 'giá nhập', 'giá trả', 'gia_tra'];
        const noteKeys = ['ghi_chu', 'ghi chú', 'note', 'ly_do', 'lý do'];

        const normalizeKey = (k) => String(k || '').trim().toLowerCase();

        const validItems = [];
        const invalidItems = [];

        rows.forEach((r, idx) => {
          const keys = Object.keys(r);
          const skuKey = keys.find(k => skuKeys.includes(normalizeKey(k)));
          const qtyKey = keys.find(k => qtyKeys.includes(normalizeKey(k)));
          const priceKey = keys.find(k => priceKeys.includes(normalizeKey(k)));
          const noteKey = keys.find(k => noteKeys.includes(normalizeKey(k)));

          const sku = skuKey ? String(r[skuKey] || '').trim() : '';
          const rawQty = qtyKey ? Number(r[qtyKey]) : 1;
          const qty = Number.isNaN(rawQty) || rawQty <= 0 ? 1 : rawQty;
          const priceVal = priceKey ? Number(String(r[priceKey] || '').replace(/[^0-9.-]/g, '')) : NaN;
          const itemNote = noteKey ? String(r[noteKey] || '').trim() : '';

          if (!sku) {
            invalidItems.push({ row: idx + 2, sku: '[Trống]', reason: 'Không tìm thấy mã hàng (SKU)' });
            return;
          }

          const matched = products.find(p => (p.sku || '').toLowerCase() === sku.toLowerCase());
          if (!matched) {
            invalidItems.push({ row: idx + 2, sku, reason: 'Mã hàng không tồn tại trong hệ thống' });
            return;
          }

          if (selectedSupplier) {
            const suppId = Number(selectedSupplier.id);
            const pSuppId = Number(matched.supplierId || matched.supplier_id || matched.supplier?.id);
            if (pSuppId && pSuppId !== suppId) {
              invalidItems.push({ row: idx + 2, sku, reason: `Mã hàng không thuộc nhà cung cấp "${selectedSupplier.name}"` });
              return;
            }
          }

          const finalPrice = !Number.isNaN(priceVal) ? priceVal : Number(matched.costPrice || matched.cost_price || 0);

          const existing = validItems.find(it => it.id === matched.id);
          if (existing) {
            existing.return_quantity += qty;
            if (itemNote) existing.note = existing.note ? `${existing.note}; ${itemNote}` : itemNote;
          } else {
            validItems.push({
              id: matched.id,
              sku: matched.sku,
              name: matched.name,
              unit: matched.unit || 'Cái',
              max_quantity: 999999,
              return_quantity: qty,
              import_price: finalPrice,
              return_price: finalPrice,
              note: itemNote,
            });
          }
        });

        setImportSummary({
          totalRows: rows.length,
          validItems,
          invalidItems,
        });
        setImportSummaryOpen(true);

      } catch (err) {
        toast.error('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    if (importSummary.validItems.length === 0) {
      toast.error('Không có sản phẩm hợp lệ nào để thêm!');
      return;
    }

    setItems(prev => {
      const combined = [...prev];
      importSummary.validItems.forEach(newItem => {
        const ex = combined.find(it => it.id === newItem.id);
        if (ex) {
          ex.return_quantity += newItem.return_quantity;
          if (newItem.note) ex.note = ex.note ? `${ex.note}; ${newItem.note}` : newItem.note;
        } else {
          combined.push(newItem);
        }
      });
      return combined;
    });

    toast.success(`Đã thêm thành công ${importSummary.validItems.length} sản phẩm vào phiếu trả hàng!`);
    setImportSummaryOpen(false);
  };

  const handleDownloadSample = () => {
    const sampleData = [
      { 'Mã hàng': 'SP001', 'Số lượng': 5, 'Đơn giá': 150000, 'Ghi chú': 'Hàng lỗi kỹ thuật' },
      { 'Mã hàng': 'SP002', 'Số lượng': 10, 'Đơn giá': 85000, 'Ghi chú': 'Hàng cận date' },
      { 'Mã hàng': 'SP003', 'Số lượng': 2, 'Đơn giá': '', 'Ghi chú': 'Để trống đơn giá sẽ lấy giá vốn' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    
    ws['!cols'] = [
      { wch: 15 }, // Mã hàng
      { wch: 12 }, // Số lượng
      { wch: 15 }, // Đơn giá
      { wch: 35 }, // Ghi chú
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MauTraHangNhap');
    XLSX.writeFile(wb, 'FileMau_TraHangNhap.xlsx');
    toast.success('Đã tải file mẫu Excel thành công');
  };

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
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleSaveReturn = async (saveStatus) => {
    if (!selectedSupplier) {
      toast.error('Vui lòng chọn nhà cung cấp');
      return;
    }

    const validItems = items.filter(it => it.return_quantity > 0);
    if (validItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm có số lượng trả > 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        purchaseOrderId: poId ? Number(poId) : null,
        supplierId: Number(selectedSupplier.id),
        items: validItems.map(it => ({
          productId: it.id,
          quantity: Number(it.return_quantity),
          unit: it.unit || 'Cái',
          price: Number(it.import_price),
          returnPrice: Number(it.return_price),
          note: it.note || '',
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
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/purchase-returns')}
            className="flex items-center gap-2 text-gray-700 hover:text-primary font-extrabold text-lg tracking-tight cursor-pointer transition-colors border-none bg-transparent"
          >
            <ArrowLeft size={20} className="text-gray-500" />
            <span>Trả hàng nhập</span>
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
              <button className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer border-none bg-transparent" title="Quét mã vạch">
                <Scan size={18} />
              </button>
              <button 
                onClick={() => setProductModalOpen(true)}
                className="p-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg cursor-pointer transition-colors border-none"
                title="Thêm hàng hóa mới"
              >
                <Plus size={18} />
              </button>
            </div>

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

        <div className="flex items-center gap-2 text-gray-600">
          <button className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent" title="In phiếu"><Printer size={18} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors border-none bg-transparent" title="Ẩn/hiện cột"><Eye size={18} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors text-amber-600 border-none bg-transparent" title="Thông tin trợ giúp"><AlertCircle size={18} /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Table Section / Empty State */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden m-4 rounded-2xl shadow-sm border border-gray-200">
          {items.length > 0 ? (
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
                          {poId && <span className="text-gray-400 font-medium">/{it.max_quantity}</span>}
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
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-primary shadow-inner">
                <FileSpreadsheet size={40} />
              </div>
              <h3 className="text-base font-extrabold text-gray-800 mb-1">Thêm sản phẩm từ file excel</h3>
              <button 
                onClick={handleDownloadSample}
                className="text-xs text-primary hover:underline font-bold mb-6 cursor-pointer border-none bg-transparent"
              >
                (Tải về file mẫu: Excel file)
              </button>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportExcel} 
                accept=".xlsx, .xls" 
                className="hidden" 
              />
              <Button 
                variant="primary" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 font-extrabold px-6 py-3 shadow-md bg-primary hover:bg-primary-hover rounded-xl cursor-pointer border-none"
              >
                <Upload size={18} /> Chọn file dữ liệu
              </Button>
            </div>
          )}
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
                  className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-300 rounded text-xs font-bold text-gray-800 focus:outline-none focus:border-primary appearance-none shadow-sm cursor-pointer"
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

            {/* Supplier Search / Info */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Nhà cung cấp</label>
              <div className="relative">
                {selectedSupplier ? (
                  <div className="flex items-center justify-between bg-blue-50/50 border border-blue-200 rounded-xl p-2.5 shadow-inner">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-gray-800">{selectedSupplier.name}</span>
                      <span className="text-xs text-gray-500 font-medium">{selectedSupplier.phone || selectedSupplier.code}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedSupplier(null)} 
                      className="p-1.5 hover:bg-blue-100 rounded-xl cursor-pointer transition-colors text-gray-500 border-none bg-transparent"
                      title="Xóa nhà cung cấp"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 shadow-inner gap-2">
                    <Search size={16} className="text-gray-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Tìm nhà cung cấp" 
                      className="w-full bg-transparent text-sm outline-none font-medium text-gray-800"
                      value={supplierSearch}
                      onChange={e => setSupplierSearch(e.target.value)}
                    />
                    <button 
                      onClick={handleCreateSupplier}
                      className="p-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg cursor-pointer transition-colors border-none"
                      title="Thêm nhà cung cấp mới"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}

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
            </div>

            {/* Purchase Order Search */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Chọn phiếu nhập (Tùy chọn)</label>
              <div className="relative">
                {po ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 shadow-inner">
                    <span className="font-extrabold text-sm text-emerald-800">{po.po_code || po.code}</span>
                    <button 
                      onClick={() => {
                        setPo(null);
                        setItems([]);
                        setSelectedSupplier(null);
                      }} 
                      className="p-1.5 hover:bg-emerald-100 rounded-xl cursor-pointer transition-colors text-emerald-600 border-none bg-transparent"
                      title="Bỏ chọn phiếu nhập"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 shadow-inner gap-2">
                    <Search size={16} className="text-gray-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Tìm theo mã phiếu nhập..." 
                      className="w-full bg-transparent text-sm outline-none font-medium text-gray-800"
                      value={poSearch}
                      onChange={e => setPoSearch(e.target.value)}
                    />
                  </div>
                )}

                {!po && filteredPOs.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto z-50 divide-y divide-gray-50">
                    {filteredPOs.map(o => (
                      <div 
                        key={o.id}
                        onClick={() => handleSelectPO(o)}
                        className="p-3 hover:bg-blue-50/60 cursor-pointer flex flex-col transition-colors"
                      >
                        <span className="font-extrabold text-sm text-gray-800">{o.po_code || o.code}</span>
                        <span className="text-xs text-gray-500 font-medium">{o.created_at ? new Date(o.created_at).toLocaleString('vi-VN') : ''} - {o.supplier_name || o.supplier?.name}</span>
                      </div>
                    ))}
                  </div>
                )}
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
                <span className="text- font-bold">Tính vào công nợ</span>
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

      {/* Modal Báo cáo & Xác nhận Import Excel */}
      {importSummaryOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-blue-600 px-6 py-4 flex items-center justify-between text-white shadow-md">
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={24} className="text-white" />
                <h2 className="text-lg font-extrabold tracking-tight">Kết quả xử lý file Excel</h2>
              </div>
              <button 
                onClick={() => setImportSummaryOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-xs font-bold text-gray-500 mb-1">Tổng dòng dữ liệu</span>
                  <span className="text-2xl font-extrabold text-gray-800">{importSummary.totalRows}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-xs font-bold text-emerald-600 mb-1">Dòng hợp lệ</span>
                  <span className="text-2xl font-extrabold text-emerald-700">{importSummary.validItems.length}</span>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-xs font-bold text-rose-600 mb-1">Dòng lỗi / Bỏ qua</span>
                  <span className="text-2xl font-extrabold text-rose-700">{importSummary.invalidItems.length}</span>
                </div>
              </div>

              {/* Danh sách hợp lệ */}
              {importSummary.validItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-extrabold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Sản phẩm hợp lệ sẵn sàng thêm ({importSummary.validItems.length})
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-inner max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 sticky top-0">
                          <th className="py-2.5 px-4 w-28">Mã hàng</th>
                          <th className="py-2.5 px-4 flex-1">Tên hàng</th>
                          <th className="py-2.5 px-4 w-20 text-center">ĐVT</th>
                          <th className="py-2.5 px-4 w-24 text-right">Số lượng</th>
                          <th className="py-2.5 px-4 w-28 text-right">Đơn giá</th>
                          <th className="py-2.5 px-4 w-36">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white font-medium">
                        {importSummary.validItems.map((it) => (
                          <tr key={it.id} className="hover:bg-gray-50/80">
                            <td className="py-2 px-4 font-bold text-gray-900">{it.sku}</td>
                            <td className="py-2 px-4 text-gray-800">{it.name}</td>
                            <td className="py-2 px-4 text-center text-gray-600">{it.unit}</td>
                            <td className="py-2 px-4 text-right font-extrabold text-primary">{it.return_quantity}</td>
                            <td className="py-2 px-4 text-right text-gray-700">{fmt(it.return_price)}</td>
                            <td className="py-2 px-4 text-gray-500 italic truncate max-w-xs">{it.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Danh sách lỗi */}
              {importSummary.invalidItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-extrabold text-rose-600 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Danh sách dòng lỗi không thể thêm ({importSummary.invalidItems.length})
                  </h3>
                  <div className="border border-rose-200 rounded-xl overflow-hidden shadow-inner max-h-52 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-rose-50/80 text-rose-800 font-bold border-b border-rose-200 sticky top-0">
                          <th className="py-2 px-4 w-20 text-center">Dòng Excel</th>
                          <th className="py-2 px-4 w-32">Mã hàng (SKU)</th>
                          <th className="py-2 px-4 flex-1">Chi tiết lỗi / Nguyên nhân</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-white font-medium">
                        {importSummary.invalidItems.map((err, i) => (
                          <tr key={i} className="hover:bg-rose-50/30 text-rose-900">
                            <td className="py-2 px-4 text-center font-bold text-rose-700">#{err.row}</td>
                            <td className="py-2 px-4 font-bold">{err.sku}</td>
                            <td className="py-2 px-4 flex items-center gap-1.5 text-rose-600">
                              <AlertCircle size={14} className="shrink-0" />
                              <span>{err.reason}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 shadow-sm">
              <button 
                onClick={() => setImportSummaryOpen(false)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none bg-transparent"
              >
                Hủy bỏ
              </button>
              <button 
                disabled={importSummary.validItems.length === 0}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-md disabled:opacity-50 border-none flex items-center gap-2"
              >
                <Plus size={16} /> Xác nhận đưa vào phiếu
              </button>
            </div>
          </div>
        </div>
      )}

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
