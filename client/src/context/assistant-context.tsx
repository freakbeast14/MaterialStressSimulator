import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

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
  const contextKeyRef = useRef<string>("");

  const buildContextKey = (page: string, context: Record<string, unknown> | null) => {
    if (!context) return `${page}::null`;
    try {
      return `${page}::${JSON.stringify(context)}`;
    } catch {
      return `${page}::${Object.keys(context).join("|")}`;
    }
  };

  const setContext = useCallback(
    (page: string, context: Record<string, unknown> | null) => {
      setState((prev) => {
        const nextKey = buildContextKey(page, context);
        if (contextKeyRef.current === nextKey) return prev;
        contextKeyRef.current = nextKey;
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
