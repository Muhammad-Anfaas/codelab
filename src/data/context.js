import { createContext } from 'react';

// The context object lives in its own file so that both the provider
// (a component) and the hook can import it without circular imports.
export const DataContext = createContext(null);
