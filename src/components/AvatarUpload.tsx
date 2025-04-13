import React, { useState } from 'react';
import {
  Box,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  name: string;
  size?: number;
  onAvatarChange?: (newAvatarUrl: string) => void;
  editable?: boolean;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  name,
  size = 40,
  onAvatarChange,
  editable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useInitials, setUseInitials] = useState(!currentAvatarUrl);

  // Обработчик ошибки при загрузке аватара
  const handleImageError = () => {
    console.error('Ошибка при загрузке аватара, использую инициалы');
    setUseInitials(true);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB');
      return;
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Создаем превью
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('avatar', file);

      console.log('Отправка запроса на загрузку аватара');

      // Отправляем файл на сервер
      const response = await fetch('http://localhost:3001/api/users/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      console.log('Получен ответ:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Неизвестная ошибка' }));
        throw new Error(errorData.message || 'Не удалось загрузить аватар');
      }

      const data = await response.json();
      console.log('Данные ответа:', data);
      
      // Проверяем, что URL аватара получен
      if (!data.avatarUrl) {
        throw new Error('Сервер не вернул URL аватара');
      }
      
      // Успешно загрузили аватар
      console.log('Аватар успешно загружен');
      setUseInitials(false);
      
      // Вызываем callback с новым URL аватара
      if (onAvatarChange) {
        console.log('Вызываем onAvatarChange с URL:', data.avatarUrl);
        onAvatarChange(data.avatarUrl);
      } else {
        console.warn('onAvatarChange не определен');
      }
      
      // Закрываем диалог
      setOpen(false);
    } catch (err) {
      console.error('Ошибка при загрузке аватара:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке аватара');
      setPreviewUrl(null);
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Формируем URL с учетом кэширования
  const getAvatarUrl = (): string | undefined => {
    if (!currentAvatarUrl || useInitials) return undefined;
    
    const serverUrl = 'http://localhost:3001';
    const url = currentAvatarUrl.startsWith('http') 
      ? currentAvatarUrl 
      : `${serverUrl}${currentAvatarUrl}`;
    
    // Добавляем метку времени для предотвращения кэширования
    const timestamp = Date.now();
    return `${url}?t=${timestamp}`;
  };

  return (
    <>
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <Avatar
          src={previewUrl || getAvatarUrl()}
          alt={name}
          onError={handleImageError}
          sx={{ 
            width: size, 
            height: size,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: size * 0.4,
          }}
        >
          {(useInitials || !currentAvatarUrl) && getInitials(name)}
        </Avatar>
        {editable && (
          <IconButton
            size="small"
            onClick={() => setOpen(true)}
            sx={{
              position: 'absolute',
              right: -8,
              bottom: -8,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              '&:hover': {
                bgcolor: 'background.paper',
              },
            }}
          >
            <EditIcon fontSize="small" color="primary" />
          </IconButton>
        )}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Изменить аватар</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Avatar
              src={previewUrl || getAvatarUrl()}
              alt={name}
              onError={handleImageError}
              sx={{ 
                width: 120, 
                height: 120, 
                mx: 'auto',
                mb: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: 48,
              }}
            >
              {(useInitials || !currentAvatarUrl) && getInitials(name)}
            </Avatar>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="avatar-upload"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="avatar-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<PhotoCameraIcon />}
                disabled={loading}
              >
                {loading ? 'Загрузка...' : 'Выбрать фото'}
              </Button>
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AvatarUpload; 