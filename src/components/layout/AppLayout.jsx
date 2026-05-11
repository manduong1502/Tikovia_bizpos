import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navbar from './Navbar';

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <Navbar />
      <div className="flex-1 p-5 min-h-[calc(100vh-90px)]">
        <Outlet />
      </div>
    </div>
  );
}
