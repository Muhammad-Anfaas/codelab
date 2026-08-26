import { useContext } from 'react';
import { DataContext } from './context';

// Any page or component calls useData() to read state and get the actions.
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData() must be used inside <DataProvider>');
  }
  return ctx;
}
