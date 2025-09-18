import React from 'react';

const EmptyState = ({ icon: Icon, title, message, actionText, onActionClick }) => {
  return (
    <div className="text-center p-8 sm:p-12 bg-gray-50/50 rounded-lg">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-800">{title}</h3>
      <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">{message}</p>
      {actionText && onActionClick && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onActionClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
