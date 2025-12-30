import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type AssistantContextState = {
  page: string;
  context: Record<string, unknown> | null;
};

type AssistantContextValue = AssistantContextState & {
  setContext: (page: string, context: Record<string, unknown> | null) => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AssistantContextState>({
    page: "unknown",
    context: null,
  });

  const setContext = useCallback(
    (page: string, context: Record<string, unknown> | null) => {
      setState((prev) => {
        if (prev.page === page && prev.context === context) return prev;
        return { page, context };
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      ...state,
      setContext,
    }),
    [state, setContext]
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error("useAssistantContext must be used within AssistantProvider");
  }
  return ctx;
}
