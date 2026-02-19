import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-xl border-2 border-input bg-input-background text-foreground focus:border-secondary focus:outline-none transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-3 rounded-xl border-2 border-input bg-input-background text-foreground focus:border-secondary focus:outline-none transition-colors ${className}`}
        {...props}
      >
        <option value="" className="bg-card">Select...</option>
        {options.map(option => (
          <option key={option.value} value={option.value} className="bg-card">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-3 rounded-xl border-2 border-input bg-input-background text-foreground focus:border-secondary focus:outline-none transition-colors resize-none ${className}`}
        {...props}
      />
    </div>
  );
}
