import { useEffect } from 'react';
import { POSProvider, usePOS } from './POSContext';
import POSHeader from './POSHeader';
import POSCart from './POSCart';
import POSProductGrid from './POSProductGrid';
import POSPaymentPanel from './POSPaymentPanel';
import POSDeliveryPanel from './POSDeliveryPanel';
import { Zap, Clock, Truck, MessageSquare } from 'lucide-react';
import './pos.css';

function POSBottomBar() {
  const { saleMode, setSaleMode } = usePOS();
  
  return (
    <div className="pos-bottombar">
      <div className="pos-sale-modes">
        <button 
          className={`pos-sale-mode ${saleMode === 'fast' ? 'active' : ''}`} 
          onClick={() => setSaleMode('fast')}
        >
          <span className="mode-icon"><Zap size={18} /></span> Bán nhanh
        </button>
        <button 
          className={`pos-sale-mode ${saleMode === 'normal' ? 'active' : ''}`} 
          onClick={() => setSaleMode('normal')}
        >
          <span className="mode-icon"><Clock size={18} /></span> Bán thường
        </button>
        <button 
          className={`pos-sale-mode ${saleMode === 'delivery' ? 'active' : ''}`} 
          onClick={() => setSaleMode('delivery')}
        >
          <span className="mode-icon"><Truck size={18} /></span> Bán giao hàng
        </button>
      </div>
      <div className="pos-bottom-right">
        <span><MessageSquare size={16} /></span><span>Tiko BizPOS</span>
      </div>
    </div>
  );
}

function POSLayout() {
  const { saleMode, currentInvoice } = usePOS();
  const isPaymentMode = currentInvoice?.isPaymentMode;

  useEffect(() => {
    document.body.style.backgroundColor = '#f0f2f5';
    return () => { document.body.style.backgroundColor = ''; };
  }, []);

  return (
    <div className="pos-fullscreen">
      <POSHeader />
      
      <div className="pos-body">
        <POSCart />
        
        <div className={`pos-right-panel ${saleMode === 'fast' ? 'narrow' : saleMode === 'normal' ? 'wide' : 'delivery'}`} id="pos-right-panel">
          {saleMode === 'delivery' ? (
            <POSDeliveryPanel />
          ) : saleMode === 'fast' ? (
            <POSPaymentPanel />
          ) : (
            <>
              {isPaymentMode ? (
                <POSPaymentPanel />
              ) : (
                <POSProductGrid />
              )}
            </>
          )}
        </div>
      </div>

      <POSBottomBar />
    </div>
  );
}

export default function POSPage() {
  return (
    <POSProvider>
      <POSLayout />
    </POSProvider>
  );
}
