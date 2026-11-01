import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-full cursor-pointer tracking-wide';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-xs sm:text-sm px-5 py-2.5 gap-2',
    lg: 'text-sm sm:text-base px-6 py-3 gap-2.5'
  };

  const variantStyles = {
    primary: 'bg-[#231E1B] text-[#FAF8F5] hover:bg-[#38302B] focus:ring-[#231E1B] shadow-xs hover:shadow-md border border-[#231E1B]',
    secondary: 'bg-white text-[#38302B] border border-[#E5DACD] hover:bg-[#FAF6F0] hover:border-[#D9CDBF] focus:ring-[#B89358] shadow-2xs',
    gold: 'bg-[#B89358] text-white hover:bg-[#A37E43] focus:ring-[#B89358] shadow-xs border border-[#B89358]',
    outline: 'bg-transparent text-[#231E1B] border border-[#E5DACD] hover:bg-[#FAF6F0] focus:ring-[#B89358]',
    danger: 'bg-rose-700 text-white hover:bg-rose-800 focus:ring-rose-600 shadow-xs border border-rose-700',
    ghost: 'bg-transparent text-[#756A61] hover:text-[#231E1B] hover:bg-[#F2ECE3] focus:ring-stone-300'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!isLoading && leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
