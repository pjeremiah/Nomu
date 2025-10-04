import React, { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const value = {
    showLogoutConfirm,
    setShowLogoutConfirm
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};
