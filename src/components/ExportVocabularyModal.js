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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative flex min-h-screen items-center justify-center p-3">
        {/* ✅ 90vw/90vh thật sự */}
        <div className="w-[90vw] h-[90vh] max-w-none bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-200 flex-none">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Xuất danh sách từ vựng
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  {previewMode ? "Xem trước nội dung sẽ được xuất" : "Chọn định dạng và trường dữ liệu muốn xuất"}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                aria-label="Đóng"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className={cx(
                  "flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all",
                  !previewMode
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                ⚙️ Cấu hình
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode(true)}
                disabled={selectedCount === 0}
                className={cx(
                  "flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all",
                  previewMode
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900",
                  selectedCount === 0 && "opacity-50 cursor-not-allowed"
                )}
              >
                👁️ Xem trước
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
            {errorBanner && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-800 mb-2">
                {errorBanner}
                {!user && errorBanner.includes("hết 3 lần") && (
                  <div className="mt-2">
                    <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold underline">
                      Đăng nhập ngay
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {!user && !errorBanner && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs text-blue-800 mb-2">
                {(() => {
                  const { remaining } = canExport(!!user);
                  return remaining > 0 
                    ? `Bạn còn ${remaining} lần xuất file miễn phí. Đăng nhập để xuất không giới hạn.`
                    : null;
                })()}
              </div>
            )}

            {previewMode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Xem trước nội dung</h3>
                  <span className="text-xs text-slate-500">Định dạng: {exportFormat.toUpperCase()}</span>
                </div>
                {renderPreview()}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Export Format */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Định dạng xuất
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  className={cx(
                    "p-2 rounded-lg border-2 text-left transition",
                    exportFormat === "pdf"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 font-bold text-xs">PDF</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold">PDF</div>
                      <div className="text-xs text-slate-500">Portable Document Format</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("word")}
                  className={cx(
                    "p-2 rounded-lg border-2 text-left transition",
                    exportFormat === "word"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-xs">DOC</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold">Word</div>
                      <div className="text-xs text-slate-500">Microsoft Word Document</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Fields - ✅ grid nhiều cột, gọn 1 hàng */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-slate-700">
                  Chọn trường dữ liệu ({selectedCount}/{availableFields.length})
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  {selectedCount === availableFields.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              </div>

              <div className="border border-slate-200 rounded-lg p-1.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {availableFields.map((field) => (
                    <label
                      key={field.key}
                      className={cx(
                        "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 cursor-pointer select-none transition",
                        selectedFields[field.key]
                          ? "border-indigo-200 bg-indigo-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedFields[field.key]}
                        onChange={() => handleFieldToggle(field.key)}
                        className="h-3.5 w-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />

                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 leading-4 truncate">
                          {field.label}
                        </div>
                        <div className="text-[10px] text-slate-500 leading-3 truncate">
                          {field.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-200">
              <div className="text-xs text-slate-700 space-y-0.5">
                <div className="flex justify-between">
                  <span>Số từ vựng:</span>
                  <span className="font-semibold">{vocabularies.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Định dạng:</span>
                  <span className="font-semibold uppercase">{exportFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span>Trường được chọn:</span>
                  <span className="font-semibold">{selectedCount}</span>
                </div>
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-slate-200 flex-none bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                {previewMode && (
                  <button
                    type="button"
                    onClick={() => setPreviewMode(false)}
                    disabled={isExporting}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                  >
                    ← Quay lại cấu hình
                  </button>
                )}
                
                {!previewMode ? (
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    disabled={selectedCount === 0 || vocabularies.length === 0}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Xem trước →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting || selectedCount === 0 || vocabularies.length === 0 || (!user && !canExport(!!user).canExport)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isExporting && (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                      </svg>
                    )}
                    {isExporting ? "Đang xuất..." : "Xuất file"}
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
