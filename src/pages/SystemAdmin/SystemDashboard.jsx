import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAppStore } from '../../stores/appStore';
import { 
  Sun, 
  Moon, 
  LogOut, 
  RefreshCw, 
  Edit3, 
  Trash2, 
  Globe, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Building2,
  Users2,
  Package,
  Calendar,
  Layers,
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react';

export default function SystemDashboard() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [superAdmin, setSuperAdmin] = useState(null);
  const navigate = useNavigate();

  // Dark mode integration
  const { darkMode, toggleDarkMode } = useAppStore();

  // Edit Modal States
  const [editingTenant, setEditingTenant] = useState(null);
  const [editPlan, setEditPlan] = useState('TRIAL');
  const [editExpiredAt, setEditExpiredAt] = useState('');
  const [editIsPermanent, setEditIsPermanent] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete Modal States
  const [deletingTenant, setDeletingTenant] = useState(null);
  const [confirmSubdomain, setConfirmSubdomain] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Load Super Admin User Info
    const userStr = localStorage.getItem('super_admin_user');
    if (userStr) {
      try {
        setSuperAdmin(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tenants');
      setTenants(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Không thể lấy danh sách gian hàng.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('super_admin_user');
    toast.success('Đăng xuất thành công');
    navigate('/login'); // Redirect to unified login page
  };

  // Dynamic subdomain url resolver
  const getTenantUrl = (subdomain) => {
    const hostname = window.location.hostname;
    const port = window.location.port; // e.g. "3000" or empty
    
    // For localhost dev server
    if (hostname === 'localhost') {
      return `http://${subdomain}.localhost${port ? `:${port}` : ''}/login`;
    }
    
    // For production server
    if (hostname.endsWith('bizpos.tikovia.vn')) {
      return `http://${subdomain}.bizpos.tikovia.vn/login`;
    }
    
    // General fallback
    return `http://${subdomain}.${hostname}${port ? `:${port}` : ''}/login`;
  };

  // Toggle Active State
  const handleToggleActive = async (tenant) => {
    if (tenant.id === 1) {
      toast.error('Không thể khóa gian hàng hệ thống gốc (ID: 1)');
      return;
    }

    const nextState = !tenant.isActive;
    const loadingToast = toast.loading(`Đang ${nextState ? 'kích hoạt' : 'khóa'} gian hàng...`);

    try {
      await api.put(`/tenants/${tenant.id}`, { isActive: nextState });
      toast.dismiss(loadingToast);
      toast.success(`Đã ${nextState ? 'kích hoạt' : 'khóa'} gian hàng '${tenant.name}'`);
      fetchTenants();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error(error);
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
    }
  };

  // Open Edit Modal
  const openEditModal = (tenant) => {
    setEditingTenant(tenant);
    setEditPlan(tenant.plan);
    if (tenant.expiredAt) {
      setEditExpiredAt(new Date(tenant.expiredAt).toISOString().split('T')[0]);
      setEditIsPermanent(false);
    } else {
      setEditExpiredAt('');
      setEditIsPermanent(true);
    }
  };

  // Save Edit Changes
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTenant) return;

    if (editingTenant.id === 1 && editPlan !== 'PRO') {
      toast.error('Không thể thay đổi gói của gian hàng gốc');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        plan: editPlan,
        expiredAt: editIsPermanent ? null : new Date(editExpiredAt).toISOString(),
      };

      await api.put(`/tenants/${editingTenant.id}`, payload);
      toast.success('Cập nhật gian hàng thành công!');
      setEditingTenant(null);
      fetchTenants();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Không thể lưu thay đổi.');
    } finally {
      setSaving(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (tenant) => {
    if (tenant.id === 1) {
      toast.error('Không thể xóa gian hàng hệ thống gốc (ID: 1)');
      return;
    }
    setDeletingTenant(tenant);
    setConfirmSubdomain('');
  };

  // Execute Cascade Delete
  const handleDeleteTenant = async () => {
    if (!deletingTenant) return;
    if (confirmSubdomain.toLowerCase() !== deletingTenant.subdomain.toLowerCase()) {
      toast.error('Subdomain xác nhận không khớp');
      return;
    }

    setDeleting(true);
    const loadingToast = toast.loading(`Đang xóa hoàn toàn gian hàng '${deletingTenant.name}'...`);

    try {
      await api.delete(`/tenants/${deletingTenant.id}`);
      toast.dismiss(loadingToast);
      toast.success(`Đã xóa sạch dữ liệu gian hàng '${deletingTenant.name}' thành công!`);
      setDeletingTenant(null);
      fetchTenants();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error(error);
      toast.error(error.response?.data?.message || 'Xóa gian hàng thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (tenant) => {
    if (!tenant.isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <XCircle size={13} /> Đã khóa
        </span>
      );
    }

    if (tenant.expiredAt) {
      const isExpired = new Date(tenant.expiredAt) < new Date();
      if (isExpired) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle size={13} /> Hết hạn
          </span>
        );
      }
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 size={13} /> Hoạt động
      </span>
    );
  };

  const getPlanBadge = (plan) => {
    switch (plan) {
      case 'PRO':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
            PRO
          </span>
        );
      case 'STANDARD':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30">
            STANDARD
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-500/30">
            TRIAL
          </span>
        );
    }
  };

  const formatExpiry = (tenant) => {
    if (!tenant.expiredAt) {
      return <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><Calendar size={13} /> Vĩnh viễn</span>;
    }
    const expiryDate = new Date(tenant.expiredAt);
    const isExpired = expiryDate < new Date();
    const formatted = expiryDate.toLocaleDateString('vi-VN');

    return (
      <span className={`inline-flex items-center gap-1 font-mono text-xs ${isExpired ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
        <Calendar size={13} /> {formatted} {isExpired ? '(Quá hạn)' : ''}
      </span>
    );
  };

  // Stats Calculations
  const totalStores = tenants.length;
  const activeStores = tenants.filter(t => t.isActive && (!t.expiredAt || new Date(t.expiredAt) >= new Date())).length;
  const lockedStores = tenants.filter(t => !t.isActive).length;
  const expiredStores = tenants.filter(t => t.isActive && t.expiredAt && new Date(t.expiredAt) < new Date()).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-12 transition-colors duration-300 relative overflow-hidden">
      {/* Background decoration (blobs visible in dark mode) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none hidden dark:block" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-sky-500/5 blur-[150px] pointer-events-none hidden dark:block" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-slate-900/75 border-b border-slate-200 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between transition-colors duration-350">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-500/10">
            TV
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Tikovia POS</h1>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">Super Admin Portal</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Header Actions */}

          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{superAdmin?.fullName || 'Tikovia Admin'}</p>
            <p className="text-xs text-slate-400">{superAdmin?.username}</p>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-200 border border-slate-300 dark:border-slate-700"
          >
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-lg dark:hover:shadow-indigo-500/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cửa hàng</p>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"><Building2 size={16} /></div>
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{totalStores}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Tổng số đã đăng ký</p>
          </div>
          
          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-lg dark:hover:shadow-indigo-500/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hoạt động</p>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={16} /></div>
            </div>
            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{activeStores}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Bình thường / Còn hạn</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-lg dark:hover:shadow-indigo-500/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quá hạn</p>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"><Calendar size={16} /></div>
            </div>
            <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">{expiredStores}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Hết hạn, cần gia hạn</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md dark:shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-lg dark:hover:shadow-indigo-500/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đang Khóa</p>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400"><ShieldAlert size={16} /></div>
            </div>
            <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">{lockedStores}</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">Khóa hệ thống thủ công</p>
          </div>
        </div>

        {/* Tenant Table Container */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-lg overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Danh sách gian hàng của khách hàng</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Quản lý kích hoạt, thời hạn và gói dịch vụ POS của các gian hàng</p>
            </div>
            <button
              onClick={fetchTenants}
              className="flex items-center gap-1.5 self-start sm:self-center px-4 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:text-white bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-600 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 rounded-xl transition-all duration-200 shadow-sm"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Làm mới dữ liệu
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Đang tải danh sách...</span>
              </div>
            ) : tenants.length === 0 ? (
              <div className="py-24 text-center text-slate-400 dark:text-slate-500">
                Chưa có gian hàng nào được đăng ký trên hệ thống.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/30">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Tên cửa hàng</th>
                    <th className="px-6 py-4">Tên miền truy cập (Subdomain)</th>
                    <th className="px-6 py-4">Liên hệ đại diện</th>
                    <th className="px-6 py-4">Khu vực</th>
                    <th className="px-6 py-4">Gói dịch vụ</th>
                    <th className="px-6 py-4">Hạn sử dụng</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-850 text-sm">
                  {tenants.map((t) => (
                    <tr 
                      key={t.id} 
                      className={`hover:bg-slate-100/40 dark:hover:bg-slate-900/20 transition-colors duration-150 ${t.id === 1 ? 'bg-indigo-50/20 dark:bg-indigo-950/5' : ''}`}
                    >
                      <td className="px-6 py-4 text-slate-400 dark:text-slate-500 font-mono text-xs">#{t.id}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 dark:text-white block">{t.name}</span>
                        {t.id === 1 && (
                          <span className="inline-flex mt-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Hệ thống gốc
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <a 
                          href={getTenantUrl(t.subdomain)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline font-mono text-xs font-semibold"
                        >
                          <Globe size={13} /> {t.subdomain}.bizpos.tikovia.vn <ExternalLink size={11} />
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                          {t.phone ? (
                            <>
                              <Phone size={13} className="text-slate-400" />
                              {t.phone}
                            </>
                          ) : (
                            <span className="text-slate-400 font-normal">Chưa thiết lập</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          {t.area ? (
                            <>
                              <MapPin size={13} className="text-slate-400" />
                              {t.area}
                            </>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getPlanBadge(t.plan)}</td>
                      <td className="px-6 py-4">{formatExpiry(t)}</td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(t)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {t.id !== 1 && (
                            <button
                              onClick={() => handleToggleActive(t)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150 cursor-pointer ${
                                t.isActive 
                                  ? 'bg-rose-50 dark:bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/10' 
                                  : 'bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/10'
                              }`}
                            >
                              {t.isActive ? 'Khóa' : 'Kích hoạt'}
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(t)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-350 transition-all duration-150 cursor-pointer"
                          >
                            <Edit3 size={13} /> Thiết lập
                          </button>
                          {t.id !== 1 && (
                            <button
                              onClick={() => openDeleteModal(t)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 dark:bg-red-500/5 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-200 dark:border-red-500/20 hover:border-red-350 transition-all duration-150 cursor-pointer"
                            >
                              <Trash2 size={13} /> Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Edit Expiry & Plan Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">
              Thiết lập gian hàng: {editingTenant.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Điều chỉnh gói cước dịch vụ và cấu hình hạn sử dụng của cửa hàng.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-6">
              {/* Plan Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                  Gói dịch vụ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['TRIAL', 'STANDARD', 'PRO'].map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      disabled={editingTenant.id === 1}
                      onClick={() => setEditPlan(plan)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all duration-150 cursor-pointer ${
                        editPlan === plan 
                          ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500' 
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-750'
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiry Date Selection */}
              {editingTenant.id !== 1 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Hạn sử dụng
                  </label>

                  <div className="flex items-center space-x-2 mb-4 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-850">
                    <input
                      type="checkbox"
                      id="permanent"
                      checked={editIsPermanent}
                      onChange={(e) => setEditIsPermanent(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                    />
                    <label htmlFor="permanent" className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                      Sử dụng vĩnh viễn (mặc định)
                    </label>
                  </div>

                  {!editIsPermanent && (
                    <div className="animate-slideDown">
                      <input
                        type="date"
                        value={editExpiredAt}
                        required={!editIsPermanent}
                        onChange={(e) => setEditExpiredAt(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thiết lập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Cascade Delete danger warning) */}
      {deletingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">Xóa vĩnh viễn gian hàng?</h3>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2 mb-6 leading-relaxed">
              <p className="text-red-700 dark:text-red-400 font-semibold bg-red-500/5 p-3.5 rounded-xl border border-red-200 dark:border-red-500/10">
                Cảnh báo: Hành động này không thể hoàn tác! Toàn bộ cơ sở dữ liệu (tài khoản nhân viên, sản phẩm, lịch sử hóa đơn, sổ quỹ...) thuộc về gian hàng này sẽ bị XÓA SẠCH hoàn toàn.
              </p>
              <p>Để tiếp tục, hãy nhập chính xác subdomain tên miền phụ <strong className="text-slate-950 dark:text-white select-all font-mono">{(deletingTenant.subdomain || '').toLowerCase()}</strong> vào bên dưới:</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={confirmSubdomain}
                onChange={(e) => setConfirmSubdomain(e.target.value)}
                placeholder="Nhập subdomain để xác nhận..."
                disabled={deleting}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all duration-200"
              />

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setDeletingTenant(null)}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleDeleteTenant}
                  disabled={deleting || confirmSubdomain.toLowerCase() !== deletingTenant.subdomain.toLowerCase()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-red-600/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {deleting ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
