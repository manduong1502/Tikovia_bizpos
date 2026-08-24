import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Monitor, ShoppingCart, AlertCircle, PlusCircle, ShieldCheck, Mail, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import api, { getSubdomain, authAPI } from '../../services/api';
import { useAppStore } from '../../stores/appStore';
import { getDeviceName, getDeviceToken, setDeviceToken } from '../../utils/deviceHelper';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [tenantError, setTenantError] = useState('');
  const [tenantLoading, setTenantLoading] = useState(true);

  // 2FA OTP state
  const [tempToken, setTempToken] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [trustDevice, setTrustDevice] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const [targetDestination, setTargetDestination] = useState('dashboard');

  const otpInputsRef = useRef([]);
  const navigate = useNavigate();
  const setUser = useAppStore(s => s.setUser);
  const currentSubdomain = getSubdomain();

  // Resend countdown timer effect
  useEffect(() => {
    let timer = null;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCountdown]);

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
        // Clear any stale invalid subdomain
        if (localStorage.getItem('tenant_subdomain')) {
          localStorage.removeItem('tenant_subdomain');
          try {
            const retryRes = await api.get('/auth/tenant', { hideErrorToast: true });
            setTenant(retryRes.data);
            return;
          } catch (e2) {}
        }
        setTenant({ name: 'Tiko BizPOS', subdomain: 'demo' });
      } finally {
        setTenantLoading(false);
      }
    };
    checkTenant();
  }, [currentSubdomain, navigate, setUser]);

  // Focus the first OTP input when transitioning to OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        if (otpInputsRef.current[0]) {
          otpInputsRef.current[0].focus();
        }
      }, 100);
    }
  }, [step]);

  const handleLogin = async (e, target = 'dashboard') => {
    if (e) e.preventDefault();

    let cleanUser = (username || '').trim();
    let cleanPass = password || '';

    // Handle double-input scenarios
    if (cleanUser === 'adminadmin') cleanUser = 'admin';
    if (cleanPass === 'admin123admin123') cleanPass = 'admin123';

    if (!cleanUser || !cleanPass) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }
    setError('');
    setLoading(true);
    setTargetDestination(target);

    try {
      if (cleanUser === 'tikovia') {
        const res = await api.post('/auth/system-login', { username: cleanUser, password: cleanPass });
        if (res.data.token) {
          localStorage.setItem('super_admin_token', res.data.token);
          localStorage.setItem('super_admin_user', JSON.stringify(res.data.user));
          navigate('/system-admin');
        }
        return;
      }

      localStorage.removeItem('token');
      const deviceToken = getDeviceToken();
      const deviceName = getDeviceName();

      const res = await authAPI.login({
        username: cleanUser,
        password: cleanPass,
        deviceToken,
        deviceName,
      });

      // Scenario A: 2FA required on untrusted device
      if (res.requiresOtp) {
        setTempToken(res.tempToken);
        setEmailMasked(res.emailMasked || 'Gmail của bạn');
        setOtpDigits(['', '', '', '', '', '']);
        setResendCountdown(60);
        setStep('otp');
        toast('Vui lòng kiểm tra mã OTP gửi về Gmail để xác thực.', { icon: '🛡️' });
        return;
      }

      // Scenario B: Direct login (Trusted device or Admin without 2FA)
      if (res.token) {
        if (res.tenant?.subdomain) {
          localStorage.setItem('tenant_subdomain', res.tenant.subdomain);
        }
        localStorage.setItem('token', res.token);
        setUser(res.user);
        toast.success('Đăng nhập thành công!');
        if (target === 'pos') {
          navigate('/pos');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('LOGIN ERROR DETAILS:', err, err.response);
      setError(err.response?.data?.message || err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  // OTP Input handlers - Smooth continuous typing without skipping boxes
  const handleOtpChange = (index, val) => {
    const cleanVal = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (!cleanVal) {
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    if (cleanVal.length > 1) {
      // Handle paste or fast multi-character buffer from IME
      const pasted = cleanVal.slice(0, 6).split('');
      pasted.forEach((ch, idx) => {
        if (index + idx < 6) {
          newDigits[index + idx] = ch;
        }
      });
      setOtpDigits(newDigits);
      const nextFocus = Math.min(5, index + pasted.length);
      otpInputsRef.current[nextFocus]?.focus();
      otpInputsRef.current[nextFocus]?.select();
      return;
    }

    // Single digit typed - replace current and advance
    const singleChar = cleanVal.slice(-1);
    newDigits[index] = singleChar;
    setOtpDigits(newDigits);

    // Advance to next box immediately
    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
      otpInputsRef.current[index + 1]?.select();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...otpDigits];
      if (newDigits[index]) {
        newDigits[index] = '';
        setOtpDigits(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpInputsRef.current[index - 1]?.focus();
        otpInputsRef.current[index - 1]?.select();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpInputsRef.current[index - 1]?.focus();
      otpInputsRef.current[index - 1]?.select();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      otpInputsRef.current[index + 1]?.focus();
      otpInputsRef.current[index + 1]?.select();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;
    const newDigits = ['', '', '', '', '', ''];
    pastedData.split('').forEach((ch, idx) => {
      newDigits[idx] = ch;
    });
    setOtpDigits(newDigits);
    const nextIndex = Math.min(5, pastedData.length);
    otpInputsRef.current[nextIndex]?.focus();
    otpInputsRef.current[nextIndex]?.select();
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const otpCode = otpDigits.join('');

    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await authAPI.verifyOtp({
        tempToken,
        otpCode,
        trustDevice,
        deviceName: getDeviceName(),
      });

      if (res.token) {
        if (res.deviceToken) {
          setDeviceToken(res.deviceToken);
        }
        if (res.tenant?.subdomain) {
          localStorage.setItem('tenant_subdomain', res.tenant.subdomain);
        }
        localStorage.setItem('token', res.token);
        setUser(res.user);
        toast.success(trustDevice ? 'Xác thực thành công! Thiết bị đã được tin cậy trong 30 ngày.' : 'Xác thực thành công!');
        if (targetDestination === 'pos') {
          navigate('/pos');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('OTP VERIFICATION ERROR:', err, err.response);
      setError(err.response?.data?.message || err.message || 'Mã xác thực không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || resending) return;
    setResending(true);
    setError('');

    try {
      const res = await authAPI.resendOtp({
        tempToken,
        deviceName: getDeviceName(),
      });
      setResendCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
      toast.success(res.message || 'Đã gửi lại mã xác thực OTP mới về Gmail!');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể gửi lại mã OTP');
    } finally {
      setResending(false);
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
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-[440px] mb-[10vh] border border-gray-100 dark:bg-[#1a1d27] dark:border-gray-800 transition-all">
          
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
          ) : step === 'otp' ? (
            /* STEP 2: 2FA OTP VERIFICATION */
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setError('');
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors border-none bg-transparent cursor-pointer flex items-center justify-center"
                  title="Quay lại"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bảo mật tài khoản</span>
              </div>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-4 animate-bounce-subtle">
                  <ShieldCheck size={30} />
                </div>
                <h2 className="text-xl font-extrabold text-gray-800 tracking-tight dark:text-white">
                  Xác thực 2 lớp qua Gmail
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 px-2 dark:text-gray-400 leading-relaxed">
                  Phát hiện đăng nhập trên thiết bị mới. Mã xác thực 6 chữ số đã được gửi tới:
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                  <Mail size={13} />
                  <span>{emailMasked}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-danger px-4 py-3 rounded-xl mb-5 text-[13px] border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-600 mb-2 text-center dark:text-gray-400">
                    Nhập mã 6 chữ số từ email
                  </label>
                  <div className="flex justify-between gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => otpInputsRef.current[idx] = el}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={digit}
                        onFocus={e => e.target.select()}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className="w-12 h-14 text-center text-xl font-extrabold text-gray-800 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>
                </div>

                {/* 30-Day Trust Device Checkbox */}
                <div className="mb-6 bg-gray-50 p-3.5 rounded-xl border border-gray-200/80 dark:bg-gray-800/60 dark:border-gray-700">
                  <label className="flex items-start gap-2.5 cursor-pointer text-[13px] text-gray-700 select-none dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={trustDevice}
                      onChange={e => setTrustDevice(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        Tin cậy thiết bị này trong 30 ngày
                      </span>
                      <span className="text-[11px] text-gray-500 mt-0.5 leading-snug dark:text-gray-400">
                        Không yêu cầu nhập lại mã OTP trên trình duyệt này trong vòng 30 ngày tiếp theo.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full py-3 font-bold text-[15px] shadow-md hover:shadow-lg bg-gradient-to-r from-primary to-blue-600 border-none justify-center"
                    disabled={loading || otpDigits.join('').length !== 6}
                    icon={<CheckCircle2 size={18} />}
                  >
                    {loading ? 'Đang xác thực...' : 'Xác nhận đăng nhập'}
                  </Button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <span className="text-gray-500 dark:text-gray-400">Chưa nhận được mã?</span>
                    {resendCountdown > 0 ? (
                      <span className="text-gray-400 font-medium">
                        Gửi lại sau ({resendCountdown}s)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resending}
                        className="text-primary hover:underline font-bold bg-transparent border-none cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
                        {resending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* STEP 1: USERNAME & PASSWORD */
            <>
              <div className="flex flex-col items-center mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl mb-4 shadow-md shadow-primary/30">
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
              
              {error && (
                <div className="bg-red-50 text-danger px-4 py-3 rounded-xl mb-5 text-[13px] border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
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
                    {loading ? 'Đang đăng nhập...' : 'Quản lý'}
                  </Button>
                  <Button type="button" variant="default" className="w-full py-2.5 font-medium text-[15px]" disabled={loading} onClick={(e) => handleLogin(e, 'pos')} icon={<ShoppingCart size={18} />}>
                    {loading ? 'Đang đăng nhập...' : 'Bán hàng'}
                  </Button>
                </div>
              </form>
              
              {currentSubdomain === 'demo' && (
                <div className="mt-8 text-center text-[13px] text-gray-500 bg-gray-50 py-2.5 rounded-xl border border-gray-100 dark:bg-gray-800/50 dark:text-gray-400">
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
