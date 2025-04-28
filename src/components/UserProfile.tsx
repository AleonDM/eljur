import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Alert,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import AvatarUpload from './AvatarUpload';
import { setCredentials } from '../store/slices/authSlice';

const UserProfile: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);

  const handleAvatarChange = (newAvatarUrl: string) => {
    console.log('UserProfile: изменение аватара на', newAvatarUrl);
    if (user) {
      dispatch(setCredentials({
        user: { ...user, avatarUrl: newAvatarUrl },
        token: localStorage.getItem('token') || ''
      }));
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'director':
        return 'Директор';
      case 'teacher':
        return 'Учитель';
      case 'student':
        return 'Ученик';
      default:
        return role;
    }
  };

  if (!user) return null;

  return (
    <Paper elevation={2} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <AvatarUpload
          currentAvatarUrl={user.avatarUrl}
          name={user.name}
          size={120}
          onAvatarChange={handleAvatarChange}
          editable={true}
        />
        <Box sx={{ ml: 3 }}>
          <Typography variant="h5" color="primary" gutterBottom>
            {user.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {getRoleText(user.role)}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default UserProfile; 