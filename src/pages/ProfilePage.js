import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProfileLayout from "../layout/ProfileLayout";
import ProfileTabs from "../components/ProfileTabs";
import ProfileUserInfoCard from "../components/ProfileUserInfoCard";
import StatisticsCards from "../components/ProfileStatisticsCards";
import ProfileTestResultsList from "../components/ProfileTestResultsList";
import ProfileTestList from "../components/ProfileTestsList";
import Toast from "../components/Toast";
import testResultService from "../services/testResultService";
import testService from "../services/testService";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("info");

  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resultToDelete, setResultToDelete] = useState(null);

  const [deleteTestLoading, setDeleteTestLoading] = useState(false);
  const [showDeleteTestConfirm, setShowDeleteTestConfirm] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);

  const [toast, setToast] = useState({ message: "", type: "success", isVisible: false });

  const [myTests, setMyTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState(null);

  const resultsCount = useMemo(() => results.length, [results]);
  const testsCount = useMemo(() => myTests.length, [myTests]);

  const fetchResults = useCallback(async () => {
    try {
      setResultsLoading(true);
      setResultsError(null);
      const data = await testResultService.getMyTestResults();
      const list = Array.isArray(data) ? data : [];
      setResults(list.filter((r) => r?.status === "active"));
    } catch (err) {
      console.error("Error fetching test results:", err);
      setResultsError("Không thể tải danh sách kết quả.");
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      setStatisticsLoading(true);
      const stats = await testResultService.getMyStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error("Error fetching statistics:", err);
    } finally {
      setStatisticsLoading(false);
    }
  }, []);

  const fetchMyTests = useCallback(async () => {
    try {
      setTestsLoading(true);
      setTestsError(null);

      const base = process.env.REACT_APP_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${base}/tests/my-tests`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch my tests");
      const data = await response.json();
      setMyTests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching my tests:", err);
      setTestsError("Không thể tải danh sách bài test của bạn.");
      setMyTests([]);
    } finally {
      setTestsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    if (activeTab === "results") {
      fetchResults();
      fetchStatistics();
    } else if (activeTab === "my-tests") {
      fetchMyTests();
    }
  }, [activeTab, fetchResults, fetchStatistics, fetchMyTests, user]);

  const showToast = (message, type = "success") => setToast({ message, type, isVisible: true });
  const hideToast = () => setToast((p) => ({ ...p, isVisible: false }));

  const handleViewDetail = (result) => {
    const resultId = result?._id || result?.id;
    const testType = result?.test_id?.test_type || result?.test_type;

    if (!resultId) return;

    let routeType = testType;
    if (!routeType) {
      if (result?.answers?.some?.((a) => a?.word)) routeType = "vocabulary";
      else routeType = "multiple_choice";
    }

    if (routeType === "vocabulary") navigate(`/vocabulary/result/${resultId}/review`);
    else navigate(`/multiple-choice/result/${resultId}/review`);
  };

  const handleRetakeTest = (result) => {
    const testType = result?.test_id?.test_type;
    const testId = result?.test_id?._id || result?.test_id?.id || result?.test_id;

    if (!testId) return showToast("Không thể tìm thấy thông tin bài test để làm lại.", "error");

    if (testType === "vocabulary") navigate(`/vocabulary/test/${testId}/settings`);
    else if (testType === "multiple_choice") navigate(`/multiple-choice/test/${testId}/settings`);
    else showToast("Loại bài test không được hỗ trợ.", "error");
  };

  const handleTakeTest = (test) => {
    const testId = test?._id || test?.id;
    if (!testId) return showToast("Không thể tìm thấy ID bài test.", "error");

    if (test?.test_type === "vocabulary") navigate(`/vocabulary/test/${testId}/settings`);
    else if (test?.test_type === "multiple_choice") navigate(`/multiple-choice/test/${testId}/settings`);
    else showToast("Loại bài test không được hỗ trợ.", "error");
  };

  const handleEditTest = () => showToast("Tính năng chỉnh sửa đang phát triển", "warning");

  const handleDeleteTest = async (test) => {
    setTestToDelete(test);
    setShowDeleteTestConfirm(true);
  };

  const confirmDeleteTest = async () => {
    if (!testToDelete) return;
    try {
      setDeleteTestLoading(true);
      await testService.softDeleteTest(testToDelete._id);
      setMyTests((prev) => prev.filter((t) => t._id !== testToDelete._id));
      showToast("Đã xóa bài test thành công", "success");
      setShowDeleteTestConfirm(false);
      setTestToDelete(null);
    } catch (err) {
      console.error("Error deleting test:", err);
      showToast("Không thể xóa bài test. Vui lòng thử lại.", "error");
    } finally {
      setDeleteTestLoading(false);
    }
  };

  const handleDeleteResult = async (result) => {
    setResultToDelete(result);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteResult = async () => {
    if (!resultToDelete) return;
    try {
      setDeleteLoading(true);
      await testResultService.softDeleteTestResult(resultToDelete._id);
      setResults((prev) => prev.filter((r) => r._id !== resultToDelete._id));
      showToast("Đã xóa kết quả bài test thành công", "success");
      setShowDeleteConfirm(false);
      setResultToDelete(null);
    } catch (err) {
      console.error("Error deleting test result:", err);
      showToast("Không thể xóa kết quả bài test. Vui lòng thử lại.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "info":
        return <ProfileUserInfoCard user={user} />;
      case "results":
        return (
          <div className="space-y-3">
            <StatisticsCards statistics={statistics} loading={statisticsLoading} />
            <ProfileTestResultsList
              results={results}
              loading={resultsLoading}
              error={resultsError}
              onRetry={fetchResults}
              onViewDetail={handleViewDetail}
              onRetakeTest={handleRetakeTest}
              onDelete={handleDeleteResult}
            />
          </div>
        );
      case "my-tests":
        return (
          <ProfileTestList
            tests={myTests}
            loading={testsLoading}
            error={testsError}
            onRetry={fetchMyTests}
            onTakeTest={handleTakeTest}
            onEditTest={handleEditTest}
            onDeleteTest={handleDeleteTest}
          />
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
          <div className="text-center">
            <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">Chưa đăng nhập</h2>
            <p className="text-zinc-600 mb-6">Vui lòng đăng nhập để xem thông tin hồ sơ.</p>
            <button
              onClick={() => navigate("/login")}
              className="w-full px-5 py-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProfileLayout>
      <div className="max-w-7xl mx-auto">
        {/* GRID chuẩn: sidebar + main */}
        <div className="grid grid-cols-1 xl:grid-cols-[20rem,1fr] gap-6 items-start">
          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 text-center">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full ring-4 ring-violet-100 mx-auto mb-4"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  {(user?.full_name || user?.username || "U").charAt(0).toUpperCase()}
                </div>
              )}

              <h3 className="text-lg font-semibold text-zinc-800 mb-1">
                {user?.full_name || user?.username}
              </h3>
              <p className="text-sm text-zinc-500 break-all">{user?.email}</p>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-zinc-800 mb-4">Điều hướng</h3>
              <ProfileTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                resultsCount={resultsCount}
                testsCount={testsCount}
              />
            </div>
          </aside>

          {/* Main */}
          <section className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 min-h-[420px]">
            {renderTabContent()}
          </section>
        </div>
      </div>

      {/* Delete Result Modal */}
      {showDeleteConfirm && resultToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-zinc-200">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-zinc-900">Xác nhận xóa</h3>
                  <p className="text-sm text-zinc-600">Thao tác này không thể hoàn tác</p>
                </div>
              </div>

              <p className="text-sm text-zinc-700 mb-5">
                Bạn có chắc chắn muốn xóa kết quả bài test{" "}
                <strong>{resultToDelete.test_id?.test_title || "Bài test"}</strong> không?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setResultToDelete(null);
                  }}
                  disabled={deleteLoading}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDeleteResult}
                  disabled={deleteLoading}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? "Đang xóa..." : "Xóa ngay"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Test Modal */}
      {showDeleteTestConfirm && testToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-zinc-200">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-zinc-900">Xác nhận xóa bài test</h3>
                  <p className="text-sm text-zinc-600">Thao tác này không thể hoàn tác</p>
                </div>
              </div>

              <p className="text-sm text-zinc-700 mb-5">
                Bạn có chắc chắn muốn xóa bài test{" "}
                <strong>{testToDelete.test_title || "Bài test"}</strong> không?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteTestConfirm(false);
                    setTestToDelete(null);
                  }}
                  disabled={deleteTestLoading}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDeleteTest}
                  disabled={deleteTestLoading}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteTestLoading ? "Đang xóa..." : "Xóa ngay"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </ProfileLayout>
  );
};

export default ProfilePage;
