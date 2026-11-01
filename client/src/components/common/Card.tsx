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
    <div className={`bg-white border border-[#EDE6DF] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-200 ${className}`}>
      {(title || action) && (
        <div className={`px-6 py-4.5 border-b border-[#F4EFEA] flex items-center justify-between ${headerClassName}`}>
          <div>
            {title && <h3 className="font-serif text-lg font-medium text-[#24201D] tracking-wide">{title}</h3>}
            {subtitle && <p className="text-xs text-[#78716A] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>{children}</div>
      {footer && <div className="px-6 py-3.5 bg-[#FAF7F4] border-t border-[#EDE6DF]">{footer}</div>}
    </div>
  );
};
