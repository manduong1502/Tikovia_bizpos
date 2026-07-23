import { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { customerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Save, X } from 'lucide-react';
import NumericInput from '../../components/ui/NumericInput';

const FormField = ({ label, required, children }) => (
  <div>
    <label className="text-sm font-bold text-gray-700 mb-1.5 block tracking-tight">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
  </div>
);

export default function CustomerModal({ open, onClose, customer = null, onSaved }) {
  const isEdit = !!customer;
  const [saving, setSaving] = useState(false);
  const [existingNames, setExistingNames] = useState([]);
  const [nameError, setNameError] = useState('');

  const mapRef = useRef(null);
  const mapId = `customer-map-${customer?.id || 'new'}`;

  const [form, setForm] = useState({
    name: '', code: '', phone: '', email: '', address: '', note: '',
    customerType: 'Cá nhân', branch: 'Chi nhánh trung tâm',
    totalDebt: 0, totalSpent: 0, isActive: true,
    latitude: null, longitude: null,
  });

  useEffect(() => {
    if (open) {
      customerAPI.getAllSimple().then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        setExistingNames(list.map(c => c.name.trim().toLowerCase()));
      }).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '',
        code: customer.code || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        note: customer.note || '',
        customerType: customer.customerType || 'Cá nhân',
        branch: customer.branch || 'Chi nhánh trung tâm',
        totalDebt: customer.totalDebt || customer.debt || 0,
        totalSpent: customer.totalSpent || customer.total_spent || 0,
        isActive: customer.isActive !== undefined ? customer.isActive : true,
        latitude: customer.latitude || null,
        longitude: customer.longitude || null,
      });
    } else {
      setForm({
        name: '', code: '', phone: '', email: '', address: '', note: '',
        customerType: 'Cá nhân', branch: 'Chi nhánh trung tâm',
        totalDebt: 0, totalSpent: 0, isActive: true,
        latitude: null, longitude: null,
      });
    }
  }, [customer, open]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(() => {
      const L = window.L;
      if (!L) return;

      const mapContainer = document.getElementById(mapId);
      if (!mapContainer) return;

      // Fix default Leaflet icon paths in React bundle environment
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const initialLat = Number(form.latitude) || 16.047079;
      const initialLng = Number(form.longitude) || 108.206230;

      const map = L.map(mapId).setView([initialLat, initialLng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

      // Handle marker drag
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setForm(p => ({ ...p, latitude: pos.lat, longitude: pos.lng }));
      });

      // Handle map click
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setForm(p => ({ ...p, latitude: e.latlng.lat, longitude: e.latlng.lng }));
      });

      mapRef.current = { map, marker };
      
      // If customer has no coordinates but has address, auto geocode as hint
      if (customer && !customer.latitude && !customer.longitude && customer.address) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customer.address)}&limit=1`, {
          headers: {
            'Accept-Language': 'vi-VN',
            'User-Agent': 'TikoBizPOS/1.0 (contact@tikovia.vn)'
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.length > 0) {
              const newLat = parseFloat(data[0].lat);
              const newLng = parseFloat(data[0].lon);
              map.setView([newLat, newLng], 16);
              marker.setLatLng([newLat, newLng]);
              setForm(p => ({ ...p, latitude: newLat, longitude: newLng }));
            }
          })
          .catch(() => {});
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (mapRef.current?.map) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
  }, [open]);

  // Geocode address using OSM Nominatim API
  const searchAddressOnMap = async () => {
    const searchVal = form.address;
    if (!searchVal || !searchVal.trim()) {
      toast.error('Vui lòng nhập địa chỉ để tìm kiếm');
      return;
    }
    
    const toastId = toast.loading('Đang tìm vị trí trên bản đồ...');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchVal)}&limit=1`, {
        headers: {
          'Accept-Language': 'vi-VN',
          'User-Agent': 'TikoBizPOS/1.0 (contact@tikovia.vn)'
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        
        setForm(p => ({ ...p, latitude: newLat, longitude: newLng }));
        
        if (mapRef.current) {
          const { map, marker } = mapRef.current;
          map.setView([newLat, newLng], 16);
          marker.setLatLng([newLat, newLng]);
        }
        toast.success('Đã tìm thấy vị trí gần đúng! Hãy kéo ghim màu xanh trên bản đồ đến đúng địa chỉ cụ thể.', { id: toastId, duration: 4000 });
      } else {
        toast.error('Không tìm thấy địa chỉ này trên bản đồ. Bạn có thể kéo ghim thủ công.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi kết nối dịch vụ định vị', { id: toastId });
    }
  };

  const u = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleNameBlur = () => {
    const val = form.name.trim().toLowerCase();
    if (val) {
      const isDuplicate = existingNames.includes(val) && val !== (customer?.name || '').trim().toLowerCase();
      if (isDuplicate) {
        setNameError('Tên khách hàng đã tồn tại');
      } else {
        setNameError('');
      }
    } else {
      setNameError('Vui lòng nhập tên khách hàng');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên khách hàng'); return; }
    if (!form.phone.trim()) { toast.error('Vui lòng nhập số điện thoại khách hàng'); return; }
    if (nameError) { toast.error('Tên khách hàng đã tồn tại'); return; }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        note: form.note.trim() || null,
        customerType: form.customerType,
        branch: form.branch.trim() || 'Chi nhánh trung tâm',
        totalDebt: Number(form.totalDebt) || 0,
        totalSpent: Number(form.totalSpent) || 0,
        isActive: form.isActive,
        latitude: form.latitude !== null ? Number(form.latitude) : null,
        longitude: form.longitude !== null ? Number(form.longitude) : null,
      };
      if (isEdit) {
        const res = await customerAPI.update(customer.id, data);
        toast.success('Cập nhật khách hàng thành công');
        onSaved?.(res);
      } else {
        const res = await customerAPI.create(data);
        toast.success('Tạo khách hàng thành công');
        onSaved?.(res);
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu khách hàng');
    } finally { setSaving(false); }
  };

  const inp = (key, placeholder, type = 'text') => (
    <input type={type} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors font-medium text-gray-800" value={form[key]} onChange={e => u(key, e.target.value)} placeholder={placeholder} />
  );

  const nameInput = (
    <div>
      <input 
        type="text" 
        className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors font-medium text-gray-800 ${nameError ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30' : 'border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary/30'}`} 
        value={form.name} 
        onChange={e => { u('name', e.target.value); setNameError(''); }} 
        onBlur={handleNameBlur}
        placeholder="Nhập tên khách hàng" 
      />
      {nameError && <p className="text-red-500 text-[11px] font-bold mt-1.5">{nameError}</p>}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Sửa khách hàng' : 'Tạo khách hàng'} size="lg"
      footer={<><Button onClick={onClose} icon={<X size={14} />}>Bỏ qua</Button><Button variant="primary" onClick={handleSave} disabled={saving} icon={<Save size={14} />}>{saving ? 'Đang lưu...' : 'Lưu'}</Button></>}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-4 font-sans">
          <FormField label="Tên khách hàng" required>{nameInput}</FormField>
          <FormField label="Mã khách hàng">{inp('code', 'Mã mặc định')}</FormField>
          <FormField label="Điện thoại" required>{inp('phone', 'Nhập số điện thoại (Bắt buộc)', 'tel')}</FormField>
          <FormField label="Email">{inp('email', 'email@gmail.com', 'email')}</FormField>
          
          <div className="md:col-span-2">
            <FormField label="Địa chỉ">
              <div className="flex gap-2">
                <div className="flex-1">
                  {inp('address', 'Nhập địa chỉ')}
                </div>
                <button
                  type="button"
                  onClick={searchAddressOnMap}
                  className="px-4 bg-primary text-white hover:bg-primary-dark font-semibold text-xs rounded-lg transition-colors border-none cursor-pointer flex items-center justify-center whitespace-nowrap"
                  style={{ backgroundColor: '#1a73e8' }}
                >
                  Tìm trên bản đồ
                </button>
              </div>
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField label="Định vị bản đồ (Kéo thả ghim hoặc click chọn vị trí chính xác)">
              <div 
                id={mapId} 
                style={{ 
                  height: '240px', 
                  width: '100%', 
                  borderRadius: '8px', 
                  border: '1px solid #d1d5db',
                  zIndex: 1, 
                  marginTop: '4px'
                }} 
              />
              <div className="flex gap-4 mt-2 text-[11px] font-bold text-gray-500 font-sans">
                <span>Vĩ độ (Lat): {form.latitude ? Number(form.latitude).toFixed(6) : 'Chưa ghim'}</span>
                <span>Kinh độ (Lng): {form.longitude ? Number(form.longitude).toFixed(6) : 'Chưa ghim'}</span>
              </div>
            </FormField>
          </div>

          <FormField label="Loại khách hàng">
            <select 
              className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white font-medium cursor-pointer text-gray-800" 
              value={form.customerType} 
              onChange={e => u('customerType', e.target.value)}
            >
              <option value="Cá nhân">Cá nhân</option>
              <option value="Công ty">Công ty</option>
            </select>
          </FormField>
          <FormField label="Chi nhánh">
            {inp('branch', 'Nhập chi nhánh')}
          </FormField>

          <FormField label="Nợ hiện tại">
            <NumericInput 
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors font-medium text-gray-800" 
              value={form.totalDebt} 
              onChange={e => u('totalDebt', e.target.value)} 
              placeholder="0" 
            />
          </FormField>
          <FormField label="Tổng bán">
            <NumericInput 
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors font-medium text-gray-800" 
              value={form.totalSpent} 
              onChange={e => u('totalSpent', e.target.value)} 
              placeholder="0" 
            />
          </FormField>

          <FormField label="Trạng thái">
            <select 
              className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors bg-white font-medium cursor-pointer text-gray-800" 
              value={form.isActive ? 'active' : 'inactive'} 
              onChange={e => u('isActive', e.target.value === 'active')}
            >
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Ghi chú">
              <textarea 
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors resize-y min-h-[80px] font-medium text-gray-800" 
                value={form.note} 
                onChange={e => u('note', e.target.value)} 
                placeholder="Nhập ghi chú khách hàng" 
                rows={3} 
              />
            </FormField>
          </div>
        </div>
      </div>
    </Modal>
  );
}
