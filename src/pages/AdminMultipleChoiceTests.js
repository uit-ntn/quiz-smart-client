import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminLayout, { useSidebar } from '../layout/AdminLayout';
import testService from '../services/testService';
import multipleChoiceService from '../services/multipleChoiceService';
import CreateMultipleChoiceTestButton from '../components/CreateMultipleChoiceTestButton';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';
import DeleteTestModal from '../components/AdminDeleteTestModal';
import AdminMCPTestDetailModal from '../components/AdminMCPTestDetailModal';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';
import { getCorrectAnswerLabels, isCorrectAnswer } from '../utils/correctAnswerHelpers';

// Setup pdfMake fonts
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

const safeFileName = (name) => {
  if (!name) return "multiple-choice-test";
  return name
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const AdminMultipleChoiceTests = () => {
  const { user } = useAuth();
  const { sidebarCollapsed } = useSidebar();
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_by_full_name');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterCreator, setFilterCreator] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showExportZipModal, setShowExportZipModal] = useState(false);
  const [includeMergeFile, setIncludeMergeFile] = useState(true);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [showExplanation, setShowExplanation] = useState(true);
  const [exportSortOrder, setExportSortOrder] = useState('original'); // original, name_asc, name_desc, date_asc, date_desc, questions_asc, questions_desc
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [testToDelete, setTestToDelete] = useState(null);

  // Bulk selection state
  const [selectedTests, setSelectedTests] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Toast state
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success'
  });

  // Toast helper function
  const showToast = (message, type = 'success') => {
    setToast({
      isVisible: true,
      message,
      type
    });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  useEffect(() => {
    fetchMultipleChoiceTests();
  }, []);

  useEffect(() => {
    filterTests();
  }, [tests, searchTerm, filterVisibility, filterDifficulty, filterStatus, sortBy, sortOrder, filterCreator]);

  const fetchMultipleChoiceTests = async () => {
    try {
      setLoading(true);
      const data = await testService.getAllMultipleChoicesTests();
      console.log('Multiple choice tests from API:', data);
      setTests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching multiple choice tests:', err);
      setError(err.message);
      showToast('Có lỗi xảy ra khi tải danh sách bài test trắc nghiệm', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const filterTests = () => {
    let filtered = [...tests];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(test =>
        test.test_title?.toLowerCase().includes(term) ||
        test.main_topic?.toLowerCase().includes(term) ||
        test.sub_topic?.toLowerCase().includes(term) ||
        test.description?.toLowerCase().includes(term)
      );
    }

    // Filter by visibility
    if (filterVisibility !== 'all') {
      filtered = filtered.filter(test => test.visibility === filterVisibility);
    }

    // Filter by difficulty
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(test => test.difficulty === filterDifficulty);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(test => test.status === filterStatus);
    }

    // Filter by creator
    if (filterCreator !== 'all') {
      filtered = filtered.filter(test => {
        const creator = test.created_by_full_name || test.created_by || '';
        return creator === filterCreator;
      });
    }

    // (date range filter removed)

    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';

      if (sortBy === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredTests(filtered);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredTests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTests = filteredTests.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterVisibility, filterDifficulty, filterStatus, sortBy, sortOrder, filterCreator]);

  // Reset page when itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedTests([]);
    setSelectAll(false);
  }, [searchTerm, filterVisibility, filterDifficulty, filterStatus, sortBy, sortOrder, filterCreator]);

  // Bulk selection functions
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedTests(paginatedTests.map(test => test._id));
    } else {
      setSelectedTests([]);
    }
  };

  const handleSelectTest = (testId, checked) => {
    if (checked) {
      const newSelected = [...selectedTests, testId];
      setSelectedTests(newSelected);
      if (newSelected.length === paginatedTests.length) {
        setSelectAll(true);
      }
    } else {
      const newSelected = selectedTests.filter(id => id !== testId);
      setSelectedTests(newSelected);
      setSelectAll(false);
    }
  };

  const openBulkDelete = () => {
    if (selectedTests.length > 0) {
      setShowBulkDeleteModal(true);
    }
  };

  const openBulkMerge = () => {
    if (selectedTests.length >= 2) {
      setShowMergeModal(true);
    }
  };

  const openExportZipModal = () => {
    if (selectedTests.length > 0) {
      setShowExportZipModal(true);
    }
  };

  // Helper function to get explanation text (similar to ExportMCPModal)
  const getExplanationText = (question) => {
    if (!question.explanation) return "";
    
    let explanation = "";
    
    // Correct answer explanations
    if (question.explanation.correct) {
      if (typeof question.explanation.correct === 'object' && Object.keys(question.explanation.correct).length > 0) {
        const correctTexts = Object.entries(question.explanation.correct)
          .map(([label, text]) => `${label}: ${text}`)
          .join('\n');
        explanation += `Đúng:\n${correctTexts}`;
      } else if (typeof question.explanation.correct === 'string' && question.explanation.correct.trim()) {
        explanation += `Đúng: ${question.explanation.correct}`;
      }
    }
    
    // Incorrect answer explanations
    if (question.explanation.incorrect_choices && Object.keys(question.explanation.incorrect_choices).length > 0) {
      const correctLabels = getCorrectAnswerLabels(question.correct_answers);
      const incorrectExplanations = Object.entries(question.explanation.incorrect_choices)
        .filter(([label, text]) => {
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
  };

  // Export multiple tests as ZIP
  const exportMultipleTestsAsZip = async (includeMerge = false, format = 'pdf', showExplanation = true, sortOrder = 'original') => {
    if (selectedTests.length === 0) return;

    try {
      setIsExportingZip(true);
      setShowExportZipModal(false);

      const zip = new JSZip();
      let selectedTestObjects = tests.filter(t => selectedTests.includes(t._id));
      
      // Sort tests based on selected order
      if (sortOrder === 'original') {
        // Keep original selection order
        selectedTestObjects = selectedTests
          .map(id => selectedTestObjects.find(t => t._id === id))
          .filter(Boolean);
      } else {
        // Sort by selected criteria
        selectedTestObjects = [...selectedTestObjects].sort((a, b) => {
          switch (sortOrder) {
            case 'name_asc':
              return (a.test_title || '').localeCompare(b.test_title || '');
            case 'name_desc':
              return (b.test_title || '').localeCompare(a.test_title || '');
            case 'date_asc':
              return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            case 'date_desc':
              return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            case 'questions_asc':
              return (a.total_questions || 0) - (b.total_questions || 0);
            case 'questions_desc':
              return (b.total_questions || 0) - (a.total_questions || 0);
            default:
              return 0;
          }
        });
      }
      
      const pdfBlobsForMerge = [];
      const docxBlobsForMerge = [];

      // Export each test
      for (const test of selectedTestObjects) {
        try {
          // Fetch questions for this test
          const questions = await multipleChoiceService.getQuestionsByTestId(test._id);
          if (!Array.isArray(questions) || questions.length === 0) {
            console.warn(`No questions found for test ${test._id}`);
            continue;
          }

          const mt = test.main_topic || "";
          const st = test.sub_topic || "";
          const headerCombined = mt && st ? `${mt} - ${st}` : (mt || st || "");
          const exportDate = `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`;
          const creatorInfo = test.created_by_full_name || test.created_by || "";
          const metaLine = creatorInfo ? `${exportDate} | Được tạo bởi: ${creatorInfo}` : exportDate;

          if (format === 'pdf') {
            // Create PDF content
            const content = [];
            
            // Always show main_topic and sub_topic separately
            if (mt) {
              content.push({ text: mt, style: 'topicHeader' });
            }
            if (st) {
              content.push({ text: st, style: 'subTopicHeader' });
            }
            content.push({ text: `${test.test_title || ""}`, style: "title" });
            content.push({ text: metaLine, style: "sub" });
            content.push({ text: " ", margin: [0, 8] });

            // Render questions
            questions.forEach((question, idx) => {
              const questionContent = [];
              questionContent.push({
                text: `Câu ${idx + 1}:`,
                style: "questionHeader"
              });
              questionContent.push({
                text: question.question_text || "",
                style: "questionText",
                margin: [0, 2, 0, 4]
              });
              (question.options || []).forEach(op => {
                const isCorrect = isCorrectAnswer(question.correct_answers, op.label);
                questionContent.push({
                  text: `${op.label}. ${op.text}`,
                  style: isCorrect ? "correctOption" : "normalOption",
                  margin: [10, 1, 0, 1]
                });
              });
              
              // Add explanation if showExplanation is true
              if (showExplanation) {
                const explanationText = getExplanationText(question);
                if (explanationText.trim()) {
                  questionContent.push({
                    text: "Giải thích:",
                    style: "sectionHeader",
                    margin: [0, 4, 0, 2]
                  });
                  questionContent.push({
                    text: explanationText,
                    style: "explanation",
                    margin: [10, 0, 0, 4]
                  });
                }
              }
              
              content.push({
                stack: questionContent,
                margin: [0, 0, 0, 12]
              });
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
                sub: { fontSize: 10, color: "#6B7280", alignment: "center", margin: [0, 4, 0, 0] },
                questionHeader: { fontSize: 12, bold: true, color: "#1E40AF", margin: [0, 8, 0, 4] },
                questionText: { fontSize: 11, color: "#111827", bold: true },
                sectionHeader: { fontSize: 10, bold: true, color: "#374151", margin: [0, 4, 0, 2] },
                normalOption: { fontSize: 10, color: "#374151" },
                correctOption: { fontSize: 10, color: "#059669", bold: true },
                correctAnswer: { fontSize: 10, color: "#059669", bold: true },
                explanation: { fontSize: 9, color: "#374151", lineHeight: 1.3 },
              },
            };

            // Generate PDF as blob
            const pdfDoc = pdfMake.createPdf(docDefinition);
            const pdfBlob = await new Promise((resolve, reject) => {
              pdfDoc.getBlob((blob) => {
                resolve(blob);
              });
            });

            // Collect PDF blob for merge
            if (includeMerge) {
              pdfBlobsForMerge.push(pdfBlob);
            }

            // Add to zip
            const fileName = headerCombined 
              ? `${safeFileName(headerCombined)}-${safeFileName(test.test_title)}.pdf`
              : `${safeFileName(test.test_title)}.pdf`;
            zip.file(fileName, pdfBlob);
          } else if (format === 'docx') {
            // Export as DOCX
            const mod = await import("docx");
            const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = mod;

            const sections = [];

            // Header
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
                    text: `${test.test_title || ""}`,
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
                    text: metaLine,
                    size: 20,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ children: [new TextRun("")] })
            );

            // Questions
            questions.forEach((question, idx) => {
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Câu ${idx + 1}:`,
                      bold: true,
                      size: 24,
                      color: "1E40AF",
                    }),
                  ],
                })
              );
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: question.question_text || "",
                      bold: true,
                      size: 22,
                    }),
                  ],
                })
              );
              (question.options || []).forEach(op => {
                const isCorrect = isCorrectAnswer(question.correct_answers, op.label);
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
              
              // Add explanation if showExplanation is true
              if (showExplanation) {
                const explanationText = getExplanationText(question);
                if (explanationText.trim()) {
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
                          text: explanationText,
                          size: 18,
                        }),
                      ],
                    })
                  );
                }
              }

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

            const docxBlob = await Packer.toBlob(doc);

            // Collect DOCX blob for merge
            if (includeMerge) {
              docxBlobsForMerge.push({ blob: docxBlob, test });
            }

            // Add to zip
            const fileName = headerCombined 
              ? `${safeFileName(headerCombined)}-${safeFileName(test.test_title)}.docx`
              : `${safeFileName(test.test_title)}.docx`;
            zip.file(fileName, docxBlob);
          }
        } catch (err) {
          console.error(`Error exporting test ${test._id}:`, err);
          // Continue with other tests even if one fails
        }
      }

      // Merge files if requested
      if (includeMerge) {
        if (format === 'pdf' && pdfBlobsForMerge.length > 0) {
          try {
            const mergedPdf = await PDFDocument.create();

            for (const pdfBlob of pdfBlobsForMerge) {
              const pdfBytes = await pdfBlob.arrayBuffer();
              const pdf = await PDFDocument.load(pdfBytes);
              const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
              copiedPages.forEach((page) => {
                mergedPdf.addPage(page);
              });
            }

            const mergedPdfBytes = await mergedPdf.save();
            const mergedPdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            zip.file("tong-hop-tat-ca-bai-test.pdf", mergedPdfBlob);
          } catch (err) {
            console.error('Error merging PDFs:', err);
            // Continue even if merge fails
          }
        } else if (format === 'docx' && docxBlobsForMerge.length > 0) {
          try {
            const mod = await import("docx");
            const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = mod;

            const allSections = [];

            // Merge all DOCX files
            for (let i = 0; i < docxBlobsForMerge.length; i++) {
              const { test } = docxBlobsForMerge[i];
              const questions = await multipleChoiceService.getQuestionsByTestId(test._id);
              if (!Array.isArray(questions) || questions.length === 0) continue;

              const mt = test.main_topic || "";
              const st = test.sub_topic || "";
              const headerCombined = mt && st ? `${mt} - ${st}` : (mt || st || "");
              const exportDate = `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`;
              const creatorInfo = test.created_by_full_name || test.created_by || "";
              const metaLine = creatorInfo ? `${exportDate} | Được tạo bởi: ${creatorInfo}` : exportDate;

              // Add separator between tests (except first)
              if (i > 0) {
                allSections.push(
                  new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),
                  new Paragraph({ children: [new TextRun({ text: "─".repeat(50), size: 20 })] }),
                  new Paragraph({ children: [new TextRun({ text: "", break: 1 })] })
                );
              }

              // Header
              if (headerCombined) {
                allSections.push(
                  new Paragraph({
                    children: [new TextRun({ text: headerCombined, bold: true, size: 32 })],
                    alignment: AlignmentType.CENTER,
                  })
                );
              }

              allSections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${test.test_title || ""}`,
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
                      text: metaLine,
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ children: [new TextRun("")] })
              );

              // Questions
              questions.forEach((question, idx) => {
                allSections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `Câu ${idx + 1}:`,
                        bold: true,
                        size: 24,
                        color: "1E40AF",
                      }),
                    ],
                  })
                );
                allSections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: question.question_text || "",
                        bold: true,
                        size: 22,
                      }),
                    ],
                  })
                );
                (question.options || []).forEach(op => {
                  const isCorrect = isCorrectAnswer(question.correct_answers, op.label);
                  allSections.push(
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
                
                // Add explanation if showExplanation is true
                if (showExplanation) {
                  const explanationText = getExplanationText(question);
                  if (explanationText.trim()) {
                    allSections.push(
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
                            text: explanationText,
                            size: 18,
                          }),
                        ],
                      })
                    );
                  }
                }

                // Add space between questions
                allSections.push(new Paragraph({ children: [new TextRun("")] }));
              });
            }

            const mergedDoc = new Document({
              sections: [
                {
                  children: allSections,
                },
              ],
            });

            const mergedDocxBlob = await Packer.toBlob(mergedDoc);
            zip.file("tong-hop-tat-ca-bai-test.docx", mergedDocxBlob);
          } catch (err) {
            console.error('Error merging DOCX files:', err);
            // Continue even if merge fails
          }
        }
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFileName = `tests-${new Date().toISOString().split('T')[0]}.zip`;
      saveAs(zipBlob, zipFileName);
      
      const formatText = format === 'pdf' ? 'PDF' : 'DOCX';
      showToast(`Đã xuất ${selectedTests.length} bài test thành file ZIP (${formatText})${includeMerge ? ' (có file tổng hợp)' : ''}`, 'success');
    } catch (err) {
      console.error('Error exporting ZIP:', err);
      showToast('Có lỗi xảy ra khi xuất file ZIP', 'error');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleMergeConfirm = async (targetTestId) => {
    if (selectedTests.length < 2 || !targetTestId) return;

    const sourceTestIds = selectedTests.filter(id => id !== targetTestId);
    
    if (sourceTestIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 2 bài test để gộp', 'error');
      return;
    }

    try {
      const response = await testService.mergeTests(targetTestId, sourceTestIds);
      
      showToast(
        `Đã gộp ${response.moved_questions} câu hỏi từ ${sourceTestIds.length} bài test. Tổng câu hỏi: ${response.target_total_questions}`,
        'success'
      );
      
      // Clear selection and refresh data
      setSelectedTests([]);
      setSelectAll(false);
      setShowMergeModal(false);
      await fetchMultipleChoiceTests();
      
    } catch (err) {
      console.error('Error merging tests:', err);
      showToast(`Không thể gộp bài test: ${err.message}`, 'error');
    }
  };

  const handleBulkDeleteConfirm = async (deleteType) => {
    if (selectedTests.length === 0) return;

    try {
      // Delete all selected tests
      if (deleteType === 'soft') {
        await Promise.all(selectedTests.map(id => testService.softDeleteTest(id)));
        showToast(`Đã xóa mềm ${selectedTests.length} bài test`, 'success');
      } else {
        await Promise.all(selectedTests.map(id => testService.hardDeleteTest(id)));
        showToast(`Đã xóa vĩnh viễn ${selectedTests.length} bài test`, 'success');
      }
      
      // Clear selection and refresh data
      setSelectedTests([]);
      setSelectAll(false);
      setShowBulkDeleteModal(false);
      await fetchMultipleChoiceTests();
      
    } catch (err) {
      console.error('Error bulk deleting tests:', err);
      showToast('Không thể xóa một số bài test. Vui lòng thử lại!', 'error');
    }
  };

  const handleDeleteClick = (test) => {
    setTestToDelete(test);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (deleteType) => {
    if (!testToDelete) return;

    try {
      if (deleteType === 'soft') {
        await testService.softDeleteTest(testToDelete._id);
        showToast(`Bài test "${testToDelete.test_title}" đã được xóa mềm`, 'success');
      } else {
        await testService.hardDeleteTest(testToDelete._id);
        showToast(`Bài test "${testToDelete.test_title}" đã được xóa vĩnh viễn`, 'success');
      }
      
      setShowDeleteModal(false);
      setTestToDelete(null);
      await fetchMultipleChoiceTests();
    } catch (err) {
      console.error('Error deleting test:', err);
      showToast(err.message || 'Có lỗi xảy ra khi xóa bài test', 'error');
    }
  };

  const handleDetailClick = (testId) => {
    setSelectedTestId(testId);
    setShowDetailModal(true);
  };

  const handleTestUpdated = () => {
    fetchMultipleChoiceTests();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full px-2 sm:px-6 lg:px-8 py-2 space-y-4">
        {/* Stats Cards and Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2">
          <div className="bg-emerald-500 rounded-lg shadow-sm p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex items-center justify-between flex-1">
                <p className="text-xs sm:text-sm font-medium text-white">Tổng số</p>
                <p className="text-base sm:text-lg font-semibold text-white">{tests.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-500 rounded-lg shadow-sm p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex items-center justify-between flex-1">
                <p className="text-xs sm:text-sm font-medium text-white">Kích hoạt</p>
                <p className="text-base sm:text-lg font-semibold text-white">
                  {tests.filter(test => test.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500 rounded-lg shadow-sm p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex items-center justify-between flex-1">
                <p className="text-xs sm:text-sm font-medium text-white">Tạm dừng</p>
                <p className="text-base sm:text-lg font-semibold text-white">
                  {tests.filter(test => test.status === 'inactive').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-500 rounded-lg shadow-sm p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex items-center justify-between flex-1">
                <p className="text-xs sm:text-sm font-medium text-white">Công khai</p>
                <p className="text-base sm:text-lg font-semibold text-white">
                  {tests.filter(test => test.visibility === 'public').length}
                </p>
              </div>
            </div>
          </div>
        </div>

          </div>

          <div className="flex-shrink-0">
            <CreateMultipleChoiceTestButton label="Tạo Test" className="h-10 px-3.5" />
          </div>
        </div>

        
        

        {/* Tests List - Mobile First Design */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Compact Filter Toolbar (moved onto table) */}
          <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-3">
            {/* Action buttons row */}
            {selectedTests.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={openExportZipModal}
                  disabled={isExportingZip}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{isExportingZip ? 'Đang xuất...' : `Xuất ZIP (${selectedTests.length})`}</span>
                </button>
                {selectedTests.length >= 2 && (
                  <button
                    onClick={openBulkMerge}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Gộp ({selectedTests.length})</span>
                  </button>
                )}
                <button
                  onClick={openBulkDelete}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Xóa ({selectedTests.length})</span>
                </button>
              </div>
            )}

            {/* Search and filters row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên, chủ đề..."
                  className="w-full px-2 py-1 border border-gray-200 rounded-md bg-white text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterVisibility}
                  onChange={(e) => setFilterVisibility(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả Trạng Thái</option>
                  <option value="public">Công khai</option>
                  <option value="private">Riêng tư</option>
                </select>

                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả Độ Khó</option>
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả Trạng Thái</option>
                  <option value="active">Kích hoạt</option>
                  <option value="inactive">Tạm dừng</option>
                  <option value="deleted">Đã xóa</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Mặc định</option>
                  <option value="test_title">Tên test</option>
                  <option value="main_topic">Chủ đề</option>
                  <option value="total_questions">Số câu hỏi</option>
                </select>

                <select
                  value={filterCreator}
                  onChange={(e) => setFilterCreator(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                >
                  <option value="all">Tất cả</option>
                  {(Array.from(new Set(tests.map(t => t.created_by_full_name || t.created_by).filter(Boolean)))).map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('test_title')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Tên Test</span>
                        <SortIcon field="test_title" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('main_topic')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Chủ đề</span>
                        <SortIcon field="main_topic" />
                      </div>
                    </th>
                    <th 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('total_questions')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Câu hỏi</span>
                        <SortIcon field="total_questions" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Độ khó
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('created_by_full_name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Được tạo bởi</span>
                        <SortIcon field="created_by_full_name" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTests.length > 0 ? (
                    paginatedTests.map((test) => (
                      <tr key={test._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedTests.includes(test._id)}
                            onChange={(e) => handleSelectTest(test._id, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="max-w-xs">
                            <div className="text-sm font-medium text-gray-900 truncate">{test.test_title}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="max-w-xs">
                            <div className="text-sm text-gray-900 truncate">{test.main_topic}</div>
                            <div className="text-xs text-gray-500 truncate">{test.sub_topic}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {test.total_questions}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            test.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            test.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {test.difficulty === 'easy' ? 'Dễ' : test.difficulty === 'medium' ? 'TB' : 'Khó'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              test.status === 'active' ? 'bg-green-100 text-green-800' :
                              test.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {test.status === 'active' ? 'Hoạt động' : test.status === 'inactive' ? 'Tạm dừng' : 'Đã xóa'}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              test.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {test.visibility === 'public' ? 'Công khai' : 'Riêng tư'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {test.created_by_full_name || test.created_by || (test.created_at ? new Date(test.created_at).toLocaleDateString('vi-VN') : '—')}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => handleDetailClick(test._id)}
                              className="text-xs text-emerald-600 hover:text-emerald-900 text-left"
                            >
                              Chi tiết
                            </button>
                            <button
                              onClick={() => handleDeleteClick(test)}
                              className="text-xs text-red-600 hover:text-red-900 text-left"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-sm text-gray-500">
                        Không tìm thấy bài test nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden">
            <div className="space-y-3 p-4">
              {paginatedTests.length > 0 ? (
                paginatedTests.map((test) => (
                  <div key={test._id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {/* Title and Topic */}
                    <div>
                      <h3 className="font-medium text-gray-900 text-sm">{test.test_title}</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {test.main_topic} {test.sub_topic && `• ${test.sub_topic}`}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {test.total_questions} câu hỏi
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                         test.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        test.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.difficulty === 'easy' ? 'Dễ' : test.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        test.status === 'active' ? 'bg-green-100 text-green-800' :
                        test.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.status === 'active' ? 'Hoạt động' : test.status === 'inactive' ? 'Tạm dừng' : 'Đã xóa'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        test.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {test.visibility === 'public' ? 'Công khai' : 'Riêng tư'}
                      </span>
                    </div>

                    {/* Date and Actions */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Được tạo bởi: {test.created_by_full_name || test.created_by || (test.created_at ? new Date(test.created_at).toLocaleDateString('vi-VN') : '—')}
                      </span>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleDetailClick(test._id)}
                          className="text-sm text-emerald-600 hover:text-emerald-900 font-medium"
                        >
                          Chi tiết
                        </button>
                        <button
                          onClick={() => handleDeleteClick(test)}
                          className="text-sm text-red-600 hover:text-red-900 font-medium"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Không tìm thấy bài test nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {(totalPages > 1 || filteredTests.length > 0) && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                    Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredTests.length)} trong {filteredTests.length} kết quả
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                      Hiển thị:
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ‹
                    </button>
                    <span className="px-3 py-1 text-sm font-medium text-gray-900">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBulkDeleteModal(false)} />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-black">Xác nhận xóa nhiều</h4>
                <p className="text-sm text-indigo-900/70">Hành động này không thể hoàn tác</p>
              </div>
            </div>
            <p className="text-black mb-6">Bạn có chắc chắn muốn xóa <span className="font-semibold">{selectedTests.length} bài test</span> đã chọn?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleBulkDeleteConfirm('soft')}
                className="w-full px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700"
              >
                Xóa mềm {selectedTests.length} bài test
              </button>
              <button
                onClick={() => handleBulkDeleteConfirm('hard')}
                className="w-full px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Xóa vĩnh viễn {selectedTests.length} bài test
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="w-full px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteTestModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        test={testToDelete}
        onDeleteConfirmed={handleDeleteConfirm}
      />

      <AdminMCPTestDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        testId={selectedTestId}
        onTestUpdated={handleTestUpdated}
      />

      {/* Export ZIP Modal */}
      {showExportZipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowExportZipModal(false)} />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-black">Xuất nhiều bài test</h4>
                <p className="text-sm text-indigo-900/70">Chọn tùy chọn xuất file</p>
              </div>
            </div>
            <p className="text-black mb-4">Bạn sẽ xuất <span className="font-semibold">{selectedTests.length} bài test</span> thành file ZIP.</p>
            
            <div className="mb-4 space-y-4">
              {/* Format selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Định dạng xuất</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">PDF</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="docx"
                      checked={exportFormat === 'docx'}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">DOCX</span>
                  </label>
                </div>
              </div>

              {/* Sort order selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Thứ tự xuất</label>
                <select
                  value={exportSortOrder}
                  onChange={(e) => setExportSortOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="original">Giữ nguyên thứ tự chọn</option>
                  <option value="name_asc">Theo tên (A → Z)</option>
                  <option value="name_desc">Theo tên (Z → A)</option>
                  <option value="date_desc">Theo ngày tạo (mới nhất)</option>
                  <option value="date_asc">Theo ngày tạo (cũ nhất)</option>
                  <option value="questions_desc">Theo số câu hỏi (nhiều nhất)</option>
                  <option value="questions_asc">Theo số câu hỏi (ít nhất)</option>
                </select>
              </div>

              {/* Show explanation checkbox */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showExplanation}
                    onChange={(e) => setShowExplanation(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Hiển thị giải thích</div>
                    <div className="text-xs text-gray-500">Bao gồm giải thích cho đáp án đúng và sai</div>
                  </div>
                </label>
              </div>

              {/* Include merge file checkbox */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMergeFile}
                    onChange={(e) => setIncludeMergeFile(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Thêm file tổng hợp</div>
                    <div className="text-xs text-gray-500">Tạo thêm 1 file {exportFormat === 'pdf' ? 'PDF' : 'DOCX'} gộp tất cả câu hỏi từ các bài test</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportZipModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
              >
                Hủy
              </button>
              <button
                onClick={() => exportMultipleTestsAsZip(includeMergeFile, exportFormat, showExplanation, exportSortOrder)}
                disabled={isExportingZip}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExportingZip ? 'Đang xuất...' : 'Xuất ZIP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Tests Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMergeModal(false)} />
          <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-black">Gộp bài test</h4>
                <p className="text-sm text-indigo-900/70">Chọn bài test đích</p>
              </div>
            </div>
            <p className="text-black mb-4">Chọn bài test sẽ nhận tất cả câu hỏi từ {selectedTests.length - 1} bài test khác:</p>
            <select 
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4"
              onChange={(e) => e.target.value && handleMergeConfirm(e.target.value)}
              defaultValue=""
            >
              <option value="">-- Chọn bài test đích --</option>
              {selectedTests.map(testId => {
                const test = tests.find(t => t._id === testId);
                return test ? (
                  <option key={testId} value={testId}>
                    {test.test_title} ({test.total_questions || 0} câu hỏi)
                  </option>
                ) : null;
              })}
            </select>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Lưu ý:</strong> Các bài test nguồn sẽ bị xóa mềm sau khi gộp. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMergeModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </AdminLayout>
  );
};

export default AdminMultipleChoiceTests;