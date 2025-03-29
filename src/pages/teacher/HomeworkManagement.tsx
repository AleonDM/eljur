import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Divider,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { getClasses, getSubjects, createHomework, deleteHomework, getHomework } from '../../services/api';

interface Class {
  id: string;
  grade: number;
  letter: string;
}

interface Subject {
  id: string;
  name: string;
  grades: number[];
}

interface HomeworkForm {
  classId: string;
  subject: string;
  description: string;
  dueDate: string;
}

interface Homework {
  id: number;
  subject: string;
  description: string;
  dueDate: string;
  classId: string;
  teacherId: string;
}

const HomeworkManagement = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');

  const [newHomework, setNewHomework] = useState<HomeworkForm>({
    classId: '',
    subject: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [loadedClasses, loadedSubjects] = await Promise.all([
        getClasses(),
        getSubjects(),
      ]);
      setClasses(loadedClasses);
      setSubjects(loadedSubjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadHomework = async () => {
    if (!selectedClass) return;
    try {
      setLoading(true);
      const loadedHomework = await getHomework(selectedClass);
      setHomework(loadedHomework);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки домашних заданий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadHomework();
  }, [selectedClass]);

  const handleAddHomework = async () => {
    try {
      if (!newHomework.classId || !newHomework.subject || !newHomework.description) {
        setError('Заполните все обязательные поля');
        return;
      }

      setLoading(true);
      setError('');
      const homework = await createHomework(newHomework);
      setHomework(prev => [homework, ...prev]);
      setNewHomework({
        classId: '',
        subject: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
      });
      setSelectedClass(newHomework.classId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при добавлении домашнего задания');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHomework = async (id: number) => {
    try {
      setLoading(true);
      setError('');
      await deleteHomework(id);
      setHomework(homework.filter(hw => hw.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении домашнего задания');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSubjects = () => {
    if (!newHomework.classId) return subjects;
    const selectedClass = classes.find(c => c.id === newHomework.classId);
    if (!selectedClass) return subjects;
    return subjects.filter(subject => subject.grades.includes(selectedClass.grade));
  };

  if (loading && !homework.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Управление домашними заданиями
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Добавить домашнее задание
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Класс</InputLabel>
            <Select
              value={newHomework.classId}
              label="Класс"
              onChange={(e) => setNewHomework({ ...newHomework, classId: e.target.value })}
              disabled={loading}
            >
              <MenuItem value="">
                <em>Выберите класс</em>
              </MenuItem>
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>
                  {cls.grade}-{cls.letter}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Предмет</InputLabel>
            <Select
              value={newHomework.subject}
              label="Предмет"
              onChange={(e) => setNewHomework({ ...newHomework, subject: e.target.value })}
              disabled={loading || !newHomework.classId}
            >
              <MenuItem value="">
                <em>Выберите предмет</em>
              </MenuItem>
              {getAvailableSubjects().map((subject) => (
                <MenuItem key={subject.id} value={subject.name}>
                  {subject.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            sx={{ minWidth: 120 }}
            type="date"
            label="Дата сдачи"
            value={newHomework.dueDate}
            onChange={(e) => setNewHomework({ ...newHomework, dueDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            disabled={loading}
          />

          <TextField
            sx={{ flexGrow: 1 }}
            label="Задание"
            value={newHomework.description}
            onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
            disabled={loading}
            multiline
            rows={3}
          />

          <Button
            variant="contained"
            onClick={handleAddHomework}
            disabled={loading || !newHomework.classId || !newHomework.subject || !newHomework.description}
            sx={{ height: 56 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Добавить'}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Просмотр домашних заданий
        </Typography>
        <FormControl sx={{ minWidth: 200, mb: 2 }}>
          <InputLabel>Выберите класс для просмотра</InputLabel>
          <Select
            value={selectedClass}
            label="Выберите класс для просмотра"
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="">
              <em>Все классы</em>
            </MenuItem>
            {classes.map((cls) => (
              <MenuItem key={cls.id} value={cls.id}>
                {cls.grade}-{cls.letter}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'grid', gap: 2 }}>
          {homework.map(hw => (
            <Card key={hw.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Typography variant="h6" color="primary" gutterBottom>
                      {hw.subject}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Класс: {classes.find(c => c.id === hw.classId)?.grade}-
                      {classes.find(c => c.id === hw.classId)?.letter}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Сдать до: {new Date(hw.dueDate).toLocaleDateString()}
                    </Typography>
                  </div>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteHomework(hw.id)}
                    disabled={loading}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {hw.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
          {selectedClass && homework.length === 0 && (
            <Alert severity="info">
              Нет домашних заданий для выбранного класса
            </Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default HomeworkManagement; 