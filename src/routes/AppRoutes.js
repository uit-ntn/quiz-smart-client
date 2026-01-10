import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import OTPVerificationPage from '../pages/OTPVerificationPage';
import AuthCallbackPage from '../pages/AuthCallbackPage';
import ProtectedRoute from '../components/ProtectedRoute';
import ProfileInfoPage from '../pages/ProfileInfoPage';
import ProfileResultsPage from '../pages/ProfileResultsPage';
import ProfileTestsPage from '../pages/ProfileTestsPage';
import HelpPage from '../pages/HelpPage';
import TopicListPage from '../pages/TopicListPage';
import MultipleChoiceTestSettings from '../pages/MultipleChoiceTestSettings';
import MultipleChoiceTestTake from '../pages/MultipleChoiceTestTake';
import MultipleChoiceTestReview from '../pages/MultipleChoiceTestReview';
import TestListPage from '../pages/TestListPage';
import VocabularyTestSettings from '../pages/VocabularyTestSettings';
import VocabularyTestTake from '../pages/VocabularyTestTake';
import ProfileTestReview from '../pages/ProfileTestReview';
import VocabularyTestResult from '../pages/VocabularyTestResult';
import AdminDashboard from '../pages/AdminDashboard';
import AdminUsers from '../pages/AdminUsers';
import AdminTopics from '../pages/AdminTopics';
import AdminTestResults from '../pages/AdminTestResults';
import AdminVocabularies from '../pages/AdminVocabularies';
import AdminMultipleChoices from '../pages/AdminMultipleChoices';
import AdminVocabularyTests from '../pages/AdminVocabularyTests';
import AdminMultipleChoiceTests from '../pages/AdminMultipleChoiceTests';
import AdminGrammarTests from '../pages/AdminGrammarTests';
import AdminReviews from '../pages/AdminReviews';


const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/help" element={<HelpPage />} />
      
      {/* Authentication Routes */}
      <Route path="/login" element={
        <ProtectedRoute requireAuth={false}>
          <LoginPage />
        </ProtectedRoute>
      } />
      <Route path="/register" element={
        <ProtectedRoute requireAuth={false}>
          <RegisterPage />
        </ProtectedRoute>
      } />
      <Route path="/forgot-password" element={
        <ProtectedRoute requireAuth={false}>
          <ForgotPasswordPage />
        </ProtectedRoute>
      } />
      <Route path="/verify-otp" element={
        <ProtectedRoute requireAuth={false}>
          <OTPVerificationPage />
        </ProtectedRoute>
      } />
      <Route path="/auth/success" element={<AuthCallbackPage />} />
      <Route path="/auth/failure" element={<AuthCallbackPage />} />
      
      {/* Protected Routes */}
      <Route path="/profile/info" element={
        <ProtectedRoute>
          <ProfileInfoPage />
        </ProtectedRoute>
      } />
      <Route path="/profile/results" element={
        <ProtectedRoute>
          <ProfileResultsPage />
        </ProtectedRoute>
      } />
      <Route path="/profile/tests" element={
        <ProtectedRoute>
          <ProfileTestsPage />
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminUsers />
        </ProtectedRoute>
      } />
      <Route path="/admin/test-results" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminTestResults />
        </ProtectedRoute>
      } />
      <Route path="/admin/vocabularies" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminVocabularies />
        </ProtectedRoute>
      } />
      <Route path="/admin/multiple-choices" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminMultipleChoices />
        </ProtectedRoute>
      } />
      <Route path="/admin/topics" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminTopics />
        </ProtectedRoute>
      } />
      <Route path="/admin/vocabulary-tests" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminVocabularyTests />
        </ProtectedRoute>
      } />
      <Route path="/admin/multiple-choice-tests" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminMultipleChoiceTests />
        </ProtectedRoute>
      } />
      <Route path="/admin/grammar-tests" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminGrammarTests />
        </ProtectedRoute>
      } />
      <Route path="/admin/reviews" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminReviews />
        </ProtectedRoute>
      } />
      
      {/* Unified Topics Route */}
      <Route path="/topics" element={<TopicListPage />} />
      
      {/* Unified Test List Route */}
      <Route path="/test/:mainTopic/:subTopic" element={<TestListPage />} />
      
      {/* Multiple Choice Routes */}
      <Route path="/multiple-choice/test/:testId/settings" element={
        <ProtectedRoute>
          <MultipleChoiceTestSettings />
        </ProtectedRoute>
      } />
      <Route path="/multiple-choice/test/:testId/take" element={
        <ProtectedRoute>
          <MultipleChoiceTestTake />
        </ProtectedRoute>
      } />
      <Route path="/multiple-choice/test/:testId/review" element={
        <ProtectedRoute>
          <MultipleChoiceTestReview />
        </ProtectedRoute>
      } />
      <Route path="/multiple-choice/result/:resultId/review" element={
        <ProtectedRoute>
          <ProfileTestReview />
        </ProtectedRoute>
      } />
      
      {/* Vocabulary Routes */}
      <Route path="/vocabulary/test/:testId/settings" element={
        <ProtectedRoute>
          <VocabularyTestSettings />
        </ProtectedRoute>
      } />
      <Route path="/vocabulary/test/:testId/take" element={
        <ProtectedRoute>
          <VocabularyTestTake />
        </ProtectedRoute>
      } />
      <Route path="/vocabulary/test/:testId/result" element={
        <ProtectedRoute>
          <VocabularyTestResult />
        </ProtectedRoute>
      } />
      <Route path="/vocabulary/result/:resultId/review" element={
        <ProtectedRoute>
          <ProfileTestReview />
        </ProtectedRoute>
      } />
    
      
      {/* Future routes */}
      <Route path="/settings" element={<div className="container py-5 text-center"><h2>Cài đặt (Đang phát triển)</h2></div>} />
      <Route path="/privacy" element={<div className="container py-5 text-center"><h2>Chính sách bảo mật (Đang phát triển)</h2></div>} />
      <Route path="/terms" element={<div className="container py-5 text-center"><h2>Điều khoản sử dụng (Đang phát triển)</h2></div>} />
      {/* 404 Page */}
      <Route path="*" element={
        <div className="container py-5 text-center">
          <i className="bi bi-exclamation-triangle display-1 text-warning"></i>
          <h2 className="mt-3">Trang không tìm thấy</h2>
          <p className="text-muted">Trang bạn đang tìm kiếm không tồn tại.</p>
          <a href="/" className="btn btn-primary">Về trang chủ</a>
        </div>
      } />
    </Routes>
  );
};

export default AppRoutes;