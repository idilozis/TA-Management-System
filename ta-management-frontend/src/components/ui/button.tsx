import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ className, children, ...props }) => {
  return (
    <button className={`p-2 bg-blue-500 text-white rounded ${className}`} {...props}>
      {children}
    </button>
  );
};