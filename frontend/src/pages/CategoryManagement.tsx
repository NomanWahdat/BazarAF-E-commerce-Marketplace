import React, { useState, useEffect } from 'react';
import Layout from '../app/components/layout/Layout';
import { categoryAPI } from '@/services/categoryApi';
import { Category } from '@/types/category';
import {
  Edit2,
  Trash2,
  Plus,
  Search,
  ChevronRight,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';

/**
 * CategoryManagement Page (Admin)
 * Manage categories with CRUD operations and tree view
 */
const CategoryManagement: React.FC = () => {
  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent: '',
    slug: '',
    commission_rate: '0',
    requires_approval: false,
    min_price: '',
    max_price: '',
    meta_title: '',
    meta_description: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryAPI.getCategoryTree();
      setCategories(data);
      setError('');
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter categories
  const filteredCategories = searchQuery
    ? categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories;

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const openCreateModal = (parentId?: string) => {
    setModalMode('create');
    setSelectedCategory(null);
    setFormData({
      name: '',
      description: '',
      parent: parentId || '',
      slug: '',
      commission_rate: '0',
      requires_approval: false,
      min_price: '',
      max_price: '',
      meta_title: '',
      meta_description: '',
    });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setModalMode('edit');
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parent: category.parent || '',
      slug: category.slug || '',
      commission_rate: String(category.commission_rate || 0),
      requires_approval: category.requires_approval || false,
      min_price: String(category.min_price || ''),
      max_price: String(category.max_price || ''),
      meta_title: category.meta_title || '',
      meta_description: category.meta_description || '',
    });
    setShowModal(true);
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Convert string values to numbers
      const dataToSubmit = {
        ...formData,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : 0,
        min_price: formData.min_price ? parseFloat(formData.min_price) : undefined,
        max_price: formData.max_price ? parseFloat(formData.max_price) : undefined,
      };

      if (modalMode === 'create') {
        await categoryAPI.createCategory(dataToSubmit);
        setSuccess('Category created successfully');
      } else if (selectedCategory) {
        await categoryAPI.updateCategory(selectedCategory.slug || selectedCategory.id, dataToSubmit);
        setSuccess('Category updated successfully');
      }

      setShowModal(false);
      loadCategories();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save category');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (categoryIdentifier: string, categoryId?: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    setDeleting(categoryId || categoryIdentifier);
    setError('');

    try {
      await categoryAPI.deleteCategory(categoryIdentifier);
      setSuccess('Category deleted successfully');
      loadCategories();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete category');
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  const renderCategoryRow = (category: Category, depth = 0): React.ReactNode[] => {
    const items: React.ReactNode[] = [];

    items.push(
      <div
        key={`row-${category.id}`}
        style={{ marginLeft: `${depth * 24}px` }}
        className="border-t border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 flex-1">
            {category.children && category.children.length > 0 && (
              <button
                onClick={() => toggleExpanded(category.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    expandedIds.has(category.id) ? 'rotate-90' : ''
                  }`}
                />
              </button>
            )}
            {(!category.children || category.children.length === 0) && (
              <div className="w-6" />
            )}

            <div className="flex-1">
              <p className="font-semibold text-gray-900">{category.name}</p>
              {category.description && (
                <p className="text-sm text-gray-600">{category.description}</p>
              )}
              {category.commission_rate && (
                <span className="text-xs text-gray-500">
                  Commission: {category.commission_rate}%
                </span>
              )}
            </div>

            <div className="text-sm text-gray-600">
              {category.product_count || 0} products
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditModal(category)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit category"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => openCreateModal(category.id)}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Add subcategory"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(category.slug || category.id, category.id)}
              disabled={deleting === category.id}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete category"
            >
              {deleting === category.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    );

    // Render children if expanded
    if (
      expandedIds.has(category.id) &&
      category.children &&
      category.children.length > 0
    ) {
      category.children.forEach((child) => {
        items.push(...renderCategoryRow(child, depth + 1));
      });
    }

    return items;
  };

  return (
    <Layout variant="admin">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Category Management
            </h1>
            <p className="text-gray-600 mt-1">Manage product categories</p>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Category
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-900 font-semibold">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-900 font-semibold">{success}</p>
          </div>
        )}

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Categories Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {filteredCategories.map((category) =>
              renderCategoryRow(category)
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? 'No categories found matching your search'
                : 'No categories yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => openCreateModal()}
                className="text-teal-600 hover:underline font-semibold"
              >
                Create first category
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                {modalMode === 'create' ? 'Create Category' : 'Edit Category'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Category name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleFormChange('description', e.target.value)
                  }
                  placeholder="Category description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleFormChange('slug', e.target.value)}
                  placeholder="URL-friendly slug"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Commission Rate */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.commission_rate}
                  onChange={(e) =>
                    handleFormChange('commission_rate', e.target.value)
                  }
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Min Price (AFN)
                  </label>
                  <input
                    type="number"
                    value={formData.min_price}
                    onChange={(e) => handleFormChange('min_price', e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Price (AFN)
                  </label>
                  <input
                    type="number"
                    value={formData.max_price}
                    onChange={(e) => handleFormChange('max_price', e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Requires Approval */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_approval}
                  onChange={(e) =>
                    handleFormChange('requires_approval', e.target.checked)
                  }
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <span className="text-sm text-gray-700">
                  Requires admin approval for new products
                </span>
              </label>

              {/* SEO */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">SEO</h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={formData.meta_title}
                    onChange={(e) =>
                      handleFormChange('meta_title', e.target.value)
                    }
                    placeholder="SEO meta title"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={formData.meta_description}
                    onChange={(e) =>
                      handleFormChange('meta_description', e.target.value)
                    }
                    placeholder="SEO meta description"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {submitting ? 'Saving...' : 'Save Category'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CategoryManagement;
