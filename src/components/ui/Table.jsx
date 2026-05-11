import React from 'react';

export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto bg-white rounded shadow-sm border border-border ${className}`}>
      <table className="w-full text-sm text-left whitespace-nowrap">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }) {
  return (
    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeader({ children, className = '' }) {
  return (
    <th scope="col" className={`px-4 py-3 font-medium tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TableRow({ children, className = '' }) {
  return (
    <tr className={`hover:bg-gray-50 transition-colors ${className}`}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '' }) {
  return (
    <td className={`px-4 py-3 ${className}`}>
      {children}
    </td>
  );
}
