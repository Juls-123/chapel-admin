// Global context for UI state and auth user reference - no business logic
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
} from "react";
import { User } from "@/lib/types/index";

// Global state interface - only UI flags and auth user reference
interface GlobalState {
  isLoading: any;
  auth: {
    user: User | null;
    isLoading: boolean;
  };
  ui: {
    sidebarOpen: boolean;
    theme: "light" | "dark";
    modalOpen: boolean;
  };
}

// Action types for state updates
type GlobalAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "CLEAR_USER" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SIDEBAR_OPEN"; payload: boolean }
  | { type: "SET_THEME"; payload: "light" | "dark" }
  | { type: "SET_MODAL_OPEN"; payload: boolean };

// Initial state
const initialState: GlobalState = {
  auth: {
    user: null,
    isLoading: true,
  },
  ui: {
    sidebarOpen: true,
    theme: "light",
    modalOpen: false,
  },
  isLoading: undefined,
};

// Reducer function
function globalReducer(state: GlobalState, action: GlobalAction): GlobalState {
  switch (action.type) {
    case "SET_USER":
      return {
        ...state,
        auth: {
          ...state.auth,
          user: action.payload,
        },
      };
    case "CLEAR_USER":
      return {
        ...state,
        auth: {
          ...state.auth,
          user: null,
        },
      };
    case "SET_LOADING":
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: action.payload,
        },
      };
    case "SET_SIDEBAR_OPEN":
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: action.payload,
        },
      };
    case "SET_THEME":
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: action.payload,
        },
      };
    case "SET_MODAL_OPEN":
      return {
        ...state,
        ui: {
          ...state.ui,
          modalOpen: action.payload,
        },
      };
    default:
      return state;
  }
}

// Context interface
interface GlobalContextType {
  state: GlobalState;
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
  setModalOpen: (open: boolean) => void;
}

// Create context
const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

// Provider component
interface GlobalProviderProps {
  children: ReactNode;
}

export function GlobalProvider({ children }: GlobalProviderProps) {
  const [state, dispatch] = useReducer(globalReducer, initialState);

  // Action creators
  const setUser = (user: User | null) => {
    dispatch({ type: "SET_USER", payload: user });
  };

  const clearUser = () => {
    dispatch({ type: "CLEAR_USER" });
  };

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  }, []);

  const setSidebarOpen = (open: boolean) => {
    dispatch({ type: "SET_SIDEBAR_OPEN", payload: open });
  };

  const setTheme = (theme: "light" | "dark") => {
    dispatch({ type: "SET_THEME", payload: theme });
  };

  const setModalOpen = (open: boolean) => {
    dispatch({ type: "SET_MODAL_OPEN", payload: open });
  };

  const value: GlobalContextType = {
    state,
    user: state.auth.user,
    isLoading: state.auth.isLoading,
    setUser,
    clearUser,
    setLoading,
    setSidebarOpen,
    setTheme,
    setModalOpen,
  };

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
}

// Hook to use the global context
export function useGlobalContext() {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
}
