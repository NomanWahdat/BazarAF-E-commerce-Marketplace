import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '@/types/category';
import * as Icons from 'lucide-react';

interface CategoryGridProps {
  categories: Category[];
  onCategoryClick?: (category: Category) => void;
  loading?: boolean;
  cols?: number;
}

/**
 * CategoryGrid Component
 * Displays categories in a responsive grid with icons
 */
const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  onCategoryClick,
  loading = false,
  cols = 8,
}) => {
  const navigate = useNavigate();

  const getIcon = (iconName?: string) => {
    if (!iconName) return Icons.Package;
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.Package;
  };

  const handleCategoryClick = (category: Category) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    } else {
      navigate(`/products?category=${category.slug}`);
    }
  };

  const gridCols = {
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
  } as Record<number, string>;

  const colsClass = gridCols[cols] || gridCols[8];

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:${colsClass} gap-4`}
    >
      {loading
        ? // Loading skeleton
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-lg aspect-square animate-pulse"
            />
          ))
        : // Actual categories
          categories.map((category) => {
            const Icon = getIcon(category.icon);
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="flex flex-col items-center p-3 md:p-4 bg-white rounded-lg border border-gray-200 hover:border-teal-500 hover:shadow-md transition-all duration-200 group"
              >
                {/* Icon Container */}
                <div className="w-14 h-14 md:w-16 md:h-16 bg-teal-50 rounded-full flex items-center justify-center mb-2 md:mb-3 group-hover:bg-teal-100 transition-colors">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-teal-600" />
                </div>

                {/* Category Name */}
                <h3 className="text-xs md:text-sm font-medium text-center text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-2">
                  {category.name}
                </h3>

                {/* Product Count */}
                <p className="text-xs text-gray-500 mt-1">
                  {category.product_count} products
                </p>
              </button>
            );
          })}
    </div>
  );
};

export default CategoryGrid;
