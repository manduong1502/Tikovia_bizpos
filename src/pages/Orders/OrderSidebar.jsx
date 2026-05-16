import Dropdown from '../../components/ui/Dropdown';
import DateFilter from '../../components/ui/DateFilter';

export default function OrderSidebar({ filters, onFilterChange }) {
  const set = (key, val) => onFilterChange(prev => ({ ...prev, [key]: val }));

  return (
    <div className="w-[220px] shrink-0 flex flex-col gap-4 text-[13px]">
      {/* Thời gian */}
      <div>
        <span className="font-bold text-gray-800 text-sm block mb-2">Thời gian</span>
        <DateFilter
          type="created"
          value={filters.orderDate}
          onChange={val => set('orderDate', val)}
        />
      </div>
      <hr className="border-gray-100" />

      {/* Loại hóa đơn */}
      <div>
        <span className="font-bold text-gray-800 text-sm block mb-2">Loại hóa đơn</span>
        {['Không giao hàng', 'Giao hàng'].map(label => (
          <label key={label} className="flex items-center gap-2 mb-1.5 cursor-pointer text-gray-700">
            <input type="checkbox" defaultChecked className="accent-blue-600 rounded" />{label}
          </label>
        ))}
      </div>
      <hr className="border-gray-100" />

      {/* Trạng thái hóa đơn */}
      <div>
        <span className="font-bold text-gray-800 text-sm block mb-2">Trạng thái hóa đơn</span>
        {[
          { label: 'Đang xử lý', val: 'processing' },
          { label: 'Hoàn thành', val: 'completed', checked: true },
          { label: 'Không giao được', val: 'failed' },
          { label: 'Đã hủy', val: 'cancelled' },
        ].map(s => (
          <label key={s.val} className="flex items-center gap-2 mb-1.5 cursor-pointer text-gray-700">
            <input type="checkbox" defaultChecked={s.checked} className="accent-blue-600 rounded"
              onChange={e => {
                if (e.target.checked && s.val === 'completed') set('status', '');
                else if (!e.target.checked && s.val === 'completed') set('status', 'cancelled');
              }}
            />{s.label}
          </label>
        ))}
      </div>
      <hr className="border-gray-100" />

      {/* Trạng thái giao hàng */}
      <div>
        <span className="font-bold text-gray-800 text-sm block mb-2">Trạng thái giao hàng</span>
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
        <span className="font-bold text-gray-800 text-sm block mb-2">Đối tác giao hàng</span>
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
        <span className="font-bold text-gray-800 text-sm block mb-2">Thời gian giao hàng</span>
        <DateFilter
          type="expected"
          value={filters.deliveryDate}
          onChange={val => set('deliveryDate', val)}
        />
      </div>
    </div>
  );
}
