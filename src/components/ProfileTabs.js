import React from "react";

const ProfileTabs = ({ activeTab, onTabChange, resultsCount, testsCount }) => {
  const tabs = [
    {
      id: "info",
      name: "Thông tin cá nhân",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      count: null,
    },
    {
      id: "results",
      name: "Kết quả bài test",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      count: resultsCount ?? 0,
    },
    {
      id: "my-tests",
      name: "Bài test tôi tạo",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      count: testsCount ?? 0,
    },
  ];

  return (
    <div className="space-y-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={[
              "w-full flex items-center justify-between px-4 text-sm font-semibold rounded-lg h-12 transition-colors border",
              isActive
                ? "text-violet-700 bg-violet-50 border-violet-200"
                : "text-zinc-600 bg-white border-transparent hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900",
            ].join(" ")}
          >
            <div className="flex items-center gap-3 min-w-0">
              {React.cloneElement(tab.icon, { className: "w-5 h-5 text-current shrink-0" })}
              <span className="truncate">{tab.name}</span>
            </div>

            {tab.count !== null && (
              <span
                className={[
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                  isActive ? "bg-violet-100 text-violet-700" : "bg-zinc-100 text-zinc-700",
                ].join(" ")}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ProfileTabs;
