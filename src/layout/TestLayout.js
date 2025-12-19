import React from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import Header from "../components/Header";
import CreateVocabularyTestButton from "../components/CreateVocabularyTestButton";
import CreateVocabularyWithAIButton from "../components/CreateVocabularyWithAIButton";
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

const TestLayout = ({
  children,
  title,
  description,
  icon,
  actions,
  breadcrumbItems,
  showBackground = true,
  maxWidth = "7xl",
  containerClassName = "",
  type = "vocabulary",
}) => {
  const getTypeConfig = (t) => {
    const configs = {
      vocabulary: {
        bgClass: "bg-gradient-to-br from-slate-50 via-white to-emerald-50",
        gradientFrom: "from-emerald-400/10 to-blue-400/10",
        gradientTo: "from-blue-400/10 to-emerald-400/10",
        iconGradient: "from-emerald-500 to-blue-600",
        createButtons: (
          <>
            <CreateVocabularyWithAIButton className="h-11 px-5 rounded-xl text-sm font-semibold whitespace-nowrap" />
            <CreateVocabularyTestButton className="h-11 px-5 rounded-xl text-sm font-semibold whitespace-nowrap" />
            <CreateMultipleChoiceTestButton className="h-11 px-5 rounded-xl text-sm font-semibold whitespace-nowrap" />
          </>
        ),
      },
      "multiple-choice": {
        bgClass: "bg-gradient-to-br from-slate-50 via-white to-blue-50",
        gradientFrom: "from-blue-400/10 to-indigo-400/10",
        gradientTo: "from-indigo-400/10 to-blue-400/10",
        iconGradient: "from-blue-500 to-indigo-600",
        createButtons: (
          <CreateMultipleChoiceTestButton className="h-11 px-5 rounded-xl text-sm font-semibold whitespace-nowrap" />
        ),
      },
    };
    return configs[t] || configs.vocabulary;
  };

  const typeConfig = getTypeConfig(type);
  const maxW = MAX_WIDTH_CLASS[maxWidth] || "max-w-7xl";

  return (
    <>
      <Header />
      <div className={`min-h-screen relative ${typeConfig.bgClass}`}>
        {showBackground && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.02]" />
            <div
              className={`pointer-events-none absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${typeConfig.gradientFrom} rounded-full blur-3xl`}
            />
            <div
              className={`pointer-events-none absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr ${typeConfig.gradientTo} rounded-full blur-3xl`}
            />
          </>
        )}

        <div className={`relative z-10 w-full ${maxW} mx-auto px-3 sm:px-4 lg:px-6 py-6 ${containerClassName}`}>
          {/* Header */}
          {(breadcrumbItems?.length > 0 || title || description) && (
            <div className="mb-6">
              {/* Breadcrumb */}
              {breadcrumbItems?.length > 0 && (
                <nav className="mb-3 text-sm text-gray-500 flex flex-wrap items-center gap-2">
                  {breadcrumbItems.map((item, idx) => (
                    <React.Fragment key={item.path || item.label || idx}>
                      {idx > 0 && <span className="text-gray-300">/</span>}
                      {item.path ? (
                        <Link to={item.path} className="hover:text-gray-700 transition">
                          {item.label}
                        </Link>
                      ) : (
                        <span className="text-gray-700 font-medium">{item.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {icon && (
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${typeConfig.iconGradient} flex items-center justify-center shadow-lg flex-shrink-0`}
                    >
                      {icon}
                    </div>
                  )}
                  <div>
                    {title && <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{title}</h1>}
                    {description && <p className="mt-1 text-gray-600 leading-relaxed">{description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {actions}
                  {typeConfig.createButtons}
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

export default TestLayout;

// Backward compatibility
export const VocabularyLayout = (props) => <TestLayout {...props} type="vocabulary" />;
export const MultipleChoiceLayout = (props) => <TestLayout {...props} type="multiple-choice" />;
