"use client";

import { useState, useRef } from "react";

export default function SimpleCreateProjectModal({ isOpen, onClose, onSubmit }) {
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const nameInputRef = useRef(null);

  const validateName = (name) => name && name.trim().length >= 3;

  const handleSubmit = async () => {
    if (!validateName(projectName)) {
      setError("Please enter at least 3 characters");
      nameInputRef.current?.focus();
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", projectName.trim());
      if (projectDescription.trim()) {
        formData.append("description", projectDescription.trim());
      }
      const res = await fetch("/api/projects", { method: "POST", body: formData });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to create project");
      }
      onSubmit(result.project);
      // reset
      setProjectName("");
      setProjectDescription("");
      setIsSubmitting(false);
    } catch (e) {
      setIsSubmitting(false);
      setError(e.message || "Failed to create project");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New project</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-gray-100 text-gray-500" aria-label="Close">×</button>
        </div>
        <div className="px-5 pt-4 pb-2 space-y-4">
          <div>
            <label className="text-sm text-gray-700">Project name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Customer Churn Model"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent ${error ? "border-red-400" : "border-gray-300"}`}
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">Description (optional)</label>
            <textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Short summary to remind you later"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent resize-none h-20"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm text-white shadow hover:bg-violet-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
