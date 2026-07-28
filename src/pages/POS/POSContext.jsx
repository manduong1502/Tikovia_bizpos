import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, productAPI } from '../../services/api';

const POSContext = createContext();

export function usePOS() {
  return useContext(POSContext);
}

export function getLocalDateString(d = new Date()) {
  const dateObj = d instanceof Date ? (isNaN(d.getTime()) ? new Date() : d) : new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTimeString(d = new Date()) {
  const dateObj = d instanceof Date ? (isNaN(d.getTime()) ? new Date() : d) : new Date(d);
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function POSProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  // State for products and customers
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invoices (Tabs) state
  const [invoices, setInvoices] = useState([
    { 
      id: 1, 
      label: 'Hóa đơn 1', 
      cart: [], 
      customer: null, 
      note: '', 
      discount: 0, 
      isPaymentMode: false,
      customDate: getLocalDateString(),
      customTime: getLocalTimeString(),
    }
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);
  const [saleMode, setSaleMode] = useState('fast'); // 'fast', 'normal', 'delivery'

  const currentInvoice = invoices.find(inv => inv.id === activeTabId);

  // Fetch initial data
  const loadData = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        productAPI.getAll().catch(() => []),
        api.get('/categories').catch(() => ({ data: [] }))
      ]);
      const prodList = Array.isArray(prodRes) ? prodRes : (prodRes?.data || []);
      const catList = Array.isArray(catRes?.data) ? catRes.data : (catRes?.data?.data || []);
      setProducts(prodList);
      setCategories(catList);
    } catch (err) {
      toast.error('Lỗi tải dữ liệu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleDataChanged = () => loadData();
    window.addEventListener('app:data-changed', handleDataChanged);
    return () => window.removeEventListener('app:data-changed', handleDataChanged);
  }, [loadData]);

  // Handle editOrder or copyOrder from navigation state or URL query params
  useEffect(() => {
    const editOrder = location.state?.editOrder;
    let copyOrder = location.state?.copyOrder;

    const params = new URLSearchParams(location.search);
    const copyOrderCode = params.get('copyOrderCode');
    if (!copyOrder && copyOrderCode) {
      const stored = sessionStorage.getItem(`copy_order_${copyOrderCode}`);
      if (stored) {
        try { copyOrder = JSON.parse(stored); } catch {}
      }
    }

    const targetOrder = editOrder || copyOrder;
    if (!targetOrder || products.length === 0) return;

    const prefix = editOrder ? 'Update' : 'Copy';
    const tabLabel = `${prefix}_${targetOrder.code}`;
    // Avoid re-creating if tab already exists
    const existingTab = invoices.find(inv => inv.label === tabLabel);
    if (existingTab) { setActiveTabId(existingTab.id); return; }

    const editCart = (targetOrder.items || []).map(it => {
      const prod = products.find(p => p.id === it.productId || p.sku === it.product_sku);
      return {
        product: prod || { id: it.productId, name: it.product_name, sku: it.product_sku, sellPrice: Number(it.unit_price || it.price || 0), stock: 9999 },
        quantity: Number(it.quantity),
        price: Number(it.unit_price || it.price || 0),
        discount: Number(it.discount || 0),
      };
    });

    const targetDateObj = (targetOrder.createdAt || targetOrder.created_at) ? new Date(targetOrder.createdAt || targetOrder.created_at) : new Date();

    const editInvoice = {
      id: nextTabId,
      label: tabLabel,
      cart: editCart,
      customer: targetOrder.customer || null,
      note: targetOrder.note || '',
      discount: 0,
      isPaymentMode: false,
      customDate: getLocalDateString(targetDateObj),
      customTime: getLocalTimeString(targetDateObj),
      ...(editOrder ? {
        _editOrderId: editOrder.id,
        _editOrderCode: editOrder.code,
        _editOrderStatus: targetOrder.status || editOrder.status || null,
      } : {}),
      deliveryAddress: targetOrder.deliveryAddress || '',
      receiverName: targetOrder.receiverName || '',
      receiverPhone: targetOrder.receiverPhone || '',
      driverId: targetOrder.driverId || '',
      driverName: targetOrder.driverId ? (targetOrder.driverName || 'Chưa gán') : '',
      deliveryStatus: targetOrder.deliveryAddress ? (targetOrder.deliveryStatus || 'ASSIGNED') : '',
    };

    const isDefaultTabEmpty = invoices.length === 1 && invoices[0].id === 1 && invoices[0].cart.length === 0 && !invoices[0].customer;

    setInvoices(prev => {
      if (isDefaultTabEmpty) {
        return [{ ...editInvoice, id: 1, label: tabLabel }];
      }
      return [...prev, editInvoice];
    });

    setActiveTabId(isDefaultTabEmpty ? 1 : nextTabId);
    if (!isDefaultTabEmpty) setNextTabId(prev => prev + 1);
    
    setSaleMode('fast');
    
    // Clean URL query params / state
    if (copyOrderCode) {
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.search, products]);

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
      isPaymentMode: false,
      customDate: getLocalDateString(),
      customTime: getLocalTimeString(),
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
  const addProduct = (newProduct) => {
    setProducts(prev => [newProduct, ...prev]);
  };

  const normalizeItemWeighings = (item) => {
    if (!item.weighings || item.weighings.length === 0) {
      return [{
        id: item._weighingId || 1,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || item.product?.sellPrice || 0),
        discount: Number(item.discount || 0)
      }];
    }
    return item.weighings;
  };

  const addToCart = (product) => {
    if (!product) return;

    const cart = currentInvoice.cart;
    const existing = cart.find(item => item.product.id === product.id);

    if (existing) {
      const weighings = normalizeItemWeighings(existing);
      const updatedWeighings = weighings.map((w, idx) => 
        idx === 0 ? { ...w, quantity: (parseFloat(w.quantity) || 0) + 1 } : w
      );
      updateCurrentInvoice({
        cart: cart.map(item => 
          item.product.id === product.id 
            ? { ...item, weighings: updatedWeighings, quantity: updatedWeighings.reduce((s, w) => s + (parseFloat(w.quantity) || 0), 0) }
            : item
        )
      });
    } else {
      const initialWeighing = { id: Date.now(), quantity: 1, price: Number(product.sellPrice || 0), discount: 0 };
      updateCurrentInvoice({
        cart: [...cart, { 
          product, 
          quantity: 1, 
          price: Number(product.sellPrice || 0), 
          discount: 0,
          weighings: [initialWeighing]
        }]
      });
    }
  };

  const addWeighingSubRow = (productId) => {
    const cart = currentInvoice.cart;
    const existing = cart.find(item => item.product.id === productId);
    if (!existing) return;

    const weighings = normalizeItemWeighings(existing);
    const lastPrice = weighings[weighings.length - 1]?.price ?? Number(existing.product.sellPrice || 0);
    const newSubRow = { id: Date.now() + Math.random(), quantity: 1, price: lastPrice, discount: 0 };
    const updatedWeighings = [...weighings, newSubRow];

    updateCurrentInvoice({
      cart: cart.map(item => 
        item.product.id === productId 
          ? { ...item, weighings: updatedWeighings, quantity: updatedWeighings.reduce((s, w) => s + (parseFloat(w.quantity) || 0), 0) }
          : item
      )
    });
    toast.success('Đã thêm 1 định lượng cân mới');
  };

  const updateWeighingSubRow = (productId, weighingId, updates) => {
    const cart = currentInvoice.cart;
    const existing = cart.find(item => item.product.id === productId);
    if (!existing) return;

    const weighings = normalizeItemWeighings(existing);
    const updatedWeighings = weighings.map(w => w.id === weighingId ? { ...w, ...updates } : w);

    updateCurrentInvoice({
      cart: cart.map(item => 
        item.product.id === productId 
          ? { 
              ...item, 
              weighings: updatedWeighings, 
              quantity: updatedWeighings.reduce((s, w) => s + (parseFloat(w.quantity) || 0), 0),
              price: updatedWeighings[0]?.price ?? item.price,
              discount: updatedWeighings[0]?.discount ?? item.discount,
            }
          : item
      )
    });
  };

  const removeWeighingSubRow = (productId, weighingId) => {
    const cart = currentInvoice.cart;
    const existing = cart.find(item => item.product.id === productId);
    if (!existing) return;

    const weighings = normalizeItemWeighings(existing);
    if (weighings.length <= 1) {
      // Remove entire product card
      removeFromCart(productId);
      return;
    }

    const updatedWeighings = weighings.filter(w => w.id !== weighingId);
    updateCurrentInvoice({
      cart: cart.map(item => 
        item.product.id === productId 
          ? { 
              ...item, 
              weighings: updatedWeighings, 
              quantity: updatedWeighings.reduce((s, w) => s + (parseFloat(w.quantity) || 0), 0) 
            }
          : item
      )
    });
  };

  const removeFromCart = (productId) => {
    updateCurrentInvoice({
      cart: currentInvoice.cart.filter(item => item.product.id !== productId)
    });
  };

  const updateCartItemQuantity = (productId, newQuantity) => {
    const item = currentInvoice.cart.find(i => i.product.id === productId);
    if (!item) return;

    const weighings = normalizeItemWeighings(item);
    const firstWeighing = weighings[0];
    updateWeighingSubRow(productId, firstWeighing.id, { quantity: newQuantity });
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
      isPaymentMode: false,
      customDate: getLocalDateString(),
      customTime: getLocalTimeString(),
      _editOrderId: undefined,
      _editOrderCode: undefined,
      _editOrderStatus: undefined,
      deliveryAddress: '',
      receiverName: '',
      receiverPhone: '',
      driverId: '',
      driverName: '',
      deliveryStatus: '',
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
      saleMode,
      setSaleMode,
      addTab,
      removeTab,
      switchTab,
      updateCurrentInvoice,
      addProduct,
      addToCart,
      addWeighingSubRow,
      updateWeighingSubRow,
      removeWeighingSubRow,
      removeFromCart,
      updateCartItemQuantity,
      setCustomer,
      clearCurrentInvoice,
      togglePaymentMode,
    }}>
      {children}
    </POSContext.Provider>
  );
}
