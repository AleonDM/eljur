import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Badge,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Divider,
  TextField,
  IconButton,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  ListItemButton,
  Chip,
  DialogActions,
} from '@mui/material';
import { 
  Person as PersonIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AvatarUpload from './AvatarUpload';

interface User {
  id: number;
  name: string;
  role: string;
  avatarUrl?: string;
}

interface Conversation {
  user: {
    id: number;
    name: string;
    role: string;
    avatarUrl?: string;
  };
  lastMessage: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
}

interface MessageListProps {
  onSelectConversation: (userId: number) => void;
  selectedUserId?: number;
}

const MessageList: React.FC<MessageListProps> = ({ onSelectConversation, selectedUserId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const currentUser = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (isSearchDialogOpen) {
      searchUsers(searchQuery);
    }
  }, [searchQuery, isSearchDialogOpen]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Не удалось загрузить диалоги');
      }

      const data = await response.json();
      setConversations(data);
      setError(null);
    } catch (err) {
      setError('Произошла ошибка при загрузке диалогов');
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setAvailableUsers([]);
      return;
    }

    setSearchLoading(true);
    try {
      const endpoint = currentUser?.role === 'teacher' ? '/api/users/students' : '/api/users/teachers';
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить список пользователей');
      }

      const users = await response.json();
      const filteredUsers = users.filter((user: User) => 
        user.name.toLowerCase().includes(query.toLowerCase()) &&
        !conversations.some(conv => conv.user.id === user.id)
      );
      setAvailableUsers(filteredUsers);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStartConversation = async (userId: number) => {
    try {
      // Отправляем пустое сообщение для создания диалога
      const response = await fetch('http://localhost:3001/api/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toUserId: userId,
          content: 'Начало диалога'
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось создать диалог');
      }

      // Обновляем список диалогов
      await fetchConversations();
      setIsSearchDialogOpen(false);
      onSelectConversation(userId);
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'teacher':
        return 'Учитель';
      case 'student':
        return 'Ученик';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <>
      <Paper elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Button
            fullWidth
            variant="outlined"
            color="primary"
            startIcon={<AddIcon color="primary" />}
            onClick={() => setIsSearchDialogOpen(true)}
          >
            Начать новый диалог
          </Button>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          ) : loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress color="primary" />
            </Box>
          ) : conversations.length === 0 ? (
            <Box p={2}>
              <Typography color="text.secondary">
                У вас пока нет диалогов
              </Typography>
            </Box>
          ) : (
            <List>
              {conversations.map((conversation) => (
                <ListItemButton
                  key={conversation.user.id}
                  selected={selectedUserId === conversation.user.id}
                  onClick={() => onSelectConversation(conversation.user.id)}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                      '&:hover': {
                        bgcolor: 'action.selected',
                      },
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      color="primary"
                      badgeContent={conversation.unreadCount}
                      invisible={conversation.unreadCount === 0}
                    >
                      <AvatarUpload
                        currentAvatarUrl={conversation.user.avatarUrl}
                        name={conversation.user.name}
                        size={40}
                      />
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography 
                          component="span" 
                          variant="subtitle1" 
                          color="primary"
                          sx={{ fontWeight: conversation.unreadCount > 0 ? 'bold' : 'normal' }}
                        >
                          {conversation.user.name}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          ({getRoleText(conversation.user.role)})
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {conversation.lastMessage?.content}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {new Date(conversation.lastMessage?.createdAt).toLocaleTimeString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Paper>

      <Dialog
        open={isSearchDialogOpen}
        onClose={() => setIsSearchDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Поиск пользователей</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Поиск по имени"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon color="primary" />
                  </InputAdornment>
                ),
              }}
              color="primary"
            />
          </Box>

          {searchError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {searchError}
            </Alert>
          )}

          {searchLoading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress color="primary" />
            </Box>
          ) : availableUsers.length > 0 ? (
            <List sx={{ mt: 2 }}>
              {availableUsers.map((user) => (
                <ListItemButton
                  key={user.id}
                  onClick={() => handleStartConversation(user.id)}
                  sx={{
                    '&:hover': {
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText',
                    },
                  }}
                >
                  <ListItemAvatar>
                    <AvatarUpload
                      currentAvatarUrl={user.avatarUrl}
                      name={user.name}
                      size={40}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary={getRoleText(user.role)}
                    primaryTypographyProps={{
                      color: 'text.primary',
                    }}
                    secondaryTypographyProps={{
                      color: 'text.secondary',
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : searchQuery && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Пользователи не найдены
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSearchDialogOpen(false)} color="primary">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MessageList; 