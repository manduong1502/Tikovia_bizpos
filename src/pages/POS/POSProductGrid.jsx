import { useState, useMemo } from 'react';
import { usePOS } from './POSContext';
import { Search, LayoutGrid, Filter, Package, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

export default function POSProductGrid() {
  const { products, categories, addToCart, currentInvoice, updateCurrentInvoice } = usePOS();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, price-asc, price-desc

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    let list = selectedCategory
      ? products.filter(p => p.categoryId === selectedCategory)
      : products;
    
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.sku?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'price-asc') list = [...list].sort((a, b) => a.sellPrice - b.sellPrice);
    else if (sortBy === 'price-desc') list = [...list].sort((a, b) => b.sellPrice - a.sellPrice);
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [products, selectedCategory, searchText, sortBy]);

  return (
    <div className="pos-product-panel">
      <div className="pos-product-toolbar">
        <div className="pos-customer-box" style={{ position: 'relative' }}>
          <Search size={16} color="#94A3B8" />
          <input 
            type="text" 
            id="pos-product-search" 
            placeholder="Tìm sản phẩm (tên, mã SKU)..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="pos-view-btns">
          <button className="pos-view-btn active" title="Dạng lưới"><LayoutGrid size={16} /></button>
          <button 
            className="pos-view-btn" 
            title="Sắp xếp"
            onClick={() => {
              if (sortBy === 'name') setSortBy('price-asc');
              else if (sortBy === 'price-asc') setSortBy('price-desc');
              else setSortBy('name');
            }}
            style={sortBy !== 'name' ? { color: 'var(--pos-primary)', background: 'var(--pos-primary-light)' } : {}}
          >
            <ArrowUpDown size={16} />
          </button>
        </div>
      </div>

      <div className="pos-product-grid" id="pos-prod-grid">
        {filteredProducts.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Không tìm thấy sản phẩm</div>
        ) : (
          filteredProducts.map(product => {
            const isOutOfStock = product.stock <= 0;
            return (
              <div 
                key={product.id}
                onClick={() => !isOutOfStock && addToCart(product)}
                className={`pos-product-cell ${isOutOfStock ? 'out-of-stock' : ''}`}
              >
                <div className="prod-img">
                  {product.image ? (
                    <img src={product.image} alt={product.name} />
                  ) : (
                    <Package size={24} color="#94A3B8" />
                  )}
                </div>
                <div className="prod-info">
                  <div className="prod-name">{product.name} {product.unit ? `(${product.unit})` : ''}</div>
                  <div className="prod-price">{new Intl.NumberFormat('vi-VN').format(product.sellPrice)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pos-product-pagination">
        <div className="pos-product-pagination-controls">
          <button disabled><ChevronLeft size={18} /></button>
          <span className="page-info">1/1</span>
          <button disabled><ChevronRight size={18} /></button>
        </div>
        <button 
          className="pos-product-checkout-btn"
          onClick={() => {
            updateCurrentInvoice({ isPaymentMode: true });
          }}
        >
          THANH TOÁN
        </button>
      </div>
    </div>
  );
}
