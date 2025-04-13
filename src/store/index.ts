import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Добавляем типизацию для состояния аутентификации
declare module 'react-redux' {
  interface DefaultRootState {
    auth: {
      isAuthenticated: boolean;
      user: {
        id: string;
        username: string;
        role: string;
        name: string;
        classId?: string | null;
        avatarUrl?: string | null;
      } | null;
      token: string | null;
    };
  }
} 