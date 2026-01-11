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
    pdfMake.vfs = pdfFonts;
  }
} catch (e) {
  console.warn("Could not load pdfMake fonts:", e);
}

const DIFFICULTY_VI = {
  easy: "Dễ",
  medium: "Trung bình", 
  hard: "Khó",
};

const safeFileName = (name) => {
  if (!name) return "multiple-choice-test";
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

const ExportMCPModal = ({
  isOpen,
  onClose,
  questions = [],
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
    question_text: true,
    options: true,
    correct_answers: true,
    explanation: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  // Helper function to get correct answer labels - supports both Array and Map/Object format
  const getCorrectAnswerLabels = (correctAnswers) => {
    if (!correctAnswers) return [];
    if (Array.isArray(correctAnswers)) return correctAnswers;
    if (typeof correctAnswers === 'object' && correctAnswers.constructor === Map) {
      return Array.from(correctAnswers.keys());
    }
    if (typeof correctAnswers === 'object') {
      // Filter out entries where value is explicitly false or "false"
      return Object.keys(correctAnswers).filter(key => {
        const value = correctAnswers[key];
        return value !== false && value !== "false";
      });
    }
    return [];
  };

  // Helper function to check if a label is a correct answer
  const isCorrectAnswer = (correctAnswers, label) => {
    if (!correctAnswers || !label) return false;
    if (Array.isArray(correctAnswers)) return correctAnswers.includes(label);
    if (typeof correctAnswers === 'object' && correctAnswers.constructor === Map) {
      return correctAnswers.has(label);
    }
    if (typeof correctAnswers === 'object') {
      // Check if label exists and value is not false or "false"
      if (!(label in correctAnswers)) return false;
      const value = correctAnswers[label];
      return value !== false && value !== "false";
    }
    return false;
  };

  const availableFields = useMemo(
    () => [
      { key: "index", label: "STT", description: "Số thứ tự" },
      { key: "question_text", label: "Câu hỏi", description: "Nội dung câu hỏi" },
      { key: "options", label: "Các lựa chọn", description: "A, B, C, D và nội dung" },
      { key: "correct_answers", label: "Đáp án đúng", description: "Đáp án chính xác" },
      { key: "explanation", label: "Giải thích", description: "Giải thích đáp án" },
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

  const getValueByField = (question, idx, key) => {
    switch (key) {
      case "index":
        return String(idx + 1);
      case "question_text":
        return question.question_text || "";
      case "main_topic":
        return question.main_topic || testMainTopic || "";
      case "sub_topic":
        return question.sub_topic || testSubTopic || "";
      case "options":
        return (question.options || [])
          .map(op => `${op.label}. ${op.text}`)
          .join("\n");
      case "correct_answers":
        return getCorrectAnswerLabels(question.correct_answers).join(", ");
      case "explanation":
        let explanation = "";
        
        // Correct answer explanations (object format)
        if (question.explanation?.correct) {
          if (typeof question.explanation.correct === 'object' && Object.keys(question.explanation.correct).length > 0) {
            const correctTexts = Object.entries(question.explanation.correct)
              .map(([label, text]) => `${label}: ${text}`)
              .join('\n');
            explanation += `Đúng:\n${correctTexts}`;
          } else if (typeof question.explanation.correct === 'string' && question.explanation.correct.trim()) {
            // Backward compatibility: old string format
            explanation += `Đúng: ${question.explanation.correct}`;
          }
        }
        
        // Incorrect answer explanations - only show explanations for choices that are NOT correct answers
        if (question.explanation?.incorrect_choices && Object.keys(question.explanation.incorrect_choices).length > 0) {
          const correctLabels = getCorrectAnswerLabels(question.correct_answers);
          const incorrectExplanations = Object.entries(question.explanation.incorrect_choices)
            .filter(([label, text]) => {
              // Filter out if empty or if this label is actually a correct answer
              if (!text || !text.trim()) return false;
              return !correctLabels.includes(label);
            });
          
          if (incorrectExplanations.length > 0) {
            const incorrectText = incorrectExplanations
              .map(([label, text]) => `${label}: ${text}`)
              .join("\n");
            explanation += explanation ? `\nSai:\n${incorrectText}` : `Sai:\n${incorrectText}`;
          }
        }
        
        return explanation;
      default:
        return "";
    }
  };

  // ✅ PDF export cho multiple choice
  const exportToPDF = async () => {
    // Kiểm tra pdfMake và vfs có sẵn không
    if (!pdfMake) {
      throw new Error("pdfMake không được tải đúng cách.");
    }
    
    if (!pdfMake.vfs || Object.keys(pdfMake.vfs).length === 0) {
      console.warn("pdfMake.vfs không có hoặc trống. Thử tiếp tục...");
    }

    const content = [];
    
    // Header: combined main and sub topic centered above the test title
    const mt = testMainTopic || (questions.find(q => q.main_topic)?.main_topic) || "";
    const st = testSubTopic || (questions.find(q => q.sub_topic)?.sub_topic) || "";
    const headerCombined = mt && st ? `${mt} - ${st}` : (mt || st || "");
    if (headerCombined) {
      content.push({ text: headerCombined, style: 'title' });
    }
    content.push({ text: `${testTitle || ""}`, style: "title" });
    const exportDate = `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`;
    const creatorInfo = createdBy ? `Được tạo bởi: ${createdBy}` : "";
    const metaLine = creatorInfo ? `${exportDate} | ${creatorInfo}` : exportDate;
    content.push({ text: metaLine, style: "sub" });
    content.push({ text: " ", margin: [0, 8] });

    // Render từng câu hỏi
    questions.forEach((question, idx) => {
      const questionContent = [];
      
      selectedKeys.forEach(key => {
        const value = getValueByField(question, idx, key);
        if (!value) return;
        
        switch (key) {
          case "index":
            questionContent.push({
              text: `Câu ${value}:`,
              style: "questionHeader"
            });
            break;
          case "question_text":
            questionContent.push({
              text: value,
              style: "questionText",
              margin: [0, 2, 0, 4]
            });
            break;
          case "options":
            (question.options || []).forEach(op => {
              const isCorrect = selectedFields.correct_answers && isCorrectAnswer(question.correct_answers, op.label);
              questionContent.push({
                text: `${op.label}. ${op.text}`,
                style: isCorrect ? "correctOption" : "normalOption",
                margin: [10, 1, 0, 1]
              });
            });
            break;
          case "correct_answers":
            questionContent.push({
              text: `Đáp án đúng: ${value}`,
              style: "correctAnswer",
              margin: [0, 4, 0, 2]
            });
            break;
          case "explanation":
            if (value.trim()) {
              questionContent.push({
                text: "Giải thích:",
                style: "sectionHeader",
                margin: [0, 4, 0, 2]
              });
              questionContent.push({
                text: value,
                style: "explanation",
                margin: [10, 0, 0, 4]
              });
            }
            break;
        }
      });
      
      if (questionContent.length > 0) {
        content.push({
          stack: questionContent,
          margin: [0, 0, 0, 12]
        });
      }
    });

    const docDefinition = {
      pageSize: "A4",
      pageOrientation: "portrait",
      pageMargins: [24, 20, 24, 24],
      defaultStyle: {
        font: "Roboto",
        fontSize: 10,
      },
      content,
      footer: function(currentPage, pageCount) {
        return { text: `Trang ${currentPage} / ${pageCount}`, alignment: 'center', margin: [0, 6, 0, 0] };
      },
      styles: {
        title: { fontSize: 16, bold: true, color: "#111827", alignment: "center" },
        meta: { fontSize: 11, color: "#374151", alignment: "center", margin: [0, 6, 0, 0] },
        sub: { fontSize: 10, color: "#6B7280", alignment: "center", margin: [0, 4, 0, 0] },
        questionHeader: { fontSize: 12, bold: true, color: "#1E40AF", margin: [0, 8, 0, 4] },
        questionText: { fontSize: 11, color: "#111827", bold: true },
        sectionHeader: { fontSize: 10, bold: true, color: "#374151", margin: [0, 4, 0, 2] },
        normalOption: { fontSize: 10, color: "#374151" },
        correctOption: { fontSize: 10, color: "#059669", bold: true },
        correctAnswer: { fontSize: 10, color: "#059669", bold: true },
        difficulty: { fontSize: 9, color: "#6B7280", italics: true },
        explanation: { fontSize: 9, color: "#374151", lineHeight: 1.3 },
      },
    };

    const fileName = headerCombined 
      ? `${safeFileName(headerCombined)}-${safeFileName(testTitle)}.pdf`
      : `multiple-choice-${safeFileName(testTitle)}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);
  };

  // Word export (docx)
  const exportToWord = async () => {
    try {
      const mod = await import("docx");
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = mod;

      const sections = [];

      // Header: combined main and sub topic centered above the test title
      const mt = testMainTopic || (questions.find(q => q.main_topic)?.main_topic) || "";
      const st = testSubTopic || (questions.find(q => q.sub_topic)?.sub_topic) || "";
      const headerCombined = mt && st ? `${mt} - ${st}` : (mt || st || "");

      if (headerCombined) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: headerCombined, bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
          })
        );
      }

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${testTitle || ""}`,
              bold: true,
              size: 32,
            }),
          ],
          heading: HeadingLevel.TITLE,
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
        new Paragraph({ children: [new TextRun("")] }) // Empty line
      );

      // Questions
      questions.forEach((question, idx) => {
        selectedKeys.forEach(key => {
          const value = getValueByField(question, idx, key);
          if (!value) return;

          switch (key) {
            case "index":
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Câu ${value}:`,
                      bold: true,
                      size: 24,
                      color: "1E40AF",
                    }),
                  ],
                })
              );
              break;
            case "question_text":
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: value,
                      bold: true,
                      size: 22,
                    }),
                  ],
                })
              );
              break;
            case "options":
              (question.options || []).forEach(op => {
                const isCorrect = selectedFields.correct_answers && isCorrectAnswer(question.correct_answers, op.label);
                sections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${op.label}. ${op.text}`,
                        bold: isCorrect,
                        color: isCorrect ? "059669" : "374151",
                        size: 20,
                      }),
                    ],
                  })
                );
              });
              break;
            case "correct_answers":
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Đáp án đúng: ${value}`,
                      bold: true,
                      color: "059669",
                      size: 20,
                    }),
                  ],
                })
              );
              break;
            case "explanation":
              if (value.trim()) {
                sections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Giải thích:",
                        bold: true,
                        size: 20,
                      }),
                    ],
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: value,
                        size: 18,
                      }),
                    ],
                  })
                );
              }
              break;
          }
        });

        // Add space between questions
        sections.push(new Paragraph({ children: [new TextRun("")] }));
      });

      const doc = new Document({
        sections: [
          {
            children: sections,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const fileName = headerCombined 
        ? `${safeFileName(headerCombined)}-${safeFileName(testTitle)}.docx`
        : `multiple-choice-${safeFileName(testTitle)}.docx`;
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
    if (!questions?.length) return null;

    const mt = testMainTopic || (questions.find(q => q.main_topic)?.main_topic) || "";
    const st = testSubTopic || (questions.find(q => q.sub_topic)?.sub_topic) || "";
    const headerCombined = mt && st ? `${mt} - ${st}` : (mt || st || "");

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
              {headerCombined && (
                <h3 className="text-lg font-bold text-slate-900 mb-1">{headerCombined}</h3>
              )}
              <h2 className="text-xl font-bold text-slate-900 mb-2">{testTitle || ""}</h2>
              <p className="text-sm text-slate-600">
                {(() => {
                  const exportDate = `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`;
                  const creatorInfo = createdBy ? `Được tạo bởi: ${createdBy}` : "";
                  return creatorInfo ? `${exportDate} | ${creatorInfo}` : exportDate;
                })()}
              </p>
            </div>

            {/* Questions Preview */}
            <div className="space-y-6">
              {questions.map((question, idx) => (
            <div key={idx} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              {selectedKeys.map(key => {
                const value = getValueByField(question, idx, key);
                if (!value) return null;

                return (
                  <div key={key} className="mb-3 last:mb-0">
                    {key === "index" && (
                      <h4 className="font-bold text-blue-700 text-lg mb-2">Câu {value}:</h4>
                    )}
                    {key === "question_text" && (
                      <p className="font-semibold text-slate-900 mb-2">{value}</p>
                    )}
                    {key === "options" && (
                      <div className="ml-4 space-y-1">
                        {(question.options || []).map(op => {
                          const isCorrect = selectedFields.correct_answers && isCorrectAnswer(question.correct_answers, op.label);
                          return (
                            <div key={op.label} className={`text-sm ${
                              isCorrect ? "text-green-700 font-semibold" : "text-slate-700"
                            }`}>
                              {op.label}. {op.text}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {key === "correct_answers" && (
                      <p className="text-green-700 font-semibold text-sm">
                        <span className="text-slate-600">Đáp án đúng:</span> {value}
                      </p>
                    )}
                    {key === "explanation" && value.trim() && (
                      <div className="text-sm text-slate-700">
                        <span className="font-medium text-slate-800">Giải thích:</span>
                        <div className="ml-2 mt-1 whitespace-pre-line">{value}</div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            ))}
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
    if (!questions?.length) {
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
                  Xuất danh sách câu hỏi trắc nghiệm
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
              <div className="space-y-3">
                {/* Export Format */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Định dạng xuất
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  className={cx(
                    "p-3 rounded-xl border-2 text-left transition",
                    exportFormat === "pdf"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 font-bold text-xs">PDF</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">PDF</div>
                      <div className="text-xs text-slate-500">Portable Document Format</div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat("word")}
                  className={cx(
                    "p-3 rounded-xl border-2 text-left transition",
                    exportFormat === "word"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-xs">DOC</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Word</div>
                      <div className="text-xs text-slate-500">Microsoft Word Document</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Fields */}
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

              <div className="border border-slate-200 rounded-xl p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
                  {availableFields.map((field) => (
                    <label
                      key={field.key}
                      className={cx(
                        "flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer select-none transition",
                        selectedFields[field.key]
                          ? "border-indigo-200 bg-indigo-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedFields[field.key]}
                        onChange={() => handleFieldToggle(field.key)}
                        className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 leading-5 truncate">
                          {field.label}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-4 truncate">
                          {field.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
              <div className="text-sm text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>Số câu hỏi:</span>
                  <span className="font-semibold">{questions.length}</span>
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
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50"
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
                    className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50"
                  >
                    ← Quay lại cấu hình
                  </button>
                )}
                
                {!previewMode ? (
                  <button
                    type="button"
                    onClick={() => setPreviewMode(true)}
                    disabled={selectedCount === 0 || questions.length === 0}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    Xem trước →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting || selectedCount === 0 || questions.length === 0 || (!user && !canExport(!!user).canExport)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isExporting && (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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

export default ExportMCPModal;