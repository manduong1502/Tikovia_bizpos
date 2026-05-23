import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, User, Mail, Lock, ShieldCheck, ArrowRight, ArrowLeft, Check, CheckCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function RegisterTenantPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const navigate = useNavigate();

  // Form State
  const [tenantName, setTenantName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const getDomainSuffix = () => {
    const host = window.location.hostname;
    const port = window.location.port;

    // Check if host is an IP address
    const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host);
    if (isIP) {
      return port ? `localhost:${port}` : 'tikovia.vn';
    }

    const parts = host.split('.');
    let baseHost = host;
    if (parts.length > 1) {
      if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== '127' && !parts[0].includes('localhost')) {
        baseHost = parts.slice(1).join('.');
      }
    }
    return port ? `${baseHost}:${port}` : baseHost;
  };

  const domainSuffix = getDomainSuffix();

  const validateStep1 = () => {
    if (!tenantName.trim()) {
      setError('Vui lòng nhập tên cửa hàng');
      return false;
    }
    if (!subdomain.trim()) {
      setError('Vui lòng nhập địa chỉ truy cập (subdomain)');
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      setError('Địa chỉ truy cập chỉ được chứa chữ thường không dấu, số và dấu gạch ngang (-) và không chứa khoảng trắng');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = () => {
    if (!adminFullName.trim()) {
      setError('Vui lòng nhập họ và tên');
      return false;
    }
    if (!adminUsername.trim()) {
      setError('Vui lòng nhập tên đăng nhập');
      return false;
    }
    if (adminUsername.length < 3) {
      setError('Tên đăng nhập tối thiểu phải có 3 ký tự');
      return false;
    }
    if (!adminPassword) {
      setError('Vui lòng nhập mật khẩu');
      return false;
    }
    if (adminPassword.length < 6) {
      setError('Mật khẩu tối thiểu phải có 6 ký tự');
      return false;
    }
    if (adminEmail && !/\S+@\S+\.\S+/.test(adminEmail)) {
      setError('Email không đúng định dạng');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = (e) => {
    if (e) e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register-tenant', {
        tenantName,
        subdomain: subdomain.toLowerCase().trim(),
        adminUsername: adminUsername.trim(),
        adminPassword,
        adminFullName: adminFullName.trim(),
        adminEmail: adminEmail ? adminEmail.trim() : null,
      });

      toast.success('Đăng ký gian hàng thành công!');
      setSuccessData(response.data.tenant);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const getSubdomainUrl = (sub) => {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;

    // Check if host is an IP address
    const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host);
    if (isIP) {
      const targetHost = port ? `localhost:${port}` : 'tikovia.vn';
      return `${protocol}//${sub}.${targetHost}/login`;
    }

    const parts = host.split('.');
    let baseHost = host;
    if (parts.length > 1) {
      if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] !== '127' && !parts[0].includes('localhost')) {
        baseHost = parts.slice(1).join('.');
      }
    }
    const finalHost = `${sub}.${baseHost}`;
    return `${protocol}//${finalHost}${port ? `:${port}` : ''}/login`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 dark:bg-[#0f1117]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-green-500 rounded-2xl flex items-center justify-center text-white font-extrabold text-3xl shadow-lg shadow-primary/20 animate-bounce">
            T
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight dark:text-white">
          Đăng ký gian hàng Tiko BizPOS
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Khởi tạo không gian kinh doanh riêng biệt của bạn chỉ trong 30 giây
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-gray-100 dark:bg-[#1a1d27] dark:border-gray-800">
          
          {/* Progress Indicator */}
          {step < 3 && (
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {step > 1 ? <Check size={16} /> : '1'}
                  </span>
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-200">Gian hàng</span>
                </div>
                <div className="flex-1 h-0.5 bg-gray-200 mx-4 dark:bg-gray-700" />
                <div className="flex items-center">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${step === 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                    2
                  </span>
                  <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">Quản trị viên</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-danger px-4 py-3 rounded-lg mb-6 text-sm border border-red-100 dark:bg-red-950/20 dark:border-red-900/30">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Tên cửa hàng / Doanh nghiệp
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Tiko Fashion, Tạp hóa Cỏ May..."
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  icon={<Store size={18} />}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Địa chỉ truy cập (Subdomain)
                </label>
                <div className="flex rounded-md shadow-sm">
                  <div className="relative flex-grow focus-within:z-10">
                    <input
                      type="text"
                      className="block w-full rounded-none rounded-l-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary dark:bg-[#1e2130] dark:border-gray-700 dark:text-white"
                      placeholder="cua-hang-cua-ban"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      required
                    />
                  </div>
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
                    .{domainSuffix}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Chỉ dùng chữ thường, số, dấu gạch ngang. Ví dụ: <span className="font-mono text-primary font-semibold">my-store</span>
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 font-medium text-[15px]"
                  icon={<ArrowRight size={18} />}
                >
                  Tiếp tục
                </Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-6 animate-page-in">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Họ và tên người quản lý
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  icon={<User size={18} />}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Địa chỉ Email
                </label>
                <Input
                  type="email"
                  placeholder="admin@gmail.com (Không bắt buộc)"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  icon={<Mail size={18} />}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Tên tài khoản quản trị
                </label>
                <Input
                  type="text"
                  placeholder="Tên đăng nhập (ví dụ: admin)"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  icon={<User size={18} />}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                  Mật khẩu đăng nhập
                </label>
                <Input
                  type="password"
                  placeholder="Tối thiểu 6 ký tự"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  icon={<Lock size={18} />}
                  required
                />
              </div>

              <div className="flex gap-4 pt-2">
                <Button
                  type="button"
                  variant="default"
                  className="w-1/3 py-2.5 font-medium text-[15px]"
                  onClick={handleBack}
                  icon={<ArrowLeft size={18} />}
                >
                  Quay lại
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-2/3 py-2.5 font-medium text-[15px]"
                  disabled={loading}
                  icon={<ShieldCheck size={18} />}
                >
                  {loading ? 'Đang tạo...' : 'Hoàn tất đăng ký'}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && successData && (
            <div className="text-center py-4 space-y-6 animate-page-in">
              <div className="flex justify-center">
                <CheckCircle size={64} className="text-success animate-pulse" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Chúc mừng doanh nghiệp!</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Cửa hàng <span className="font-semibold text-gray-900 dark:text-white">"{successData.name}"</span> đã được khởi tạo thành công trên hệ thống Tiko BizPOS.
                </p>
              </div>

              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 text-left dark:bg-blue-950/20 dark:border-blue-900/30 space-y-3">
                <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider dark:text-blue-400">
                  Thông tin truy cập của bạn:
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  🔗 Trang đăng nhập cửa hàng: <br />
                  <a
                    href={getSubdomainUrl(successData.subdomain)}
                    className="font-semibold text-primary hover:underline break-all block mt-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {getSubdomainUrl(successData.subdomain)}
                  </a>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  👤 Tài khoản Admin: <span className="font-semibold text-gray-900 dark:text-white">{adminUsername}</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={getSubdomainUrl(successData.subdomain)}
                  className="inline-flex items-center justify-center w-full px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg shadow-primary/20"
                >
                  Truy cập ngay cửa hàng của bạn
                </a>
              </div>
            </div>
          )}

          {step < 3 && (
            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Đã có gian hàng?{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary-hover no-underline">
                Đăng nhập ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
