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
    <div className="w-64 shrink-0 flex flex-col gap-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 font-sans">
      {/* Nhóm hàng */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-extrabold text-gray-800 tracking-tight">Nhóm hàng</span>
          <button className="text-primary text-xs font-bold hover:underline cursor-pointer bg-transparent border-none">Tạo mới</button>
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

      <hr className="border-gray-100" />

      {/* Vị trí */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Vị trí</span>
        <input
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-700 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none shadow-sm bg-white"
          placeholder="Chọn vị trí"
          value={filters.location || ''}
          onChange={(e) => onFilterChange({ location: e.target.value })}
        />
      </div>

      <hr className="border-gray-100" />

      {/* Loại hàng */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Loại hàng</span>
        <Dropdown
          value={productType}
          options={PRODUCT_TYPES}
          onChange={(v) => onFilterChange({ productType: v })}
        />
      </div>

      <hr className="border-gray-100" />

      {/* Bán trực tiếp */}
      <div>
        <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Bán trực tiếp</span>
        <div className="flex gap-2">
          {[
            { value: '', label: 'Tất cả' },
            { value: 'yes', label: 'Có' },
            { value: 'no', label: 'Không' },
          ].map(tag => (
            <button
              type="button"
              key={tag.value}
              onClick={() => onFilterChange({ directSale: tag.value })}
              className={`px-3 py-1.5 text-xs rounded-lg border font-bold transition-all cursor-pointer ${
                filters.directSale === tag.value ? 'bg-primary/10 text-primary border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary/50'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

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
