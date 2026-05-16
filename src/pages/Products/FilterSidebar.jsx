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
  filters, onFilterChange,
}) {
  const { selectedCategories, filterStock, dateExpected, dateCreated, productType, status } = filters;

  return (
    <div className="w-[240px] shrink-0 flex flex-col gap-4">
      {/* Nhóm hàng */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-gray-700">Nhóm hàng</span>
          <button className="text-primary text-xs font-medium hover:underline">Tạo mới</button>
        </div>
        <CategoryFilter
          categories={categories}
          products={products}
          selectedIds={selectedCategories}
          onApply={(ids) => onFilterChange({ selectedCategories: ids })}
        />
      </div>

      {/* Tồn kho */}
      <div>
        <span className="text-sm font-medium text-gray-600 mb-1.5 block">Tồn kho</span>
        <Dropdown
          value={filterStock}
          options={STOCK_OPTIONS}
          onChange={(v) => onFilterChange({ filterStock: v })}
        />
      </div>

      {/* Dự kiến hết hàng */}
      <div>
        <span className="text-sm font-medium text-gray-600 mb-1.5 block">Dự kiến hết hàng</span>
        <DateFilter
          type="expected"
          value={dateExpected}
          onChange={(v) => onFilterChange({ dateExpected: v })}
        />
      </div>

      {/* Thời gian tạo */}
      <div>
        <span className="text-sm font-medium text-gray-600 mb-1.5 block">Thời gian tạo</span>
        <DateFilter
          type="created"
          value={dateCreated}
          onChange={(v) => onFilterChange({ dateCreated: v })}
        />
      </div>

      {/* Nhà cung cấp */}
      <div>
        <span className="text-sm font-medium text-gray-600 mb-1.5 block">Nhà cung cấp</span>
        <MultiSelectFilter
          items={suppliers.map((s) => ({ value: String(s.id ?? s.name), label: s.name }))}
          selectedValues={filters.suppliers || []}
          placeholder="Chọn nhà cung cấp"
          panelTitle="Nhà cung cấp"
          searchPlaceholder="Tìm nhà cung cấp"
          onApply={(vals) => onFilterChange({ suppliers: vals })}
        />
      </div>

      {/* Vị trí */}
      <div>
        <span className="text-sm font-medium text-gray-600 mb-1.5 block">Vị trí</span>
        <input
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
          placeholder="Chọn vị trí"
          value={filters.location || ''}
          onChange={(e) => onFilterChange({ location: e.target.value })}
        />
      </div>

      {/* Loại hàng */}
      <div>
        <span className="text-sm font-medium text-gray-600 mb-1.5 block">Loại hàng</span>
        <Dropdown
          value={productType}
          options={PRODUCT_TYPES}
          onChange={(v) => onFilterChange({ productType: v })}
        />
      </div>

      {/* Bán trực tiếp */}
      <div>
        <span className="text-sm font-medium text-gray-600 mb-1.5 block">Bán trực tiếp</span>
        <div className="flex gap-1">
          {[
            { value: '', label: 'Tất cả' },
            { value: 'yes', label: 'Có' },
            { value: 'no', label: 'Không' },
          ].map(tag => (
            <button
              type="button"
              key={tag.value}
              onClick={() => onFilterChange({ directSale: tag.value })}
              className={`px-3 py-1 text-xs rounded border cursor-pointer transition-colors ${
                filters.directSale === tag.value ? 'bg-primary text-white border-primary font-bold' : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trạng thái */}
      <div>
        <span className="text-sm font-medium text-gray-600 mb-1.5 block">Trạng thái</span>
        <Dropdown
          value={status}
          options={STATUS_OPTIONS}
          onChange={(v) => onFilterChange({ status: v })}
        />
      </div>
    </div>
  );
}
