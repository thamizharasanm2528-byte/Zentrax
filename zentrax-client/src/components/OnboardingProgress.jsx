import React from 'react';
import { CheckCircle } from 'lucide-react';

const OnboardingProgress = ({ steps, currentStep }) => {
    return (
        <div className="flex items-center justify-center gap-2 py-6">
            {steps.map((step, i) => {
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;
                return (
                    <React.Fragment key={i}>
                        <div className="flex flex-col items-center gap-1.5">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                                isCompleted
                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                                    : isCurrent
                                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25 ring-4 ring-primary-500/20'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                            }`}>
                                {isCompleted ? <CheckCircle className="h-5 w-5" /> : i + 1}
                            </div>
                            <span className={`text-[10px] font-bold tracking-wider uppercase ${
                                isCurrent ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                            }`}>
                                {step}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-16 h-1 rounded-full transition-all duration-500 -mt-5 ${
                                isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                            }`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default OnboardingProgress;
