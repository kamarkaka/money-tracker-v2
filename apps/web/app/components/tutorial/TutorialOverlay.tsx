"use client";

import { useState, useCallback } from "react";
import { TutorialProgress } from "./TutorialProgress";
import { ModeSelectionStep } from "./steps/ModeSelectionStep";
import { WelcomeStep } from "./steps/WelcomeStep";
import { PageTourStep } from "./steps/PageTourStep";
import { CategorySetupStep } from "./steps/CategorySetupStep";
import { BudgetSetupStep } from "./steps/BudgetSetupStep";
import { BankLinkStep } from "./steps/BankLinkStep";
import { CompletionStep } from "./steps/CompletionStep";

// Steps: 0=ModeSelect, 1=Welcome, 2=Tour, 3=Categories, 4=Budgets, 5=BankLink, 6=Completion
// Pro tutorial progress shows steps 2-5 (Tour, Categories, Budgets, Accounts) = 4 steps
const PRO_PROGRESS_STEPS = 4;

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
    if (step === 4 && skippedCategories) {
      setCurrentStep(5);
      return;
    }
    setCurrentStep(step);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="animate-scale-in w-[90vw] max-w-2xl rounded-xl border border-card-border bg-card-bg shadow-2xl md:w-full">
        {/* Progress bar (only for pro tutorial steps 2-5) */}
        {currentStep >= 2 && currentStep <= 5 && (
          <TutorialProgress
            currentStep={currentStep - 2}
            totalSteps={PRO_PROGRESS_STEPS}
          />
        )}

        {/* Step 0: Mode Selection (no skip) */}
        {currentStep === 0 && (
          <ModeSelectionStep
            onSelectPro={() => goToStep(1)}
            onSelectCasual={async () => {
              await completeTutorial();
              window.location.reload();
            }}
          />
        )}

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <WelcomeStep
            onNext={() => goToStep(2)}
            onSkip={skipTutorial}
          />
        )}

        {/* Step 2: Page Tour */}
        {currentStep === 2 && (
          <PageTourStep
            onNext={() => goToStep(3)}
          />
        )}

        {/* Step 3: Categories */}
        {currentStep === 3 && (
          <CategorySetupStep
            onNext={(created) => {
              const count = created.reduce(
                (sum, g) => sum + 1 + g.children.filter((c) => c.checked).length,
                0
              );
              setCategoriesCreated(count);
              goToStep(4);
            }}
            onSkip={() => {
              setSkippedCategories(true);
              goToStep(5);
            }}
          />
        )}

        {/* Step 4: Budgets */}
        {currentStep === 4 && (
          <BudgetSetupStep
            onNext={(count) => {
              setBudgetsCreated(count);
              goToStep(5);
            }}
            onSkip={() => goToStep(5)}
            onSkipTutorial={skipTutorial}
          />
        )}

        {/* Step 5: Bank Link */}
        {currentStep === 5 && (
          <BankLinkStep
            onNext={(count) => {
              setAccountsLinked(count);
              goToStep(6);
            }}
            onSkip={() => goToStep(6)}
          />
        )}

        {/* Step 6: Completion */}
        {currentStep === 6 && (
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
