import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const POSContext = createContext();

export function usePOS() {
  return useContext(POSContext);
}

export function POSProvider({ children }) {
  // State for products and customers
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invoices (Tabs) state
  const [invoices, setInvoices] = useState([
    { id: 1, label: 'Hóa đơn 1', cart: [], customer: null, note: '', discount: 0, isPaymentMode: false }
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);

  const currentInvoice = invoices.find(inv => inv.id === activeTabId);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories')
        ]);
        setProducts(prodRes.data?.data || prodRes.data || []);
        setCategories(catRes.data?.data || catRes.data || []);
      } catch (err) {
        toast.error('Lỗi tải dữ liệu: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- Tab Actions ---
  const addTab = () => {
    if (invoices.length >= 10) {
      toast.error('Chỉ được mở tối đa 10 hóa đơn');
      return;
    }
    const newInvoice = {
      id: nextTabId,
      label: `Hóa đơn ${nextTabId}`,
      cart: [],
      customer: null,
      note: '',
      discount: 0,
      isPaymentMode: false
    };
    setInvoices([...invoices, newInvoice]);
    setActiveTabId(nextTabId);
    setNextTabId(prev => prev + 1);
  };

  const removeTab = (id) => {
    if (invoices.length === 1) return;
    const newInvoices = invoices.filter(inv => inv.id !== id);
    setInvoices(newInvoices);
    if (activeTabId === id) {
      setActiveTabId(newInvoices[newInvoices.length - 1].id);
    }
  };

  const switchTab = (id) => {
    setActiveTabId(id);
  };

  // --- Update Current Invoice ---
  const updateCurrentInvoice = (updates) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === activeTabId ? { ...inv, ...updates } : inv
    ));
  };

  // --- Cart Actions ---
  const addToCart = (product) => {
    if (product.stock <= 0) {
      toast.error('Sản phẩm đã hết hàng!');
      return;
    }

    const cart = currentInvoice.cart;
    const existing = cart.find(item => item.product.id === product.id);

    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error('Vượt quá số lượng tồn kho!');
        return;
      }
      updateCurrentInvoice({
        cart: cart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      updateCurrentInvoice({
        cart: [...cart, { product, quantity: 1, price: product.sellPrice, discount: 0 }]
      });
    }
  };

  const removeFromCart = (productId) => {
    updateCurrentInvoice({
      cart: currentInvoice.cart.filter(item => item.product.id !== productId)
    });
  };

  const updateCartItemQuantity = (productId, newQuantity) => {
    const item = currentInvoice.cart.find(i => i.product.id === productId);
    if (!item) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > item.product.stock) {
      toast.error('Vượt quá số lượng tồn kho!');
      return;
    }

    updateCurrentInvoice({
      cart: currentInvoice.cart.map(i => 
        i.product.id === productId ? { ...i, quantity: newQuantity } : i
      )
    });
  };

  const setCustomer = (customer) => {
    updateCurrentInvoice({ customer });
  };

  const clearCurrentInvoice = () => {
    updateCurrentInvoice({
      cart: [],
      customer: null,
      note: '',
      discount: 0,
      isPaymentMode: false
    });
  };

  const togglePaymentMode = (status) => {
    updateCurrentInvoice({ isPaymentMode: status !== undefined ? status : !currentInvoice.isPaymentMode });
  };

  return (
    <POSContext.Provider value={{
      loading,
      products,
      categories,
      invoices,
      activeTabId,
      currentInvoice,
      addTab,
      removeTab,
      switchTab,
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      setCustomer,
      updateCurrentInvoice,
      clearCurrentInvoice,
      togglePaymentMode
    }}>
      {children}
    </POSContext.Provider>
  );
}
