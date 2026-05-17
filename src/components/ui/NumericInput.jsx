import React, { forwardRef, useState, useEffect } from 'react';

const NumericInput = forwardRef(({
  value,
  onChange,
  className = '',
  placeholder = '0',
  ...props
}, ref) => {
  // Helper to format string/number to dot separated string
  const formatValue = (val) => {
    if (val === undefined || val === null || val === '') return '';
    // Strip non-digits
    const numericStr = String(val).replace(/\D/g, '');
    if (!numericStr) return '';
    return new Intl.NumberFormat('vi-VN').format(Number(numericStr));
  };

  const [displayValue, setDisplayValue] = useState(formatValue(value));

  useEffect(() => {
    setDisplayValue(formatValue(value));
  }, [value]);

  const handleChange = (e) => {
    const rawVal = e.target.value;
    const numericStr = rawVal.replace(/\D/g, '');
    
    // Format the text representation
    const formatted = formatValue(numericStr);
    setDisplayValue(formatted);

    // Call parent's onChange with a numeric value
    if (onChange) {
      const parsedNum = Number(numericStr) || 0;
      onChange({
        target: {
          name: props.name,
          value: parsedNum
        }
      });
    }
  };

  return (
    <input
      ref={ref}
      type="text"
      className={`w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm ${className}`}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      {...props}
    />
  );
});

NumericInput.displayName = 'NumericInput';
export default NumericInput;
