import { useState } from 'react';
import PropTypes from 'prop-types';

const ErrorMessage = ({
  error,
  onRetry,
  retryLabel = 'Thử lại',
  showDetailsLabel = 'Chi tiết',
  hideDetailsLabel = 'Ẩn',
}) => {
  const [open, setOpen] = useState(false);

  const message =
    typeof error === 'string'
      ? error
      : error && error.message
      ? error.message
      : 'Đã xảy ra lỗi không xác định.';
  const details =
    error && typeof error === 'object'
      ? error.stack || JSON.stringify(error, null, 2)
      : null;

  return (
    <div className="max-w-md mx-auto py-16">
      <div
        role="alert"
        aria-live="assertive"
        className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm"
      >
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0" aria-hidden="true">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold text-red-800">Có lỗi xảy ra</h3>
            <p className="mt-1 text-sm text-red-700 break-words">{message}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {retryLabel}
            </button>
          )}

          {details && (
            <button
              type="button"
              onClick={() => setOpen((s) => !s)}
              aria-expanded={open}
              className="inline-flex items-center px-3 py-1.5 bg-white border border-red-200 text-sm text-red-700 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              {open ? hideDetailsLabel : showDetailsLabel}
            </button>
          )}
        </div>

        {open && details && (
          <pre className="mt-4 p-3 bg-red-100 rounded text-xs text-red-800 overflow-auto whitespace-pre-wrap">
            {details}
          </pre>
        )}
      </div>
    </div>
  );
};

ErrorMessage.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Error),
    PropTypes.object,
  ]),
  onRetry: PropTypes.func,
  retryLabel: PropTypes.string,
  showDetailsLabel: PropTypes.string,
  hideDetailsLabel: PropTypes.string,
};

export default ErrorMessage;