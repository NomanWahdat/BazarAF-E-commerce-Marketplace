// frontend/src/app/components/Categories/CategoriesDisplay.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/app/components/ui/button';
import { Loader2, ChevronDown, ChevronUp, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CategoryCard } from './CategoryCard';
import { getIconComponent, getCategoryColor } from './iconMap';

export interface CategoryData {
  id: string;
  name: string;
  description?: string;
  icon: string;
  level: 'main' | 'sub' | 'production';
  color?: string;
  product_count: number;
  is_active: boolean;
  parent_id?: string;
  parent_name?: string;
  subcategories?: CategoryData[];
}

interface CategoriesDisplayProps {
  categories: CategoryData[];
  loading?: boolean;
  onCategoryClick: (category: CategoryData) => void;
  onSubcategoryClick?: (category: CategoryData) => void;
  title?: string;
}

export const CategoriesDisplay: React.FC<CategoriesDisplayProps> = ({
  categories,
  loading = false,
  onCategoryClick,
  onSubcategoryClick,
  title = 'Shop by Category',
}) => {
  const { t } = useTranslation();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check scroll position
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Ensure categories is an array
  const categoriesArray = Array.isArray(categories) ? categories : [];

  // Separate categories by level
  const mainCategories = categoriesArray.filter(c => c.level === 'main' && c.is_active);
  const productionCategories = categoriesArray.filter(c => c.level === 'production' && c.is_active);

  const handleExpandSubcategories = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
    }
  };

  const handleCategoryClick = (category: CategoryData) => {
    if (category.level === 'main' && category.subcategories?.length) {
      handleExpandSubcategories(category.id);
    } else {
      onCategoryClick(category);
    }
  };

  if (loading) {
    return (
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{title || t('home_shop_by_category')}</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <span className="ml-2 text-gray-600">{t('categories_loading')}</span>
        </div>
      </section>
    );
  }

  if (!mainCategories.length && !productionCategories.length) {
    return (
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{title || t('home_shop_by_category')}</h2>
        <div className="text-center py-12 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>{t('categories_none_available')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold mb-6">{title || t('home_shop_by_category')}</h2>

      {/* Main Categories - Horizontal Scroll */}
      {mainCategories.length > 0 && (
        <div className="mb-8">
          <div className="relative">
            {/* Scroll Left Button */}
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
                aria-label={t('categories_scroll_left')}
              >
                <ChevronLeft className="w-5 h-5 text-teal-600" />
              </button>
            )}

            {/* Scroll Right Button */}
            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
                aria-label={t('categories_scroll_right')}
              >
                <ChevronRight className="w-5 h-5 text-teal-600" />
              </button>
            )}

            {/* Categories Container */}
            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide px-4 py-2"
              style={{ scrollBehavior: 'smooth' }}
            >
              {mainCategories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                const categoryColor = getCategoryColor(category.color, category.level);
                const isExpanded = expandedCategory === category.id;
                const hasSubcategories = category.subcategories?.length;

                return (
                  <div key={category.id} className="flex flex-col gap-2 flex-shrink-0">
                    <CategoryCard
                      id={category.id}
                      name={category.name}
                      icon={IconComponent}
                      productCount={category.product_count}
                      color={categoryColor}
                      onClick={() => handleCategoryClick(category)}
                      level="main"
                      isHovered={expandedCategory === category.id}
                    />

                    {/* Subcategories Expandable */}
                    {hasSubcategories && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExpandSubcategories(category.id)}
                        className="w-full text-xs h-8"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            {t('categories_hide')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            {t('categories_show_count', { count: category.subcategories?.length || 0 })}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Subcategories */}
      {expandedCategory && (
        <div className="mb-8 p-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {t('categories_subcategories_of')}{' '}
              <span className="text-teal-600 font-bold">
                {mainCategories.find(c => c.id === expandedCategory)?.name}
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {mainCategories
              .find(c => c.id === expandedCategory)
              ?.subcategories?.filter(sub => sub.is_active)
              .map(subcategory => {
                const IconComponent = getIconComponent(subcategory.icon);
                const subColor = getCategoryColor(subcategory.color, subcategory.level);

                return (
                  <CategoryCard
                    key={subcategory.id}
                    id={subcategory.id}
                    name={subcategory.name}
                    icon={IconComponent}
                    productCount={subcategory.product_count}
                    color={subColor}
                    onClick={() => {
                      onSubcategoryClick?.(subcategory);
                      setExpandedCategory(null);
                    }}
                    level="sub"
                  />
                );
              })}
          </div>
        </div>
      )}
    </section>
  );
};
