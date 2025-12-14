// src/layout/MultipleChoiceLayout.jsx
import React from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import CreateMultipleChoiceTestButton from "../components/CreateMultipleChoiceTestButton";

const MAX_WIDTH_CLASS = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
  none: "max-w-none",
};

const MultipleChoiceLayout = ({
  children,
  breadcrumbItems = [],
  title,
  description,
  icon,
  actions,
  showBackground = true,
  maxWidth = "7xl",
  containerClassName = "", // thêm để customize từng page
}) => {
  const maxW = MAX_WIDTH_CLASS[maxWidth] || "max-w-7xl";

  return (
    <>
      <Header />
      <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {showBackground && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.02]" />
            <div className="pointer-events-none absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/8 to-indigo-400/8 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-400/8 to-blue-400/8 rounded-full blur-3xl" />
          </>
        )}

        <div
          className={`relative z-10 w-full ${maxW} mx-auto px-3 sm:px-4 lg:px-6 py-6 ${containerClassName}`}
        >
          {(title || description) && (
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {icon && (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
                      {icon}
                    </div>
                  )}
                  <div>
                    {title && (
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {title}
                      </h1>
                    )}
                    {description && (
                      <p className="text-gray-600 leading-relaxed">
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {actions}
                  <CreateMultipleChoiceTestButton />
                </div>
              </div>
            </div>
          )}

          <div>{children}</div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default MultipleChoiceLayout;
