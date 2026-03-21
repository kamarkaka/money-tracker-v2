"use client";

import { useState, useCallback } from "react";
import { TutorialProgress } from "./TutorialProgress";
import { WelcomeStep } from "./steps/WelcomeStep";
import { PageTourStep } from "./steps/PageTourStep";
import { CategorySetupStep } from "./steps/CategorySetupStep";
import { BudgetSetupStep } from "./steps/BudgetSetupStep";
import { BankLinkStep } from "./steps/BankLinkStep";
import { CompletionStep } from "./steps/CompletionStep";

const TOTAL_STEPS = 6;

interface TutorialOverlayProps {
    onClose: () => void;
}

export function TutorialOverlay({ onClose } : TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [categoriesCreated, setCategoriesCreated] = useState(0);
  const [budgetsCreated, setBudgetsCreated] = useState(0);
  const [accountsLinked, setAccountsLinked] = useState(0);
  const [skippedCategories, setSkippedCategories] = useState(false);

  const completeTutorial = useCallback(async () => {
    await fetch("/api/tutorial/complete", { method: "PUT" });
    onClose();
  }, [onClose]);

  const skipTutorial = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  const goToStep = (step: number) => {
    // If going to budget step but categories were skipped, skip budget too
    if (step === 3 && skippedCategories) {
      setCurrentStep(4);
      return;
    }
    setCurrentStep(step);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="animate-scale-in w-[90vw] max-w-2xl rounded-xl border border-card-border bg-card-bg shadow-2xl md:w-full">
        {/* Progress bar (hidden on welcome and completion steps) */}
        {currentStep > 0 && currentStep < TOTAL_STEPS - 1 && (
          <TutorialProgress
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
          />
        )}

        {/* Steps */}
        {currentStep === 0 && (
          <WelcomeStep
            onNext={() => goToStep(1)}
            onSkip={skipTutorial}
          />
        )}

        {currentStep === 1 && (
          <PageTourStep
            onNext={() => goToStep(2)}
          />
        )}

        {currentStep === 2 && (
          <CategorySetupStep
            onNext={(created) => {
              const count = created.reduce(
                (sum, g) => sum + 1 + g.children.filter((c) => c.checked).length,
                0
              );
              setCategoriesCreated(count);
              goToStep(3);
            }}
            onSkip={() => {
              setSkippedCategories(true);
              goToStep(4);
            }}
          />
        )}

        {currentStep === 3 && (
          <BudgetSetupStep
            onNext={(count) => {
              setBudgetsCreated(count);
              goToStep(4);
            }}
            onSkip={() => goToStep(4)}
            onSkipTutorial={skipTutorial}
          />
        )}

        {currentStep === 4 && (
          <BankLinkStep
            onNext={(count) => {
              setAccountsLinked(count);
              goToStep(5);
            }}
            onSkip={() => goToStep(5)}
          />
        )}

        {currentStep === 5 && (
          <CompletionStep
            categoriesCreated={categoriesCreated}
            budgetsCreated={budgetsCreated}
            accountsLinked={accountsLinked}
            onFinish={completeTutorial}
          />
        )}
      </div>
    </div>
  );
}
