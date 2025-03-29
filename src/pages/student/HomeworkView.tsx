import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getHomework } from '../../services/api';

interface Homework {
  id: number;
  subject: string;
  description: string;
  dueDate: string;
  teacher: {
    name: string;
  };
}

const HomeworkView = () => {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const { user } = useSelector((state: RootState) => state.auth);

  const loadHomework = async () => {
    if (!user?.classId) return;
    
    try {
      setLoading(true);
      setError('');
      const data = await getHomework(user.classId);
      setHomework(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки домашних заданий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomework();
  }, [user?.classId]);

  // Получаем уникальные даты из домашних заданий
  const dates = [...new Set(homework.map(hw => 
    new Date(hw.dueDate).toISOString().split('T')[0]
  ))].sort();

  // Фильтруем задания по выбранной дате
  const filteredHomework = homework.filter(hw =>
    new Date(hw.dueDate).toISOString().split('T')[0] === selectedDate
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Домашние задания
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={dates.indexOf(selectedDate)}
          onChange={(_, newValue) => setSelectedDate(dates[newValue])}
          variant="scrollable"
          scrollButtons="auto"
        >
          {dates.map(date => (
            <Tab
              key={date}
              label={new Date(date).toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            />
          ))}
        </Tabs>
      </Paper>

      {filteredHomework.length === 0 ? (
        <Alert severity="info">
          На этот день нет домашних заданий
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {filteredHomework.map(hw => (
            <Card key={hw.id}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  {hw.subject}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Учитель: {hw.teacher.name}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {hw.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default HomeworkView; 