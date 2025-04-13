import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './store/index.ts';
import { createAppTheme } from './theme';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import StudentDashboard from './pages/student/Dashboard';
import DirectorDashboard from './pages/director/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import StudentHomework from './pages/student/HomeworkView';
import StudentSchedule from './pages/student/Schedule';
import TeacherHomework from './pages/teacher/HomeworkManagement';
import TeacherSchedule from './pages/teacher/Schedule';
import Messages from './pages/Messages';
import { Box, Typography } from '@mui/material';
import { useEffect } from 'react';
import { setCredentials } from './store/slices/authSlice';
import { RootState } from './store';
import PathTracker from './components/PathTracker';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import UserProfile from './components/UserProfile';

const AppContent = () => {
  const { mode, customColor } = useTheme();
  const theme = createAppTheme(mode, customColor);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthInitializer>
          <Layout>
            <PathTracker />
            <AppRoutes />
          </Layout>
        </AuthInitializer>
      </Router>
    </MuiThemeProvider>
  );
};

const AppRoutes = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/director/*"
        element={
          <ProtectedRoute role="director">
            <DirectorDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/teacher"
        element={
          <ProtectedRoute role="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/homework"
        element={
          <ProtectedRoute role="teacher">
            <TeacherHomework />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/schedule"
        element={
          <ProtectedRoute role="teacher">
            <TeacherSchedule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/messages"
        element={
          <ProtectedRoute role="teacher">
            {user && <Messages currentUser={{ userId: Number(user.id), role: user.role }} />}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/homework"
        element={
          <ProtectedRoute role="student">
            <StudentHomework />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/schedule"
        element={
          <ProtectedRoute role="student">
            <StudentSchedule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/messages"
        element={
          <ProtectedRoute role="student">
            {user && <Messages currentUser={{ userId: Number(user.id), role: user.role }} />}
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute role={user?.role || 'student'}>
            <UserProfile />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" color="error">
            Страница не найдена
          </Typography>
        </Box>
      } />
    </Routes>
  );
};

const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        dispatch(setCredentials({ user, token }));
        
        if ((location.pathname === '/login' || location.pathname === '/') && localStorage.getItem('lastPath')) {
          const lastPath = localStorage.getItem('lastPath');
          if (lastPath && lastPath.includes(`/${user.role.toLowerCase()}`)) {
            navigate(lastPath);
          } else {
            navigate(`/${user.role.toLowerCase()}`);
          }
        }
      } catch (error) {
        console.error('Ошибка при восстановлении сессии:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, [dispatch, navigate, location.pathname]);

  return <>{children}</>;
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
}

export default App; 