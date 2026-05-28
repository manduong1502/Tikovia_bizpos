import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Monitor, ShoppingCart, AlertCircle, PlusCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import api, { getSubdomain } from '../../services/api';
import { useAppStore } from '../../stores/appStore';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [tenantError, setTenantError] = useState('');
  const [tenantLoading, setTenantLoading] = useState(true);
  const navigate = useNavigate();
  const setUser = useAppStore(s => s.setUser);

  const currentSubdomain = getSubdomain();

  useEffect(() => {
    // Check if there is a token in the URL query parameters (SSO from base domain)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      const fetchUserData = async () => {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          toast.success('Đăng nhập thành công!');
          navigate('/dashboard');
        } catch (e) {
          console.error(e);
          localStorage.removeItem('token');
          setError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
        }
      };
      fetchUserData();
      return;
    }

    const checkTenant = async () => {
      try {
        const res = await api.get('/auth/tenant', { hideErrorToast: true });
        setTenant(res.data);
      } catch (err) {
        setTenantError(err.response?.data?.message || `Cửa hàng '${currentSubdomain}' không tồn tại trên hệ thống.`);
      } finally {
        setTenantLoading(false);
      }
    };
    checkTenant();
  }, [currentSubdomain, navigate, setUser]);

  const handleLogin = async (e, target = 'dashboard') => {
    if (e) e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (username === 'tikovia') {
        const res = await api.post('/auth/system-login', { username, password });
        if (res.data.token) {
          localStorage.setItem('super_admin_token', res.data.token);
          localStorage.setItem('super_admin_user', JSON.stringify(res.data.user));
          navigate('/system-admin');
        }
      } else {
        const res = await api.post('/auth/login', { username, password });
        if (res.data.token) {
          // Disable tenant subdomain redirection to keep only 1 default shop
          /*
          const tenantSubdomain = res.data.tenant?.subdomain;
          const hostname = window.location.hostname.toLowerCase();
          const port = window.location.port;

          const isBaseDomain = hostname === 'bizpos.tikovia.vn' || hostname === 'localhost';

          if (isBaseDomain && tenantSubdomain) {
            const targetHost = hostname === 'localhost' 
              ? `${tenantSubdomain}.localhost${port ? `:${port}` : ''}`
              : `${tenantSubdomain}.bizpos.tikovia.vn`;
            
            window.location.href = `http://${targetHost}/login?token=${res.data.token}`;
            return;
          }
          */

          if (res.data.tenant?.subdomain) {
            localStorage.setItem('tenant_subdomain', res.data.tenant.subdomain);
          }
          localStorage.setItem('token', res.data.token);
          setUser(res.data.user);
          if (target === 'pos') {
            navigate('/pos');
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-5 dark:bg-[#0f1117]">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-500">Đang tải thông tin gian hàng...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light flex flex-col dark:bg-[#0f1117]">
      <div className="flex-1 flex flex-col items-center justify-center p-5">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-[420px] mb-[10vh] dark:bg-[#1a1d27] dark:border dark:border-gray-800">
          
          {tenantError ? (
            <div className="text-center py-4 space-y-5">
              <div className="flex justify-center">
                <AlertCircle size={48} className="text-danger" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Không tìm thấy gian hàng</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {tenantError}
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-3">
                <Link to="/register-tenant" className="w-full">
                  <Button variant="primary" className="w-full py-2.5 font-medium text-[15px]" icon={<PlusCircle size={18} />}>
                    Đăng ký gian hàng mới
                  </Button>
                </Link>
                <button 
                  onClick={() => {
                    localStorage.removeItem('tenant_subdomain');
                    window.location.reload();
                  }}
                  className="text-sm text-primary hover:underline bg-transparent border-none cursor-pointer"
                >
                  Quay lại gian hàng demo
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-green-500 rounded-xl flex items-center justify-center text-white font-extrabold text-2xl mb-4 shadow-sm shadow-primary/30">
                  T
                </div>
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight m-0 dark:text-white">
                  {tenant ? tenant.name : 'Tiko BizPOS'}
                </h1>
                {tenant && (
                  <span className="text-xs text-gray-500 font-mono mt-1 dark:text-gray-400">
                    {tenant.subdomain}.{window.location.hostname}
                  </span>
                )}
              </div>
              
              {error && <div className="bg-red-50 text-danger px-4 py-3 rounded mb-5 text-[13px] border border-red-100 dark:bg-red-950/20 dark:border-red-900/30">{error}</div>}
              
              <form onSubmit={(e) => handleLogin(e, 'dashboard')}>
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
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer flex items-center justify-center focus:outline-none dark:hover:text-gray-300" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                <div className="flex items-center justify-between mb-6 text-[13px]">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-600 select-none dark:text-gray-400">
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
              
              {currentSubdomain === 'demo' && (
                <div className="mt-8 text-center text-[13px] text-gray-500 bg-gray-50 py-2 rounded dark:bg-gray-800/50 dark:text-gray-400">
                  Mặc định: <b className="text-gray-700 dark:text-gray-300">admin</b> / <b className="text-gray-700 dark:text-gray-300">admin123</b>
                </div>
              )}

              <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Chưa có tài khoản?{' '}
                <Link to="/register-tenant" className="font-medium text-primary hover:text-primary-hover no-underline">
                  Đăng ký gian hàng mới
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
      <div className="bg-white border-t border-border p-4 flex items-center justify-between text-xs text-gray-500 px-8 dark:bg-[#1a1d27] dark:border-gray-800">
        <span>📞 Hỗ trợ: 1900 0000</span>
        <span>🇻🇳 Tiếng Việt</span>
      </div>
    </div>
  );
}
