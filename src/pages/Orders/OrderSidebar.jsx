import Dropdown from '../../components/ui/Dropdown';
import DateFilter from '../../components/ui/DateFilter';

export default function OrderSidebar({ filters, onFilterChange }) {
  const set = (key, val) => onFilterChange(prev => ({ ...prev, [key]: val }));

  return (
    <div className="w-64 shrink-0 flex flex-col gap-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 font-sans">
      {/* Thời gian */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Thời gian</span>
        <DateFilter
          label="Thời gian"
          type="created"
          value={filters.orderDate}
          onChange={val => set('orderDate', val)}
        />
      </div>

      <hr className="border-gray-100" />

      {/* Loại hóa đơn */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Loại hóa đơn</span>
        <div className="flex flex-col gap-2.5">
          {['Không giao hàng', 'Giao hàng'].map(label => (
            <label key={label} className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer hover:text-primary transition-colors">
              <input type="checkbox" defaultChecked className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Trạng thái hóa đơn */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Trạng thái hóa đơn</span>
        <div className="flex flex-col gap-2.5">
          {[
            { label: 'Đang xử lý', val: 'processing' },
            { label: 'Hoàn thành', val: 'completed', checked: true },
            { label: 'Không giao được', val: 'failed' },
            { label: 'Đã hủy', val: 'cancelled' },
          ].map(s => (
            <label key={s.val} className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer hover:text-primary transition-colors">
              <input
                type="checkbox"
                defaultChecked={s.checked}
                className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                onChange={e => {
                  if (e.target.checked && s.val === 'completed') set('status', '');
                  else if (!e.target.checked && s.val === 'completed') set('status', 'cancelled');
                }}
              />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Trạng thái giao hàng */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Trạng thái giao hàng</span>
        <Dropdown
          value={filters.deliveryStatus || ''}
          options={[
            { value: '', label: 'Chọn trạng thái' },
            { value: 'pending', label: 'Chờ giao' },
            { value: 'shipping', label: 'Đang giao' },
            { value: 'delivered', label: 'Đã giao' },
          ]}
          onChange={val => set('deliveryStatus', val)}
        />
      </div>

      <hr className="border-gray-100" />

      {/* Đối tác giao hàng */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Đối tác giao hàng</span>
        <Dropdown
          value={filters.deliveryPartner || ''}
          options={[
            { value: '', label: 'Chọn đối tác giao hàng' },
            { value: 'ghtk', label: 'Giao Hàng Tiết Kiệm' },
            { value: 'ghn', label: 'Giao Hàng Nhanh' },
            { value: 'viettel', label: 'Viettel Post' },
          ]}
          onChange={val => set('deliveryPartner', val)}
        />
      </div>

      <hr className="border-gray-100" />

      {/* Thời gian giao hàng */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Thời gian giao hàng</span>
        <DateFilter
          label="Thời gian giao hàng"
          type="expected"
          value={filters.deliveryDate}
          onChange={val => set('deliveryDate', val)}
        />
      </div>
    </div>
  );
}
