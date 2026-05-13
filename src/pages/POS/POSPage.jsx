import { useEffect } from 'react';
import { POSProvider } from './POSContext';
import POSHeader from './POSHeader';
import POSCart from './POSCart';
import POSProductGrid from './POSProductGrid';
import POSPaymentPanel from './POSPaymentPanel';

function POSLayout() {
  // Add dark background for POS
  useEffect(() => {
    document.body.style.backgroundColor = '#f0f2f5';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#f0f2f5]">
      <POSHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left column: Cart & Summary */}
        <div className="w-[35%] min-w-[350px] bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
          <POSCart />
        </div>
        
        {/* Right column: Products Grid & Payment */}
        <div className="flex-1 flex flex-col bg-gray-50 relative overflow-hidden">
          {/* Product Grid */}
          <POSProductGrid />
          
          {/* Payment Panel slides from bottom or is fixed on right side? 
              In typical KiotViet POS, the payment panel is part of the right column when "Payment" is clicked,
              or it's always visible as a sidebar. Let's make it a sliding panel or overlay when payment is clicked,
              OR follow the old JS where it completely replaces the product grid.
              For simplicity, let's keep it next to cart or overlaying product grid. 
              Actually, in KiotViet, the right pane switches between Products and Payment.
          */}
          <POSPaymentPanel />
        </div>
      </div>
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
