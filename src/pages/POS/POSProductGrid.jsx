import { useState } from 'react';
import { usePOS } from './POSContext';
import { Image as ImageIcon } from 'lucide-react';

export default function POSProductGrid() {
  const { products, categories, addToCart } = usePOS();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filter products by category
  const filteredProducts = selectedCategory
    ? products.filter(p => p.categoryId === selectedCategory)
    : products;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f0f2f5] p-2 overflow-hidden">
      {/* Category Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors border ${
            selectedCategory === null
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
          }`}
        >
          Tất cả
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors border ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-1 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {filteredProducts.map(product => {
            const isOutOfStock = product.stock <= 0;
            return (
              <div 
                key={product.id}
                onClick={() => !isOutOfStock && addToCart(product)}
                className={`bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col transition-all ${
                  isOutOfStock ? 'opacity-60 cursor-not-allowed grayscale-[50%]' : 'cursor-pointer hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center relative">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-300 w-8 h-8" />
                  )}
                  {/* Price Tag */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <div className="text-white font-bold text-[13px]">
                      {new Intl.NumberFormat('vi-VN').format(product.sellPrice)}
                    </div>
                  </div>
                </div>
                
                <div className="p-2 flex flex-col h-full justify-between">
                  <div className="text-[12px] font-medium text-gray-800 line-clamp-2 leading-snug mb-1" title={product.name}>
                    {product.name}
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                    <span className="text-[11px] text-gray-500 truncate mr-1" title={product.sku}>{product.sku}</span>
                    <span className={`text-[11px] font-bold ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}>
                      Tồn: {product.stock}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>Không tìm thấy sản phẩm</p>
          </div>
        )}
      </div>
    </div>
  );
}
