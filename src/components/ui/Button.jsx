import React from 'react';

export default function Button({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '', 
  icon,
  ...props 
}) {
  const baseStyle = "inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    default: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
    primary: "bg-primary text-white hover:bg-primary-hover",
    danger: "bg-white border border-danger text-danger hover:bg-red-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
  };
  
  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="mr-1.5">{icon}</span>}
      {children}
    </button>
  );
}
