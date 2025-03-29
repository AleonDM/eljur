import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { UserRole } from '../store/slices/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: UserRole;
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!isAuthenticated || !user) {
    if (location.pathname !== '/login' && location.pathname !== '/') {
      localStorage.setItem('lastPath', location.pathname);
    }
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 