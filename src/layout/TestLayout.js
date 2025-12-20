import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

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

const TestLayout = ({
  children,
  title,
  description,
  icon,
  actions,
  breadcrumbItems,
  maxWidth = "full",
  containerClassName = "",
  type = "vocabulary",
  hideHeader = false,
}) => {
  const maxW = MAX_WIDTH_CLASS[maxWidth] || "max-w-full";

  const getIconBg = (t) => {
    if (t === "multiple-choice") return "bg-violet-600";
    if (t === "topics") return "bg-indigo-600";
    return "bg-emerald-600";
  };

  return (
    <>
      <Header />

      {/* ===== Page background (NO GRADIENT) ===== */}
      <div className="min-h-screen bg-slate-100">
        {/* ===== Container ===== */}
        <div
          className={[
            "w-full mx-auto",
            maxW,
            "px-4 sm:px-6 lg:px-8",
            "py-6",
            containerClassName,
          ].join(" ")}
        >
          {/* ===== Page header ===== */}
          {!hideHeader && (breadcrumbItems?.length > 0 || title || description) && (
            <div className="mb-6">
              {/* Breadcrumb */}
              {breadcrumbItems?.length > 0 && (
                <nav className="mb-3 text-sm font-medium text-slate-500 flex flex-wrap items-center gap-2">
                  {breadcrumbItems.map((item, idx) => (
                    <React.Fragment key={item.path || item.label || idx}>
                      {idx > 0 && <span className="text-slate-300">/</span>}
                      {item.path ? (
                        <Link
                          to={item.path}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="text-slate-900">{item.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              )}

              {/* Title + actions */}
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {icon && (
                    <div
                      className={[
                        "w-12 h-12 rounded-2xl",
                        getIconBg(type),
                        "flex items-center justify-center",
                        "text-white shadow-sm shrink-0",
                      ].join(" ")}
                    >
                      {icon}
                    </div>
                  )}

                  <div>
                    {title && (
                      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {title}
                      </h1>
                    )}
                    {description && (
                      <p className="mt-1.5 max-w-2xl text-slate-600 leading-relaxed">
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                {actions && (
                  <div className="flex items-center gap-2 shrink-0">
                    {actions}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== Page content ===== */}
          {children}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default TestLayout;

/* ===== Shortcut layouts ===== */
export const VocabularyLayout = (props) => (
  <TestLayout {...props} type="vocabulary" />
);

export const MultipleChoiceLayout = (props) => (
  <TestLayout {...props} type="multiple-choice" />
);
