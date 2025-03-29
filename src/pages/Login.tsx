import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import { RootState } from '../store';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Container,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { login } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Если пользователь уже аутентифицирован, перенаправляем его
  useEffect(() => {
    if (isAuthenticated && user) {
      const lastPath = localStorage.getItem('lastPath');
      if (lastPath && lastPath.includes(`/${user.role.toLowerCase()}`)) {
        navigate(lastPath);
      } else {
        navigate(`/${user.role.toLowerCase()}`);
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(username, password);
      localStorage.setItem('user', JSON.stringify(response.user));
      dispatch(setCredentials(response));
      
      // Получаем сохраненный путь из localStorage
      const lastPath = localStorage.getItem('lastPath');
      
      // Если есть сохраненный путь и он соответствует роли пользователя, перенаправляем на него
      if (lastPath && lastPath.includes(`/${response.user.role.toLowerCase()}`)) {
        navigate(lastPath);
      } else {
        // Иначе перенаправляем на дефолтный путь для роли
        navigate(`/${response.user.role.toLowerCase()}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверные учетные данные');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Вход в систему
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Имя пользователя"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="Показать/скрыть пароль"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {error && (
              <Typography color="error" align="center" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Войти'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 