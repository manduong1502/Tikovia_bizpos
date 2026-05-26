import Dropdown from '../../components/ui/Dropdown';
import CategoryFilter from '../../components/ui/CategoryFilter';
import DateFilter from '../../components/ui/DateFilter';
import MultiSelectFilter from '../../components/ui/MultiSelectFilter';

const STOCK_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'under', label: 'Dưới định mức tồn' },
  { value: 'over', label: 'Vượt định mức tồn' },
  { value: 'in', label: 'Còn hàng trong kho' },
  { value: 'out', label: 'Hết hàng trong kho' },
];

const PRODUCT_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'product', label: 'Hàng hóa' },
  { value: 'service', label: 'Dịch vụ' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Hàng đang kinh doanh' },
  { value: 'inactive', label: 'Ngừng kinh doanh' },
];

export default function FilterSidebar({
  categories, products, suppliers,
  filters, onFilterChange, onCreateCategory,
}) {
  const { selectedCategories, filterStock, dateExpected, dateCreated, productType, status } = filters;

  return (
    <div className="w-64 shrink-0 flex flex-col gap-2 bg-white p-4 pb-[200px] rounded-2xl shadow-sm border border-gray-100 font-sans">
      {/* Nhóm hàng */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-extrabold text-gray-800 tracking-tight">Nhóm hàng</span>
          <button type="button" onClick={onCreateCategory} className="text-primary text-xs font-bold hover:underline cursor-pointer bg-transparent border-none">Tạo mới</button>
        </div>
        <CategoryFilter
          categories={categories}
          products={products}
          selectedIds={selectedCategories}
          onApply={(ids) => onFilterChange({ selectedCategories: ids })}
        />
      </div>

      <hr className="border-gray-100" />

      {/* Tồn kho */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Tồn kho</span>
        <Dropdown
          value={filterStock}
          options={STOCK_OPTIONS}
          onChange={(v) => onFilterChange({ filterStock: v })}
        />
      </div>

      <hr className="border-gray-100" />

      {/* Dự kiến hết hàng */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Dự kiến hết hàng</span>
        <DateFilter
          label="Dự kiến hết hàng"
          type="expected"
          value={dateExpected}
          onChange={(v) => onFilterChange({ dateExpected: v })}
        />
      </div>

      <hr className="border-gray-100" />

      {/* Thời gian tạo */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Thời gian tạo</span>
        <DateFilter
          label="Thời gian tạo"
          type="created"
          value={dateCreated}
          onChange={(v) => onFilterChange({ dateCreated: v })}
        />
      </div>

      <hr className="border-gray-100" />

      {/* Nhà cung cấp */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Nhà cung cấp</span>
        <MultiSelectFilter
          items={suppliers.map((s) => ({ value: String(s.id ?? s.name), label: s.name }))}
          selectedValues={filters.suppliers || []}
          placeholder="Chọn nhà cung cấp"
          panelTitle="Nhà cung cấp"
          searchPlaceholder="Tìm nhà cung cấp"
          onApply={(vals) => onFilterChange({ suppliers: vals })}
        />
      </div>

      {/* Trạng thái */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Trạng thái</span>
        <Dropdown
          value={status}
          options={STATUS_OPTIONS}
          onChange={(v) => onFilterChange({ status: v })}
        />
      </div>
    </div>
  );
}
