import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

/**
 * Компонент для отслеживания и сохранения текущего пути в localStorage
 * Используется для восстановления навигации после перезагрузки страницы
 */
const PathTracker: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Сохраняем путь только если пользователь аутентифицирован
    // и текущий путь не является страницей входа
    if (isAuthenticated && user && location.pathname !== '/login') {
      // Проверяем, что путь соответствует роли пользователя
      if (location.pathname.includes(`/${user.role.toLowerCase()}`)) {
        localStorage.setItem('lastPath', location.pathname);
      }
    }
  }, [location.pathname, isAuthenticated, user]);

  // Компонент не рендерит ничего в DOM
  return null;
};

export default PathTracker; 