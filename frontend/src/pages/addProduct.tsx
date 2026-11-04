import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../app/components/layout/Layout';
import { categoryAPI, productAPI } from '@/services/categoryApi';
import {
  Category,
  CategoryAttribute,
} from '@/types/category';
import {
  Upload,
  X,
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';

/**
 * AddProduct Page
 * Vendor product creation with attributes and image management
 */
const AddProduct: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    original_price: '',
    quantity: '',
    cod_available: true,
  });

  const [attributes, setAttributes] = useState<{
    [key: string]: string;
  }>({});
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // UI State
  const [_loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryAttributes, setCategoryAttributes] = useState<
    CategoryAttribute[]
  >([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load attributes when category changes
  useEffect(() => {
    if (formData.category) {
      loadCategoryAttributes();
    } else {
      setCategoryAttributes([]);
      setAttributes({});
    }
  }, [formData.category]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await categoryAPI.getCategoryTree();
      // Flatten to get all categories for selection
      const allCategories = flattenCategories(data);
      setCategories(allCategories);
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const flattenCategories = (categories: Category[]): Category[] => {
    const flattened: Category[] = [];
    const traverse = (cats: Category[], depth = 0) => {
      cats.forEach((cat) => {
        flattened.push(cat);
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children, depth + 1);
        }
      });
    };
    traverse(categories);
    return flattened;
  };

  const loadCategoryAttributes = async () => {
    setLoadingAttributes(true);
    try {
      const data = await categoryAPI.getCategoryAttributes(categories.find(category => category.id === formData.category)?.slug || formData.category);
      setCategoryAttributes(data);

      // Initialize empty attribute values
      const emptyAttrs: { [key: string]: string } = {};
      data.forEach((attr) => {
        emptyAttrs[attr.id] = '';
      });
      setAttributes(emptyAttrs);
    } catch (err) {
      console.error('Failed to load attributes:', err);
    } finally {
      setLoadingAttributes(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAttributeChange = (attributeId: string, value: string) => {
    setAttributes((prev) => ({
      ...prev,
      [attributeId]: value,
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const totalImages = images.length + newFiles.length;

    if (totalImages > 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    // Validate file types and size
    for (const file of newFiles) {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        setError('Image size must be less than 5MB');
        return;
      }
    }

    setImages((prev) => [...prev, ...newFiles]);
    setError('');

    // Create preview URLs
    newFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setImagePreviewUrls((prev) => [...prev, url]);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Product name is required');
      return false;
    }
    if (!formData.category) {
      setError('Category is required');
      return false;
    }
    if (!formData.price) {
      setError('Price is required');
      return false;
    }
    if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      setError('Price must be a positive number');
      return false;
    }
    if (!formData.quantity) {
      setError('Quantity is required');
      return false;
    }
    if (isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      setError('Quantity must be a non-negative number');
      return false;
    }
    if (images.length === 0) {
      setError('At least one product image is required');
      return false;
    }

    // Validate required attributes
    for (const attr of categoryAttributes) {
      if (attr.is_required && !attributes[attr.id]?.trim()) {
        setError(`${attr.name} is required`);
        return false;
      }
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Create product
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: Number(formData.price),
        original_price: formData.original_price
          ? Number(formData.original_price)
          : undefined,
        stock_quantity: Number(formData.quantity),
        cod_available: formData.cod_available,
        attributes: Object.entries(attributes)
          .filter(([, value]) => value)
          .map(([attributeId, value]) => ({
            attribute: attributeId,
            value,
          })),
      };

      const createdProduct = await productAPI.createProduct(
        productData
      );

      if (!createdProduct) throw new Error('Product could not be created.');
      // Upload images
      if (images.length > 0) {
        await productAPI.uploadImages(createdProduct.id, images);
      }

      setSuccess('Product created successfully!');
      setTimeout(() => {
        navigate('/vendor?tab=products');
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to create product');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout variant="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-600 mt-2">
            Create a new product listing for your store
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Alert */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">{error}</p>
              </div>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">{success}</p>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Basic Information
            </h2>

            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter product name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category *
                </label>
                <div className="relative">
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      handleInputChange('category', e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.full_path}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  placeholder="Enter detailed product description"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Pricing & Stock
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Price (AFN) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Original Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Original Price (AFN) (Optional)
                </label>
                <input
                  type="number"
                  value={formData.original_price}
                  onChange={(e) =>
                    handleInputChange('original_price', e.target.value)
                  }
                  placeholder="Leave empty if no discount"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Stock Quantity *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* COD */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cod_available}
                onChange={(e) =>
                  handleInputChange('cod_available', e.target.checked)
                }
                className="w-4 h-4 text-teal-600 rounded"
              />
              <span className="text-sm text-gray-700">
                Cash on Delivery Available
              </span>
            </label>
          </div>

          {/* Category Attributes */}
          {categoryAttributes.length > 0 && (
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Product Specifications
              </h2>

              {loadingAttributes && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                </div>
              )}

              <div className="space-y-4">
                {categoryAttributes.map((attr) => (
                  <div key={attr.id}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {attr.name}
                      {attr.is_required && <span className="text-red-600">*</span>}
                    </label>

                    {attr.attribute_type === 'select' ||
                    attr.attribute_type === 'multi_select' ? (
                      <select
                        value={attributes[attr.id] || ''}
                        onChange={(e) =>
                          handleAttributeChange(attr.id, e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">
                          Select {attr.name.toLowerCase()}
                        </option>
                        {attr.values?.map((val) => (
                          <option key={val.id} value={val.value}>
                            {val.value}
                          </option>
                        ))}
                      </select>
                    ) : attr.attribute_type === 'boolean' ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={attributes[attr.id] === 'true'}
                          onChange={(e) =>
                            handleAttributeChange(
                              attr.id,
                              e.target.checked ? 'true' : 'false'
                            )
                          }
                          className="w-4 h-4 text-teal-600 rounded"
                        />
                        <span className="text-sm text-gray-700">
                          {attr.name}
                        </span>
                      </label>
                    ) : (
                      <input
                        type={attr.attribute_type === 'number' ? 'number' : 'text'}
                        value={attributes[attr.id] || ''}
                        onChange={(e) =>
                          handleAttributeChange(attr.id, e.target.value)
                        }
                        placeholder={`Enter ${attr.name.toLowerCase()}`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Product Images *
            </h2>

            {/* Upload Area */}
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors block">
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-900">
                    Drop images here or click to select
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    PNG, JPG up to 5MB each. Max 10 images.
                  </p>
                </div>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>

            {/* Image Previews */}
            {imagePreviewUrls.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  {imagePreviewUrls.length} image{imagePreviewUrls.length !== 1 ? 's' : ''} selected
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {submitting ? 'Creating...' : 'Create Product'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AddProduct;