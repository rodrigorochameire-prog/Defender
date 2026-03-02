"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type JobType = "classification" | "transcription" | "sync" | "extraction";

export type ProcessingJob = {
  id: string;
  type: JobType;
  label: string;
  status: "running" | "completed" | "failed";
  /** 0-100 for determinate, -1 for indeterminate */
  progress: number;
  detail: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
};

type ProcessingQueueContextType = {
  jobs: ProcessingJob[];
  activeJobs: ProcessingJob[];
  recentJobs: ProcessingJob[];
  activeCount: number;
  addJob: (job: Omit<ProcessingJob, "startedAt">) => void;
  updateJob: (id: string, updates: Partial<ProcessingJob>) => void;
  completeJob: (id: string, detail?: string) => void;
  failJob: (id: string, error: string) => void;
  removeJob: (id: string) => void;
};

const ProcessingQueueContext = createContext<ProcessingQueueContextType | undefined>(undefined);

const MAX_HISTORY = 20;
const HISTORY_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function ProcessingQueueProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCleanup = useCallback(() => {
    if (cleanupTimerRef.current) clearTimeout(cleanupTimerRef.current);
    cleanupTimerRef.current = setTimeout(() => {
      setJobs((prev) => {
        const now = Date.now();
        return prev.filter((j) => {
          if (j.status === "running") return true;
          if (!j.completedAt) return true;
          return now - j.completedAt.getTime() < HISTORY_TTL_MS;
        }).slice(-MAX_HISTORY);
      });
    }, HISTORY_TTL_MS);
  }, []);

  const addJob = useCallback((job: Omit<ProcessingJob, "startedAt">) => {
    setJobs((prev) => {
      const existing = prev.findIndex((j) => j.id === job.id);
      const newJob: ProcessingJob = { ...job, startedAt: new Date() };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newJob;
        return updated;
      }
      return [...prev, newJob];
    });
  }, []);

  const updateJob = useCallback((id: string, updates: Partial<ProcessingJob>) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, ...updates } : j))
    );
  }, []);

  const completeJob = useCallback((id: string, detail?: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, status: "completed" as const, progress: 100, completedAt: new Date(), ...(detail ? { detail } : {}) }
          : j
      )
    );
    scheduleCleanup();
  }, [scheduleCleanup]);

  const failJob = useCallback((id: string, error: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id
          ? { ...j, status: "failed" as const, error, completedAt: new Date() }
          : j
      )
    );
    scheduleCleanup();
  }, [scheduleCleanup]);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const activeJobs = jobs.filter((j) => j.status === "running");
  const recentJobs = jobs.filter((j) => j.status !== "running");

  return (
    <ProcessingQueueContext.Provider
      value={{
        jobs,
        activeJobs,
        recentJobs,
        activeCount: activeJobs.length,
        addJob,
        updateJob,
        completeJob,
        failJob,
        removeJob,
      }}
    >
      {children}
    </ProcessingQueueContext.Provider>
  );
}

export function useProcessingQueue() {
  const ctx = useContext(ProcessingQueueContext);
  if (!ctx) {
    throw new Error("useProcessingQueue must be used within ProcessingQueueProvider");
  }
  return ctx;
}
