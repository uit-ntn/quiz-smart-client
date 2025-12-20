import React, { useEffect, useState } from "react";

const cx = (...a) => a.filter(Boolean).join(" ");

const AdminDeleteTestModal = ({ isOpen, onClose, test, onDeleteConfirmed }) => {
  const [deleteType, setDeleteType] = useState("soft"); // 'soft' | 'hard'
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    // reset when open
    setDeleteType("soft");
    setConfirmText("");
    setLoading(false);
  }, [isOpen]);

  const handleClose = () => {
    if (loading) return;
    onClose?.();
  };

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

    const toneCls =
      tone === "danger"
        ? {
            active: "border-red-300 bg-red-50",
            dot: "bg-red-500",
            tag: "bg-red-100 text-red-800",
          }
        : {
            active: "border-amber-300 bg-amber-50",
            dot: "bg-amber-500",
            tag: "bg-amber-100 text-amber-800",
          };

    return (
      <button
        type="button"
        onClick={() => setDeleteType(value)}
        className={cx(
          "w-full text-left rounded-xl border p-3 transition",
          isActive ? toneCls.active : "border-slate-200 bg-white hover:bg-slate-50"
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cx("mt-1 w-2.5 h-2.5 rounded-full", toneCls.dot)} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">{title}</span>
              <span className={cx("px-2 py-0.5 rounded-md text-[11px] font-black", toneCls.tag)}>
                {value === "soft" ? "Xóa mềm" : "Xóa cứng"}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-600 leading-relaxed">{desc}</p>
          </div>

          <input
            type="radio"
            name="deleteType"
            checked={isActive}
            onChange={() => setDeleteType(value)}
            className="mt-1"
          />
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* modal */}
      <div className="relative min-h-full flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
          {/* header (compact) */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">Xóa bài kiểm tra</h2>
              <p className="text-xs font-semibold text-slate-500">Chọn kiểu xóa phù hợp</p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
              aria-label="Đóng"
            >
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* body */}
          <div className="p-4 space-y-3">
            {/* test info (compact) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-extrabold text-slate-900 line-clamp-1">
                {test.test_title}
              </div>
              {test.description ? (
                <div className="mt-1 text-xs font-semibold text-slate-600 line-clamp-2">
                  {test.description}
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-600">
                <span>Loại: {test.test_type}</span>
                <span>Câu hỏi: {test.total_questions || 0}</span>
                <span>Thời gian: {test.duration_minutes} phút</span>
              </div>
            </div>

            {/* options */}
            <div className="space-y-2">
              <Option
                value="soft"
                tone="warn"
                title="Chuyển vào thùng rác"
                desc="Ẩn khỏi danh sách, có thể khôi phục."
              />
              <Option
                value="hard"
                tone="danger"
                title="Xóa vĩnh viễn"
                desc="Xóa hoàn toàn, không thể khôi phục."
              />
            </div>

            {/* hard confirm */}
            {deleteType === "hard" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <div className="text-sm font-extrabold text-red-900">Xác nhận</div>
                <p className="mt-1 text-xs font-semibold text-red-800">
                  Nhập đúng tên:{" "}
                  <span className="font-mono bg-white/70 px-1 rounded">
                    {test.test_title}
                  </span>
                </p>

                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Nhập tên test..."
                  className="mt-2 w-full h-10 px-3 rounded-lg border border-red-300 bg-white text-sm font-semibold
                             focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                />
              </div>
            )}

            {/* actions */}
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 h-10 rounded-lg border border-slate-300 bg-white text-sm font-extrabold text-slate-800
                           hover:bg-slate-50 disabled:opacity-60"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={loading || !hardOk}
                className={cx(
                  "flex-1 h-10 rounded-lg text-sm font-extrabold text-white transition flex items-center justify-center",
                  deleteType === "soft" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                    Đang xóa...
                  </span>
                ) : deleteType === "soft" ? (
                  "Chuyển vào thùng rác"
                ) : (
                  "Xóa vĩnh viễn"
                )}
              </button>
            </div>

            {/* hint (compact) */}
            <div className="text-center text-[11px] font-semibold text-slate-500">
              Gợi ý: nên dùng <span className="font-black">“Chuyển vào thùng rác”</span> để có thể khôi phục.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDeleteTestModal;
