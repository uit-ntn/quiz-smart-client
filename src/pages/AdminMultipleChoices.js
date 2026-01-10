import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "../layout/AdminLayout";
import MultipleChoiceService from "../services/multipleChoiceService";
import testService from "../services/testService";
import { getCorrectAnswerLabels, isCorrectAnswer } from "../utils/correctAnswerHelpers";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import AdminMCPQuestionModal from "../components/AdminMCPQuestionModal";
import AdminMCPQuestionDetailModal from "../components/AdminMCPQuestionDetailModal";

/* ---------- Small UI helpers ---------- */
const Badge = ({ children, tone = "sky" }) => {
  const map = {
    sky: "bg-sky-50 text-sky-800 ring-1 ring-sky-100",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    red: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium ${map[tone]}`}>
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

  const [selectedTestId, setSelectedTestId] = useState("");
  const [selectedMainTopic, setSelectedMainTopic] = useState("");
  const [selectedSubTopic, setSelectedSubTopic] = useState("");
  const [mainTopics, setMainTopics] = useState([]);
  const [subTopics, setSubTopics] = useState([]);

  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Date filters (only dates, no times)
  

  // modals
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [showBulkDeleteDuplicatesModal, setShowBulkDeleteDuplicatesModal] = useState(false);

  // Bulk selection state
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // test info cache
  const [tests, setTests] = useState({});
  const [allTests, setAllTests] = useState([]);

  const filteredSubTopics = useMemo(() => {
    if (!selectedMainTopic) return subTopics;
    return [...new Set(allTests.filter(t => t.main_topic === selectedMainTopic).map(t => t.sub_topic).filter(Boolean))];
  }, [allTests, selectedMainTopic, subTopics]);

  const filteredTests = useMemo(() => {
    let filtered = [...allTests];
    
    if (selectedMainTopic) {
      filtered = filtered.filter(t => t.main_topic === selectedMainTopic);
    }
    
    if (selectedSubTopic) {
      filtered = filtered.filter(t => t.sub_topic === selectedSubTopic);
    }
    
    return filtered;
  }, [allTests, selectedMainTopic, selectedSubTopic]);

  useEffect(() => {
    fetchQuestions();
    fetchAllTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, searchTerm, selectedTestId, selectedMainTopic, selectedSubTopic, sortBy, sortOrder, showDuplicatesOnly]);

  // Reset sub topic when main topic changes
  useEffect(() => {
    if (selectedMainTopic && !filteredSubTopics.includes(selectedSubTopic)) {
      setSelectedSubTopic("");
    }
  }, [selectedMainTopic, filteredSubTopics, selectedSubTopic]);

  // Reset test when main topic or sub topic changes
  useEffect(() => {
    if ((selectedMainTopic || selectedSubTopic) && !filteredTests.some(t => t._id === selectedTestId)) {
      setSelectedTestId("");
    }
  }, [selectedMainTopic, selectedSubTopic, filteredTests, selectedTestId]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedQuestions([]);
    setSelectAll(false);
  }, [searchTerm, selectedTestId, selectedMainTopic, selectedSubTopic, showDuplicatesOnly]);

  // Bulk selection functions
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedQuestions(filteredQuestions.map(q => q._id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleSelectQuestion = (questionId, checked) => {
    if (checked) {
      const newSelected = [...selectedQuestions, questionId];
      setSelectedQuestions(newSelected);
      if (newSelected.length === filteredQuestions.length) {
        setSelectAll(true);
      }
    } else {
      const newSelected = selectedQuestions.filter(id => id !== questionId);
      setSelectedQuestions(newSelected);
      setSelectAll(false);
    }
  };

  const openBulkDelete = () => {
    if (selectedQuestions.length > 0) {
      setShowBulkDeleteModal(true);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedQuestions.length === 0) return;

    try {
      // Delete all selected questions
      await Promise.all(selectedQuestions.map(id => MultipleChoiceService.deleteMultipleChoice(id)));
      
      // Remove deleted items from both state arrays immediately
      setQuestions(prev => prev.filter(q => !selectedQuestions.includes(q._id)));
      setFilteredQuestions(prev => prev.filter(q => !selectedQuestions.includes(q._id)));
      
      // Clear selection
      setSelectedQuestions([]);
      setSelectAll(false);
      setShowBulkDeleteModal(false);
      
      console.log(`Successfully deleted ${selectedQuestions.length} questions`);
    } catch (err) {
      console.error('Error bulk deleting questions:', err);
      alert('Không thể xóa một số câu hỏi. Vui lòng thử lại!');
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await MultipleChoiceService.getAllMultipleChoices();
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

      // Extract unique main topics and sub topics
      setMainTopics([...new Set(multipleChoiceTests.map(t => t.main_topic).filter(Boolean))]);
      setSubTopics([...new Set(multipleChoiceTests.map(t => t.sub_topic).filter(Boolean))]);
    } catch (e) {
      console.error('Error fetching all tests:', e);
    }
  };

  const filterQuestions = () => {
    let list = [...questions];
    console.log('Filtering questions:', list.length, 'items');
    
    // Create duplicate map for all questions (needed for visual indicators)
    const questionTextCounts = {};
    const duplicateMap = {};
    questions.forEach(q => {
      const text = q.question_text?.trim().toLowerCase();
      if (text) {
        questionTextCounts[text] = (questionTextCounts[text] || 0) + 1;
        if (!duplicateMap[text]) duplicateMap[text] = [];
        duplicateMap[text].push(q._id);
      }
    });
    
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((q) => {
        const questionText = q.question_text?.toLowerCase() || '';
        const optionsText = q.options?.map(op => 
          typeof op === 'string' ? op.toLowerCase() : op?.text?.toLowerCase() || ''
        ).join(' ') || '';
        const explanationText = q.explanation?.correct?.toLowerCase() || '';
        const incorrectChoicesText = q.explanation?.incorrect_choices 
          ? Object.values(q.explanation.incorrect_choices).join(' ').toLowerCase()
          : '';
        return questionText.includes(s) || optionsText.includes(s) || explanationText.includes(s) || incorrectChoicesText.includes(s);
      });
      console.log('After search filter:', list.length, 'items');
    }

    if (selectedTestId) {
      list = list.filter((q) => q.test_id === selectedTestId);
    }

    if (selectedMainTopic) {
      list = list.filter((q) => {
        const t = tests[q.test_id];
        return t?.main_topic === selectedMainTopic;
      });
    }

    if (selectedSubTopic) {
      list = list.filter((q) => {
        const t = tests[q.test_id];
        return t?.sub_topic === selectedSubTopic;
      });
    }

    // Duplicate filter - show ALL instances of duplicate questions
    if (showDuplicatesOnly) {
      list = list.filter(q => {
        const text = q.question_text?.trim().toLowerCase();
        return text && questionTextCounts[text] > 1;
      });
      console.log('After duplicate filter:', list.length, 'items');
    }

    // Attach duplicate info to each question for UI display
    list = list.map(q => {
      const text = q.question_text?.trim().toLowerCase();
      return {
        ...q,
        duplicateCount: text ? questionTextCounts[text] : 1,
        isDuplicate: text ? questionTextCounts[text] > 1 : false,
        duplicateIds: text ? duplicateMap[text] : [q._id]
      };
    });

    // Sort logic
    if (showDuplicatesOnly) {
      // Group duplicates together by question text
      list.sort((a, b) => {
        const aText = a.question_text?.trim().toLowerCase() || '';
        const bText = b.question_text?.trim().toLowerCase() || '';
        
        // First sort by question text (to group duplicates)
        if (aText < bText) return -1;
        if (aText > bText) return 1;
        
        // Within the same question text, sort by creation date
        const aDate = new Date(a.created_at || a.updated_at || 0);
        const bDate = new Date(b.created_at || b.updated_at || 0);
        return aDate - bDate; // Older first
      });
    } else {
      // Normal sorting
      list.sort((a, b) => {
        let aVal, bVal;
        switch (sortBy) {
          case 'date':
            aVal = new Date(a.created_at || a.updated_at || 0);
            bVal = new Date(b.created_at || b.updated_at || 0);
            break;
          case 'update':
            aVal = new Date(a.updated_at || a.created_at || 0);
            bVal = new Date(b.updated_at || b.created_at || 0);
            break;
          default:
            return 0;
        }
        
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
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
    console.log('Opening delete modal for question:', q);
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

  const openMove = (q) => {
    setSelectedQuestion(q);
    setShowMoveModal(true);
    setShowDetailModal(false);
  };

  const openBulkMove = () => {
    if (selectedQuestions.length > 0) {
      setShowBulkMoveModal(true);
    }
  };

  const openBulkDeleteDuplicates = () => {
    if (showDuplicatesOnly && filteredQuestions.length > 0) {
      setShowBulkDeleteDuplicatesModal(true);
    }
  };

  const handleBulkDeleteDuplicatesConfirm = async () => {
    if (!showDuplicatesOnly || filteredQuestions.length === 0) return;

    try {
      // Group questions by their text to identify duplicates
      const duplicateGroups = {};
      filteredQuestions.forEach(q => {
        const text = q.question_text?.trim().toLowerCase();
        if (text) {
          if (!duplicateGroups[text]) duplicateGroups[text] = [];
          duplicateGroups[text].push(q);
        }
      });

      // For each duplicate group, keep only the oldest question (by creation date)
      const questionsToDelete = [];
      Object.values(duplicateGroups).forEach(group => {
        if (group.length > 1) {
          // Sort by creation date (oldest first), keep the first one, delete the rest
          const sortedGroup = group.sort((a, b) => 
            new Date(a.created_at || a.updated_at || 0) - new Date(b.created_at || b.updated_at || 0)
          );
          // Keep the oldest, delete the rest
          questionsToDelete.push(...sortedGroup.slice(1));
        }
      });

      if (questionsToDelete.length === 0) {
        alert('Không có câu hỏi trùng nào để xóa!');
        return;
      }

      // Delete all duplicate questions except the oldest in each group
      await Promise.all(questionsToDelete.map(q => MultipleChoiceService.deleteMultipleChoice(q._id)));
      
      // Update both state arrays immediately
      const deleteIds = questionsToDelete.map(q => q._id);
      setQuestions(prev => prev.filter(q => !deleteIds.includes(q._id)));
      setFilteredQuestions(prev => prev.filter(q => !deleteIds.includes(q._id)));
      
      setShowBulkDeleteDuplicatesModal(false);
      
      console.log(`Successfully deleted ${questionsToDelete.length} duplicate questions`);
      alert(`Đã xóa ${questionsToDelete.length} câu hỏi trùng lặp!`);
    } catch (err) {
      console.error('Error bulk deleting duplicates:', err);
      alert('Không thể xóa câu hỏi trùng lặp. Vui lòng thử lại!');
    }
  };

  const handleMoveConfirm = async (targetTestId) => {
    if (!selectedQuestion || !targetTestId) return;
    
    try {
      const response = await MultipleChoiceService.moveQuestion(selectedQuestion._id, targetTestId);
      
      // Update the question in both state arrays immediately
      setQuestions(prevQuestions => 
        prevQuestions.map(q => 
          q._id === selectedQuestion._id 
            ? { ...q, test_id: targetTestId }
            : q
        )
      );
      setFilteredQuestions(prevQuestions => 
        prevQuestions.map(q => 
          q._id === selectedQuestion._id 
            ? { ...q, test_id: targetTestId }
            : q
        )
      );
      
      setShowMoveModal(false);
      setSelectedQuestion(null);
      
      // Show success message
      console.log('Question moved successfully:', response);
    } catch (error) {
      console.error('Error moving question:', error);
      setError(error.message);
    }
  };

  const handleBulkMoveConfirm = async (targetTestId) => {
    if (selectedQuestions.length === 0 || !targetTestId) return;
    
    try {
      // Move all selected questions
      const movePromises = selectedQuestions.map(questionId => 
        MultipleChoiceService.moveQuestion(questionId, targetTestId)
      );
      
      await Promise.all(movePromises);
      
      // Update the questions in both state arrays immediately
      setQuestions(prevQuestions => 
        prevQuestions.map(q => 
          selectedQuestions.includes(q._id)
            ? { ...q, test_id: targetTestId }
            : q
        )
      );
      setFilteredQuestions(prevQuestions => 
        prevQuestions.map(q => 
          selectedQuestions.includes(q._id)
            ? { ...q, test_id: targetTestId }
            : q
        )
      );
      
      setShowBulkMoveModal(false);
      setSelectedQuestions([]);
      setSelectAll(false);
      
      console.log('Questions moved successfully');
    } catch (error) {
      console.error('Error moving questions:', error);
      setError(error.message);
    }
  };



  const handleDeleteConfirm = async () => {
    if (!selectedQuestion) {
      console.error('No question selected for deletion');
      return;
    }
    console.log('Deleting question:', selectedQuestion._id);
    
    // Check if user is still authenticated
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      return;
    }
    
    try {
      await MultipleChoiceService.deleteMultipleChoice(selectedQuestion._id);
      console.log('Question deleted successfully');
      
      // Remove deleted item from both state arrays immediately
      setQuestions((prev) => prev.filter((q) => q._id !== selectedQuestion._id));
      setFilteredQuestions((prev) => prev.filter((q) => q._id !== selectedQuestion._id));
      
      setShowDeleteModal(false);
      setSelectedQuestion(null);
    } catch (e) {
      console.error('Delete failed:', e);
      if (e.message.includes('401') || e.message.includes('403') || e.message.includes('Unauthorized') || e.message.includes('Forbidden')) {
        alert('Bạn không có quyền xóa câu hỏi này hoặc phiên đăng nhập đã hết hạn!');
      } else {
        alert("Không thể xóa câu hỏi. Vui lòng thử lại!");
      }
    }
  };

  const handleQuestionSaved = (response) => {
    console.log('handleQuestionSaved called:', { isEditMode, response, selectedQuestion });
    console.log('Response _id:', response?._id);
    console.log('Selected question _id:', selectedQuestion?._id);
    
    if (isEditMode) {
      console.log('Updating existing question');
      // Update existing question - ensure response has _id
      const updatedResponse = { ...response, _id: response._id || selectedQuestion._id };
      setQuestions((prev) => {
        const updated = prev.map((q) => {
          console.log('Comparing:', q._id, 'with', selectedQuestion._id, 'result:', q._id === selectedQuestion._id);
          return (q._id === selectedQuestion._id ? updatedResponse : q);
        });
        console.log('Updated questions:', updated);
        return updated;
      });
    } else {
      console.log('Adding new question');
      // Add new question
      setQuestions((prev) => [response, ...prev]);
    }
    setShowQuestionModal(false);
    setSelectedQuestion(null);
    setIsEditMode(false);
  };



  // (removed quick time filters; using only full-date range)

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
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-2 py-2 space-y-3">
        {/* Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Compact Filter Toolbar */}
          <div className="px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo câu hỏi..."
                  className="w-full px-2 py-1 border border-gray-200 rounded-md bg-white text-sm"
                />
              </div>

              <div className="flex items-center space-x-3">
                {selectedQuestions.length > 0 && (
                  <>
                    <button
                      onClick={openBulkMove}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>Chuyển ({selectedQuestions.length})</span>
                    </button>
                    <button
                      onClick={openBulkDelete}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Xóa ({selectedQuestions.length})</span>
                    </button>
                  </>
                )}
                {showDuplicatesOnly && (
                  <button
                    onClick={openBulkDeleteDuplicates}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Xóa trùng</span>
                  </button>
                )}
                <button
                  onClick={fetchQuestions}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Làm mới</span>
                </button>
                <button
                  onClick={openCreate}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white h-9 px-3 text-sm rounded-lg inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Thêm câu hỏi</span>
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={selectedMainTopic}
                onChange={(e) => setSelectedMainTopic(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="">Tất cả chủ đề chính</option>
                {mainTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>

              <select
                value={selectedSubTopic}
                onChange={(e) => setSelectedSubTopic(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="">Tất cả chủ đề phụ</option>
                {filteredSubTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>

              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="">Tất cả bài kiểm tra</option>
                {filteredTests.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.test_title}
                  </option>
                ))}
              </select>

              {/* date inputs removed */}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="date">Ngày tạo</option>
                <option value="update">Ngày cập nhật</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="asc">↑ Tăng</option>
                <option value="desc">↓ Giảm</option>
              </select>

              <label className="inline-flex items-center gap-2 px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={showDuplicatesOnly}
                  onChange={(e) => setShowDuplicatesOnly(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-700">Chỉ hiện câu trùng</span>
              </label>

              {/* removed time-based quick filters and date-type selector */}

              {(searchTerm || selectedTestId || selectedMainTopic || selectedSubTopic || showDuplicatesOnly) ? (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedTestId("");
                    setSelectedMainTopic("");
                    setSelectedSubTopic("");
                    setShowDuplicatesOnly(false);
                    // date state removed
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                >
                  Xóa lọc
                </button>
              ) : null}
            </div>

            {error && (
              <div className="mt-3">
                <ErrorMessage message={error} />
              </div>
            )}
          </div>
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
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Câu hỏi</th>
                  <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Đáp án đúng</th>
                  <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuestions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-xs text-gray-500">
                      {searchTerm ? "Không tìm thấy câu hỏi nào phù hợp" : "Chưa có câu hỏi nào"}
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map((q, idx) => {
                    const t = q.test_id ? tests[q.test_id] : null;
                    
                    // Get correct answer from new schema
                    const correctLabels = getCorrectAnswerLabels(q.correct_answers);
                    const correctLetter = correctLabels[0] || null;
                    const correctOption = correctLetter 
                      ? q.options?.find(opt => opt.label === correctLetter)
                      : null;

                    return (
                      <tr key={q._id} className={`hover:bg-gray-50 ${q.isDuplicate ? 'bg-yellow-50' : ''}`}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedQuestions.includes(q._id)}
                            onChange={(e) => handleSelectQuestion(q._id, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge tone="indigo">{idx + 1}</Badge>
                            {q.isDuplicate && (
                              <Badge tone="red" title={`Trùng với ${q.duplicateCount - 1} câu khác`}>
                                Trùng x{q.duplicateCount}
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <div className="text-xs text-gray-900 font-medium max-w-md truncate">
                            {q.question_text}
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          {getCorrectAnswerLabels(q.correct_answers).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {getCorrectAnswerLabels(q.correct_answers).map(letter => {
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
                            <span className="text-xs text-indigo-900/60">—</span>
                          )}
                        </td>

                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          <div className="flex flex-col space-y-1">
                            <button
                              onClick={() => openDetail(q)}
                              className="text-[10px] text-emerald-600 hover:text-emerald-900 text-left"
                              title="Xem chi tiết"
                            >
                              Chi tiết
                            </button>
                            <button
                              onClick={() => openEdit(q)}
                              className="text-[10px] text-blue-600 hover:text-blue-900 text-left"
                              title="Chỉnh sửa"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => openMove(q)}
                              className="text-[10px] text-orange-600 hover:text-orange-900 text-left"
                              title="Chuyển bài test"
                            >
                              Chuyển
                            </button>
                            <button
                              onClick={() => openDelete(q)}
                              className="text-[10px] text-red-600 hover:text-red-900 text-left"
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
        <AdminMCPQuestionModal
          isOpen={showQuestionModal}
          onClose={() => {
            setShowQuestionModal(false);
            setSelectedQuestion(null);
            setIsEditMode(false);
          }}
          testId={isEditMode ? selectedQuestion?.test_id : null}
          question={isEditMode ? selectedQuestion : null}
          onQuestionSaved={handleQuestionSaved}
          allTests={allTests}
        />

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
              <p className="text-black mb-6">Bạn có chắc chắn muốn xóa <span className="font-semibold">{selectedQuestions.length} câu hỏi</span> đã chọn?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBulkDeleteConfirm}
                  className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                >
                  Xóa {selectedQuestions.length} câu hỏi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
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
        <AdminMCPQuestionDetailModal
          isOpen={showDetailModal && !showQuestionModal}
          onClose={() => setShowDetailModal(false)}
          question={selectedQuestion}
          testInfo={selectedQuestion?.test_id ? tests[selectedQuestion.test_id] : null}
        />

        {/* Move Question Modal */}
        {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowMoveModal(false)} />
            <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-black">Chuyển câu hỏi</h4>
                  <p className="text-sm text-indigo-900/70">Chọn bài test đích</p>
                </div>
              </div>
              <p className="text-black mb-4">Chuyển câu hỏi sang bài test khác:</p>
              <select 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4"
                onChange={(e) => e.target.value && handleMoveConfirm(e.target.value)}
                defaultValue=""
              >
                <option value="">-- Chọn bài test --</option>
                {allTests
                  .filter(t => t._id !== selectedQuestion?.test_id && t.test_type === 'multiple_choice')
                  .map(t => (
                    <option key={t._id} value={t._id}>
                      {t.test_title}
                    </option>
                  ))
                }
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMoveModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Move Modal */}
        {showBulkMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowBulkMoveModal(false)} />
            <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-black">Chuyển nhiều câu hỏi</h4>
                  <p className="text-sm text-indigo-900/70">Chọn bài test đích</p>
                </div>
              </div>
              <p className="text-black mb-4">Chuyển <span className="font-semibold">{selectedQuestions.length} câu hỏi</span> sang bài test khác:</p>
              <select 
                className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4"
                onChange={(e) => e.target.value && handleBulkMoveConfirm(e.target.value)}
                defaultValue=""
              >
                <option value="">-- Chọn bài test --</option>
                {allTests
                  .filter(t => t.test_type === 'multiple_choice')
                  .map(t => (
                    <option key={t._id} value={t._id}>
                      {t.test_title}
                    </option>
                  ))
                }
              </select>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkMoveModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Duplicates Modal */}
        {showBulkDeleteDuplicatesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowBulkDeleteDuplicatesModal(false)} />
            <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-black">Xóa câu hỏi trùng lặp</h4>
                  <p className="text-sm text-indigo-900/70">Hành động này không thể hoàn tác</p>
                </div>
              </div>
              <p className="text-black mb-6">
                Bạn có chắc chắn muốn xóa tất cả câu hỏi trùng lặp, chỉ giữ lại câu hỏi cũ nhất trong mỗi nhóm trùng nhau?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteDuplicatesModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-900 hover:bg-indigo-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBulkDeleteDuplicatesConfirm}
                  className="flex-1 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                >
                  Xóa trùng lặp
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
