import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import AdminLayout from "../layout/AdminLayout";
import testResultService from "../services/testResultService";
import userService from "../services/userService";
import { getCorrectAnswerLabels, isCorrectAnswer } from "../utils/correctAnswerHelpers";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

// ---------- helpers ----------
const safeLower = (v) => (typeof v === "string" ? v.toLowerCase() : "");
const safeStr = (v) => (v == null ? "" : String(v));

const msToMMSS = (ms) => {
  if (!ms || ms <= 0) return "N/A";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const fmtDateVI = (d) => {
  if (!d) return "N/A";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleDateString("vi-VN");
};

const getTestTitle = (r) => r?.test_snapshot?.test_title || "Unknown Test";

const getTestType = (r) => r?.test_snapshot?.test_type || "N/A";

const getTopicText = (r) => {
  const main = r?.test_snapshot?.main_topic || "";
  const sub = r?.test_snapshot?.sub_topic || "";
  if (!main && !sub) return "";
  if (main && sub) return `${main} · ${sub}`;
  return main || sub;
};

const getDifficulty = (r) => r?.test_snapshot?.difficulty || "medium";

const extractUserObject = (r) => {
  // Common places backend might embed user info
  return (
    r?.user_snapshot ||
    r?.user ||
    r?.user_id ||
    r?.createdBy ||
    r?.created_by ||
    r?.owner ||
    null
  );
};

const getUserName = (r, userCache = {}) => {
  const u = extractUserObject(r);
  // try embedded user first
  const name = u?.full_name || u?.fullName || u?.name || u?.displayName || u?.username;
  if (name) return name;

  // try cached user by ID
  const userId = r?.user_id || r?.userId || (typeof r?.createdBy === 'string' ? r.createdBy : r?.createdBy?._id);
  const cachedUser = userId ? userCache[userId] : null;
  if (cachedUser?.full_name) return cachedUser.full_name;

  // fallback: try email local-part
  const email = u?.email || r?.email || r?.user_email || cachedUser?.email || "";
  if (email) return email.split("@")[0];

  return "Unknown User";
};

const getUserEmail = (r, userCache = {}) => {
  const u = extractUserObject(r);
  if (u?.email) return u.email;
  
  // try cached user by ID
  const userId = r?.user_id || r?.userId || (typeof r?.createdBy === 'string' ? r.createdBy : r?.createdBy?._id);
  const cachedUser = userId ? userCache[userId] : null;
  
  return r?.email || r?.user_email || cachedUser?.email || "";
};

const getUserId = (r) => {
  const u = extractUserObject(r);
  // if user object contains id fields
  return u?._id || u?.id || r?.user_id || r?.userId || "";
};

const getUserAvatar = (r) => {
  const u = extractUserObject(r);
  return u?.avatar_url || u?.avatar || u?.photo || null;
};

const getUserRole = (r) => {
  const u = extractUserObject(r);
  return u?.role || u?.user_role || "user";
};

const getPercentage = (r) => {
  // BE mới: percentage
  if (typeof r?.percentage === "number") return r.percentage;
  // fallback (nếu BE trả score)
  if (typeof r?.score === "number") return r.score;
  return 0;
};

const getCorrectCount = (r) => {
  if (typeof r?.correct_count === "number") return r.correct_count;
  if (typeof r?.correct_answers === "number") return r.correct_answers;
  return 0;
};

const getTotalQuestions = (r) => {
  if (typeof r?.total_questions === "number") return r.total_questions;
  return 0;
};

const getDurationMs = (r) => {
  if (typeof r?.duration_ms === "number") return r.duration_ms;
  // fallback nếu BE cũ trả time_taken (giây)
  if (typeof r?.time_taken === "number") return r.time_taken * 1000;
  return 0;
};

const getCreatedAt = (r) => r?.createdAt || r?.created_at || r?.end_time || r?.endTime || null;

const normalizeAnswerValue = (answer, field = 'user_answer') => {
  let v;

  // Multiple choice uses arrays, others use strings
  if (answer?.question_collection === 'multiple_choices') {
    v = field === 'user_answer' ? answer?.user_answers : getCorrectAnswerLabels(answer?.correct_answers);
  } else {
    v = field === 'user_answer' ? answer?.user_answer : answer?.correct_answer;
  }

  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "Không trả lời";
  if (v == null || v === "") return "Không trả lời";
  return String(v);
};

const getQuestionText = (answer) => {
  if (answer?.question_collection === 'vocabularies') {
    // For vocabulary, show word or meaning based on question_mode
    if (answer?.question_mode === 'word_to_meaning') {
      return `Nghĩa của "${answer?.word}"`;
    } else if (answer?.question_mode === 'meaning_to_word') {
      return `Từ có nghĩa "${answer?.meaning}"`;
    }
    return answer?.word || "Vocabulary Question";
  }
  return answer?.question_text || "Question";
};

const AdminTestResults = () => {
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTestId, setFilterTestId] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterScoreMax, setFilterScoreMax] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [resultToDelete, setResultToDelete] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [userCache, setUserCache] = useState({});
  const [allUsers, setAllUsers] = useState([]);

  // bulk selection / delete
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { user } = useAuth(); // (không bắt buộc dùng)

  useEffect(() => {
    fetchResults();
    fetchAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, searchTerm, filterStatus, filterTestId, filterUserId, filterScoreMax]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterTestId, filterUserId, filterScoreMax, itemsPerPage]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await testResultService.getAllTestResults(); // ✅ service mới

      // Debug logging to understand data structure
      if (data && data.length > 0) {
        console.log("Sample test result:", data[0]);
        console.log("User data structure:", {
          user_id: data[0]?.user_id,
          user: data[0]?.user,
          createdBy: data[0]?.createdBy
        });
      }

      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching test results:", err);
      setError("Không thể tải danh sách kết quả");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      console.log('Fetched users:', data);
      setAllUsers(Array.isArray(data) ? data : []);
      
      // Build cache by ID
      const cache = {};
      (Array.isArray(data) ? data : []).forEach(u => {
        if (u._id) cache[u._id] = u;
      });
      setUserCache(cache);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };



  const filterResults = () => {
    let filtered = [...results];

    // search
    if (searchTerm.trim()) {
      const term = safeLower(searchTerm.trim());
      filtered = filtered.filter((r) => {
        const testTitle = safeLower(getTestTitle(r));
        const userName = safeLower(getUserName(r));
        const email = safeLower(getUserEmail(r));
        const topic = safeLower(getTopicText(r));
        return (
          testTitle.includes(term) ||
          userName.includes(term) ||
          email.includes(term) ||
          topic.includes(term)
        );
      });
    }

    // status
    if (filterStatus !== "all") {
      filtered = filtered.filter((r) => (r?.status || "") === filterStatus);
    }

    // test filter
    if (filterTestId) {
      filtered = filtered.filter((r) => (r?.test_snapshot?._id || r?.test_id) === filterTestId);
    }

    // user filter
    if (filterUserId) {
      filtered = filtered.filter((r) => getUserId(r) === filterUserId);
    }

    // score max filter
    if (filterScoreMax !== "") {
      const maxScore = parseFloat(filterScoreMax);
      if (!isNaN(maxScore)) {
        filtered = filtered.filter((r) => getPercentage(r) <= maxScore);
      }
    }

    setFilteredResults(filtered);
  };

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((filteredResults.length || 0) / itemsPerPage));
  }, [filteredResults.length, itemsPerPage]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredResults.slice(start, end);
  }, [filteredResults, currentPage, itemsPerPage]);

  const handleDeleteClick = (result) => {
    setResultToDelete(result);
    setShowDeleteModal(true);
  };

  const toggleSelectId = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAllOnPage = (checked) => {
    if (checked) {
      const ids = paginatedResults.map((r) => r._id).filter(Boolean);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      const idsOnPage = new Set(paginatedResults.map((r) => r._id));
      setSelectedIds((prev) => prev.filter((id) => !idsOnPage.has(id)));
    }
  };

  const handleDetailClick = async (result) => {
    try {
      // nếu bạn muốn detail luôn "fresh"
      const fresh = await testResultService.getTestResultById(result._id);
      setSelectedResult(fresh);
    } catch (e) {
      // fallback nếu call fail vẫn mở modal với data đang có
      setSelectedResult(result);
    } finally {
      setShowDetailModal(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!resultToDelete?._id) return;

    try {
      await testResultService.hardDeleteTestResult(resultToDelete._id); // Hard delete for admin
      setResults((prev) => prev.filter((r) => r._id !== resultToDelete._id));
      setShowDeleteModal(false);
      setResultToDelete(null);
    } catch (err) {
      console.error("Error deleting result:", err);
      alert("Không thể xóa kết quả. Vui lòng thử lại!");
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedResult?._id) return;

    try {
      setLoading(true);
      setError(null);

      // ✅ service mới: updateStatusById
      await testResultService.updateStatusById(selectedResult._id, newStatus);

      const refreshed = await testResultService.getTestResultById(selectedResult._id);
      setSelectedResult(refreshed);

      await fetchResults();
      alert("Cập nhật trạng thái thành công");
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Không thể cập nhật trạng thái.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!selectedIds || selectedIds.length === 0) return;

    try {
      setLoading(true);
      await Promise.all(selectedIds.map((id) => testResultService.hardDeleteTestResult(id))); // Hard delete for admin
      setResults((prev) => prev.filter((r) => !selectedIds.includes(r._id)));
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
    } catch (err) {
      console.error("Error bulk deleting results:", err);
      alert("Không thể xóa một vài kết quả. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const StatusBadge = ({ status }) => {
    const s = status || "draft";
    const cls =
      s === "active"
        ? "bg-green-100 text-green-800"
        : s === "archived"
          ? "bg-yellow-100 text-yellow-800"
          : s === "deleted"
            ? "bg-red-100 text-red-800"
            : "bg-gray-100 text-gray-800";

    const label =
      s === "active"
        ? "Hoàn thành"
        : s === "archived"
          ? "Lưu trữ"
          : s === "deleted"
            ? "Đã xóa"
            : "Nháp";

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        {label}
      </span>
    );
  };

  const DetailModal = () => {
    const pct = getPercentage(selectedResult);
    const correct = getCorrectCount(selectedResult);
    const totalQ = getTotalQuestions(selectedResult);
    const duration = msToMMSS(getDurationMs(selectedResult));
    const testTitle = getTestTitle(selectedResult);
    const testType = getTestType(selectedResult);
    const userName = getUserName(selectedResult, userCache);
    const email = getUserEmail(selectedResult, userCache);

    const testTypeLabel =
      testType === "vocabulary"
        ? "Từ vựng"
        : testType === "multiple_choice"
          ? "Trắc nghiệm"
          : testType;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">Chi tiết kết quả test</h3>
            <button
              onClick={() => setShowDetailModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User & Test Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Thông tin User</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {getUserAvatar(selectedResult) ? (
                      <img
                        src={getUserAvatar(selectedResult)}
                        alt={userName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ display: getUserAvatar(selectedResult) ? 'none' : 'flex' }}
                    >
                      {(() => {
                        if (userName && userName !== "Unknown User") {
                          return userName.charAt(0).toUpperCase();
                        }
                        if (email) {
                          return email.charAt(0).toUpperCase();
                        }
                        const userId = getUserId(selectedResult);
                        if (userId) {
                          return userId.slice(-2).toUpperCase();
                        }
                        return "?";
                      })()
                      }                 </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {userName}
                      {getUserRole(selectedResult) === 'admin' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Admin
                        </span>
                      )}
                      {userName === "Unknown User" && (
                        <span className="text-xs text-gray-500 ml-1">(ID: {getUserId(selectedResult)})</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">
                      {email || "No email"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Thông tin Test</h4>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Tên test:</span>{" "}
                  <span className="text-gray-900">{testTitle}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Loại:</span>{" "}
                  <span className="text-gray-900">{testTypeLabel || "N/A"}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-gray-700">Độ khó:</span>{" "}
                  <span className="text-gray-900 capitalize">{getDifficulty(selectedResult)}</span>
                </p>
                {getTopicText(selectedResult) && (
                  <p className="text-sm">
                    <span className="font-medium text-gray-700">Chủ đề:</span>{" "}
                    <span className="text-gray-900">{getTopicText(selectedResult)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status control */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="text-sm">
              <span className="font-medium text-gray-700">Trạng thái:</span>{" "}
              <StatusBadge status={selectedResult?.status} />
            </div>

            {/* admin đổi status */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => handleUpdateStatus("draft")}
                className="px-3 py-2 text-xs font-semibold rounded border border-gray-300 hover:bg-gray-50"
              >
                Đặt nháp
              </button>
              <button
                onClick={() => handleUpdateStatus("active")}
                className="px-3 py-2 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700"
              >
                Đặt hoàn thành
              </button>
              <button
                onClick={() => handleUpdateStatus("archived")}
                className="px-3 py-2 text-xs font-semibold rounded bg-amber-600 text-white hover:bg-amber-700"
              >
                Lưu trữ
              </button>
            </div>
          </div>

          {/* Score Summary */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Điểm</p>
                <p className={`text-3xl font-bold ${getScoreColor(pct)}`}>{pct}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Đúng</p>
                <p className="text-3xl font-bold text-green-600">{correct}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Tổng</p>
                <p className="text-3xl font-bold text-gray-900">{totalQ}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Thời gian</p>
                <p className="text-3xl font-bold text-blue-600">{duration}</p>
              </div>
            </div>
          </div>

          {/* Answers Details */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Chi tiết câu trả lời</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedResult?.answers && selectedResult.answers.length > 0 ? (
                selectedResult.answers.map((answer, index) => {
                  const ok = !!answer?.is_correct;
                  const qText = getQuestionText(answer);
                  const userAns = normalizeAnswerValue(answer, 'user_answer');
                  const correctAns = normalizeAnswerValue(answer, 'correct_answer');
                  const isMultipleChoice = answer?.question_collection === 'multiple_choices';
                  const isVocabulary = answer?.question_collection === 'vocabularies';

                  return (
                    <div
                      key={index}
                      className={`border-2 rounded-lg p-4 ${ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span
                            className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${ok ? "bg-green-500 text-white" : "bg-red-500 text-white"
                              }`}
                          >
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{qText}</p>
                            {isVocabulary && (
                              <div className="mt-1 text-xs text-gray-600">
                                <span className="font-medium">Từ:</span> {answer?.word} •
                                <span className="font-medium">Nghĩa:</span> {answer?.meaning}
                                {answer?.example_sentence && (
                                  <div className="mt-1 italic">VD: {answer.example_sentence}</div>
                                )}
                              </div>
                            )}
                            {isMultipleChoice && answer?.options && (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {answer.options.map((opt) => {
                                  const isCorrect = isCorrectAnswer(answer.correct_answers, opt.label);
                                  const isUserChoice = answer.user_answers?.includes(opt.label);
                                  return (
                                    <div
                                      key={opt.label}
                                      className={`text-xs p-2 rounded border ${isCorrect
                                          ? "border-green-300 bg-green-100"
                                          : isUserChoice
                                            ? "border-red-300 bg-red-100"
                                            : "border-gray-200 bg-gray-50"
                                        }`}
                                    >
                                      <span className="font-bold">{opt.label}:</span> {opt.text}
                                      {isCorrect && <span className="text-green-600 ml-1">✓</span>}
                                      {isUserChoice && !isCorrect && <span className="text-red-600 ml-1">✗</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {ok ? (
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="ml-11 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium text-gray-700">Trả lời:</span>{" "}
                          <span className={ok ? "text-green-600 font-medium" : "text-red-600"}>{userAns}</span>
                        </p>
                        {!ok && correctAns && correctAns !== "Không trả lời" && (
                          <p className="text-sm">
                            <span className="font-medium text-gray-700">Đáp án đúng:</span>{" "}
                            <span className="text-green-600 font-medium">{correctAns}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500 py-8">Không có chi tiết câu trả lời</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowDetailModal(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DeleteModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Xác nhận xóa vĩnh viễn</h3>
            <p className="text-sm text-red-600 font-medium">⚠️ Hành động này sẽ xóa vĩnh viễn và không thể hoàn tác</p>
          </div>
        </div>
        <p className="text-gray-700 mb-6">Bạn có chắc chắn muốn xóa vĩnh viễn kết quả test này? Dữ liệu sẽ bị xóa hoàn toàn khỏi hệ thống.</p>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );

  const BulkDeleteModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Xác nhận xóa vĩnh viễn nhiều</h3>
            <p className="text-sm text-red-600 font-medium">⚠️ Hành động này sẽ xóa vĩnh viễn <strong>{selectedIds.length}</strong> kết quả đã chọn. Không thể hoàn tác.</p>
          </div>
        </div>
        <div className="text-gray-700 mb-6">Bạn có chắc chắn muốn xóa vĩnh viễn tất cả các kết quả đã chọn? Dữ liệu sẽ bị xóa hoàn toàn khỏi hệ thống.</div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkDeleteModal(false)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleBulkDeleteConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Xóa ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
        <LoadingSpinner message="Đang tải danh sách kết quả..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {error && <ErrorMessage message={error} />}

        {/* Compact header with total count */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Search bar with buttons */}
          <div className="px-4 py-3 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên test / chủ đề / user..."
                  className="w-full px-2 py-1 border border-gray-200 rounded-md bg-white text-sm"
                />
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchResults}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="hidden sm:inline">Làm mới</span>
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(true)}
                  disabled={selectedIds.length === 0}
                  className="bg-red-600 hover:bg-red-700 text-white h-9 px-3 text-sm rounded-lg inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 11v6m4-6v6M9 7h6" />
                  </svg>
                  <span>Xóa chọn ({selectedIds.length})</span>
                </button>
              </div>
            </div>

            {/* Filters row below search */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={filterTestId}
                onChange={(e) => setFilterTestId(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="">Tất cả Bài Test</option>
                {Array.from(new Set(results.map(r => ({ 
                  id: r?.test_snapshot?._id || r?.test_id, 
                  title: getTestTitle(r) 
                })).filter(t => t.id).map(t => JSON.stringify(t)))).map(testStr => {
                  const test = JSON.parse(testStr);
                  return (
                    <option key={test.id} value={test.id}>
                      {test.title}
                    </option>
                  );
                })}
              </select>

              <select
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="">Tất cả User</option>
                {allUsers.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.full_name || user.email || user._id}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
              >
                <option value="all">Tất cả Trạng thái</option>
                <option value="draft">Nháp</option>
                <option value="active">Hoàn thành</option>
                <option value="archived">Lưu trữ</option>
                <option value="deleted">Đã xóa</option>
              </select>

              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-600">Điểm ≤</label>
                <input
                  type="number"
                  value={filterScoreMax}
                  onChange={(e) => setFilterScoreMax(e.target.value)}
                  placeholder="100"
                  min="0"
                  max="100"
                  className="w-16 px-2 py-1 border border-gray-200 rounded-md text-sm bg-white"
                />
              </div>

              {(searchTerm || filterStatus !== "all" || filterTestId || filterUserId || filterScoreMax) && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("all");
                    setFilterTestId("");
                    setFilterUserId("");
                    setFilterScoreMax("");
                  }}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Xóa lọc
                </button>
              )}
            </div>

            <div className="mt-2 text-sm text-gray-600">
              Tổng số: {filteredResults.length} kết quả
              {(searchTerm || filterStatus !== "all" || filterTestId || filterUserId || filterScoreMax) && (
                <span className="ml-2 text-xs">
                  (Đã lọc: {searchTerm && `từ khóa "${searchTerm}"`}
                  {filterStatus !== "all" && `, trạng thái "${filterStatus}"`}
                  {filterTestId && ", có test cụ thể"}
                  {filterUserId && ", có user cụ thể"}
                  {filterScoreMax && `, điểm ≤ ${filterScoreMax}%`})
                </span>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        onChange={(e) => handleSelectAllOnPage(e.target.checked)}
                        checked={paginatedResults.length > 0 && paginatedResults.every((r) => selectedIds.includes(r._id))}
                      />
                    </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Điểm
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày làm
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      {searchTerm || filterStatus !== "all" || filterTestId || filterUserId || filterScoreMax
                        ? "Không tìm thấy kết quả nào phù hợp với bộ lọc"
                        : "Chưa có kết quả nào"}
                    </td>
                  </tr>
                ) : (
                  paginatedResults.map((result) => {
                    const pct = getPercentage(result);
                    const correct = getCorrectCount(result);
                    const totalQ = getTotalQuestions(result);

                    return (
                      <tr key={result._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(result._id)}
                                onChange={() => toggleSelectId(result._id)}
                              />
                            </td>
                            {/* USER */}
                            <td className="px-4 py-2">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {(() => {
                                const name = getUserName(result, userCache);
                                const email = getUserEmail(result, userCache);
                                const userId = getUserId(result);

                                if (name && name !== "Unknown User") {
                                  return name.charAt(0).toUpperCase();
                                }
                                if (email) {
                                  return email.charAt(0).toUpperCase();
                                }
                                if (userId) {
                                  return userId.slice(-2).toUpperCase();
                                }
                                return "?";
                              })()}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {getUserName(result, userCache)}
                                {getUserRole(result) === 'admin' && (
                                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    Admin
                                  </span>
                                )}
                                {getUserName(result, userCache) === "Unknown User" && (
                                  <span className="text-xs text-gray-500 ml-1">(ID: {getUserId(result)})</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">{getUserEmail(result, userCache) || "No email"}</div>
                            </div>
                          </div>
                        </td>

                        {/* TEST */}
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium text-gray-900">{getTestTitle(result)}</div>
                          <div className="text-xs text-gray-500">
                            {getTestType(result) === "vocabulary"
                              ? "Từ vựng"
                              : getTestType(result) === "multiple_choice"
                                ? "Trắc nghiệm"
                                : getTestType(result)}
                            {getTopicText(result) ? ` · ${getTopicText(result)}` : ""}
                          </div>
                        </td>

                        {/* SCORE */}
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className={`text-2xl font-bold ${getScoreColor(pct)}`}>{pct}%</div>
                          <div className="text-xs text-gray-500">
                            {correct}/{totalQ}
                          </div>
                        </td>

                        {/* TIME */}
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {msToMMSS(getDurationMs(result))}
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-2 whitespace-nowrap">
                          <StatusBadge status={result.status} />
                        </td>

                        {/* DATE */}
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {fmtDateVI(getCreatedAt(result))}
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleDetailClick(result)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Xem chi tiết"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>

                            <button
                              onClick={() => handleDeleteClick(result)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Hiển thị{" "}
            {filteredResults.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{" "}
            {Math.min(currentPage * itemsPerPage, filteredResults.length)} trong{" "}
            {filteredResults.length} kết quả
          </div>

          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(parseInt(e.target.value, 10))}
              className="px-2 py-1 border border-gray-300 rounded"
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

      {/* Detail Modal */}
      {showDetailModal && selectedResult && <DetailModal />}

      {/* Delete Modal */}
      {showDeleteModal && <DeleteModal />}
      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && <BulkDeleteModal />}
    </AdminLayout>
  );
};

export default AdminTestResults;
