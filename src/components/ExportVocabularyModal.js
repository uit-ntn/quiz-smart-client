import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import AuthContext from '../context/AuthContext';

const cx = (...a) => a.filter(Boolean).join(" ");

// Gắn vfs cho pdfmake - xử lý nhiều trường hợp bundler khác nhau
try {
  if (pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  } else if (pdfFonts.default && pdfFonts.default.pdfMake && pdfFonts.default.pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.default.pdfMake.vfs;
  } else if (pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs;
  } else {
    // Fallback: assign pdfFonts directly nếu nó chứa vfs
    pdfMake.vfs = pdfFonts;
  }
} catch (e) {
  console.warn("Could not load pdfMake fonts:", e);
}

const POS_VI = {
  noun: "Danh từ",
  verb: "Động từ",
  adjective: "Tính từ",
  adverb: "Trạng từ",
  preposition: "Giới từ",
  conjunction: "Liên từ",
  pronoun: "Đại từ",
  interjection: "Thán từ",
};

const safeFileName = (name) => {
  if (!name) return "vocabulary";
  return name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens instead of underscores
    // Keep Vietnamese characters, letters, numbers, underscores and hyphens
    .replace(/[^\p{L}\p{N}_-]/gu, '') // Use Unicode property escapes for letters and numbers
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

// Utility functions for export limit management
const EXPORT_LIMIT_KEY = 'quiz_smart_export_count';
const EXPORT_LIMIT = 3;

const getExportCount = () => {
  try {
    const count = localStorage.getItem(EXPORT_LIMIT_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch (e) {
    return 0;
  }
};

const incrementExportCount = () => {
  try {
    const current = getExportCount();
    localStorage.setItem(EXPORT_LIMIT_KEY, (current + 1).toString());
    return current + 1;
  } catch (e) {
    return 0;
  }
};

const canExport = (isLoggedIn) => {
  if (isLoggedIn) return { canExport: true, remaining: Infinity };
  const count = getExportCount();
  return { canExport: count < EXPORT_LIMIT, remaining: EXPORT_LIMIT - count };
};

// lock body scroll khi mở modal (tránh scroll nền)
function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

const ExportVocabularyModal = ({
  isOpen,
  onClose,
  vocabularies = [],
  testTitle = "",
  testMainTopic = "",
  testSubTopic = "",
  createdBy = "",
}) => {
  const { user } = useContext(AuthContext);
  useLockBodyScroll(isOpen);

  const [exportFormat, setExportFormat] = useState("pdf");
  const [selectedFields, setSelectedFields] = useState({
    index: true,
    word: true,
    meaning: true,
    example_sentence: true,
    part_of_speech: true,
    cefr_level: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const availableFields = useMemo(
    () => [
      { key: "index", label: "STT", description: "Số thứ tự" },
      { key: "word", label: "Từ vựng", description: "Từ tiếng Anh" },
      { key: "meaning", label: "Nghĩa", description: "Nghĩa tiếng Việt" },
      { key: "example_sentence", label: "Ví dụ", description: "Câu ví dụ minh họa" },
      { key: "part_of_speech", label: "Loại từ", description: "Danh từ, động từ, tính từ..." },
      { key: "cefr_level", label: "Trình độ CEFR", description: "A1, A2, B1, B2, C1, C2" },
    ],
    []
  );

  const selectedKeys = useMemo(
    () => availableFields.filter((f) => selectedFields[f.key]).map((f) => f.key),
    [availableFields, selectedFields]
  );

  const selectedCount = selectedKeys.length;

  const handleFieldToggle = useCallback((fieldKey) => {
    setSelectedFields((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  }, []);

  const handleSelectAll = useCallback(() => {
    const allSelected = selectedCount === availableFields.length;
    const next = {};
    availableFields.forEach((f) => (next[f.key] = !allSelected));
    setSelectedFields(next);
  }, [selectedCount, availableFields]);

  const getValueByField = (vocab, idx, key) => {
    switch (key) {
      case "index":
        return String(idx + 1);
      case "word":
        return vocab.word || "";
      case "meaning":
        return vocab.meaning || "";
      case "example_sentence":
        return vocab.example_sentence || "";
      case "part_of_speech":
        return POS_VI[vocab.part_of_speech] || vocab.part_of_speech || "";
      case "cefr_level":
        return vocab.cefr_level || "";
      default:
        return "";
    }
  };

  // ✅ PDF tiếng Việt chuẩn bằng pdfmake
  const exportToPDF = async () => {
    // Kiểm tra pdfMake và vfs có sẵn không
    if (!pdfMake) {
      throw new Error("pdfMake không được tải đúng cách.");
    }
    
    if (!pdfMake.vfs || Object.keys(pdfMake.vfs).length === 0) {
      console.warn("pdfMake.vfs không có hoặc trống. Thử tiếp tục...");
      // Không throw error, vì một số font mặc định vẫn có thể hoạt động
    }

    const headerRow = availableFields
      .filter((f) => selectedFields[f.key])
      .map((f) => ({ text: f.label, style: "th" }));

    const bodyRows = vocabularies.map((v, idx) =>
      selectedKeys.map((k) => ({
        text: getValueByField(v, idx, k),
        style: "td",
      }))
    );

    // widths theo field để dễ đọc
    const widths = selectedKeys.map((k) => {
      if (k === "index") return 28;
      if (k === "word") return 80;
      if (k === "cefr_level") return 48;
      if (k === "part_of_speech") return 90;
      if (k === "meaning") return 150;
      if (k === "example_sentence") return "*";
      return "*";
    });

    const docDefinition = {
      pageSize: "A4",
      pageOrientation: selectedKeys.length >= 5 ? "landscape" : "portrait",
      pageMargins: [24, 20, 24, 24],
      defaultStyle: {
        font: "Roboto",
        fontSize: 10,
      },
      content: [
        { text: `Danh sách từ vựng: ${testTitle || ""}`, style: "title" },
        { text: (() => {
          const exportDate = `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`;
          const creatorInfo = createdBy ? `Được tạo bởi: ${createdBy}` : "";
          return creatorInfo ? `${exportDate} | ${creatorInfo}` : exportDate;
        })(), style: "sub" },
        { text: " ", margin: [0, 4] },
        {
          table: {
            headerRows: 1,
            widths,
            body: [headerRow, ...bodyRows],
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#EEF2FF" : null),
            hLineColor: () => "#E5E7EB",
            vLineColor: () => "#E5E7EB",
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
        },
      ],
      styles: {
        title: { fontSize: 16, bold: true, color: "#111827" },
        sub: { fontSize: 10, color: "#6B7280" },
        th: { bold: true, color: "#111827", fontSize: 10 },
        td: { color: "#111827", fontSize: 9 },
      },
    };

    const mt = testMainTopic || "";
    const st = testSubTopic || "";
    const headerCombined = mt && st ? `${mt} - ${st}` : (mt || st || "");
    const fileName = headerCombined 
      ? `${safeFileName(headerCombined)}-${safeFileName(testTitle)}.pdf`
      : `${safeFileName(testTitle)}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);
  };

  // Word export (docx)
  const exportToWord = async () => {
    try {
      const mod = await import("docx");
      const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType } = mod;

      const headerCells = availableFields
        .filter((f) => selectedFields[f.key])
        .map(
          (f) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: f.label, bold: true })],
                }),
              ],
            })
        );

      const rows = [
        new TableRow({ children: headerCells }),
        ...vocabularies.map((v, idx) => {
          const cells = selectedKeys.map(
            (k) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun(getValueByField(v, idx, k))],
                  }),
                ],
              })
          );
          return new TableRow({ children: cells });
        }),
      ];

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Danh sách từ vựng: ${testTitle || ""}`,
                    bold: true,
                    size: 32,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: (() => {
                      const exportDate = `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`;
                      const creatorInfo = createdBy ? `Được tạo bởi: ${createdBy}` : "";
                      return creatorInfo ? `${exportDate} | ${creatorInfo}` : exportDate;
                    })(),
                    size: 20,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ children: [new TextRun("")] }),
              new Table({ rows }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const mt = testMainTopic || "";
      const st = testSubTopic || "";
      const headerCombined = mt && st ? `${mt} - ${st}` : (mt || st || "");
      const fileName = headerCombined 
        ? `${safeFileName(headerCombined)}-${safeFileName(testTitle)}.docx`
        : `${safeFileName(testTitle)}.docx`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export to Word error:", error);
      throw new Error("Có lỗi khi tạo file Word. Vui lòng thử lại.");
    }
  };

  const renderPreview = () => {
    if (!vocabularies?.length) return null;

    return (
      <div className="space-y-4">
        {/* Preview Content */}
        <div className="border border-slate-200 rounded-lg overflow-auto bg-white" style={{maxHeight: '500px'}}>
          <div 
            style={{
              padding: '20px'
            }}
          >
            {/* Header Preview */}
            <div className="text-center border-b border-slate-200 pb-4 mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Danh sách từ vựng: {testTitle || ""}</h2>
              <p className="text-sm text-slate-600">
                {(() => {
                  const exportDate = `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`;
                  const creatorInfo = createdBy ? `Được tạo bởi: ${createdBy}` : "";
                  return creatorInfo ? `${exportDate} | ${creatorInfo}` : exportDate;
                })()}
              </p>
            </div>

            {/* Table Preview */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-indigo-50">
                  <tr>
                    {availableFields
                      .filter(f => selectedFields[f.key])
                      .map(field => (
                        <th key={field.key} className="px-4 py-3 text-left text-sm font-semibold text-slate-900 uppercase tracking-wider">
                          {field.label}
                        </th>
                      ))
                    }
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {vocabularies.map((vocab, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      {selectedKeys.map(key => (
                        <td key={key} className="px-4 py-3 text-sm text-slate-900 whitespace-pre-wrap">
                          {getValueByField(vocab, idx, key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleExport = async () => {
    setErrorBanner("");

    // Check login status and export limit
    const { canExport: canExportFile, remaining } = canExport(!!user);
    if (!canExportFile) {
      setErrorBanner("Bạn đã sử dụng hết 3 lần xuất file miễn phí. Vui lòng đăng nhập để xuất không giới hạn.");
      return;
    }

    if (selectedCount === 0) {
      setErrorBanner("Vui lòng chọn ít nhất 1 trường để xuất.");
      return;
    }
    if (!vocabularies?.length) {
      setErrorBanner("Không có dữ liệu để xuất.");
      return;
    }

    try {
      setIsExporting(true);
      if (exportFormat === "pdf") await exportToPDF();
      else await exportToWord();
      
      // Increment export count for non-logged in users
      if (!user) {
        incrementExportCount();
      }
      
      onClose?.();
    } catch (e) {
      console.error("Export error:", e);
      setErrorBanner(e?.message || "Có lỗi khi xuất file. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex min-h-screen items-center justify-center p-3">
        <div className="w-[90vw] h-[90vh] max-w-none bg-white rounded-2xl shadow-2xl border-[3px] border-emerald-400 ring-2 ring-emerald-200 overflow-hidden flex flex-col">

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 flex-none">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-base font-extrabold text-white">📤 Xuất danh sách từ vựng</h2>
                <p className="text-xs text-emerald-200 font-medium mt-0.5">
                  {previewMode ? "Xem trước nội dung sẽ được xuất" : "Chọn định dạng và trường dữ liệu muốn xuất"}
                </p>
              </div>
              <button type="button" onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Tabs */}
            <div className="flex bg-white/10 rounded-xl p-0.5 gap-0.5">
              <button type="button" onClick={() => setPreviewMode(false)}
                className={cx("flex-1 px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all",
                  !previewMode ? "bg-white text-emerald-800 shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10")}>
                ⚙️ Cấu hình
              </button>
              <button type="button" onClick={() => setPreviewMode(true)} disabled={selectedCount === 0}
                className={cx("flex-1 px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all",
                  previewMode ? "bg-white text-emerald-800 shadow-sm" : "text-white/80 hover:text-white hover:bg-white/10",
                  selectedCount === 0 && "opacity-40 cursor-not-allowed")}>
                👁️ Xem trước
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {errorBanner && (
              <div className="rounded-xl border-2 border-rose-400 bg-rose-100 px-3 py-2 text-xs text-rose-800 font-bold mb-3">
                {errorBanner}
                {!user && errorBanner.includes("hết 3 lần") && (
                  <div className="mt-2">
                    <a href="/login" className="text-blue-700 hover:text-blue-800 font-extrabold underline">Đăng nhập ngay</a>
                  </div>
                )}
              </div>
            )}
            {!user && !errorBanner && (
              <div className="rounded-xl border-2 border-indigo-300 bg-indigo-100 px-3 py-2 text-xs text-indigo-800 font-bold mb-3">
                {(() => { const { remaining } = canExport(!!user); return remaining > 0 ? `Bạn còn ${remaining} lần xuất file miễn phí. Đăng nhập để xuất không giới hạn.` : null; })()}
              </div>
            )}

            {previewMode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900">Xem trước nội dung</h3>
                  <span className="inline-flex items-center rounded-full border-2 border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">{exportFormat.toUpperCase()}</span>
                </div>
                {renderPreview()}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Format */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wide">Định dạng xuất</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setExportFormat("pdf")}
                      className={cx("p-2.5 rounded-xl border-[3px] text-left transition-all",
                        exportFormat === "pdf" ? "border-rose-500 bg-rose-50 shadow-md" : "border-slate-200 hover:border-rose-300 bg-white")}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-rose-600 border-2 border-rose-800 flex items-center justify-center">
                          <span className="text-white font-extrabold text-[10px]">PDF</span>
                        </div>
                        <div>
                          <div className={cx("text-xs font-extrabold", exportFormat === "pdf" ? "text-rose-800" : "text-slate-800")}>PDF</div>
                          <div className="text-[10px] text-slate-500">Portable Document Format</div>
                        </div>
                      </div>
                    </button>
                    <button type="button" onClick={() => setExportFormat("word")}
                      className={cx("p-2.5 rounded-xl border-[3px] text-left transition-all",
                        exportFormat === "word" ? "border-blue-500 bg-blue-50 shadow-md" : "border-slate-200 hover:border-blue-300 bg-white")}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-700 border-2 border-blue-900 flex items-center justify-center">
                          <span className="text-white font-extrabold text-[10px]">DOC</span>
                        </div>
                        <div>
                          <div className={cx("text-xs font-extrabold", exportFormat === "word" ? "text-blue-800" : "text-slate-800")}>Word</div>
                          <div className="text-[10px] text-slate-500">Microsoft Word Document</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                      Chọn trường dữ liệu ({selectedCount}/{availableFields.length})
                    </label>
                    <button type="button" onClick={handleSelectAll}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-extrabold border-b border-emerald-400">
                      {selectedCount === availableFields.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </button>
                  </div>
                  <div className="border-2 border-emerald-200 rounded-xl p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {availableFields.map((field) => (
                        <label key={field.key}
                          className={cx("flex items-center gap-2 rounded-xl border-2 px-2.5 py-2 cursor-pointer select-none transition-all",
                            selectedFields[field.key] ? "border-emerald-400 bg-emerald-50 shadow-sm" : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50")}>
                          <input type="checkbox" checked={!!selectedFields[field.key]}
                            onChange={() => handleFieldToggle(field.key)}
                            className="h-4 w-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500" />
                          <div className="min-w-0">
                            <div className={cx("text-xs font-extrabold leading-4 truncate", selectedFields[field.key] ? "text-emerald-800" : "text-slate-900")}>{field.label}</div>
                            <div className="text-[10px] text-slate-500 leading-3 truncate">{field.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl bg-emerald-50 border-2 border-emerald-300 p-3">
                  <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wide mb-2">Tóm tắt xuất</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border-2 border-sky-300 bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700">📚 {vocabularies.length} từ vựng</span>
                    <span className="inline-flex items-center rounded-full border-2 border-violet-300 bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">📄 {exportFormat.toUpperCase()}</span>
                    <span className="inline-flex items-center rounded-full border-2 border-emerald-400 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">✅ {selectedCount} trường</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t-2 border-emerald-200 flex-none bg-emerald-50">
            <div className="flex items-center justify-between">
              <button type="button" onClick={onClose} disabled={isExporting}
                className="px-4 py-2 text-xs font-extrabold text-slate-700 bg-white border-[3px] border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">
                Hủy
              </button>
              <div className="flex items-center gap-2">
                {previewMode && (
                  <button type="button" onClick={() => setPreviewMode(false)} disabled={isExporting}
                    className="px-4 py-2 text-xs font-extrabold text-slate-700 bg-white border-[3px] border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    ← Quay lại
                  </button>
                )}
                {!previewMode ? (
                  <button type="button" onClick={() => setPreviewMode(true)} disabled={selectedCount === 0 || vocabularies.length === 0}
                    className="px-4 py-2 text-xs font-extrabold text-white bg-blue-700 border-[3px] border-blue-900 rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-colors">
                    Xem trước →
                  </button>
                ) : (
                  <button type="button" onClick={handleExport}
                    disabled={isExporting || selectedCount === 0 || vocabularies.length === 0 || (!user && !canExport(!!user).canExport)}
                    className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-700 border-[3px] border-emerald-900 rounded-xl hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-1.5 transition-colors">
                    {isExporting && (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                      </svg>
                    )}
                    {isExporting ? "Đang xuất..." : "⬇️ Xuất file"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportVocabularyModal;
