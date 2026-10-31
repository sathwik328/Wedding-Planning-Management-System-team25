import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footer
}) => {
  return (
    <div className={`bg-white border border-[#E7E2D8] rounded-md shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className={`px-5 py-4 border-b border-[#E7E2D8] flex items-center justify-between ${headerClassName}`}>
          <div>
            {title && <h3 className="font-serif text-lg font-semibold text-[#1E2229]">{title}</h3>}
            {subtitle && <p className="text-xs text-[#718096] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
      {footer && <div className="px-5 py-3 bg-[#F7F4EE] border-t border-[#E7E2D8]">{footer}</div>}
    </div>
  );
};
