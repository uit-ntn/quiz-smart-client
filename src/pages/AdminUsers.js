import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../layout/AdminLayout";
import userService from "../services/userService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

/* =========================
   Icons (no dependency)
========================= */
const Icon = {
  Search: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 00-14.9-2M4 15a8 8 0 0014.9 2"
      />
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
    </svg>
  ),
  X: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Pencil: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
};

/* =========================
   Modal Shell (ESC + overlay)
========================= */
const ModalShell = ({ title, subtitle, onClose, children, maxWidth = "max-w-md" }) => {
  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative min-h-full flex items-center justify-center p-3">
        <div className={`w-full ${maxWidth} rounded-xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden`}>
          <div className="px-4 py-3 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900 truncate">{title}</div>
              {subtitle ? <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div> : null}
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              aria-label="Đóng"
            >
              <Icon.X className="w-4 h-4 text-slate-700" />
            </button>
          </div>

          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
};

const roleBadge = (role) => {
  if (role === "admin") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-indigo-50 text-indigo-700 border-indigo-200";
};

const initialCreate = { email: "", password: "", full_name: "", role: "user" };

const AdminUsers = () => {
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "user" });

  const [createForm, setCreateForm] = useState(initialCreate);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Không thể tải danh sách users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q);

      const matchRole = filterRole === "all" || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, filterRole]);

  const openCreate = () => {
    setCreateForm(initialCreate);
    setShowCreateModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({ full_name: user.full_name || "", role: user.role || "user" });
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      const newUser = await userService.createUser(createForm);
      setUsers((prev) => [newUser, ...prev]);
      setShowCreateModal(false);
      setCreateForm(initialCreate);
    } catch (err) {
      console.error("Error creating user:", err);
      alert("Không thể tạo user. Vui lòng thử lại!");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser || saving) return;

    try {
      setSaving(true);
      await userService.updateUser(editingUser._id, editForm);

      setUsers((prev) =>
        prev.map((u) => (u._id === editingUser._id ? { ...u, ...editForm } : u))
      );

      setShowEditModal(false);
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating user:", err);
      alert("Không thể cập nhật user. Vui lòng thử lại!");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner message="Đang tải danh sách users..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 py-5 space-y-4">
        {/* Toolbar card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">Quản lý Users</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Tổng số: <span className="font-medium text-slate-700">{filteredUsers.length}</span> users
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchUsers}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Icon.Refresh className="w-4 h-4" />
                <span className="hidden sm:inline">Làm mới</span>
              </button>

              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Icon.Plus className="w-4 h-4" />
                <span>Tạo user</span>
              </button>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
              {/* Search */}
              <div className="relative">
                <Icon.Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên hoặc email..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Role filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tất cả role</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {(searchTerm || filterRole !== "all") && (
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Đang lọc:{" "}
                  <span className="font-medium text-slate-700">
                    {searchTerm ? `“${searchTerm}”` : "—"}
                  </span>{" "}
                  • <span className="font-medium text-slate-700">{filterRole}</span>
                </div>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterRole("all");
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Xóa lọc
                </button>
              </div>
            )}

            {error ? (
              <div className="mt-3">
                <ErrorMessage message={error} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden lg:block">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-sm font-medium text-slate-700">
                  {searchTerm || filterRole !== "all" ? "Không tìm thấy user phù hợp" : "Chưa có user nào"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {searchTerm || filterRole !== "all"
                    ? "Thử từ khóa khác hoặc xóa lọc."
                    : "Bấm “Tạo user” để thêm mới."}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Role</th>
                      <th className="px-4 py-3 text-left">Ngày tham gia</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const initial =
                        (u.full_name?.trim()?.[0] || u.email?.trim()?.[0] || "U").toUpperCase();

                      return (
                        <tr key={u._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold">
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate">
                                  {u.full_name || "Chưa có tên"}
                                </div>
                                <div className="text-xs text-slate-500 truncate">ID: {u._id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-700 truncate max-w-[360px]">{u.email}</div>
                          </td>

                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${roleBadge(u.role)}`}>
                              {u.role === "admin" ? "Admin" : "User"}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-700">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "—"}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <button
                                onClick={() => openEdit(u)}
                                className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-indigo-700 hover:bg-indigo-50"
                              >
                                <Icon.Pencil className="w-4 h-4" />
                                Sửa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden p-3 space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-sm font-medium text-slate-700">
                  {searchTerm || filterRole !== "all" ? "Không tìm thấy user phù hợp" : "Chưa có user nào"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {searchTerm || filterRole !== "all"
                    ? "Thử từ khóa khác hoặc xóa lọc."
                    : "Bấm “Tạo user” để thêm mới."}
                </div>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const initial =
                  (u.full_name?.trim()?.[0] || u.email?.trim()?.[0] || "U").toUpperCase();

                return (
                  <div key={u._id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {u.full_name || "Chưa có tên"}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{u.email}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => openEdit(u)}
                        className="px-2.5 py-1.5 text-xs rounded-lg text-indigo-700 hover:bg-indigo-50"
                      >
                        Sửa
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${roleBadge(u.role)}`}>
                        {u.role === "admin" ? "Admin" : "User"}
                      </span>
                      <div className="text-xs text-slate-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "—"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <ModalShell
          title="Tạo user mới"
          subtitle="Tạo tài khoản và phân quyền"
          onClose={() => !saving && setShowCreateModal(false)}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mật khẩu <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                required
                minLength={6}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Họ tên</label>
              <input
                type="text"
                value={createForm.full_name}
                onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Nhập họ tên..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="pt-1 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Đang tạo..." : "Tạo user"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <ModalShell
          title="Chỉnh sửa user"
          subtitle={editingUser?.email || ""}
          onClose={() => !saving && setShowEditModal(false)}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="text"
                value={editingUser?.email || ""}
                disabled
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Họ tên</label>
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Nhập họ tên..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="pt-1 flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
