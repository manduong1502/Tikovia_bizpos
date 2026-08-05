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
      let str = String(val).replace(/,/g, '.');
      str = str.replace(/[^0-9.]/g, '');
      const parts = str.split('.');
      if (parts.length > 2) {
        str = parts[0] + '.' + parts.slice(1).join('');
      }
      return str;
    } else {
      const numericStr = String(val).replace(/\D/g, '');
      if (!numericStr) return '';
      return new Intl.NumberFormat('vi-VN').format(Number(numericStr));
    }
  };

  const getRawValue = (val) => {
    if (val === undefined || val === null || val === '') return '';
    if (allowDecimal) return String(val);
    const numericStr = String(val).replace(/\D/g, '');
    return numericStr ? String(Number(numericStr)) : '';
  };

  const [displayValue, setDisplayValue] = useState(formatValue(value));

  // Update displayValue when parent value changes or when focus state changes
  useEffect(() => {
    if (isFocused) {
      setDisplayValue(getRawValue(value));
    } else {
      setDisplayValue(formatValue(value));
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    let rawVal = e.target.value;
    
    if (allowDecimal) {
      rawVal = rawVal.replace(/,/g, '.').replace(/[^0-9.]/g, '');
      const parts = rawVal.split('.');
      if (parts.length > 2) {
        rawVal = parts[0] + '.' + parts.slice(1).join('');
      }
      setDisplayValue(rawVal);
      if (onChange) {
        onChange({ target: { name: props.name, value: parseFloat(rawVal) || 0 } });
      }
    } else {
      const numericStr = rawVal.replace(/\D/g, '');
      setDisplayValue(numericStr);
      const num = Number(numericStr) || 0;
      if (onChange) {
        onChange({ target: { name: props.name, value: num } });
      }
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    const raw = getRawValue(value);
    setDisplayValue(raw);
    const target = e.target;
    if (props.selectOnFocus !== false) {
      setTimeout(() => {
        try { target.select(); } catch {}
      }, 0);
    }
    if (props.onFocus) props.onFocus(e);
  };

  const handleMouseUp = (e) => {
    if (props.selectOnFocus !== false) {
      try { e.target.select(); } catch {}
    }
    if (props.onMouseUp) props.onMouseUp(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    setDisplayValue(formatValue(value));
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <input
      ref={ref}
      type="tel"
      inputMode="numeric"
      autoComplete="off"
      className={`w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm ${className}`}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onMouseUp={handleMouseUp}
      onBlur={handleBlur}
      placeholder={placeholder}
      {...props}
    />
  );
});

NumericInput.displayName = 'NumericInput';
export default NumericInput;
