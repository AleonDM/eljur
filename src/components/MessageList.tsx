import React, { useState, useEffect, useRef } from 'react';
import {
  List,
  ListItemText,
  ListItemAvatar,
  Typography,
  Badge,
  Paper,
  Box,
  CircularProgress,
  Alert,
  TextField,
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
  Close as CloseIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AvatarUpload from './AvatarUpload';
import { io, Socket } from 'socket.io-client';

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
    hasAttachment?: boolean;
    attachmentType?: string;
    attachmentName?: string;
  };
  unreadCount: number;
}

interface Message {
  id: number;
  content: string;
  fromUserId: number;
  toUserId: number;
  isRead: boolean;
  hasAttachment?: boolean;
  attachmentType?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
  from?: {
    id: number;
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

interface MessageListProps {
  onSelectConversation: (userId: number) => void;
  selectedUserId?: number;
}

// Получаем URL API и сокета из переменных окружения или используем localhost для разработки
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

const MessageList: React.FC<MessageListProps> = ({ onSelectConversation, selectedUserId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Установка соединения с Socket.IO
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Создаем соединение с Socket.IO
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      console.log('MessageList: Socket.IO подключен');
      setSocketConnected(true);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('MessageList: Ошибка подключения Socket.IO:', err.message);
      setSocketConnected(false);
    });

    socketRef.current.on('disconnect', () => {
      console.log('MessageList: Socket.IO отключен');
      setSocketConnected(false);
    });

    // Обработка новых сообщений
    socketRef.current.on('message', (data) => {
      if (data.type === 'NEW_MESSAGE' && data.message) {
        handleNewMessage(data.message);
      } else if (data.type === 'MESSAGE_DELETED' && data.messageId) {
        // При необходимости можно обработать удаление сообщения
        fetchConversations();
      } else if (data.type === 'MESSAGES_READ' && data.fromUserId) {
        // Обработка статуса прочтения
        handleMessagesRead(data.fromUserId);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Обработка новых сообщений через Socket.IO
  const handleNewMessage = (message: Message) => {
    if (!currentUser) return;

    // Определяем ID собеседника (обязательно числовой тип)
    const fromUserId = typeof message.fromUserId === 'string' 
      ? parseInt(message.fromUserId, 10) 
      : message.fromUserId;
    
    const toUserId = typeof message.toUserId === 'string'
      ? parseInt(message.toUserId, 10)
      : message.toUserId;

    const currentUserIdNum = typeof currentUser.id === 'string'
      ? parseInt(currentUser.id, 10)
      : currentUser.id;
    
    const selectedUserIdNum = selectedUserId !== undefined 
      ? (typeof selectedUserId === 'string' ? parseInt(selectedUserId, 10) : selectedUserId)
      : undefined;

    // Определяем ID собеседника  
    const otherUserId = fromUserId === currentUserIdNum ? toUserId : fromUserId;
    
    // Проверяем, существует ли диалог с этим пользователем
    const existingConversationIndex = conversations.findIndex(
      conv => conv.user.id === otherUserId
    );

    if (existingConversationIndex !== -1) {
      // Обновляем существующий диалог
      const updatedConversations = [...conversations];
      const conversation = updatedConversations[existingConversationIndex];
      
      // Обновляем последнее сообщение
      conversation.lastMessage = {
        content: message.content,
        createdAt: message.createdAt,
        hasAttachment: message.hasAttachment,
        attachmentType: message.attachmentType,
        attachmentName: message.attachmentName
      };
      
      // Если сообщение пришло не от текущего пользователя, увеличиваем счетчик непрочитанных
      if (fromUserId !== currentUserIdNum) {
        // Увеличиваем счетчик только если диалог не выбран или не совпадает с текущим выбранным
        if (selectedUserIdNum === undefined || fromUserId !== selectedUserIdNum) {
          conversation.unreadCount += 1;
        }
      }
      
      // Перемещаем этот диалог в начало списка
      updatedConversations.splice(existingConversationIndex, 1);
      updatedConversations.unshift(conversation);
      
      setConversations(updatedConversations);
    } else {
      // Полностью обновляем список диалогов, если появился новый
      fetchConversations();
    }
  };

  // Обработка статуса прочтения сообщений
  const handleMessagesRead = (fromUserId: number) => {
    setConversations(prevConversations => 
      prevConversations.map(conv => {
        if (conv.user.id === fromUserId) {
          return {
            ...conv,
            unreadCount: 0
          };
        }
        return conv;
      })
    );
  };

  useEffect(() => {
    if (isSearchDialogOpen) {
      searchUsers(searchQuery);
    }
  }, [searchQuery, isSearchDialogOpen]);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Отслеживаем выбор диалога, чтобы сбрасывать счетчик непрочитанных
  useEffect(() => {
    if (selectedUserId) {
      // Обнуляем счетчик непрочитанных для выбранного диалога
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv.user.id === selectedUserId) {
            return {
              ...conv,
              unreadCount: 0
            };
          }
          return conv;
        })
      );
    }
  }, [selectedUserId]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`${API_URL}/api/messages/conversations`, {
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
      
      // Если есть выбранный диалог, обнуляем для него счетчик непрочитанных
      if (selectedUserId) {
        data.forEach((conv: Conversation) => {
          if (conv.user.id === selectedUserId) {
            conv.unreadCount = 0;
          }
        });
      }
      
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
      const response = await fetch(`${API_URL}${endpoint}`, {
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
      const response = await fetch(`${API_URL}/api/messages`, {
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
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Button
            fullWidth
            variant="outlined"
            color="primary"
            startIcon={<AddIcon color="primary" />}
            onClick={() => setIsSearchDialogOpen(true)}
          >
            Начать новый диалог
          </Button>
          
          {/* Индикатор статуса подключения */}
          {socketConnected ? (
            <Chip 
              label="Онлайн" 
              size="small" 
              color="success" 
              variant="outlined" 
              sx={{ ml: 1, flexShrink: 0 }} 
            />
          ) : (
            <Chip 
              label="Оффлайн" 
              size="small" 
              color="error" 
              variant="outlined" 
              sx={{ ml: 1, flexShrink: 0 }} 
            />
          )}
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
                            fontWeight: conversation.unreadCount > 0 ? 'bold' : 'normal'
                          }}
                        >
                          {conversation.lastMessage?.hasAttachment ? (
                            <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                              <AttachFileIcon fontSize="small" sx={{ mr: 0.5 }} />
                              {conversation.lastMessage?.content || 'Вложение'}
                            </Box>
                          ) : (
                            conversation.lastMessage?.content
                          )}
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