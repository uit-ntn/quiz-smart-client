import React, { useEffect, useState } from "react";

const cx = (...a) => a.filter(Boolean).join(" ");

const AdminDeleteTestModal = ({ isOpen, onClose, test, onDeleteConfirmed }) => {
  const [deleteType, setDeleteType] = useState("soft");
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDeleteType("soft");
    setConfirmText("");
    setLoading(false);
  }, [isOpen]);

  const handleClose = () => { if (loading) return; onClose?.(); };

  const handleDelete = async () => {
    if (!test) return;
    const needConfirm = deleteType === "hard";
    const ok = !needConfirm || confirmText === test?.test_title;
    if (!ok) return;
    try {
      setLoading(true);
      await onDeleteConfirmed?.(deleteType);
    } catch (err) {
      console.error("Error deleting test:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !test) return null;

  const hardOk = deleteType !== "hard" || confirmText === test?.test_title;

  const Option = ({ value, title, desc, tone }) => {
    const isActive = deleteType === value;
    const toneCls = tone === "danger"
      ? { active: "border-[3px] border-rose-500 bg-rose-50", dot: "bg-rose-600", tag: "border-rose-500 bg-rose-100 text-rose-700" }
      : { active: "border-[3px] border-amber-500 bg-amber-50", dot: "bg-amber-500", tag: "border-amber-500 bg-amber-100 text-amber-700" };

    return (
      <button type="button" onClick={() => setDeleteType(value)}
        className={cx("w-full text-left rounded-xl border-[3px] p-3 transition",
          isActive ? toneCls.active : "border-slate-200 bg-white hover:border-slate-300")}>
        <div className="flex items-start gap-3">
          <span className={cx("mt-1 w-2.5 h-2.5 rounded-full shrink-0", toneCls.dot)} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-extrabold text-slate-900">{title}</span>
              <span className={cx("px-2 py-0.5 rounded-full border-2 text-[10px] font-extrabold", toneCls.tag)}>
                {value === "soft" ? "Xóa mềm" : "Xóa cứng"}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-600 leading-relaxed">{desc}</p>
          </div>
          <input type="radio" name="deleteType" checked={isActive} onChange={() => setDeleteType(value)} className="mt-1 shrink-0" />
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative min-h-full flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white border-[3px] border-orange-500 ring-2 ring-orange-100 shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl">🗑️</div>
                <div>
                  <h2 className="text-base font-extrabold text-white">Xóa bài kiểm tra</h2>
                  <p className="text-xs text-orange-200 font-medium">Chọn kiểu xóa phù hợp</p>
                </div>
              </div>
              <button type="button" onClick={handleClose}
                className="w-8 h-8 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Test info */}
            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-3">
              <div className="text-sm font-extrabold text-slate-900 line-clamp-1">{test.test_title}</div>
              {test.description && (
                <div className="mt-1 text-xs font-medium text-slate-600 line-clamp-2">{test.description}</div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full border-2 border-sky-300 bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                  📋 {test.test_type}
                </span>
                <span className="inline-flex items-center rounded-full border-2 border-violet-300 bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  ❓ {test.total_questions || 0} câu
                </span>
                <span className="inline-flex items-center rounded-full border-2 border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  ⏱ {test.duration_minutes} phút
                </span>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Option value="soft" tone="warn" title="Chuyển vào thùng rác" desc="Ẩn khỏi danh sách, có thể khôi phục." />
              <Option value="hard" tone="danger" title="Xóa vĩnh viễn" desc="Xóa hoàn toàn, không thể khôi phục." />
            </div>

            {/* Hard confirm */}
            {deleteType === "hard" && (
              <div className="rounded-xl border-2 border-rose-400 bg-rose-50 p-3">
                <div className="text-sm font-extrabold text-rose-900 mb-1">⚠️ Xác nhận xóa vĩnh viễn</div>
                <p className="text-xs font-medium text-rose-700 mb-2">
                  Nhập đúng tên:{" "}
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-300 text-rose-900">{test.test_title}</span>
                </p>
                <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Nhập tên test để xác nhận..."
                  className="w-full px-3 py-2 rounded-xl border-2 border-rose-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-500" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button type="button" onClick={handleClose} disabled={loading}
                className="flex-1 py-2.5 rounded-xl border-[3px] border-slate-300 bg-white text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition-colors">
                Hủy
              </button>
              <button type="button" onClick={handleDelete} disabled={loading || !hardOk}
                className={cx("flex-1 py-2.5 rounded-xl border-[3px] text-sm font-extrabold text-white transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed",
                  deleteType === "soft"
                    ? "bg-amber-600 border-amber-800 hover:bg-amber-700"
                    : "bg-rose-600 border-rose-800 hover:bg-rose-700")}>
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    Đang xóa...
                  </>
                ) : deleteType === "soft" ? "🗑️ Chuyển vào thùng rác" : "⚠️ Xóa vĩnh viễn"}
              </button>
            </div>

            <p className="text-center text-[11px] font-medium text-slate-500">
              Gợi ý: nên dùng <span className="font-extrabold">"Chuyển vào thùng rác"</span> để có thể khôi phục.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDeleteTestModal;
