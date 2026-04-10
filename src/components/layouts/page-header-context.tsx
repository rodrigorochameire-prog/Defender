"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface PageHeaderContextValue {
  hasPageHeader: boolean;
  setHasPageHeader: (value: boolean) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  hasPageHeader: false,
  setHasPageHeader: () => {},
});

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [hasPageHeader, setHasPageHeaderState] = useState(false);
  const setHasPageHeader = useCallback((value: boolean) => {
    setHasPageHeaderState(value);
  }, []);

  return (
    <PageHeaderContext.Provider value={{ hasPageHeader, setHasPageHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  return useContext(PageHeaderContext);
}
