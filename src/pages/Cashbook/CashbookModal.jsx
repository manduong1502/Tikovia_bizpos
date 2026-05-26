import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, Calendar, Clock, HelpCircle, ChevronDown, Check } from 'lucide-react';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { cashbookAPI, customerAPI, supplierAPI } from '../../services/api';
import NumericInput from '../../components/ui/NumericInput';

export default function CashbookModal({ open, onClose, onSaved, type = 'thu' }) {
  const isThu = type === 'thu';

  // Core Form States
  const [form, setForm] = useState({
    code: '',
    amount: '',
    category: isThu ? 'Chuyển/Rút' : 'Chọn loại chi',
    payer_name: '',
    payer_phone: '',
    payer_address: '',
    partnerType: 'other', // other, customer, supplier, staff, delivery
    payment_method: 'cash',
    note: '',
    isAccounting: true,
    createdBy: 'Võ Thành Huy',
    time: new Date().toLocaleString('vi-VN', { hour12: false }),
    bankAccount: 'Chọn tài khoản'
  });

  // Dropdown UI toggle states
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showPartnerTypeDropdown, setShowPartnerTypeDropdown] = useState(false);

  // Autocomplete suggestions states
  const [partnerSuggestions, setPartnerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);

  // Sub-modal (Tạo đối tượng nhận/nộp) states
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    phone: '',
    address: '',
    province: '',
    ward: '',
    note: ''
  });

  const [saving, setSaving] = useState(false);

  const catRef = useRef(null);
  const accRef = useRef(null);
  const partRef = useRef(null);
  const partnerSearchRef = useRef(null);

  // Predefined Categories
  const baseIncomeCategories = ['Thu nhập khác', 'Chuyển/Rút'];
  const baseExpenseCategories = [
    'Chi phí khác',
    'Chuyển/Rút',
    'Chi phí điện',
    'Chi phí hội nghị, sự kiện, công tác phí'
  ];

  const [incomeCategories, setIncomeCategories] = useState(baseIncomeCategories);
  const [expenseCategories, setExpenseCategories] = useState(baseExpenseCategories);

  // Predefined Bank Accounts
  const [bankAccounts, setBankAccounts] = useState(['Techcombank - 1903xxx', 'Vietcombank - 0071xxx']);

  // Reset form when modal opens or types change
  useEffect(() => {
    if (open) {
      setForm({
        code: '',
        amount: '',
        category: isThu ? 'Chuyển/Rút' : 'Chi phí khác',
        payer_name: '',
        payer_phone: '',
        payer_address: '',
        partnerType: 'other',
        payment_method: 'cash',
        note: '',
        isAccounting: true,
        createdBy: 'Võ Thành Huy',
        time: new Date().toLocaleString('vi-VN', { hour12: false }),
        bankAccount: 'Chọn tài khoản'
      });
      setShowCatDropdown(false);
      setShowAccountDropdown(false);
      setShowPartnerTypeDropdown(false);
      setSelectedPartnerId(null);
      setPartnerSuggestions([]);
      setShowSuggestions(false);
    }
  }, [open, type, isThu]);

  // Click outside listener for custom dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (catRef.current && !catRef.current.contains(event.target)) setShowCatDropdown(false);
      if (accRef.current && !accRef.current.contains(event.target)) setShowAccountDropdown(false);
      if (partRef.current && !partRef.current.contains(event.target)) setShowPartnerTypeDropdown(false);
      if (partnerSearchRef.current && !partnerSearchRef.current.contains(event.target)) setShowSuggestions(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!open) return null;

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handlePartnerSearch = async (val) => {
    f('payer_name', val);
    setSelectedPartnerId(null);
    if (!val || val.trim().length === 0) {
      setPartnerSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      if (form.partnerType === 'customer') {
        const res = await customerAPI.getAll({ search: val, limit: 10 });
        const list = Array.isArray(res) ? res : (res?.data || []);
        setPartnerSuggestions(list);
        setShowSuggestions(list.length > 0);
      } else if (form.partnerType === 'supplier') {
        const res = await supplierAPI.getAll({ search: val, limit: 10 });
        const list = Array.isArray(res) ? res : (res?.data || []);
        setPartnerSuggestions(list);
        setShowSuggestions(list.length > 0);
      } else {
        setPartnerSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error(err);
      setPartnerSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectPartner = (partner) => {
    f('payer_name', partner.name);
    f('payer_phone', partner.phone || '');
    f('payer_address', partner.address || '');
    setSelectedPartnerId(partner.id);
    setPartnerSuggestions([]);
    setShowSuggestions(false);
  };

  const handlePartnerTypeChange = (type) => {
    f('partnerType', type);
    f('payer_name', '');
    f('payer_phone', '');
    f('payer_address', '');
    setSelectedPartnerId(null);
    setPartnerSuggestions([]);
    setShowSuggestions(false);
  };

  // Form submission
  const handleSubmit = async (shouldPrint = false) => {
    if (!form.amount || Number(form.amount) <= 0) { 
      toast.error('Số tiền phải > 0'); 
      return; 
    }
    if (!form.payer_name) {
      toast.error(`Vui lòng nhập tên người ${isThu ? 'nộp' : 'nhận'}`);
      return;
    }

    setSaving(true);
    try {
      await cashbookAPI.create({
        type: isThu ? 'thu' : 'chi',
        amount: Number(form.amount),
        category: form.category,
        partnerType: form.partnerType,
        partnerName: form.payer_name,
        partnerPhone: form.payer_phone,
        partnerAddress: form.payer_address,
        paymentMethod: form.payment_method,
        isAccounting: form.isAccounting,
        note: form.note,
        branch: 'Chi nhánh trung tâm',
        createdBy: form.createdBy,
        customerId: form.partnerType === 'customer' ? selectedPartnerId : null,
        supplierId: form.partnerType === 'supplier' ? selectedPartnerId : null,
      });

      toast.success(`Tạo phiếu ${isThu ? 'thu' : 'chi'} thành công ${shouldPrint ? '& Đã in' : ''}`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu phiếu');
    } finally {
      setSaving(false);
    }
  };

  // Sub-modal handler to save new custom partner
  const handleSavePartner = async () => {
    if (!partnerForm.name) {
      toast.error('Tên đối tượng là bắt buộc');
      return;
    }
    try {
      await cashbookAPI.createPartner(partnerForm);
      // Populate fields into the main modal
      f('payer_name', partnerForm.name);
      if (partnerForm.phone) f('payer_phone', partnerForm.phone);
      if (partnerForm.address) {
        const fullAddr = [partnerForm.address, partnerForm.ward, partnerForm.province].filter(Boolean).join(', ');
        f('payer_address', fullAddr);
      }
      toast.success('Thêm đối tượng thành công');
      setPartnerModalOpen(false);
      // Reset sub-modal form
      setPartnerForm({ name: '', phone: '', address: '', province: '', ward: '', note: '' });
    } catch {
      // Fallback locally
      f('payer_name', partnerForm.name);
      if (partnerForm.phone) f('payer_phone', partnerForm.phone);
      if (partnerForm.address) {
        const fullAddr = [partnerForm.address, partnerForm.ward, partnerForm.province].filter(Boolean).join(', ');
        f('payer_address', fullAddr);
      }
      toast.success('Thêm đối tượng thành công (giả lập)');
      setPartnerModalOpen(false);
      setPartnerForm({ name: '', phone: '', address: '', province: '', ward: '', note: '' });
    }
  };

  // Add quick categories in popover
  const handleAddNewCategory = () => {
    if (!catSearch) return;
    if (isThu) {
      setIncomeCategories(p => [...p, catSearch]);
      f('category', catSearch);
    } else {
      setExpenseCategories(p => [...p, catSearch]);
      f('category', catSearch);
    }
    setCatSearch('');
    setShowCatDropdown(false);
    toast.success('Đã thêm loại thu/chi mới');
  };

  // Add quick bank accounts in popover
  const handleAddNewAccount = () => {
    const accName = prompt('Nhập tên tài khoản nộp mới:');
    if (!accName) return;
    setBankAccounts(p => [...p, accName]);
    f('bankAccount', accName);
    setShowAccountDropdown(false);
    toast.success('Đã thêm tài khoản mới');
  };

  const partnerTypes = [
    { key: 'customer', label: 'Khách hàng' },
    { key: 'supplier', label: 'Nhà cung cấp' },
    { key: 'staff', label: 'Nhân viên' },
    { key: 'delivery', label: 'Đối tác giao hàng' },
    { key: 'other', label: 'Khác' }
  ];

  const currentCategories = isThu ? incomeCategories : expenseCategories;
  const filteredCats = currentCategories.filter(c => c.toLowerCase().includes(catSearch.toLowerCase()));

  return (
    <>
      {/* Main Receipt/Payment Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
        <div 
          className="bg-white rounded-2xl shadow-2xl w-[92%] max-w-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-extrabold text-gray-800 tracking-tight m-0">
              {isThu ? 'Tạo phiếu thu tiền mặt' : 'Tạo phiếu chi tiền mặt'}
            </h2>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border-none bg-transparent"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Mã phiếu */}
              <div>
                <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Mã phiếu</label>
                <input 
                  type="text" 
                  placeholder="Tự động"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none bg-gray-50 focus:bg-white focus:border-primary transition-all"
                  value={form.code}
                  onChange={e => f('code', e.target.value)}
                />
              </div>

              {/* Thời gian */}
              <div>
                <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Thời gian</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="w-full border border-gray-200 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold outline-none bg-gray-50 focus:bg-white focus:border-primary transition-all"
                    value={form.time}
                    onChange={e => f('time', e.target.value)}
                  />
                  <Calendar size={14} className="absolute right-3.5 top-2.5 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Loại thu / Loại chi Custom Dropdown */}
              <div className="relative" ref={catRef}>
                <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">
                  Loại {isThu ? 'thu' : 'chi'}
                </label>
                <div 
                  onClick={() => setShowCatDropdown(!showCatDropdown)}
                  className="flex items-center justify-between w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold bg-white outline-none cursor-pointer hover:border-gray-300 transition-all select-none"
                >
                  <span className="truncate">{form.category}</span>
                  <ChevronDown size={14} className="text-gray-400 shrink-0" />
                </div>

                {/* Popover Dropdown menu */}
                {showCatDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 animate-slide-down flex flex-col max-h-[220px]">
                    <div className="px-3 pb-2 pt-1 border-b border-gray-100 flex items-center gap-1.5">
                      <Search size={12} className="text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm"
                        className="w-full border-none outline-none text-xs font-semibold p-0 bg-transparent"
                        value={catSearch}
                        onChange={e => setCatSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                      {filteredCats.map(cat => (
                        <div 
                          key={cat}
                          onClick={() => {
                            f('category', cat);
                            setShowCatDropdown(false);
                          }}
                          className="px-3.5 py-2 text-xs font-semibold hover:bg-blue-50/50 hover:text-primary transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span>{cat}</span>
                          {form.category === cat && <Check size={12} className="text-primary" />}
                        </div>
                      ))}
                      {filteredCats.length === 0 && (
                        <div className="px-3.5 py-3 text-xs text-gray-400 font-semibold text-center italic">
                          Không tìm thấy loại {isThu ? 'thu' : 'chi'}
                        </div>
                      )}
                    </div>
                    {catSearch && !currentCategories.includes(catSearch) && (
                      <div 
                        onClick={handleAddNewCategory}
                        className="mt-1 px-3.5 py-2 border-t border-gray-100 text-xs font-bold text-primary hover:bg-blue-50 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} /> Tạo mới "{catSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Người thu / Người chi Dropdown */}
              <div>
                <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">
                  Người {isThu ? 'thu' : 'chi'}
                </label>
                <select 
                  className="w-full border border-gray-200 rounded px-3.5 py-2 text-xs font-bold bg-white outline-none cursor-pointer hover:border-gray-300 transition-all"
                  value={form.createdBy}
                  onChange={e => f('createdBy', e.target.value)}
                >
                  <option>Võ Thành Huy</option>
                  <option>Nguyễn Văn A</option>
                </select>
              </div>
            </div>

            {/* Tài khoản nộp (Only for Phiếu thu) */}
            {isThu && (
              <div className="relative" ref={accRef}>
                <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Tài khoản nộp</label>
                <div 
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center justify-between w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-bold bg-white outline-none cursor-pointer hover:border-gray-300 transition-all select-none"
                >
                  <span className="truncate">{form.bankAccount}</span>
                  <ChevronDown size={14} className="text-gray-400 shrink-0" />
                </div>

                {showAccountDropdown && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-2 animate-slide-down flex flex-col max-h-[200px]">
                    <div 
                      onClick={() => {
                        f('bankAccount', 'Chọn tài khoản');
                        setShowAccountDropdown(false);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold hover:bg-blue-50/50 hover:text-primary transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span>Chọn tài khoản</span>
                      {form.bankAccount === 'Chọn tài khoản' && <Check size={12} className="text-primary" />}
                    </div>
                    {bankAccounts.map(acc => (
                      <div 
                        key={acc}
                        onClick={() => {
                          f('bankAccount', acc);
                          setShowAccountDropdown(false);
                        }}
                        className="px-3.5 py-2 text-xs font-semibold hover:bg-blue-50/50 hover:text-primary transition-all flex items-center justify-between cursor-pointer"
                      >
                        <span>{acc}</span>
                        {form.bankAccount === acc && <Check size={12} className="text-primary" />}
                      </div>
                    ))}
                    <div 
                      onClick={handleAddNewAccount}
                      className="mt-1 px-3.5 py-2 border-t border-gray-100 text-xs font-bold text-primary hover:bg-blue-50 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Thêm tài khoản nộp
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Đối tượng nhận/nộp & Tên người nhận/nộp */}
            <div>
              <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">
                Người {isThu ? 'nộp' : 'nhận'}
              </label>
              <div className="flex gap-2">
                {/* Phân loại đối tượng */}
                <div className="relative w-1/3" ref={partRef}>
                  <div 
                    onClick={() => setShowPartnerTypeDropdown(!showPartnerTypeDropdown)}
                    className="flex items-center justify-between w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold bg-white cursor-pointer select-none"
                  >
                    <span className="truncate">{partnerTypes.find(t => t.key === form.partnerType)?.label || 'Khác'}</span>
                    <ChevronDown size={12} className="text-gray-400 shrink-0" />
                  </div>
                  {showPartnerTypeDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
                      {partnerTypes.map(t => (
                        <div 
                          key={t.key}
                          onClick={() => {
                            handlePartnerTypeChange(t.key);
                            setShowPartnerTypeDropdown(false);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold hover:bg-blue-50 hover:text-primary cursor-pointer transition-colors"
                        >
                          {t.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tên & Nút tạo mới */}
                <div className="flex-1 flex flex-col gap-1 relative" ref={partnerSearchRef}>
                  <input 
                    type="text" 
                    placeholder={`Tìm hoặc nhập tên người ${isThu ? 'nộp' : 'nhận'}`}
                    className="w-full border border-gray-200 rounded-xl pl-3.5 pr-20 py-2.5 text-xs font-semibold outline-none focus:border-primary transition-all"
                    value={form.payer_name}
                    onChange={e => handlePartnerSearch(e.target.value)}
                    onFocus={() => {
                      if (partnerSuggestions.length > 0) setShowSuggestions(true);
                    }}
                  />
                  <button 
                    onClick={() => setPartnerModalOpen(true)}
                    className="absolute right-3.5 top-2.5 border-none bg-transparent text-xs font-extrabold text-primary hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Tạo mới
                  </button>

                  {/* Suggestions Autocomplete Dropdown */}
                  {showSuggestions && partnerSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {partnerSuggestions.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => handleSelectPartner(p)}
                          className="px-3.5 py-2 hover:bg-blue-50/50 cursor-pointer transition-all flex flex-col gap-0.5 border-b border-gray-50 last:border-none"
                        >
                          <span className="text-xs font-bold text-gray-800">{p.name} ({p.code || `KH${String(p.id).padStart(6, '0')}`})</span>
                          {p.phone && <span className="text-[10px] text-gray-500 font-semibold">SĐT: {p.phone}</span>}
                          {p.address && <span className="text-[10px] text-gray-400 truncate">{p.address}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Số tiền */}
            <div>
              <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Số tiền *</label>
              <NumericInput 
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-right text-sm font-black outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                value={form.amount} 
                onChange={e => f('amount', e.target.value)} 
                placeholder="0" 
              />
            </div>

            {/* Ghi chú */}
            <div>
              <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Ghi chú</label>
              <textarea 
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm resize-y min-h-[60px]" 
                value={form.note} 
                onChange={e => f('note', e.target.value)} 
                placeholder="Nhập ghi chú"
              />
            </div>

            {/* Checkbox Hạch toán kết quả kinh doanh */}
            <div className="flex items-center gap-2.5 pt-1">
              <input 
                type="checkbox" 
                id="isAccountingCheck"
                className="w-4 h-4 rounded text-primary focus:ring-primary border-gray-300 cursor-pointer"
                checked={form.isAccounting}
                onChange={e => f('isAccounting', e.target.checked)}
              />
              <label htmlFor="isAccountingCheck" className="text-xs font-extrabold text-gray-600 flex items-center gap-1 cursor-pointer select-none">
                Hạch toán kết quả kinh doanh <HelpCircle size={13} className="text-gray-400" title="Nếu bật, lượng tiền này sẽ được tính vào doanh thu/chi phí kinh doanh tổng" />
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Bỏ qua
            </button>
            <button 
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="px-4 py-2 text-xs sm:text-sm font-bold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Lưu & In
            </button>
            <Button 
              variant="primary" 
              onClick={() => handleSubmit(false)} 
              disabled={saving} 
              className={`shadow-md border-none px-5 rounded-xl cursor-pointer ${isThu ? 'bg-gradient-to-r from-primary to-blue-600' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-modal: Tạo đối tượng nhận/nộp mới */}
      {partnerModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 animate-fade-in" onClick={() => setPartnerModalOpen(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-md overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Title */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-extrabold text-gray-800 m-0">
                Tạo người {isThu ? 'nộp' : 'nhận'}
              </h3>
              <button 
                onClick={() => setPartnerModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer border-none bg-transparent"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Fields */}
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">
                  Tên người {isThu ? 'nộp' : 'nhận'} *
                </label>
                <input 
                  type="text" 
                  placeholder="Bắt buộc"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-primary transition-all"
                  value={partnerForm.name}
                  onChange={e => setPartnerForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Điện thoại</label>
                <input 
                  type="text" 
                  placeholder="Nhập số điện thoại"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-primary transition-all"
                  value={partnerForm.phone}
                  onChange={e => setPartnerForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Địa chỉ</label>
                <input 
                  type="text" 
                  placeholder="Nhập địa chỉ"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-primary transition-all"
                  value={partnerForm.address}
                  onChange={e => setPartnerForm(p => ({ ...p, address: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Khu vực</label>
                  <input 
                    type="text" 
                    placeholder="Chọn Tỉnh/Thành phố"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-primary transition-all"
                    value={partnerForm.province}
                    onChange={e => setPartnerForm(p => ({ ...p, province: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Phường/Xã</label>
                  <input 
                    type="text" 
                    placeholder="Chọn Phường/Xã"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-primary transition-all"
                    value={partnerForm.ward}
                    onChange={e => setPartnerForm(p => ({ ...p, ward: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 block">Ghi chú</label>
                <textarea 
                  placeholder="Nhập ghi chú"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:border-primary transition-all resize-y min-h-[50px]"
                  value={partnerForm.note}
                  onChange={e => setPartnerForm(p => ({ ...p, note: e.target.value }))}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
              <button 
                onClick={() => setPartnerModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-bold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Bỏ qua
              </button>
              <button 
                onClick={handleSavePartner}
                className="px-4 py-1.5 text-xs font-bold bg-primary hover:bg-blue-600 text-white rounded-xl transition-all shadow-md border-none cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
