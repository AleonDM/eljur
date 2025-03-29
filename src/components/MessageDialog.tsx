import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Link,
  Fab,
  Tooltip,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import AvatarUpload from './AvatarUpload';

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
  _tempAttachmentUrl?: string;
}

interface MessageDialogProps {
  selectedUserId: number | null;
  currentUserId: number;
  onBackToList?: () => void;
}

const API_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

const MessageDialog: React.FC<MessageDialogProps> = ({ selectedUserId, currentUserId, onBackToList }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const { mode } = useAppTheme();
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000;

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  const markMessagesAsRead = async () => {
    if (!selectedUserId) return;

    try {
      await fetch(`${API_URL}/api/messages/read/${selectedUserId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const getFullImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  const connectWebSocket = useCallback(() => {
    let reconnectAttempts = 0;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket уже подключен');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Токен не найден');
        return;
      }

      try {
        wsRef.current = new WebSocket(`${WS_URL}/?token=${token}`);

        wsRef.current.onopen = () => {
          console.log('WebSocket соединение установлено');
          reconnectAttempts = 0;
          setWsConnected(true);
          setError(null);
        };

        wsRef.current.onclose = (event) => {
          console.log(`WebSocket соединение закрыто. Код: ${event.code}, Причина: ${event.reason}`);
          setWsConnected(false);

          if (event.code === 1000 || event.code === 1001) {
            return;
          }

          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && selectedUserId) {
            console.log(`Попытка переподключения ${reconnectAttempts + 1} из ${MAX_RECONNECT_ATTEMPTS}`);
            setTimeout(() => {
              reconnectAttempts++;
              connect();
            }, RECONNECT_INTERVAL);
          } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            setError('Не удалось установить соединение. Попробуйте обновить страницу.');
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('Ошибка WebSocket соединения:', error);
          setWsConnected(false);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_MESSAGE' && data.message) {
              setMessages(prev => [...prev, data.message]);
              scrollToBottom();
            } else if (data.type === 'MESSAGE_DELETED' && data.messageId) {
              setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
            }
          } catch (error) {
            console.error('Ошибка при обработке сообщения WebSocket:', error);
          }
        };
      } catch (error) {
        console.error('Ошибка при создании WebSocket соединения:', error);
        setWsConnected(false);
        setError('Ошибка подключения к серверу сообщений');
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Закрытие соединения');
      }
    };
  }, [selectedUserId]);

  useEffect(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  // Загружаем начальные сообщения при выборе пользователя
  useEffect(() => {
    if (selectedUserId) {
      fetchMessages();
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [selectedUserId, messages]);

  const fetchMessages = async () => {
    if (!selectedUserId) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/messages/conversation/${selectedUserId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить сообщения');
      }

      const data = await response.json();
      setMessages(data);
      markMessagesAsRead();
      scrollToBottom();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        setError('Файл слишком большой. Максимальный размер: 5MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon />;
    if (type === 'application/pdf') return <PictureAsPdfIcon />;
    return <InsertDriveFileIcon />;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || (!newMessage.trim() && !selectedFile)) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('content', newMessage.trim() || '');
      formData.append('toUserId', selectedUserId.toString());
      if (selectedFile) {
        formData.append('file', selectedFile);
        console.log('Прикрепляю файл:', selectedFile.name, selectedFile.type, selectedFile.size);
      }

      // Сохраняем копию файла для локального отображения
      const localFile = selectedFile ? selectedFile : null;

      // Очищаем форму до отправки запроса
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      console.log('Отправляю сообщение на сервер...');
      
      // При отправке FormData не указываем Content-Type, 
      // браузер автоматически установит его как multipart/form-data с правильной границей
      const response = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
          // Не указываем Content-Type для FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Неизвестная ошибка' }));
        throw new Error(errorData.message || 'Не удалось отправить сообщение');
      }

      // Получаем ответ от сервера с данными о сообщении
      const message = await response.json();
      console.log('Сообщение успешно отправлено:', message);
      
      // Создаем локальную копию сообщения с URL для отображения
      if (localFile && localFile.type.startsWith('image/') && message.attachmentUrl) {
        // Создаем временный URL для локального отображения изображения
        const tempUrl = URL.createObjectURL(localFile);
        console.log('Создан временный URL для изображения:', tempUrl);
        
        // Сохраняем связь между временным URL и реальным URL на сервере
        const localMessage = {
          ...message,
          _tempAttachmentUrl: tempUrl
        };
        
        // Добавляем сообщение локально
        setMessages(prev => [...prev, localMessage]);
      } else {
        // Добавляем сообщение локально
        setMessages(prev => [...prev, message]);
      }
      
      setError(null);
      
      // Прокручиваем к последнему сообщению
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (err) {
      console.error('Ошибка при отправке сообщения:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при отправке сообщения');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (message: Message) => {
    setMessageToDelete(message);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!messageToDelete) return;

    try {
      setLoading(true);
      
      // Сохраняем ID сообщения для удаления
      const messageIdToDelete = messageToDelete.id;
      
      // Сохраняем ссылку на временный URL, если он есть
      const tempUrl = messageToDelete._tempAttachmentUrl;
      
      console.log(`Отправляю запрос на удаление сообщения ${messageIdToDelete}`);
      
      const response = await fetch(`${API_URL}/api/messages/${messageIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Неизвестная ошибка' }));
        throw new Error(errorData.message || 'Не удалось удалить сообщение');
      }

      console.log(`Сообщение ${messageIdToDelete} успешно удалено на сервере`);
      
      // Удаляем сообщение локально после успешного удаления на сервере
      setMessages(prev => {
        console.log(`Удаляю сообщение ${messageIdToDelete} из локального состояния`);
        return prev.filter(msg => msg.id !== messageIdToDelete);
      });
      
      // Освобождаем временный URL, если он был
      if (tempUrl) {
        console.log('Освобождаю временный URL для удаленного сообщения');
        URL.revokeObjectURL(tempUrl);
      }
      
      setError(null);
    } catch (err) {
      console.error('Ошибка при удалении сообщения:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при удалении сообщения');
    } finally {
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      setLoading(false);
    }
  };

  const handleImageClick = (url: string) => {
    setPreviewImageUrl(url);
    setImagePreviewOpen(true);
  };

  if (!selectedUserId) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
        bgcolor="background.paper"
      >
        <Typography variant="body1" color="textSecondary">
          Выберите диалог для просмотра сообщений
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {isMobile && (
          <Box 
            sx={{ 
              p: 1.5, 
              borderBottom: 1, 
              borderColor: 'divider', 
              display: 'flex', 
              alignItems: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText'
            }}
          >
            <IconButton 
              onClick={onBackToList} 
              edge="start" 
              sx={{ color: 'inherit', mr: 1 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="subtitle1" fontWeight="medium">
              Вернуться к списку диалогов
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          ref={messagesContainerRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 2,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'background.default',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'primary.light',
              borderRadius: '4px',
            },
          }}
          onScroll={handleScroll}
        >
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: message.fromUserId === currentUserId ? 'flex-end' : 'flex-start',
                mb: 2,
                gap: 1,
                alignItems: 'flex-start'
              }}
            >
              {message.fromUserId !== currentUserId && (
                <AvatarUpload
                  currentAvatarUrl={message.from?.avatarUrl}
                  name={message.from?.name || ''}
                  size={32}
                />
              )}
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  maxWidth: '70%',
                  bgcolor: message.fromUserId === currentUserId ? 'primary.main' : 'background.paper',
                  color: message.fromUserId === currentUserId ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Box sx={{ mb: 0.5 }}>
                  <Typography
                    variant="caption"
                    component="span"
                    sx={{
                      color: message.fromUserId === currentUserId ? 'inherit' : 'text.secondary',
                      mr: 1
                    }}
                  >
                    {message.from?.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    component="span"
                    sx={{
                      color: message.fromUserId === currentUserId ? 'inherit' : 'text.secondary'
                    }}
                  >
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </Typography>
                  {message.fromUserId === currentUserId && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteClick(message)}
                      sx={{
                        ml: 1,
                        color: 'inherit',
                        opacity: 0.7,
                        '&:hover': {
                          opacity: 1
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                <Typography
                  variant="body1"
                  sx={{
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {message.content}
                </Typography>

                {message.hasAttachment && (
                  <Box sx={{ mt: 1 }}>
                    {message.attachmentType?.startsWith('image/') ? (
                      <Box
                        component="img"
                        src={getFullImageUrl(message._tempAttachmentUrl || message.attachmentUrl)}
                        alt="Прикрепленное изображение"
                        sx={{
                          maxWidth: '100%',
                          maxHeight: 200,
                          borderRadius: 1,
                          cursor: 'pointer',
                          border: `1px solid ${
                            message.fromUserId === currentUserId 
                              ? 'rgba(255,255,255,0.2)'
                              : 'rgba(0,0,0,0.1)'
                          }`
                        }}
                        onClick={() => handleImageClick(getFullImageUrl(message._tempAttachmentUrl || message.attachmentUrl))}
                      />
                    ) : (
                      <Link
                        href={getFullImageUrl(message.attachmentUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          color: message.fromUserId === currentUserId ? 'inherit' : 'primary.main',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {getFileIcon(message.attachmentType || '')}
                        <Typography sx={{ ml: 1 }}>
                          {message.attachmentName || 'Скачать файл'}
                        </Typography>
                      </Link>
                    )}
                  </Box>
                )}
              </Paper>
              {message.fromUserId === currentUserId && (
                <AvatarUpload
                  currentAvatarUrl={message.from?.avatarUrl}
                  name={message.from?.name || ''}
                  size={32}
                />
              )}
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        <Box
          component="form"
          onSubmit={handleSendMessage}
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1
          }}
        >
          <input
            type="file"
            id="file-input"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/gif,application/pdf"
            ref={fileInputRef}
          />
          <label htmlFor="file-input">
            <IconButton component="span" color="primary">
              <AttachFileIcon />
            </IconButton>
          </label>
          {selectedFile && (
            <Chip
              label={selectedFile.name}
              onDelete={() => setSelectedFile(null)}
              size="small"
              color="primary"
              sx={{ maxWidth: '200px' }}
            />
          )}
          <TextField
            fullWidth
            placeholder="Введите сообщение..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            size="small"
            multiline
            maxRows={4}
            error={!!error}
            helperText={error}
            color="primary"
          />
          <IconButton 
            type="submit" 
            color="primary" 
            disabled={(!newMessage.trim() && !selectedFile) || loading}
          >
            {loading ? <CircularProgress size={24} color="primary" /> : <SendIcon />}
          </IconButton>
        </Box>
      </Paper>

      <Dialog
        open={imagePreviewOpen}
        onClose={() => setImagePreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Box
            component="img"
            src={previewImageUrl}
            alt="Увеличенное изображение"
            sx={{
              maxWidth: '100%',
              maxHeight: '90vh',
              objectFit: 'contain'
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImagePreviewOpen(false)} color="primary">
            Закрыть
          </Button>
          <Button 
            component="a" 
            href={previewImageUrl} 
            download 
            target="_blank"
            color="primary"
            variant="contained"
          >
            Скачать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Удаление сообщения</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить это сообщение? Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            color="primary"
            disabled={loading}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
          >
            {loading ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>

      {showScrollButton && (
        <Box
          sx={{
            position: 'absolute',
            right: 32,
            bottom: 120,
            zIndex: 10,
          }}
        >
          <Tooltip title="Прокрутить вниз">
            <Fab
              color="primary"
              sx={{
                width: 56,
                height: 56,
                '& .MuiSvgIcon-root': {
                  fontSize: 32
                }
              }}
              onClick={() => scrollToBottom('smooth')}
            >
              <KeyboardArrowDownIcon />
            </Fab>
          </Tooltip>
        </Box>
      )}
    </>
  );
};

export default MessageDialog;