import React from "react";
import { Link } from "react-router-dom";

const SubTopicCard = ({
    topic,
    mainTopic,
    subTopic,
    testCount = 0,
    to,
    color = "blue",
    buttonLabel,
    className = "",
}) => {
    return (
        <Link
            to={to}
            className={[
                "group block p-6 rounded-2xl border border-gray-200 bg-white",
                "hover:border-gray-900 hover:bg-gray-50 transition-all duration-200",
                className,
            ].join(" ")}
        >
            <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {subTopic}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {buttonLabel || "Xem bài kiểm tra"}
                    </p>
                </div>
                
                <div className="ml-4">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </Link>
    );
};

export default SubTopicCard;