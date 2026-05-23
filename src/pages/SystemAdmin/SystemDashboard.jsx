import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

export default function SystemDashboard() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [superAdmin, setSuperAdmin] = useState(null);
  const navigate = useNavigate();

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
    navigate('/system-admin/login');
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
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          Đã khóa
        </span>
      );
    }

    if (tenant.expiredAt) {
      const isExpired = new Date(tenant.expiredAt) < new Date();
      if (isExpired) {
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Hết hạn
          </span>
        );
      }
    }

    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        Hoạt động
      </span>
    );
  };

  const getPlanBadge = (plan) => {
    switch (plan) {
      case 'PRO':
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
            PRO
          </span>
        );
      case 'STANDARD':
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
            STANDARD
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-500/20 text-slate-300 border border-slate-500/30">
            TRIAL
          </span>
        );
    }
  };

  const formatExpiry = (tenant) => {
    if (!tenant.expiredAt) {
      return <span className="text-emerald-400 font-medium">Vĩnh viễn</span>;
    }
    const expiryDate = new Date(tenant.expiredAt);
    const isExpired = expiryDate < new Date();
    const formatted = expiryDate.toLocaleDateString('vi-VN');

    return (
      <span className={isExpired ? 'text-rose-400 font-medium' : 'text-slate-300'}>
        {formatted} {isExpired ? '(Đã quá hạn)' : ''}
      </span>
    );
  };

  // Stats Calculations
  const totalStores = tenants.length;
  const activeStores = tenants.filter(t => t.isActive && (!t.expiredAt || new Date(t.expiredAt) >= new Date())).length;
  const lockedStores = tenants.filter(t => !t.isActive).length;
  const expiredStores = tenants.filter(t => t.isActive && t.expiredAt && new Date(t.expiredAt) < new Date()).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-sky-500/5 blur-[150px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-slate-900/75 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-indigo-500/10">
            TV
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Tikovia POS</h1>
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Super Admin Control Portal</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-200">{superAdmin?.fullName || 'Tikovia Admin'}</p>
            <p className="text-xs text-slate-400">{superAdmin?.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white transition-all duration-200 border border-slate-700"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10 space-y-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tổng số cửa hàng</p>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">{totalStores}</h3>
            <p className="text-xs text-indigo-400 mt-2 font-medium">Đã đăng ký hệ thống</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Đang hoạt động</p>
            <h3 className="text-3xl font-extrabold text-emerald-400 tracking-tight">{activeStores}</h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">Bình thường / Chưa hết hạn</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Cửa hàng quá hạn</p>
            <h3 className="text-3xl font-extrabold text-amber-400 tracking-tight">{expiredStores}</h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">Cần gia hạn hợp đồng</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Gian hàng bị khóa</p>
            <h3 className="text-3xl font-extrabold text-rose-400 tracking-tight">{lockedStores}</h3>
            <p className="text-xs text-slate-500 mt-2 font-medium">Đã bị khóa thủ công</p>
          </div>
        </div>

        {/* Tenant Table Container */}
        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Danh sách gian hàng của khách hàng</h2>
              <p className="text-xs text-slate-400 mt-1">Quản lý trạng thái kích hoạt, thời hạn và gói dịch vụ POS</p>
            </div>
            <button
              onClick={fetchTenants}
              className="self-start sm:self-center px-4 py-2 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-all duration-200"
            >
              Làm mới dữ liệu
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-slate-400">Đang tải danh sách gian hàng...</span>
              </div>
            ) : tenants.length === 0 ? (
              <div className="py-20 text-center text-slate-500">
                Chưa có gian hàng nào được đăng ký trên hệ thống.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30">
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Tên cửa hàng</th>
                    <th className="px-6 py-4">Tên miền phụ (Subdomain)</th>
                    <th className="px-6 py-4">Đại diện & Liên hệ</th>
                    <th className="px-6 py-4">Khu vực</th>
                    <th className="px-6 py-4">Gói dịch vụ</th>
                    <th className="px-6 py-4">Hạn sử dụng</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-sm">
                  {tenants.map((t) => (
                    <tr 
                      key={t.id} 
                      className={`hover:bg-slate-900/20 transition-colors duration-150 ${t.id === 1 ? 'bg-indigo-950/5' : ''}`}
                    >
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">#{t.id}</td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {t.name}
                        {t.id === 1 && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Hệ thống gốc
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <a 
                          href={`http://${t.subdomain}.localhost:3000`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 underline font-mono text-xs"
                        >
                          {t.subdomain}.bizpos.tikovia.vn
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-200 font-medium">{t.phone ? 'Liên hệ' : 'N/A'}</div>
                        <div className="text-xs text-slate-400">{t.phone || 'Chưa cập nhật'}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{t.area || 'Chưa cập nhật'}</td>
                      <td className="px-6 py-4">{getPlanBadge(t.plan)}</td>
                      <td className="px-6 py-4 text-xs font-mono">{formatExpiry(t)}</td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(t)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2.5">
                          {t.id !== 1 && (
                            <button
                              onClick={() => handleToggleActive(t)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
                                t.isActive 
                                  ? 'bg-rose-500/5 text-rose-400 border-rose-500/20 hover:bg-rose-500/10' 
                                  : 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                              }`}
                            >
                              {t.isActive ? 'Khóa' : 'Kích hoạt'}
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(t)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700 hover:border-slate-650 transition-all duration-150"
                          >
                            Thiết lập
                          </button>
                          {t.id !== 1 && (
                            <button
                              onClick={() => openDeleteModal(t)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 transition-all duration-150"
                            >
                              Xóa
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2">
              Thiết lập gian hàng: {editingTenant.name}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Điều chỉnh gói cước dịch vụ và cấu hình hạn sử dụng của cửa hàng.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-6">
              {/* Plan Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Gói dịch vụ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['TRIAL', 'STANDARD', 'PRO'].map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      disabled={editingTenant.id === 1}
                      onClick={() => setEditPlan(plan)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all duration-150 ${
                        editPlan === plan 
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500' 
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Hạn sử dụng
                  </label>

                  <div className="flex items-center space-x-2 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-850">
                    <input
                      type="checkbox"
                      id="permanent"
                      checked={editIsPermanent}
                      onChange={(e) => setEditIsPermanent(e.target.checked)}
                      className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                    />
                    <label htmlFor="permanent" className="text-xs text-slate-300 select-none cursor-pointer">
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
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
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
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
            <div className="flex items-center space-x-3 text-red-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-bold text-white">Xóa vĩnh viễn gian hàng?</h3>
            </div>

            <div className="text-xs text-slate-400 space-y-2 mb-6 leading-relaxed">
              <p className="text-red-400 font-semibold bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                Cảnh báo: Hành động này không thể hoàn tác! Toàn bộ cơ sở dữ liệu (tài khoản nhân viên, sản phẩm, lịch sử hóa đơn, sổ quỹ...) thuộc về gian hàng này sẽ bị XÓA SẠCH hoàn toàn.
              </p>
              <p>Để tiếp tục, hãy nhập chính xác subdomain tên miền phụ <strong className="text-white select-all font-mono">{(deletingTenant.subdomain || '').toLowerCase()}</strong> vào bên dưới:</p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={confirmSubdomain}
                onChange={(e) => setConfirmSubdomain(e.target.value)}
                placeholder="Nhập subdomain để xác nhận..."
                disabled={deleting}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all duration-200"
              />

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setDeletingTenant(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleDeleteTenant}
                  disabled={deleting || confirmSubdomain.toLowerCase() !== deletingTenant.subdomain.toLowerCase()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-red-600/20 active:scale-[0.98] transition-all"
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
