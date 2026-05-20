import { Filter } from 'lucide-react';
import DateFilter from '../../../components/ui/DateFilter';

export default function AdvancedFilter({
  filters,
  setFilters,
  receivedByOptions,
  statusOptions,
  sidebarOpen,
  setSidebarOpen,
}) {
  const toggleStatusFilter = (st) => {
    const next = new Set(filters.statuses);
    if (next.has(st)) next.delete(st);
    else next.add(st);
    setFilters(prev => ({ ...prev, statuses: next }));
  };

  return (
    <div className={`fixed top-14 md:top-[102px] bottom-0 left-0 z-50 w-72 bg-white shadow-2xl p-4 overflow-y-auto custom-scrollbar transform transition-transform duration-300 lg:sticky lg:top-[118px] lg:max-h-[calc(100vh-144px)] lg:w-64 lg:p-4 lg:shadow-sm lg:border lg:border-gray-100 lg:rounded-2xl lg:overflow-y-auto custom-scrollbar lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col gap-2 font-sans`}>
      <div className="flex items-center justify-between mb-4 lg:hidden border-b border-gray-100 pb-3">
        <span className="font-bold text-gray-800 text-base">Bộ lọc tìm kiếm</span>
        <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 border-none bg-transparent cursor-pointer flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* Status Filter */}
        <div>
          <span className="text-sm font-extrabold text-gray-800 mb-3 block tracking-tight">Trạng thái phiếu</span>
          <div className="space-y-2">
            {statusOptions.map(st => (
              <label key={st.value} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                  filters.statuses.has(st.value) ? 'bg-primary border-primary' : 'border-gray-300 group-hover:border-primary/50'
                }`}>
                  {filters.statuses.has(st.value) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 select-none group-hover:text-gray-900">{st.label}</span>
              </label>
            ))}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Date Filter */}
        <div>
          <span className="text-sm font-extrabold text-gray-800 mb-3 block tracking-tight">Thời gian tạo</span>
          <DateFilter
            value={filters.dateRange}
            onChange={range => setFilters(prev => ({ ...prev, dateRange: range }))}
          />
        </div>



        {/* Received By Filter */}
        <div>
          <span className="text-sm font-extrabold text-gray-800 mb-1.5 block tracking-tight">Người nhập</span>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 min-h-[42px] text-sm font-medium text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 shadow-sm bg-white cursor-pointer"
            value={filters.receivedBy}
            onChange={e => setFilters(prev => ({ ...prev, receivedBy: e.target.value }))}
          >
            {receivedByOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
