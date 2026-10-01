import React, { createContext, useContext, useState, useEffect } from 'react';

interface DashboardContextType {
  isFullScreen: boolean;
  setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DashboardContext = createContext<DashboardContextType>({
  isFullScreen: false,
  setIsFullScreen: () => {},
});

export const useDashboard = () => useContext(DashboardContext);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (isFullScreen) {
      document.body.classList.add('edurag-fullscreen');
    } else {
      document.body.classList.remove('edurag-fullscreen');
    }
    return () => {
      document.body.classList.remove('edurag-fullscreen');
    };
  }, [isFullScreen]);

  return (
    <DashboardContext.Provider value={{ isFullScreen, setIsFullScreen }}>
      {children}
    </DashboardContext.Provider>
  );
}
