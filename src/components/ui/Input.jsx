import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  className = '', 
  icon,
  error,
  ...props 
}, ref) => {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={`w-full rounded border px-3 py-1.5 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${icon ? 'pl-9' : ''} ${error ? 'border-danger' : 'border-gray-300'} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
