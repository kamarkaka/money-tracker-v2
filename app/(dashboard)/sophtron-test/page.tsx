"use client";

import { useState } from "react";

// ── Endpoint definitions ──

interface FieldDef {
  name: string;
  label: string;
  type: "text" | "textarea";
}

interface EndpointDef {
  name: string;
  group: string;
  method: string;
  fields: FieldDef[];
}

const ENDPOINTS: EndpointDef[] = [
  // Customer
  { name: "getCustomers", group: "Customer", method: "GET", fields: [{ name: "uniqueId", label: "Unique ID (optional)", type: "text" }] },
  { name: "createCustomer", group: "Customer", method: "POST", fields: [{ name: "body", label: "Body JSON", type: "textarea" }] },
  { name: "getCustomerById", group: "Customer", method: "GET", fields: [{ name: "id", label: "Customer ID", type: "text" }] },
  { name: "updateCustomer", group: "Customer", method: "PUT", fields: [{ name: "id", label: "Customer ID", type: "text" }, { name: "body", label: "Body JSON", type: "textarea" }] },
  { name: "deleteCustomer", group: "Customer", method: "DELETE", fields: [{ name: "id", label: "Customer ID", type: "text" }] },
  // Institution
  { name: "searchInstitutions", group: "Institution", method: "GET", fields: [{ name: "query", label: "Query (optional)", type: "text" }, { name: "type", label: "Type (optional, number)", type: "text" }, { name: "extensive", label: "Extensive (optional, true/false)", type: "text" }] },
  // Member
  { name: "createMember", group: "Member", method: "POST", fields: [{ name: "customerId", label: "Customer ID", type: "text" }, { name: "jobType", label: "Job Type", type: "text" }, { name: "body", label: "Body JSON", type: "textarea" }] },
  { name: "getMembers", group: "Member", method: "GET", fields: [{ name: "customerId", label: "Customer ID", type: "text" }] },
  { name: "getMemberById", group: "Member", method: "GET", fields: [{ name: "customerId", label: "Customer ID", type: "text" }, { name: "memberId", label: "Member ID", type: "text" }] },
  { name: "deleteMember", group: "Member", method: "DELETE", fields: [{ name: "customerId", label: "Customer ID", type: "text" }, { name: "memberId", label: "Member ID", type: "text" }] },
  { name: "refreshMember", group: "Member", method: "POST", fields: [{ name: "customerId", label: "Customer ID", type: "text" }, { name: "memberId", label: "Member ID", type: "text" }, { name: "jobType", label: "Job Type", type: "text" }] },
  { name: "updateMember", group: "Member", method: "PUT", fields: [{ name: "customerId", label: "Customer ID", type: "text" }, { name: "memberId", label: "Member ID", type: "text" }, { name: "jobType", label: "Job Type", type: "text" }, { name: "body", label: "Body JSON", type: "textarea" }] },
  // Account
  { name: "getAccountsByMember", group: "Account", method: "GET", fields: [{ name: "customerId", label: "Customer ID", type: "text" }, { name: "memberId", label: "Member ID", type: "text" }] },
  { name: "getAccountsByCustomer", group: "Account", method: "GET", fields: [{ name: "customerId", label: "Customer ID", type: "text" }] },
  { name: "getAccountById", group: "Account", method: "GET", fields: [{ name: "customerId", label: "Customer ID", type: "text" }, { name: "accountId", label: "Account ID", type: "text" }] },
  { name: "getAccountHoldings", group: "Account", method: "GET", fields: [{ name: "customerId", label: "Customer ID", type: "text" }, { name: "accountId", label: "Account ID", type: "text" }] },
  { name: "getTransactions", group: "Account", method: "GET", fields: [{ name: "customerId", label: "Customer ID", type: "text" }, { name: "accountId", label: "Account ID", type: "text" }, { name: "startDate", label: "Start Date", type: "text" }, { name: "endDate", label: "End Date", type: "text" }] },
  // Job
  { name: "getJob", group: "Job", method: "GET", fields: [{ name: "id", label: "Job ID", type: "text" }] },
  { name: "answerJobChallenge", group: "Job", method: "PUT", fields: [{ name: "id", label: "Job ID", type: "text" }, { name: "challengeType", label: "Challenge Type", type: "text" }, { name: "body", label: "Body JSON", type: "textarea" }] },
];

const GROUPS = ["Customer", "Institution", "Member", "Account", "Job"];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function SophtronTestPage() {
  const [selected, setSelected] = useState<EndpointDef>(ENDPOINTS[5]); // default to searchInstitutions
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (ep: EndpointDef) => {
    setSelected(ep);
    setFieldValues({});
    setResponse(null);
    setError(null);
  };

  const handleFieldChange = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);
    try {
      const res = await fetch("/api/sophtron-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: selected.name, params: fieldValues }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
      } else {
        setResponse(JSON.stringify(data.data, null, 2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Sophtron API Tester
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Test Sophtron V2 API endpoints with custom parameters
        </p>
      </div>

      <div className="flex gap-6">
        {/* Endpoint sidebar */}
        <div className="w-72 shrink-0">
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
            {GROUPS.map((group) => (
              <div key={group}>
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {group}
                </div>
                {ENDPOINTS.filter((ep) => ep.group === group).map((ep) => (
                  <button
                    key={ep.name}
                    onClick={() => handleSelect(ep)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      selected.name === ep.name
                        ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-750"
                    }`}
                  >
                    <span
                      className={`inline-block w-14 rounded px-1.5 py-0.5 text-center text-xs font-mono font-bold ${METHOD_COLORS[ep.method]}`}
                    >
                      {ep.method}
                    </span>
                    <span className="truncate">{ep.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Selected endpoint header */}
          <div className="mb-4 flex items-center gap-3">
            <span
              className={`inline-block rounded px-2 py-1 text-xs font-mono font-bold ${METHOD_COLORS[selected.method]}`}
            >
              {selected.method}
            </span>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {selected.name}
            </span>
          </div>

          {/* Fields form */}
          <div className="mb-4 space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            {selected.fields.length === 0 ? (
              <p className="text-sm text-zinc-500">No parameters required.</p>
            ) : (
              selected.fields.map((field) => (
                <div key={field.name}>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={fieldValues[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      rows={5}
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                      placeholder='{"key": "value"}'
                    />
                  ) : (
                    <input
                      type="text"
                      value={fieldValues[field.name] || ""}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                  )}
                </div>
              ))
            )}

            <button
              onClick={handleSend}
              disabled={loading}
              className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Sending..." : "Send Request"}
            </button>
          </div>

          {/* Response area */}
          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
              <h3 className="mb-1 text-sm font-semibold text-red-800 dark:text-red-300">Error</h3>
              <pre className="whitespace-pre-wrap break-all font-mono text-sm text-red-700 dark:text-red-400">
                {error}
              </pre>
            </div>
          )}

          {response && (
            <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
              <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Response</h3>
              </div>
              <pre className="max-h-[600px] overflow-auto p-4 font-mono text-sm text-zinc-800 dark:text-zinc-200">
                {response}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
