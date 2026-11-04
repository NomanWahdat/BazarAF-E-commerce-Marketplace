// frontend/src/app/components/Categories/CategoryCard.tsx

import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface CategoryCardProps {
  id: string;
  name: string;
  icon: LucideIcon;
  productCount: number;
  color: string;
  onClick: () => void;
  level: 'main' | 'sub' | 'production';
  isHovered?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  name,
  icon: IconComponent,
  productCount,
  color,
  onClick,
  level,
  isHovered = false,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const { t } = useTranslation();

  const handleMouseEnter = () => {
    setIsAnimating(true);
  };

  const handleMouseLeave = () => {
    setIsAnimating(false);
  };

  const iconSize = level === 'main' ? 32 : 24;
  const isProduction = level === 'production';

  return (
    <Card
      className={`
        p-4 cursor-pointer transition-all duration-300 bg-white
        ${isAnimating || isHovered ? 'shadow-xl scale-105' : 'hover:shadow-md'}
        ${isProduction ? 'border-2 border-dashed' : ''}
        group relative overflow-hidden
      `}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Animated Background Gradient */}
      <div
        className={`
          absolute inset-0 opacity-0 transition-opacity duration-300
          ${isAnimating ? 'opacity-5' : ''}
        `}
        style={{ backgroundColor: color }}
      />

      {/* Content */}
      <div className="flex flex-col items-center gap-2 text-center relative z-10">
        {/* Icon Container */}
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isAnimating ? 'scale-110' : 'scale-100'}
          `}
          style={{
            backgroundColor: `${color}15`,
            borderColor: color,
            borderWidth: '2px',
          }}
        >
          <IconComponent
            size={iconSize}
            style={{ color }}
            className={`transition-all duration-300 ${
              isAnimating ? 'rotate-12' : 'rotate-0'
            }`}
          />
        </div>

        {/* Category Name */}
        <div className="text-sm font-semibold line-clamp-2 min-h-[2.5rem] flex items-center">
          {name}
        </div>

        {/* Product Count Badge */}
        <Badge
          variant="outline"
          className={`text-xs transition-colors duration-300`}
          style={{
            borderColor: color,
            color: color,
            backgroundColor: isAnimating ? `${color}15` : 'transparent',
          }}
        >
          {productCount} {t('categories_items')}
        </Badge>

        {/* Production Level Badge */}
        {isProduction && (
          <Badge
            className="text-xs bg-purple-100 text-purple-700 border-purple-300"
            variant="outline"
          >
            {t('categories_wholesale')}
          </Badge>
        )}
      </div>

      {/* Hover Indicator Line */}
      <div
        className={`
          absolute bottom-0 left-0 h-1 transition-all duration-300
          ${isAnimating ? 'w-full' : 'w-0'}
        `}
        style={{ backgroundColor: color }}
      />
    </Card>
  );
};
