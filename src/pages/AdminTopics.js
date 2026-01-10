import React, { useState, useEffect } from "react";
import AdminLayout from "../layout/AdminLayout";
import topicService from "../services/topicService";

const AdminTopics = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSubTopicModal, setShowSubTopicModal] = useState(false);
  const [showEditSubTopicModal, setShowEditSubTopicModal] = useState(false);
  const [selectedSubTopic, setSelectedSubTopic] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState(new Set());

  // Form states
  const [createForm, setCreateForm] = useState({
    name: "",
    active: true,
    avatar_url: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    active: true,
    avatar_url: "",
  });
  const [subTopicForm, setSubTopicForm] = useState({
    name: "",
    active: true,
  });
  const [editSubTopicForm, setEditSubTopicForm] = useState({
    name: "",
    active: true,
  });

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await topicService.getAllTopics({ include_inactive: true });
      setTopics(data || []);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    try {
      await topicService.createTopic(createForm);
      setShowCreateModal(false);
      setCreateForm({ name: "", active: true, avatar_url: "" });
      fetchTopics();
    } catch (err) {
      alert("Lỗi: " + (err.message || "Không thể tạo topic"));
    }
  };

  const handleEditTopic = async (e) => {
    e.preventDefault();
    try {
      await topicService.updateTopic(selectedTopic.name, editForm);
      setShowEditModal(false);
      setSelectedTopic(null);
      fetchTopics();
    } catch (err) {
      alert("Lỗi: " + (err.message || "Không thể cập nhật topic"));
    }
  };

  const handleDeleteTopic = async () => {
    try {
      await topicService.deleteTopic(selectedTopic.name);
      setShowDeleteModal(false);
      setSelectedTopic(null);
      fetchTopics();
    } catch (err) {
      alert("Lỗi: " + (err.message || "Không thể xóa topic"));
    }
  };

  const handleAddSubTopic = async (e) => {
    e.preventDefault();
    try {
      await topicService.addSubTopic(selectedTopic.name, subTopicForm);
      setShowSubTopicModal(false);
      setSubTopicForm({ name: "", active: true });
      setSelectedTopic(null);
      fetchTopics();
    } catch (err) {
      alert("Lỗi: " + (err.message || "Không thể thêm subtopic"));
    }
  };

  const handleEditSubTopic = async (e) => {
    e.preventDefault();
    if (!selectedTopic || !selectedSubTopic) return;
    
    try {
      await topicService.updateSubTopic(selectedTopic.name, selectedSubTopic._id, editSubTopicForm);
      setShowEditSubTopicModal(false);
      setSelectedSubTopic(null);
      setSelectedTopic(null);
      setEditSubTopicForm({ name: "", active: true });
      fetchTopics();
    } catch (err) {
      alert("Lỗi: " + (err.message || "Không thể cập nhật subtopic"));
    }
  };

  const handleDeleteSubTopic = async (topicName, subtopicId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa subtopic này?")) return;
    
    try {
      await topicService.deleteSubTopic(topicName, subtopicId);
      fetchTopics();
    } catch (err) {
      alert("Lỗi: " + (err.message || "Không thể xóa subtopic"));
    }
  };

  const openEditModal = (topic) => {
    setSelectedTopic(topic);
    setEditForm({
      name: topic.name,
      active: topic.active,
      avatar_url: topic.avatar_url || "",
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (topic) => {
    setSelectedTopic(topic);
    setShowDeleteModal(true);
  };

  const openSubTopicModal = (topic) => {
    setSelectedTopic(topic);
    setShowSubTopicModal(true);
  };

  const openEditSubTopicModal = (topic, subtopic) => {
    setSelectedTopic(topic);
    setSelectedSubTopic(subtopic);
    setEditSubTopicForm({
      name: subtopic.name,
      active: subtopic.active,
    });
    setShowEditSubTopicModal(true);
  };

  const toggleTopicExpansion = (topicName) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicName)) {
      newExpanded.delete(topicName);
    } else {
      newExpanded.add(topicName);
    }
    setExpandedTopics(newExpanded);
  };

  const filteredTopics = topics.filter(topic =>
    topic.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Có lỗi xảy ra</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchTopics}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Search and Create Button */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Tạo Topic Mới
            </button>
          </div>
        </div>

        {/* Topics List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Danh sách Topics</h2>
          </div>

          {filteredTopics.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📂</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Không có topic nào</h3>
              <p className="text-gray-500">
                {searchTerm ? "Không tìm thấy topic phù hợp" : "Chưa có topic nào được tạo"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredTopics.map((topic) => (
                <div key={topic._id} className="p-6">
                  {/* Main Topic Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {topic.avatar_url ? (
                          <img
                            src={topic.avatar_url}
                            alt={topic.name}
                            className="w-12 h-12 rounded-xl object-cover border-2 border-gray-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600 ${
                            topic.avatar_url ? 'hidden' : ''
                          }`}
                          style={{ display: topic.avatar_url ? 'none' : 'flex' }}
                        >
                          {topic.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      </div>

                      {/* Topic Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{topic.name}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            topic.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {topic.active ? 'Hoạt động' : 'Tạm dừng'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{topic.sub_topics?.length || 0} subtopics</span>
                          <span>👁️ {topic.views || 0} lượt xem</span>
                          <span>📅 {new Date(topic.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={() => toggleTopicExpansion(topic.name)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            expandedTopics.has(topic.name) ? 'rotate-90' : ''
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => openSubTopicModal(topic)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Thêm Subtopic"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEditModal(topic)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteModal(topic)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Subtopics */}
                  {expandedTopics.has(topic.name) && topic.sub_topics && topic.sub_topics.length > 0 && (
                    <div className="mt-4 ml-16 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Subtopics:</h4>
                      {[...topic.sub_topics].sort((a, b) => {
                        const nameA = (a.name || '').toLowerCase();
                        const nameB = (b.name || '').toLowerCase();
                        return nameA.localeCompare(nameB, 'vi');
                      }).map((subtopic) => (
                        <div key={subtopic._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 truncate">{subtopic.name}</span>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                                subtopic.active 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {subtopic.active ? 'Hoạt động' : 'Tạm dừng'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              👁️ {subtopic.views || 0} lượt xem
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <button
                              onClick={() => openEditSubTopicModal(topic, subtopic)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Sửa subtopic"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteSubTopic(topic.name, subtopic._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa subtopic"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Topic Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Tạo Topic Mới</h3>
            </div>
            
            <form onSubmit={handleCreateTopic} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên Topic *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập tên topic..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
                <input
                  type="url"
                  value={createForm.avatar_url}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                <select
                  value={createForm.active}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, active: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="true">Hoạt động</option>
                  <option value="false">Tạm dừng</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({ name: "", active: true, avatar_url: "" });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tạo Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Topic Modal */}
      {showEditModal && selectedTopic && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Chỉnh sửa Topic</h3>
            </div>
            
            <form onSubmit={handleEditTopic} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên Topic *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
                <input
                  type="url"
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                <select
                  value={editForm.active}
                  onChange={(e) => setEditForm(prev => ({ ...prev, active: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="true">Hoạt động</option>
                  <option value="false">Tạm dừng</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTopic(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Topic Modal */}
      {showDeleteModal && selectedTopic && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa Topic</h3>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa topic "<strong>{selectedTopic.name}</strong>"? 
                Hành động này không thể hoàn tác và sẽ xóa tất cả subtopics bên trong.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedTopic(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteTopic}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Xóa Topic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add SubTopic Modal */}
      {showSubTopicModal && selectedTopic && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Thêm Subtopic vào "{selectedTopic.name}"
              </h3>
            </div>
            
            <form onSubmit={handleAddSubTopic} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên Subtopic *</label>
                <input
                  type="text"
                  required
                  value={subTopicForm.name}
                  onChange={(e) => setSubTopicForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập tên subtopic..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                <select
                  value={subTopicForm.active}
                  onChange={(e) => setSubTopicForm(prev => ({ ...prev, active: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="true">Hoạt động</option>
                  <option value="false">Tạm dừng</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubTopicModal(false);
                    setSelectedTopic(null);
                    setSubTopicForm({ name: "", active: true });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Thêm Subtopic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit SubTopic Modal */}
      {showEditSubTopicModal && selectedTopic && selectedSubTopic && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Sửa Subtopic "{selectedSubTopic.name}"
              </h3>
              <p className="text-sm text-gray-600 mt-1">Thuộc topic: {selectedTopic.name}</p>
            </div>
            
            <form onSubmit={handleEditSubTopic} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên Subtopic *</label>
                <input
                  type="text"
                  required
                  value={editSubTopicForm.name}
                  onChange={(e) => setEditSubTopicForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Nhập tên subtopic..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                <select
                  value={editSubTopicForm.active}
                  onChange={(e) => setEditSubTopicForm(prev => ({ ...prev, active: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="true">Hoạt động</option>
                  <option value="false">Tạm dừng</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSubTopicModal(false);
                    setSelectedSubTopic(null);
                    setSelectedTopic(null);
                    setEditSubTopicForm({ name: "", active: true });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Cập nhật Subtopic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminTopics;
