import React, { useState, useEffect } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown } from 'lucide-react';

export default function Pagination({
  totalItems = 0,
  pageSize = 15,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  itemName = 'hàng hóa'
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [inputPage, setInputPage] = useState(String(currentPage));

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  const handleInputChange = (e) => {
    setInputPage(e.target.value);
  };

  const handleInputBlur = () => {
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    } else {
      setInputPage(String(currentPage));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Custom dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageSizes = [15, 20, 30, 50, 100];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 sm:p-2.5 border-t border-gray-150 bg-white rounded-b-2xl font-sans text-xs text-gray-600 select-none max-w-full">
      {/* Left section: Hiển thị dòng */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 font-medium">Hiển thị</span>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 px-2 py-1 border border-primary rounded-lg text-primary font-bold hover:bg-primary/5 transition-colors bg-white cursor-pointer shadow-sm text-[11px]"
          >
            <span>{pageSize} dòng</span>
            <ChevronDown size={12} />
          </button>
          
          {isOpen && (
            <div className="absolute left-0 bottom-full mb-1 w-24 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 animate-fade-in py-0.5">
              {pageSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    onPageSizeChange(size);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs font-bold hover:bg-gray-50 transition-colors flex items-center justify-between ${pageSize === size ? 'text-primary bg-primary/5' : 'text-gray-700'}`}
                >
                  <span>{size} dòng</span>
                  {pageSize === size && (
                    <span className="w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle section: Navigation buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className={`p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white text-gray-500 cursor-pointer flex items-center justify-center transition-colors shadow-sm ${currentPage === 1 ? 'cursor-not-allowed' : ''}`}
        >
          <ChevronsLeft size={13} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white text-gray-500 cursor-pointer flex items-center justify-center transition-colors shadow-sm ${currentPage === 1 ? 'cursor-not-allowed' : ''}`}
        >
          <ChevronLeft size={13} />
        </button>

        {/* Input page box */}
        <input
          type="text"
          value={inputPage}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="w-10 py-1 border border-gray-300 rounded-lg text-center text-xs font-bold text-gray-800 focus:border-primary outline-none shadow-sm transition-all focus:ring-1 focus:ring-primary/20"
        />

        {/* Next Page */}
        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white text-gray-500 cursor-pointer flex items-center justify-center transition-colors shadow-sm ${currentPage === totalPages ? 'cursor-not-allowed' : ''}`}
        >
          <ChevronRight size={13} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className={`p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white text-gray-500 cursor-pointer flex items-center justify-center transition-colors shadow-sm ${currentPage === totalPages ? 'cursor-not-allowed' : ''}`}
        >
          <ChevronsRight size={13} />
        </button>
      </div>

      {/* Right section: Item range */}
      <div className="font-bold text-gray-700 text-xs">
        {startItem} - {endItem} trong {totalItems} {itemName}
      </div>
    </div>
  );
}
