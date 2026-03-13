"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "@/app/components/ui/Modal";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

interface LoginFormField {
  MappedField: string;
  DisplayText: string;
  Optional: boolean;
}

interface SophtronInstitution {
  InstitutionID: string;
  InstitutionId: string;
  InstitutionName: string;
  URL: string;
  Logo: string;
  InstitutionDetail: {
    LoginFormFields: LoginFormField[];
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JobResponse = any;

interface ConnectInstitutionModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  refreshData?: {
    institutionId: string;
    institutionName: string;
  } | null;
}

type Step = "search" | "credentials" | "verification" | "confirmation";

export function ConnectInstitutionModal({
  open,
  onClose,
  onComplete,
  refreshData,
}: ConnectInstitutionModalProps) {
  const [step, setStep] = useState<Step>("search");

  // Step 1: Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SophtronInstitution[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<SophtronInstitution | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2: Credentials
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Step 3: Verification
  const [jobId, setJobId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("Connecting...");
  const [jobLastStatus, setJobLastStatus] = useState<string>("");
  const [jobLastStepDisplay, setJobLastStepDisplay] = useState<string>("");
  const [lastStep, setLastStep] = useState<string>("");
  const [tokenMethods, setTokenMethods] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [tokenInput, setTokenInput] = useState("");
  const [awaitingInput, setAwaitingInput] = useState(false);
  const [sendingChallenge, setSendingChallenge] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 4: Confirmation
  const [success, setSuccess] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ accounts: number; transactions: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSearchResults([]);
      setCredentials({});
      setSuccess(false);
      setSyncing(false);
      setSyncResult(null);
      setErrorMessage("");
      setLastStep("");
      setTokenMethods([]);
      setTokenInput("");
      setAwaitingInput(false);

      if (refreshData) {
        // Start directly at verification step for refresh
        setSelectedInstitution({ InstitutionName: refreshData.institutionName } as SophtronInstitution);
        setJobStatus("Starting refresh...");
        setStep("verification");

        // Call refresh API to create the job
        fetch(`/api/institution/${refreshData.institutionId}/refresh`, { method: "POST" })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              setErrorMessage(data.error);
              setSuccess(false);
              setStep("confirmation");
            } else {
              setJobId(data.jobId);
              setMemberId(data.memberId);
              setJobStatus("Refreshing...");
            }
          })
          .catch((err) => {
            setErrorMessage(err instanceof Error ? err.message : "Failed to start refresh");
            setSuccess(false);
            setStep("confirmation");
          });
      } else {
        setSelectedInstitution(null);
        setJobId(null);
        setMemberId(null);
        setJobStatus("Connecting...");
        setStep("search");
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [open, refreshData]);

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sophtron/search?query=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setSearchResults(data);
        }
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [searchQuery]);

  // Step 1 → 2: Select institution
  const handleSelectInstitution = (inst: SophtronInstitution) => {
    setSelectedInstitution(inst);
    const initial: Record<string, string> = {};
    inst.InstitutionDetail?.LoginFormFields?.forEach((f) => {
      initial[f.MappedField] = "";
    });
    setCredentials(initial);
    setStep("credentials");
  };

  // Step 2 → 3: Submit credentials
  const handleSubmitCredentials = async () => {
    if (!selectedInstitution) return;
    setSubmitting(true);

    try {
      // Ensure we have a sophtron customer ID
      await fetch("/api/sophtron/customer");

      const institutionId = selectedInstitution.InstitutionID || selectedInstitution.InstitutionId;
      const res = await fetch("/api/sophtron/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId, credentials }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to connect");
        setStep("confirmation");
        setSubmitting(false);
        return;
      }

      setJobId(data.jobId);
      setMemberId(data.memberId);
      setStep("verification");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to connect");
      setStep("confirmation");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Poll job status
  const pollJob = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/sophtron/connect?jobId=${jobId}`);
      const job: JobResponse = await res.json();

      const currentLastStep = job.LastStep || "";
      const currentLastStatus = job.LastStatus || job.Status || "";
      setJobStatus(job.StatusMessage || job.Status || "Processing...");
      setJobLastStatus(currentLastStatus);
      setJobLastStepDisplay(currentLastStep);

      // Check for timeout
      if (currentLastStatus.toLowerCase() === "timeout") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setErrorMessage("Connection timed out. Please try again.");
        setSuccess(false);
        setStep("confirmation");
        return;
      }

      // Check for success
      if (job.SuccessFlag === true) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setMemberId(job.MemberID || job.MemberId || memberId);
        setSuccess(true);
        setStep("confirmation");
        return;
      }

      // Check for failure (job finished but not successful)
      if (job.SuccessFlag === false && currentLastStep && currentLastStep !== lastStep) {
        // Not a terminal failure yet if it's a challenge step
        if (currentLastStep !== "TokenMethods" && currentLastStep !== "TokenInput") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setErrorMessage(job.StatusMessage || "Connection failed");
          setSuccess(false);
          setStep("confirmation");
          return;
        }
      }

      // Handle challenge steps
      if (currentLastStep === "TokenMethods") {
        // Try TokenMethod first (single string of JSON array), then TokenMethods
        const raw = job.TokenMethod || job.TokenMethods;
        if (raw) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          try {
            const methods = JSON.parse(raw);
            setTokenMethods(Array.isArray(methods) ? methods : [methods]);
          } catch {
            setTokenMethods([raw].filter(Boolean));
          }
          setLastStep(currentLastStep);
          setAwaitingInput(true);
          return;
        }
        // No TokenMethod field yet — keep polling
      } else if (currentLastStep === "TokenInput" && currentLastStep !== lastStep) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setLastStep(currentLastStep);
        setTokenInput("");
        setTokenMethods([]);
        setAwaitingInput(true);
        return;
      } else if (currentLastStep !== lastStep) {
        setLastStep(currentLastStep);
      }
    } catch {
      // Continue polling on network errors
    }
  }, [jobId, lastStep, memberId]);

  // Start polling when entering verification step
  useEffect(() => {
    if (step === "verification" && jobId && !awaitingInput) {
      pollingRef.current = setInterval(pollJob, 5000);
      // Also poll immediately
      pollJob();
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [step, jobId, awaitingInput, pollJob]);

  // Answer challenge
  const handleAnswerChallenge = async (challengeType: string, answer: Record<string, string>) => {
    if (!jobId) return;
    setSendingChallenge(true);
    try {
      await fetch(`/api/sophtron/connect?jobId=${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeType, ...answer }),
      });
      setAwaitingInput(false);
      setTokenMethods([]);
      setTokenInput("");
      // Polling will restart via the useEffect
    } catch {
      // ignore, polling will catch up
    } finally {
      setSendingChallenge(false);
    }
  };

  // Step 4: Save institution and sync accounts/transactions on success
  useEffect(() => {
    if (step === "confirmation" && success && selectedInstitution && !syncing && !syncResult) {
      setSyncing(true);
      fetch("/api/sophtron/connect/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionName: selectedInstitution.InstitutionName,
          memberId: memberId || undefined,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          setSyncResult({
            accounts: data.accountsUpserted ?? 0,
            transactions: data.transactionsUpserted ?? 0,
          });
        })
        .catch(() => {
          setSyncResult({ accounts: 0, transactions: 0 });
        })
        .finally(() => {
          setSyncing(false);
        });
    }
  }, [step, success, selectedInstitution, syncing, syncResult]);

  const resetState = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setStep("search");
    setSearchQuery("");
    setSearchResults([]);
    setSearching(false);
    setSelectedInstitution(null);
    setCredentials({});
    setSubmitting(false);
    setJobId(null);
    setMemberId(null);
    setJobStatus("Connecting...");
    setJobLastStatus("");
    setJobLastStepDisplay("");
    setLastStep("");
    setTokenMethods([]);
    setSelectedMethod("");
    setTokenInput("");
    setAwaitingInput(false);
    setSendingChallenge(false);
    setSuccess(false);
    setSyncing(false);
    setSyncResult(null);
    setErrorMessage("");
  };

  const handleClose = () => {
    const wasSuccess = success;
    resetState();
    onClose();
    if (wasSuccess) onComplete();
  };

  const stepTitles: Record<Step, string> = {
    search: "Select Institution",
    credentials: "Log In",
    verification: "Verification",
    confirmation: success ? "Success" : "Connection Failed",
  };

  return (
    <Modal open={open} onClose={handleClose} title={stepTitles[step]} className="w-full max-w-lg">
      {/* Step 1: Search */}
      {step === "search" && (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for your bank..."
            autoFocus
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
          />
          {searching && (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          )}
          {!searching && searchResults.length > 0 && (
            <ul className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-700 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
              {searchResults.map((inst) => {
                const id = inst.InstitutionID || inst.InstitutionId;
                const logoUrl = inst.Logo?.trim();
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => handleSelectInstitution(inst)}
                      className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUrl}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-200 text-xs font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                          {inst.InstitutionName.charAt(0)}
                        </div>
                      )}
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {inst.InstitutionName}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="py-4 text-center text-sm text-zinc-500">No institutions found.</p>
          )}
        </div>
      )}

      {/* Step 2: Credentials */}
      {step === "credentials" && selectedInstitution && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-md bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
            {selectedInstitution.Logo?.trim() && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedInstitution.Logo.trim()}
                alt=""
                className="h-6 w-6 rounded object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {selectedInstitution.InstitutionName}
            </span>
          </div>

          {selectedInstitution.InstitutionDetail?.LoginFormFields?.map((field) => (
            <div key={field.MappedField}>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {field.DisplayText}
                {field.Optional && <span className="ml-1 text-zinc-400">(optional)</span>}
              </label>
              <input
                type={field.MappedField.toLowerCase().includes("password") ? "password" : "text"}
                value={credentials[field.MappedField] || ""}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, [field.MappedField]: e.target.value }))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep("search")}
              className="cursor-pointer rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmitCredentials}
              disabled={submitting}
              className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Verification */}
      {step === "verification" && (
        <div className="flex flex-col items-center gap-4 py-4">
          {!awaitingInput ? (
            <>
              <LoadingSpinner />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{jobStatus}</p>
              {(jobLastStepDisplay || jobLastStatus) && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {[jobLastStepDisplay && `Step: ${jobLastStepDisplay}`, jobLastStatus && `Status: ${jobLastStatus}`].filter(Boolean).join(" · ")}
                </p>
              )}
            </>
          ) : lastStep === "TokenMethods" && tokenMethods.length > 0 ? (
            <div className="w-full flex flex-col gap-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Select a verification method:
              </p>
              {tokenMethods.map((method) => (
                <label
                  key={method}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  <input
                    type="radio"
                    name="tokenMethod"
                    value={method}
                    checked={selectedMethod === method}
                    onChange={() => setSelectedMethod(method)}
                    className="accent-zinc-900 dark:accent-zinc-50"
                  />
                  <span className="text-sm text-zinc-900 dark:text-zinc-100">{method}</span>
                </label>
              ))}
              <button
                type="button"
                onClick={() => handleAnswerChallenge("TokenMethod", { answerText: selectedMethod })}
                disabled={!selectedMethod || sendingChallenge}
                className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {sendingChallenge ? "Sending..." : "Continue"}
              </button>
            </div>
          ) : lastStep === "TokenInput" ? (
            <div className="w-full flex flex-col gap-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Enter the verification code sent to your device:
              </p>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Verification code"
                autoFocus
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
              />
              <button
                type="button"
                onClick={() => handleAnswerChallenge("TokenInput", { answerText: String(tokenInput) })}
                disabled={!tokenInput.trim() || sendingChallenge}
                className="cursor-pointer rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {sendingChallenge ? "Verifying..." : "Submit"}
              </button>
            </div>
          ) : (
            <>
              <LoadingSpinner />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{jobStatus}</p>
            </>
          )}
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === "confirmation" && (
        <div className="flex flex-col items-center gap-4 py-4">
          {success ? (
            syncing ? (
              <>
                <LoadingSpinner />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Syncing accounts and transactions...
                </p>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  <strong>{selectedInstitution?.InstitutionName}</strong> has been connected successfully.
                </p>
                {syncResult && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Synced {syncResult.accounts} account{syncResult.accounts !== 1 ? "s" : ""} and {syncResult.transactions} transaction{syncResult.transactions !== 1 ? "s" : ""}.
                  </p>
                )}
              </>
            )
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">
                {errorMessage || "Failed to connect the institution."}
              </p>
            </>
          )}
          {!syncing && (
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              OK
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
