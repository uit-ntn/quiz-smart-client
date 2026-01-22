import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AdminLayout, { useSidebar } from "../layout/AdminLayout";
import userService from "../services/userService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import Toast from "../components/Toast";

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
  Trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

// Small preview helper that waits for onLoad/onError to determine visibility
const PreviewImage = ({ src, alt = "Avatar preview", className = "w-16 h-16 rounded-full object-cover border-2 border-slate-200" }) => {
  const [status, setStatus] = useState("idle"); // idle | loaded | error

  useEffect(() => {
    setStatus(src ? "idle" : "idle");
  }, [src]);

  if (!src) return null;

  return (
    <div className="mt-2">
      <div className="text-xs text-slate-500 mb-1">Preview:</div>
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        style={{ display: status === "loaded" ? "block" : "none" }}
      />
      {status === "error" && (
        <div className="text-xs text-rose-600 mt-1">Không thể hiển thị ảnh. Kiểm tra URL hoặc thử URL khác.</div>
      )}
    </div>
  );
};

const roleBadge = (role) => {
  if (role === "admin") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-indigo-50 text-indigo-700 border-indigo-200";
};

const initialCreate = { email: "", password: "", full_name: "", role: "user", email_verified: true, avatar_url: "", status: "active" };

const AdminUsers = () => {
  const location = useLocation();
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [sortOrder, setSortOrder] = useState("name-asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "user", newPassword: "", email_verified: false, avatar_url: "", status: "active" });

  const [createForm, setCreateForm] = useState(initialCreate);
  const [saving, setSaving] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToastMessage = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

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

  useEffect(() => {
    if (location.state?.openCreateModal) {
      setShowCreateModal(true);
      // Clear the state to prevent reopening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, sortOrder, itemsPerPage]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let filtered = users.filter((u) => {
      const matchSearch =
        !q ||
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q);

      const matchRole = filterRole === "all" || u.role === filterRole;
      return matchSearch && matchRole;
    });

    // Sort users
    filtered.sort((a, b) => {
      const nameA = (a.full_name || a.email || "").toLowerCase();
      const nameB = (b.full_name || b.email || "").toLowerCase();

      if (sortOrder === "name-asc") {
        return nameA.localeCompare(nameB);
      } else if (sortOrder === "name-desc") {
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

    return filtered;
  }, [users, searchTerm, filterRole, sortOrder]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((filteredUsers.length || 0) / itemsPerPage));
  }, [filteredUsers.length, itemsPerPage]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const openCreate = () => {
    setCreateForm(initialCreate);
    setShowCreateModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({ 
      full_name: user.full_name || "", 
      role: user.role || "user", 
      newPassword: "",
      email_verified: user.email_verified || false,
      avatar_url: user.avatar_url || "",
      status: user.status || "active"
    });
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      // Sử dụng giá trị email_verified từ form
      const newUser = await userService.createUser(createForm);
      setUsers((prev) => [newUser, ...prev]);
      setShowCreateModal(false);
      setCreateForm(initialCreate);
      showToastMessage("Tạo user thành công!");
    } catch (err) {
      console.error("Error creating user:", err);
      showToastMessage("Không thể tạo user. Vui lòng thử lại!", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser || saving) return;

    try {
      setSaving(true);
      
      // Update basic info
      const { newPassword, ...basicInfo } = editForm;
      await userService.updateUser(editingUser._id, basicInfo);

      // Update password if provided
      if (newPassword && newPassword.trim()) {
        await userService.adminUpdatePassword(editingUser._id, newPassword);
      }

      setUsers((prev) =>
        prev.map((u) => (u._id === editingUser._id ? { ...u, ...basicInfo } : u))
      );

      setShowEditModal(false);
      setEditingUser(null);
      showToastMessage(newPassword ? "Cập nhật user và password thành công!" : "Cập nhật user thành công!");
    } catch (err) {
      console.error("Error updating user:", err);
      showToastMessage("Không thể cập nhật user. Vui lòng thử lại!", "error");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (user) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser || deleting) return;

    try {
      setDeleting(true);
      await userService.hardDeleteUser(deletingUser._id);
      setUsers((prev) => prev.filter((u) => u._id !== deletingUser._id));
      setShowDeleteModal(false);
      setDeletingUser(null);
      showToastMessage("Xóa user thành công!");
    } catch (err) {
      console.error("Error deleting user:", err);
      showToastMessage("Không thể xóa user. Vui lòng thử lại!", "error");
    } finally {
      setDeleting(false);
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
      <div className="w-full px-2 sm:px-5 lg:px-8 py-2 space-y-4">
        {/* Toolbar card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
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

            {/* Filters row below search */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              {/* Sort filter */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="name-asc">Tên A-Z</option>
                <option value="name-desc">Tên Z-A</option>
              </select>

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

            {(searchTerm || filterRole !== "all" || sortOrder !== "name-asc") && (
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Đang lọc:{" "}
                  <span className="font-medium text-slate-700">
                    {searchTerm ? `"${searchTerm}"` : "—"}
                  </span>{" "}
                  • <span className="font-medium text-slate-700">{filterRole}</span>{" "}
                  • <span className="font-medium text-slate-700">
                    {sortOrder === "name-asc" ? "A-Z" : "Z-A"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterRole("all");
                    setSortOrder("name-asc");
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
            {paginatedUsers.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-sm font-medium text-slate-700">
                  {searchTerm || filterRole !== "all" || sortOrder !== "name-asc" ? "Không tìm thấy user phù hợp" : "Chưa có user nào"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {searchTerm || filterRole !== "all" || sortOrder !== "name-asc"
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
                      <th className="px-4 py-3 text-left">Trạng thái</th>
                      <th className="px-4 py-3 text-left">Ngày tham gia</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedUsers.map((u) => {
                      const initial =
                        (u.full_name?.trim()?.[0] || u.email?.trim()?.[0] || "U").toUpperCase();

                      return (
                        <tr key={u._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative flex-shrink-0">
                                {u.avatar_url ? (
                                  <img 
                                    src={u.avatar_url} 
                                    alt={u.full_name || 'User'}
                                    className="w-9 h-9 rounded-full object-cover border-2 border-indigo-200"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className={`w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold ${
                                    u.avatar_url ? 'hidden' : ''
                                  }`}
                                  style={{ display: u.avatar_url ? 'none' : 'flex' }}
                                >
                                  {initial}
                                </div>
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
                            <div className="space-y-1">
                              <div>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border font-medium ${
                                  u.status === "active" 
                                    ? "bg-green-50 text-green-700 border-green-200" 
                                    : "bg-slate-50 text-slate-700 border-slate-200"
                                }`}>
                                  {u.status === "active" ? "✓ Active" : "✗ Inactive"}
                                </span>
                              </div>
                              {u.authProvider === 'google' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Google OAuth
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Local Account
                                </span>
                              )}
                              <div className="text-xs">
                                {u.email_verified ? (
                                  <span className="text-green-600">✓ Email verified</span>
                                ) : (
                                  <span className="text-amber-600">⚠ Chưa verify</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-sm text-slate-700">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "—"}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEdit(u)}
                                className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-indigo-700 hover:bg-indigo-50"
                              >
                                <Icon.Pencil className="w-4 h-4" />
                                Sửa
                              </button>
                              <button
                                onClick={() => openDeleteConfirm(u)}
                                className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-red-700 hover:bg-red-50"
                              >
                                <Icon.Trash className="w-4 h-4" />
                                Xóa
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
            {paginatedUsers.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-sm font-medium text-slate-700">
                  {searchTerm || filterRole !== "all" || sortOrder !== "name-asc" ? "Không tìm thấy user phù hợp" : "Chưa có user nào"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {searchTerm || filterRole !== "all" || sortOrder !== "name-asc"
                    ? "Thử từ khóa khác hoặc xóa lọc."
                    : "Bấm “Tạo user” để thêm mới."}
                </div>
              </div>
            ) : (
              paginatedUsers.map((u) => {
                const initial =
                  (u.full_name?.trim()?.[0] || u.email?.trim()?.[0] || "U").toUpperCase();

                return (
                  <div key={u._id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          {u.avatar_url ? (
                            <img 
                              src={u.avatar_url} 
                              alt={u.full_name || 'User'}
                              className="w-9 h-9 rounded-full object-cover border-2 border-indigo-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold ${
                              u.avatar_url ? 'hidden' : ''
                            }`}
                            style={{ display: u.avatar_url ? 'none' : 'flex' }}
                          >
                            {initial}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {u.full_name || "Chưa có tên"}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{u.email}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="px-2.5 py-1.5 text-xs rounded-lg text-indigo-700 hover:bg-indigo-50"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(u)}
                          className="px-2.5 py-1.5 text-xs rounded-lg text-red-700 hover:bg-red-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${roleBadge(u.role)}`}>
                          {u.role === "admin" ? "Admin" : "User"}
                        </span>
                        <div className="text-xs text-slate-500">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString("vi-VN") : "—"}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border font-medium ${
                          u.status === "active" 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}>
                          {u.status === "active" ? "✓ Active" : "✗ Inactive"}
                        </span>
                        <div className="text-xs">
                          {u.email_verified ? (
                            <span className="text-green-600">✓ Email verified</span>
                          ) : (
                            <span className="text-amber-600">⚠ Chưa verify</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {u.authProvider === 'google' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Google OAuth
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Local Account
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm text-slate-700">
              Hiển thị{" "}
              {filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{" "}
              {Math.min(currentPage * itemsPerPage, filteredUsers.length)} trong{" "}
              {filteredUsers.length} users
            </div>

            <div className="flex items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
                className="px-2 py-1 border border-slate-300 rounded"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  ‹
                </button>

                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages })
                    .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                    .map((_, idx) => {
                      const startPage = Math.max(1, currentPage - 2);
                      const pageNum = startPage + idx;
                      if (pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded ${currentPage === pageNum ? "bg-indigo-600 text-white" : "border"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <ModalShell
          title="Tạo user mới"
          subtitle="Tạo tài khoản và phân quyền"
          onClose={() => !saving && setShowCreateModal(false)}
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleCreateSubmit} className="grid grid-cols-2 gap-3">
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

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Avatar URL <span className="text-slate-400">(tùy chọn)</span>
              </label>
              <input
                type="url"
                value={createForm.avatar_url}
                onChange={(e) => setCreateForm((p) => ({ ...p, avatar_url: e.target.value }))}
                onBlur={(e) => setCreateForm((p) => ({ ...p, avatar_url: (e.target.value || "").trim() }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://example.com/avatar.jpg"
              />
              <PreviewImage src={createForm.avatar_url} />
              <div className="text-xs text-slate-500 mt-1">
                URL ảnh đại diện của user (để trống nếu không có)
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Trạng thái</label>
              <select
                value={createForm.status}
                onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={createForm.email_verified}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email_verified: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Email đã được verify
              </label>
              <div className="text-xs text-slate-500 mt-1">
                Nếu bỏ chọn, user sẽ cần verify email trước khi đăng nhập
              </div>
            </div>

            <div className="col-span-2 pt-1 flex gap-2">
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
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
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

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Avatar URL <span className="text-slate-400">(tùy chọn)</span>
              </label>
              <input
                type="url"
                value={editForm.avatar_url}
                onChange={(e) => setEditForm((p) => ({ ...p, avatar_url: e.target.value }))}
                onBlur={(e) => setEditForm((p) => ({ ...p, avatar_url: (e.target.value || "").trim() }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://example.com/avatar.jpg"
              />
              <PreviewImage src={editForm.avatar_url} />
              <div className="text-xs text-slate-500 mt-1">
                URL ảnh đại diện của user (để trống nếu không có)
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Trạng thái</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Mật khẩu mới <span className="text-slate-400">(tùy chọn)</span>
              </label>
              <input
                type="password"
                value={editForm.newPassword}
                onChange={(e) => setEditForm((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Để trống nếu không đổi password"
                minLength={6}
              />
              {editForm.newPassword && editForm.newPassword.length < 6 && (
                <div className="text-xs text-red-600 mt-1">Password phải có ít nhất 6 ký tự</div>
              )}
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={editForm.email_verified}
                  onChange={(e) => setEditForm((p) => ({ ...p, email_verified: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={editingUser?.authProvider === 'google'}
                />
                Email đã được verify
              </label>
              {editingUser?.authProvider === 'google' && (
                <div className="text-xs text-slate-500 mt-1">
                  Google accounts được verify tự động
                </div>
              )}
            </div>

            <div className="col-span-2 pt-1 flex gap-2">
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

      {/* Delete Confirm Modal */}
      {showDeleteModal && (
        <ModalShell
          title="Xác nhận xóa"
          subtitle={deletingUser?.email || deletingUser?.full_name || ""}
          onClose={() => !deleting && setShowDeleteModal(false)}
          maxWidth="max-w-sm"
        >
          <div className="text-sm text-slate-700">Bạn có chắc muốn xóa user "{deletingUser?.full_name || deletingUser?.email}"?</div>

          <div className="pt-4 flex gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="flex-1 px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Đang xóa..." : "Xóa user"}
            </button>
          </div>
        </ModalShell>
      )}

      {/* Toast */}
      <Toast isVisible={showToast} message={toastMessage} type={toastType} onClose={() => setShowToast(false)} />
    </AdminLayout>
  );
};

export default AdminUsers;
