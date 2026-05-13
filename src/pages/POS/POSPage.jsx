import { useEffect } from 'react';
import { POSProvider, usePOS } from './POSContext';
import POSHeader from './POSHeader';
import POSCart from './POSCart';
import POSProductGrid from './POSProductGrid';
import POSPaymentPanel from './POSPaymentPanel';
import POSDeliveryPanel from './POSDeliveryPanel';
import { Zap, Clock, Truck, MessageCircleQuestion, HelpCircle, MessageSquare } from 'lucide-react';

function POSBottomBar() {
  const { saleMode, setSaleMode } = usePOS();
  
  return (
    <div className="h-[44px] bg-white border-t border-gray-200 flex justify-between items-center px-2 shrink-0">
      <div className="flex items-center h-full gap-1">
        <button 
          onClick={() => setSaleMode('fast')}
          className={`flex items-center gap-1.5 px-4 h-full border-b-2 font-medium text-[13px] transition-colors ${saleMode === 'fast' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
        >
          <Zap size={16} className={saleMode === 'fast' ? 'text-[#1a73e8]' : 'text-gray-400'} /> Bán nhanh
        </button>
        <button 
          onClick={() => setSaleMode('normal')}
          className={`flex items-center gap-1.5 px-4 h-full border-b-2 font-medium text-[13px] transition-colors ${saleMode === 'normal' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
        >
          <Clock size={16} className={saleMode === 'normal' ? 'text-[#1a73e8]' : 'text-gray-400'} /> Bán thường
        </button>
        <button 
          onClick={() => setSaleMode('delivery')}
          className={`flex items-center gap-1.5 px-4 h-full border-b-2 font-medium text-[13px] transition-colors ${saleMode === 'delivery' ? 'border-[#1a73e8] text-[#1a73e8]' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
        >
          <Truck size={16} className={saleMode === 'delivery' ? 'text-[#1a73e8]' : 'text-gray-400'} /> Bán giao hàng
        </button>
      </div>

      <div className="flex items-center gap-4 text-gray-500 pr-2">
        <div className="flex items-center gap-1.5 text-[#1a73e8] bg-blue-50 px-3 py-1 rounded-full text-[13px] font-medium cursor-pointer hover:bg-blue-100 transition-colors">
          <MessageSquare size={14} /> 1900 6522
        </div>
        <button className="hover:text-[#1a73e8] transition-colors"><MessageCircleQuestion size={18} /></button>
        <button className="hover:text-[#1a73e8] transition-colors"><HelpCircle size={18} /></button>
        <button className="hover:text-orange-500 text-orange-400 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z"/></svg>
        </button>
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
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#f0f2f5]">
      <POSHeader />
      
      <div className="flex flex-1 overflow-hidden p-2 gap-2">
        {/* Left column: Cart & Summary */}
        <div className={`bg-white border border-gray-200 flex flex-col shadow-sm rounded-lg overflow-hidden transition-all duration-300 ${saleMode === 'delivery' ? 'w-[32%] min-w-[320px]' : 'flex-1 min-w-[500px]'}`}>
          <POSCart />
        </div>
        
        {/* Right column: Products Grid or Payment Panel */}
        <div className={`flex flex-col bg-white border border-gray-200 shadow-sm rounded-lg relative overflow-hidden transition-all duration-300 ${saleMode === 'delivery' ? 'flex-1' : 'w-[40%] max-w-[500px] min-w-[400px]'}`}>
          {saleMode === 'delivery' ? (
            <POSDeliveryPanel />
          ) : saleMode === 'fast' ? (
            <POSPaymentPanel forceShow={true} />
          ) : (
            <>
              {isPaymentMode ? (
                <POSPaymentPanel forceShow={true} />
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
