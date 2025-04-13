import React, { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
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
import Done from '@mui/icons-material/Done';
import DoneAll from '@mui/icons-material/DoneAll';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import AvatarUpload from './AvatarUpload';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

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

// Получаем URL API и сокета из переменных окружения или используем localhost для разработки
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Нормализуем URL для предотвращения двойных слешей
const normalizeUrl = (baseUrl: string, path: string): string => {
  // Удаляем завершающий слеш из baseUrl, если он есть
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  // Убеждаемся, что path начинается со слеша
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const MessageDialog: React.FC<MessageDialogProps> = ({ selectedUserId, currentUserId, onBackToList }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const { mode } = useAppTheme();
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      await fetch(normalizeUrl(API_URL, `/api/messages/read/${selectedUserId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Уведомляем через сокет о прочтении
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('mark_messages_read', { fromUserId: selectedUserId });
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const getFullImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('http')) return url;
    return normalizeUrl(API_URL, url);
  };

  const connectSocket = useCallback(() => {
    // Очищаем старый таймер, если он существует
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    // Закрываем предыдущее соединение, если оно существует
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Токен не найден');
        setError('Не удалось подключиться: токен не найден');
        return;
      }

      console.log('Подключение к Socket.IO...');
      
      // Создаем новое подключение с токеном в auth
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: RECONNECT_INTERVAL
      });

      // Обработчики событий
      socketRef.current.on('connect', () => {
        console.log('Socket.IO подключен!');
        setSocketConnected(true);
        setError(null);
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Ошибка подключения Socket.IO:', err.message);
        setSocketConnected(false);
        setError(`Ошибка подключения: ${err.message}`);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log(`Socket.IO отключен: ${reason}`);
        setSocketConnected(false);
        
        if (reason === 'io server disconnect') {
          // Сервер разорвал соединение, необходимо переподключиться вручную
          reconnectTimerRef.current = setTimeout(() => {
            console.log('Пробуем переподключиться вручную...');
            socketRef.current?.connect();
          }, RECONNECT_INTERVAL);
        }
      });

      socketRef.current.on('message', (data) => {
        console.log('Получено новое событие через Socket.IO:', data);
        
        if (data.type === 'NEW_MESSAGE' && data.message) {
          setMessages(prev => [...prev, data.message]);
          scrollToBottom();
          
          // Если сообщение от текущего собеседника, отмечаем как прочитанное
          if (selectedUserId && data.message.fromUserId === selectedUserId) {
            markMessagesAsRead();
          }
        } 
        else if (data.type === 'MESSAGE_DELETED' && data.messageId) {
          setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
        }
        else if (data.type === 'MESSAGES_READ' && data.fromUserId) {
          // Обновляем статус прочтения для сообщений, отправленных указанному пользователю
          setMessages(prev => prev.map(msg => 
            msg.fromUserId === currentUserId && msg.toUserId === data.fromUserId
              ? { ...msg, isRead: true }
              : msg
          ));
        }
      });

      socketRef.current.on('connect_status', (status) => {
        console.log('Статус подключения:', status);
        if (status.connected) {
          setSocketConnected(true);
        }
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };
    } catch (error) {
      console.error('Ошибка при настройке Socket.IO:', error);
      setSocketConnected(false);
      setError('Ошибка при подключении к серверу сообщений');
      return undefined;
    }
  }, [currentUserId, selectedUserId]);

  useEffect(() => {
    const cleanup = connectSocket();
    return () => {
      if (cleanup) cleanup();
    };
  }, [connectSocket]);

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
      const response = await fetch(normalizeUrl(API_URL, `/api/messages/conversation/${selectedUserId}`), {
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
      
      // Сохраняем копию файла для локального отображения
      const localFile = selectedFile;
      let tempUrl = '';
      
      if (selectedFile) {
        formData.append('file', selectedFile);
        console.log('Прикрепляю файл:', selectedFile.name, selectedFile.type, selectedFile.size);
        
        // Создаем временный URL для предварительного отображения изображения
        if (selectedFile.type.startsWith('image/')) {
          tempUrl = URL.createObjectURL(selectedFile);
          console.log('Создан временный URL для изображения:', tempUrl);
        }
      }

      // Очищаем форму до отправки запроса
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      console.log('Отправляю сообщение на сервер...');
      
      // При отправке FormData не указываем Content-Type, 
      // браузер автоматически установит его как multipart/form-data с правильной границей
      const response = await fetch(normalizeUrl(API_URL, '/api/messages'), {
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
      
      // Уведомляем через сокет (для отладки, основная отправка происходит через API)
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send_message', { 
          messageId: message.id,
          toUserId: selectedUserId
        });
      }
      
      // Добавляем сообщение локально
      if (localFile && localFile.type.startsWith('image/')) {
        // Создаем локальную копию сообщения с временным URL
        const localMessage = {
          ...message,
          _tempAttachmentUrl: tempUrl
        };
        setMessages(prev => [...prev, localMessage]);
      } else {
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
      
      const response = await fetch(normalizeUrl(API_URL, `/api/messages/${messageIdToDelete}`), {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Отправка сообщения при нажатии Enter (без Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Предотвращаем перенос строки
      if (newMessage.trim() || selectedFile) {
        handleSendMessage(e as unknown as React.FormEvent);
      }
    }
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

  if (loading && messages.length === 0) {
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
            {!socketConnected && (
              <Chip 
                label="Оффлайн" 
                size="small" 
                color="error" 
                variant="outlined" 
                sx={{ ml: 'auto' }} 
              />
            )}
            {socketConnected && (
              <Chip 
                label="Онлайн" 
                size="small" 
                color="success" 
                variant="outlined" 
                sx={{ ml: 'auto' }} 
              />
            )}
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
                <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }}>
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
                  
                  {/* Индикатор прочтения для отправленных сообщений */}
                  {message.fromUserId === currentUserId && (
                    <Box component="span" sx={{ ml: 1, display: 'inline-flex', alignItems: 'center' }}>
                      {message.isRead ? (
                        <Tooltip title="Прочитано">
                          <DoneAll fontSize="small" sx={{ opacity: 0.8, color: 'inherit' }} />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Отправлено">
                          <Done fontSize="small" sx={{ opacity: 0.7, color: 'inherit' }} />
                        </Tooltip>
                      )}
                    </Box>
                  )}
                  
                  {message.fromUserId === currentUserId && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleDeleteClick(message)}
                      sx={{
                        ml: 'auto',
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
            onKeyDown={handleKeyDown}
            size="small"
            multiline
            maxRows={4}
            error={!!error}
            helperText={error}
            color="primary"
            disabled={!socketConnected && loading}
          />
          <IconButton 
            type="submit" 
            color="primary" 
            disabled={(!newMessage.trim() && !selectedFile) || loading || !socketConnected}
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