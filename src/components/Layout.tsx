import { Box, AppBar, Toolbar, Typography, Button, Drawer, IconButton, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Tooltip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip, CircularProgress } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import MenuIcon from '@mui/icons-material/Menu';
import GradeIcon from '@mui/icons-material/Grade';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MessageIcon from '@mui/icons-material/Message';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useEffect, useState } from 'react';
import { useTheme, DEFAULT_PRIMARY_COLOR } from '../contexts/ThemeContext';
import { ChromePicker } from 'react-color';
import { getClassRatings, StudentRating } from '../services/api';
import { getGradeColor } from '../utils/gradeUtils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { mode, toggleTheme, customColor, setCustomColor, resetColor } = useTheme();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [studentRating, setStudentRating] = useState<{ rank: number; total: number; average: number } | null>(null);
  const [loadingRating, setLoadingRating] = useState(false);

  useEffect(() => {
    // Загружаем рейтинг только для студентов и только если есть classId
    if (isAuthenticated && user?.role === 'student' && user?.classId) {
      const fetchRating = async () => {
        try {
          setLoadingRating(true);
          const ratings = await getClassRatings(user.classId as string);
          
          // Найдем рейтинг текущего пользователя
          if (ratings.length > 0) {
            // Сортируем по среднему баллу от высшего к низшему
            const sortedRatings = [...ratings].sort((a, b) => b.averageGrade - a.averageGrade);
            
            // Находим индекс текущего пользователя
            const userIndex = sortedRatings.findIndex(r => r.studentId.toString() === user.id);
            
            if (userIndex !== -1) {
              setStudentRating({
                rank: userIndex + 1,
                total: ratings.length,
                average: sortedRatings[userIndex].averageGrade
              });
            }
          }
        } catch (error) {
          console.error('Ошибка при загрузке рейтинга:', error);
        } finally {
          setLoadingRating(false);
        }
      };
      
      fetchRating();
    }
  }, [isAuthenticated, user]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleColorChange = (color: { hex: string }) => {
    setCustomColor(color.hex);
  };

  const handleColorPickerClose = () => {
    setColorPickerOpen(false);
  };

  const isHomePage = location.pathname === '/';

  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'teacher':
        return [
          { text: 'Оценки', icon: <GradeIcon />, path: '/teacher' },
          { text: 'Расписание', icon: <ScheduleIcon />, path: '/teacher/schedule' },
          { text: 'Домашние задания', icon: <AssignmentIcon />, path: '/teacher/homework' },
          { text: 'Сообщения', icon: <MessageIcon />, path: '/teacher/messages' },
        ];
      case 'student':
        return [
          { text: 'Оценки', icon: <GradeIcon />, path: '/student' },
          { text: 'Домашние задания', icon: <AssignmentIcon />, path: '/student/homework' },
          { text: 'Расписание', icon: <ScheduleIcon />, path: '/student/schedule' },
          { text: 'Сообщения', icon: <MessageIcon />, path: '/student/messages' },
          { text: 'Рейтинг', icon: <EmojiEventsIcon />, path: '/student/rating' },
        ];
      default:
        return [];
    }
  };

  // Компонент отображения рейтинга для многократного использования
  const RatingDisplay = () => {
    if (user?.role !== 'student' || !studentRating) return null;
    
    if (loadingRating) {
      return <CircularProgress size={20} color="inherit" />;
    }
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <EmojiEventsIcon sx={{ mr: 0.5, fontSize: '1.2rem' }} />
        <Typography variant="body2" sx={{ mr: 1 }}>
          Рейтинг: {studentRating.rank}/{studentRating.total}
        </Typography>
        <Chip 
          label={studentRating.average.toFixed(2)}
          size="small"
          sx={{ 
            color: 'white',
            bgcolor: getGradeColor(studentRating.average),
            fontWeight: 'bold',
            minWidth: 45
          }}
        />
      </Box>
    );
  };

  const navigationItems = getNavItems();

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation" onClick={() => setDrawerOpen(false)}>
      {user?.role === 'student' && (
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <RatingDisplay />
        </Box>
      )}
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.path} component="div">
            <ListItemButton 
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isHomePage && (
        <AppBar 
          position="static" 
          color="primary"
        >
          <Toolbar>
            {isAuthenticated && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 2, display: { sm: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <Typography
              variant="h6"
              component="div"
              sx={{ 
                flexGrow: 0, 
                cursor: 'pointer', 
                mr: 4,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                color: 'white'
              }}
              onClick={() => navigate('/')}
            >
              Электронный дневник
            </Typography>
            
            <Box sx={{ display: { xs: 'none', sm: 'block' }, flexGrow: 1 }}>
              {getNavItems().map((item) => (
                <Button
                  key={item.path}
                  color="inherit"
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: 'inherit',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
            
            {isAuthenticated && (
              <>
                {user?.role === 'student' && (
                  <Box sx={{ mr: 3, display: { xs: 'none', sm: 'flex' } }}>
                    <RatingDisplay />
                  </Box>
                )}

                <Typography 
                  variant="body1" 
                  sx={{ 
                    mr: 2,
                    display: { xs: 'none', sm: 'block' }
                  }}
                >
                  {user?.name} ({user?.role})
                </Typography>

                {mode === 'light' && (
                  <>
                    <Tooltip title="Изменить цвет темы">
                      <IconButton 
                        color="inherit"
                        onClick={() => setColorPickerOpen(true)}
                        sx={{ mr: 1 }}
                      >
                        <ColorLensIcon />
                      </IconButton>
                    </Tooltip>

                    <Dialog 
                      open={colorPickerOpen} 
                      onClose={handleColorPickerClose}
                      PaperProps={{
                        sx: { 
                          maxWidth: 'fit-content',
                          bgcolor: 'background.paper',
                          p: 2
                        }
                      }}
                    >
                      <DialogTitle>Выберите цвет темы</DialogTitle>
                      <DialogContent>
                        <ChromePicker 
                          color={customColor || DEFAULT_PRIMARY_COLOR}
                          onChange={handleColorChange}
                          disableAlpha
                        />
                      </DialogContent>
                      <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Button 
                          onClick={resetColor} 
                          variant="outlined"
                        >
                          Сбросить
                        </Button>
                        <Button 
                          onClick={handleColorPickerClose}
                          variant="contained"
                        >
                          Закрыть
                        </Button>
                      </DialogActions>
                    </Dialog>
                  </>
                )}

                <Tooltip title={mode === 'light' ? 'Тёмная тема' : 'Светлая тема'}>
                  <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
                    {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
                  </IconButton>
                </Tooltip>
                <Button 
                  color="inherit"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  endIcon={<AccountCircleIcon />}
                >
                  {user?.name}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                >
                  <MenuItem onClick={() => {
                    navigate('/profile');
                    setAnchorEl(null);
                  }}>
                    <ListItemIcon>
                      <AccountCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Профиль" />
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Выйти" />
                  </MenuItem>
                </Menu>
              </>
            )}
          </Toolbar>
        </AppBar>
      )}

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 