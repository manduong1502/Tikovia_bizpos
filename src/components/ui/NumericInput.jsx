import React, { forwardRef, useState, useEffect } from 'react';

const NumericInput = forwardRef(({
  value,
  onChange,
  className = '',
  placeholder = '0',
  allowDecimal = false,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  // Helper to format string/number to dot/comma separated string
  const formatValue = (val) => {
    if (val === undefined || val === null || val === '') return '';

    if (allowDecimal) {
      // Convert to string and handle decimals
      let str = String(val).replace(/,/g, '.');
      // Strip anything that is not digit or dot
      str = str.replace(/[^0-9.]/g, '');
      const parts = str.split('.');
      if (parts.length > 2) {
        str = parts[0] + '.' + parts.slice(1).join('');
      }
      return str;
    } else {
      // Strip non-digits and format with Vietnamese thousand separators (.)
      const numericStr = String(val).replace(/\D/g, '');
      if (!numericStr) return '';
      return new Intl.NumberFormat('vi-VN').format(Number(numericStr));
    }
  };

  const [displayValue, setDisplayValue] = useState(formatValue(value));

  useEffect(() => {
    if (allowDecimal) {
      const currentNum = parseFloat(String(displayValue).replace(/,/g, '.'));
      const parentNum = Number(value) || 0;
      
      if (isNaN(currentNum) || currentNum !== parentNum || displayValue === '') {
        setDisplayValue(formatValue(value));
      }
    } else {
      const currentNum = Number(String(displayValue).replace(/\D/g, ''));
      const parentNum = Number(value) || 0;
      
      if (currentNum !== parentNum || (displayValue === '' && value !== '' && value !== null && value !== undefined)) {
        setDisplayValue(formatValue(value));
      }
    }
  }, [value]);

  const handleChange = (e) => {
    let rawVal = e.target.value;
    
    if (allowDecimal) {
      // Normalize comma to dot
      rawVal = rawVal.replace(/,/g, '.');
      // Strip characters other than digits and dot
      let cleanVal = rawVal.replace(/[^0-9.]/g, '');
      
      // Ensure only one dot
      const parts = cleanVal.split('.');
      if (parts.length > 2) {
        cleanVal = parts[0] + '.' + parts.slice(1).join('');
      }
      
      setDisplayValue(cleanVal);
      
      if (onChange) {
        const parsedNum = parseFloat(cleanVal) || 0;
        onChange({
          target: {
            name: props.name,
            value: parsedNum
          }
        });
      }
    } else {
      const numericStr = rawVal.replace(/\D/g, '');
      const formatted = numericStr ? new Intl.NumberFormat('vi-VN').format(Number(numericStr)) : '';
      setDisplayValue(formatted);
      
      if (onChange) {
        onChange({
          target: {
            name: props.name,
            value: Number(numericStr) || 0
          }
        });
      }
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    setDisplayValue(formatValue(value));
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <input
      ref={ref}
      type="text"
      className={`w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm ${className}`}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      {...props}
    />
  );
});

NumericInput.displayName = 'NumericInput';
export default NumericInput;
