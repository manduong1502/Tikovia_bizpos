import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Monitor, ShoppingCart } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import api from '../../services/api';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e, target = 'dashboard') => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/products');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-[420px] mb-[10vh]">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-green-500 rounded-xl flex items-center justify-center text-white font-extrabold text-2xl mb-4 shadow-sm shadow-primary/30">
              T
            </div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight m-0">Tiko BizPOS</h1>
          </div>
          
          {error && <div className="bg-red-50 text-danger px-4 py-3 rounded mb-5 text-[13px] border border-red-100">{error}</div>}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <Input 
                type="text" 
                placeholder="Tên đăng nhập" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="py-2.5"
              />
            </div>
            <div className="mb-5 relative">
              <Input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Mật khẩu" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required 
                className="py-2.5 pr-10"
              />
              <button 
                type="button" 
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer flex items-center justify-center focus:outline-none" 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <div className="flex items-center justify-between mb-6 text-[13px]">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600 select-none">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" /> Duy trì đăng nhập
              </label>
              <a href="#" className="text-primary hover:text-primary-hover no-underline">Quên mật khẩu?</a>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button type="submit" variant="primary" className="w-full py-2.5 font-medium text-[15px]" disabled={loading} icon={<Monitor size={18} />}>
                Quản lý
              </Button>
              <Button type="button" variant="default" className="w-full py-2.5 font-medium text-[15px]" disabled={loading} onClick={(e) => handleLogin(e, 'pos')} icon={<ShoppingCart size={18} />}>
                Bán hàng
              </Button>
            </div>
          </form>
          
          <div className="mt-8 text-center text-[13px] text-gray-500 bg-gray-50 py-2 rounded">
            Mặc định: <b className="text-gray-700">admin</b> / <b className="text-gray-700">admin123</b>
          </div>
        </div>
      </div>
      <div className="bg-white border-t border-border p-4 flex items-center justify-between text-xs text-gray-500 px-8">
        <span>📞 Hỗ trợ: 1900 0000</span>
        <span>🇻🇳 Tiếng Việt</span>
      </div>
    </div>
  );
}
