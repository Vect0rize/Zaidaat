import React, { createContext, useContext, useState } from 'react';
import type { Property } from '../types';

interface CompareContextValue {
  compareItems: Property[];
  toggleCompare: (property: Property) => void;
  removeCompare: (id: number) => void;
  clearCompare: () => void;
  isInCompare: (id: number) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareItems, setCompareItems] = useState<Property[]>([]);

  const toggleCompare = (property: Property) => {
    setCompareItems((prev) => {
      const exists = prev.some((p) => p.id === property.id);
      if (exists) return prev.filter((p) => p.id !== property.id);
      if (prev.length >= 4) {
        return [...prev.slice(1), property];
      }
      return [...prev, property];
    });
  };

  const removeCompare = (id: number) => {
    setCompareItems((prev) => prev.filter((p) => p.id !== id));
  };

  const clearCompare = () => setCompareItems([]);

  const isInCompare = (id: number) => compareItems.some((p) => p.id === id);

  return (
    <CompareContext.Provider value={{ compareItems, toggleCompare, removeCompare, clearCompare, isInCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider');
  return ctx;
}
