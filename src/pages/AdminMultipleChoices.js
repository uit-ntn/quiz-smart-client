import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "../layout/AdminLayout";
import multipleChoiceService from "../services/multipleChoiceService";
import testService from "../services/testService";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import AdminQuestionModal from "../components/AdminQuestionModal";

/* ---------- Small UI helpers ---------- */
const Badge = ({ children, tone = "sky" }) => {
  const map = {
    sky: "bg-sky-50 text-sky-800 ring-1 ring-sky-100",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    red: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
};



const AdminMultipleChoices = () => {
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  // modals
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // test info cache
  const [tests, setTests] = useState({});
  const [allTests, setAllTests] = useState([]);

  useEffect(() => {
    fetchQuestions();
    fetchAllTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, searchTerm]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await multipleChoiceService.getAllMultipleChoices();
      console.log('Multiple choice data:', data);
      
      // Xử lý dữ liệu - API có thể trả về array hoặc object
      let questionsArray = [];
      if (Array.isArray(data)) {
        questionsArray = data;
      } else if (data && typeof data === 'object') {
        // Thử các key phổ biến
        questionsArray = data.data || data.questions || data.results || data.items || [];
        
        // Nếu vẫn không có, log để debug
        if (questionsArray.length === 0) {
          console.log('API response structure:', Object.keys(data));
        }
      }
      
      console.log('Final questions array:', questionsArray.length, 'items');
      setQuestions(questionsArray);

      // preload test info if we have questions
      if (questionsArray.length > 0) {
        const ids = [...new Set(questionsArray.map((q) => q.test_id).filter(Boolean))];
        const info = {};
        await Promise.all(
          ids.map(async (id) => {
            try {
              const t = await testService.getTestById(id);
              info[id] = t;
            } catch (e) {
              console.error("Fetch test failed", id, e);
            }
          })
        );
        setTests(info);
      }
    } catch (e) {
      console.error('Error fetching questions:', e);
      setError("Không thể tải danh sách câu hỏi: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTests = async () => {
    try {
      const data = await testService.getAllTests();
      console.log('All tests data:', data);
      
      let testsArray = [];
      if (Array.isArray(data)) {
        testsArray = data;
      } else if (data && typeof data === 'object') {
        testsArray = data.data || data.tests || data.results || data.items || [];
      }
      
      // Filter only multiple choice tests
      const multipleChoiceTests = testsArray.filter(test => 
        test.test_type === 'multiple_choice' || test.test_type === 'multiple-choice'
      );
      
      setAllTests(multipleChoiceTests);
    } catch (e) {
      console.error('Error fetching all tests:', e);
    }
  };

  const filterQuestions = () => {
    let list = [...questions];
    console.log('Filtering questions:', list.length, 'items');
    
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((q) => {
        const questionText = q.question_text?.toLowerCase() || '';
        const optionsText = q.options?.map(op => 
          typeof op === 'string' ? op.toLowerCase() : op?.text?.toLowerCase() || ''
        ).join(' ') || '';
        const explanationText = q.explanation?.correct?.toLowerCase() || '';
        return questionText.includes(s) || optionsText.includes(s) || explanationText.includes(s);
      });
      console.log('After search filter:', list.length, 'items');
    }
    
    console.log('Final filtered questions:', list);
    setFilteredQuestions(list);
  };

  /* -------------------- CRUD Handlers -------------------- */
  const openCreate = () => {
    setSelectedQuestion(null);
    setIsEditMode(false);
    setShowQuestionModal(true);
    setShowDetailModal(false); // Close detail modal if open
  };

  const openEdit = (q) => {
    setSelectedQuestion(q);
    setIsEditMode(true);
    setShowQuestionModal(true);
    setShowDetailModal(false); // Close detail modal if open
  };

  const openDelete = (q) => {
    setSelectedQuestion(q);
    setShowDeleteModal(true);
    setShowDetailModal(false); // Close detail modal if open
  };

  const openDetail = (q) => {
    setSelectedQuestion(q);
    setShowDetailModal(true);
    setShowQuestionModal(false); // Close question modal if open
    setIsEditMode(false);
  };



  const handleDeleteConfirm = async () => {
    if (!selectedQuestion) return;
    try {
      await multipleChoiceService.deleteMultipleChoice(selectedQuestion._id);
      setQuestions((prev) => prev.filter((q) => q._id !== selectedQuestion._id));
      setShowDeleteModal(false);
      setSelectedQuestion(null);
    } catch (e) {
      console.error(e);
      alert("Không thể xóa câu hỏi. Vui lòng thử lại!");
    }
  };

  const handleQuestionSaved = (response) => {
    if (isEditMode) {
      // Update existing question
      setQuestions((prev) =>
        prev.map((q) => (q._id === selectedQuestion._id ? response : q))
      );
    } else {
      // Add new question
      setQuestions((prev) => [response, ...prev]);
    }
    setShowQuestionModal(false);
    setSelectedQuestion(null);
    setIsEditMode(false);
  };



  const correctLetter = (idx) =>
    typeof idx === "number" ? String.fromCharCode(65 + idx) : "—";

  const total = useMemo(() => filteredQuestions.length, [filteredQuestions]);

  /* -------------------- Render -------------------- */
  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner message="Đang tải danh sách câu hỏi..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-black truncate">Quản lý Multiple Choice</h1>
            <p className="text-indigo-900/70 mt-1 text-sm sm:text-base">Tổng số: {total} câu hỏi</p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={fetchQuestions}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-sky-100 bg-sky-50 text-indigo-900 hover:bg-sky-100 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Thêm câu hỏi</span>
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-sky-100 p-4">
          <label className="block text-sm font-medium text-black mb-2">Tìm kiếm</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo câu hỏi..."
            className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black placeholder:text-indigo-400 text-sm"
          />
        </div>



        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-sky-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-sky-50 border-b border-sky-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-900/70 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-900/70 uppercase">Câu hỏi</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-indigo-900/70 uppercase">Đáp án đúng</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-indigo-900/70 uppercase">Thao tác</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-sky-100">
                {filteredQuestions.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-indigo-900/70">
                      {searchTerm ? "Không tìm thấy câu hỏi nào phù hợp" : "Chưa có câu hỏi nào"}
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map((q, idx) => {
                    const t = q.test_id ? tests[q.test_id] : null;
                    
                    // Get correct answer from new schema
                    const correctLetter = q.correct_answers?.[0] || null;
                    const correctOption = correctLetter 
                      ? q.options?.find(opt => opt.label === correctLetter)
                      : null;

                    return (
                      <tr key={q._id} className="hover:bg-sky-50/60">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge tone="indigo">{idx + 1}</Badge>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-black font-medium max-w-md truncate">
                            {q.question_text}
                          </div>
                          {q.tags && q.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {q.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {q.correct_answers && q.correct_answers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {q.correct_answers.map(letter => {
                                const option = q.options?.find(opt => opt.label === letter);
                                return option ? (
                                  <Badge key={letter} tone="green">
                                    {letter}. {option.text.length > 30 
                                      ? option.text.substring(0, 30) + '...' 
                                      : option.text}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <span className="text-indigo-900/60">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => openDetail(q)}
                              className="rounded-lg border border-indigo-100 px-3 py-1.5 text-indigo-700 hover:bg-indigo-50"
                              title="Xem chi tiết"
                            >
                              Chi tiết
                            </button>
                            <button
                              onClick={() => openEdit(q)}
                              className="rounded-lg border border-sky-100 px-3 py-1.5 text-indigo-900 hover:bg-sky-50"
                              title="Chỉnh sửa"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => openDelete(q)}
                              className="rounded-lg border border-rose-200 px-3 py-1.5 text-rose-600 hover:bg-rose-50"
                              title="Xoá"
                            >
                              Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Question Modal */}
        <AdminQuestionModal
          isOpen={showQuestionModal}
          onClose={() => {
            setShowQuestionModal(false);
            setSelectedQuestion(null);
            setIsEditMode(false);
          }}
          testId={null}
          testType="multiple_choice"
          question={isEditMode ? selectedQuestion : null}
          onQuestionSaved={handleQuestionSaved}
        />

        {/* Delete Modal */}
        {showDeleteModal && !showQuestionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full grid place-items-center ring-1 ring-rose-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M7 21h10a2 2 0 002-2V7l-5-5H9L4 7v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-black">Xác nhận xóa</h4>
                  <p className="text-sm text-indigo-900/70">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <p className="text-black mb-6">Bạn có chắc chắn muốn xóa câu hỏi này?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && !showQuestionModal && selectedQuestion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Chi tiết câu hỏi</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {(() => {
                  const t = tests[selectedQuestion.test_id];
                  
                  // Get correct answer from new schema
                  const correctLetter = selectedQuestion.correct_answers?.[0] || null;
                  const correctOption = correctLetter 
                    ? selectedQuestion.options?.find(opt => opt.label === correctLetter)
                    : null;

                  return (
                    <div className="space-y-6">
                      {/* Test Info */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">Thông tin bài kiểm tra</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Tên bài:</span>
                            <div className="text-gray-900">{t?.test_title || '—'}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Trạng thái:</span>
                            <div className="text-gray-900">{t?.visibility === 'public' ? '🌍 Công khai' : '🔒 Riêng tư'}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Chủ đề chính:</span>
                            <div className="text-gray-900">{t?.main_topic || '—'}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Chủ đề con:</span>
                            <div className="text-gray-900">{t?.sub_topic || '—'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Question */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Câu hỏi</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-900">{selectedQuestion.question_text}</p>
                        </div>
                      </div>

                      {/* Options */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Các đáp án</h4>
                        <div className="space-y-2">
                          {selectedQuestion.options?.map((op, i) => {
                            const isCorrect = selectedQuestion.correct_answers?.includes(op.label);
                            const optionText = op.text;
                            const optionLabel = op.label;
                            
                            return (
                              <div
                                key={i}
                                className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
                                  isCorrect 
                                    ? 'border-emerald-500 bg-emerald-100 text-emerald-900' 
                                    : 'border-gray-300 bg-gray-50 text-gray-800'
                                }`}
                              >
                                <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-500 text-white'
                                }`}>
                                  {optionLabel}
                                </span>
                                <span className={`flex-1 ${isCorrect ? 'font-bold' : 'font-medium'}`}>
                                  {optionText}
                                </span>
                                {isCorrect && (
                                  <span className="text-emerald-600">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Explanation */}
                      {selectedQuestion.explanation && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Giải thích</h4>
                          <div className="space-y-3">
                            {typeof selectedQuestion.explanation === 'object' ? (
                              <>
                                {selectedQuestion.explanation.correct && (
                                  <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-r">
                                    <div className="flex items-start">
                                      <svg className="w-5 h-5 text-emerald-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      <div>
                                        <h5 className="font-medium text-emerald-800 mb-1">✓ Đáp án đúng</h5>
                                        <p className="text-emerald-700">{selectedQuestion.explanation.correct}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {selectedQuestion.explanation.incorrect_choices && Object.keys(selectedQuestion.explanation.incorrect_choices).length > 0 && (
                                  <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r">
                                    <div className="flex items-start">
                                      <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                      </svg>
                                      <div>
                                        <h5 className="font-medium text-amber-800 mb-2">⚠ Tại sao các đáp án khác sai?</h5>
                                        <div className="space-y-2">
                                          {Object.entries(selectedQuestion.explanation.incorrect_choices).map(([label, explanation]) => (
                                            <div key={label} className="flex items-start bg-white/50 p-2 rounded">
                                              <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-600 text-white text-xs font-bold rounded mr-2">
                                                {label}
                                              </span>
                                              <p className="text-amber-800 text-sm">{explanation}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-gray-700">{selectedQuestion.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Question Modal */}
        {showQuestionModal && !showDetailModal && (
          <AdminQuestionModal
            isOpen={showQuestionModal}
            onClose={() => {
              setShowQuestionModal(false);
              setSelectedQuestion(null);
              setIsEditMode(false);
            }}
            questionData={isEditMode ? selectedQuestion : null}
            testType="multiple-choice"
            onQuestionSaved={handleQuestionSaved}
            allTests={allTests}
          />
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-black mb-4">
                Xóa câu hỏi
              </h3>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa câu hỏi này không? Hành động này không thể hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedQuestion(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};



export default AdminMultipleChoices;
