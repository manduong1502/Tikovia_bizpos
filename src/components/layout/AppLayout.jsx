import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navbar from './Navbar';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50">
      <div className="relative z-[1000] shrink-0 shadow-sm">
        <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <Navbar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      </div>
      <main className="flex-1 p-1.5 sm:p-5 max-w-full overflow-y-auto custom-scrollbar flex flex-col relative z-0">
        <Outlet />
      </main>
    </div>
  );
}
