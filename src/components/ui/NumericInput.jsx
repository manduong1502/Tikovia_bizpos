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
  const formatValue = (val, focusedOverride) => {
    if (val === undefined || val === null || val === '') return '';
    const focused = focusedOverride !== undefined ? focusedOverride : isFocused;

    if (allowDecimal) {
      // Convert to string and handle decimals
      let str = String(val).replace(/,/g, '.');
      // Strip anything that is not digit or dot
      str = str.replace(/[^0-9.]/g, '');
      const parts = str.split('.');
      if (parts.length > 2) {
        str = parts[0] + '.' + parts.slice(1).join('');
      }
      
      if (!str) return '';
      
      if (focused) {
        // When focused, show the raw string with dot so user can edit easily
        return str;
      }
      
      const num = Number(str);
      if (isNaN(num)) return str;
      
      // format to Vietnamese style: e.g. 1,5
      return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4
      }).format(num);
    } else {
      // Strip non-digits
      const numericStr = String(val).replace(/\D/g, '');
      if (!numericStr) return '';
      
      if (focused) {
        // Show raw number without separators when focused
        return numericStr;
      }
      
      // For integer values, always format with thousand separators when blurred
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
      
      if (currentNum !== parentNum || displayValue === '') {
        setDisplayValue(formatValue(value));
      }
    }
  }, [value, isFocused]);

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
      setDisplayValue(numericStr);
      
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
    if (allowDecimal) {
      // Switch to unformatted decimal on focus
      setDisplayValue(formatValue(value, true));
    }
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (allowDecimal) {
      // Format to Vietnamese style on blur
      setDisplayValue(formatValue(value, false));
    }
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
