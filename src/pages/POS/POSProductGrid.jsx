import { useState } from 'react';
import { usePOS } from './POSContext';
import { Image as ImageIcon, Search, Plus, LayoutGrid, Filter, Package, ChevronLeft, ChevronRight } from 'lucide-react';

export default function POSProductGrid() {
  const { products, categories, addToCart, currentInvoice, updateCurrentInvoice } = usePOS();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Filter products by category
  const filteredProducts = selectedCategory
    ? products.filter(p => p.categoryId === selectedCategory)
    : products;

  return (
    <div className="pos-product-panel">
      <div className="pos-product-toolbar">
        <div className="pos-customer-box" style={{ position: 'relative' }}>
          <Search size={16} color="#94A3B8" />
          <input 
            type="text" 
            id="pos-cust-input" 
            placeholder="Tìm khách hàng (F4)"
            disabled
          />
          <button className="add-btn" onClick={() => {}}><Plus size={16} /></button>
        </div>
        <div className="pos-view-btns">
          <button className="pos-view-btn active" title="Dạng lưới"><LayoutGrid size={16} /></button>
          <button className="pos-view-btn" title="Lọc"><Filter size={16} /></button>
          <button className="pos-view-btn" title="Hình ảnh"><ImageIcon size={16} /></button>
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
                  <div className="prod-name">{product.name}</div>
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
