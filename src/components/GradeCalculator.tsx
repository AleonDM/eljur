import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  IconButton,
  Chip,
  TextField,
  Divider,
  Stack,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface GradeCalculatorProps {
  subjectGrades?: (number | string)[];
  onClose?: () => void;
}

const GradeCalculator: React.FC<GradeCalculatorProps> = ({ subjectGrades = [], onClose }) => {
  const [grades, setGrades] = useState<(number | string)[]>(subjectGrades);
  const [inputValue, setInputValue] = useState<string>('');
  const [average, setAverage] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const theme = useTheme();

  useEffect(() => {
    calculateAverage();
  }, [grades]);

  useEffect(() => {
    setGrades(subjectGrades);
  }, [subjectGrades]);

  const calculateAverage = () => {
    const numericGrades = grades.filter(grade => {
      if (typeof grade === 'number') return true;
      if (typeof grade === 'string' && !isNaN(Number(grade))) return true;
      return false;
    }).map(grade => typeof grade === 'string' ? Number(grade) : grade) as number[];
    
    if (numericGrades.length === 0) {
      setAverage(0);
      return;
    }
    
    const sum = numericGrades.reduce((acc, grade) => acc + grade, 0);
    setAverage(parseFloat((sum / numericGrades.length).toFixed(2)));
  };

  const handleAddGrade = () => {
    const grade = parseInt(inputValue);
    if (isNaN(grade)) {
      setError('Пожалуйста, введите число');
      return;
    }
    
    if (grade < 1 || grade > 5) {
      setError('Оценка должна быть от 1 до 5');
      return;
    }
    
    setGrades([...grades, grade]);
    setInputValue('');
    setError('');
  };

  const handleRemoveGrade = (index: number) => {
    const newGrades = [...grades];
    newGrades.splice(index, 1);
    setGrades(newGrades);
  };

  const handleReset = () => {
    setGrades([]);
    setInputValue('');
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddGrade();
    }
  };

  const getGradeColor = (value: number | string) => {
    switch (value) {
      case 5:
        return '#1B5E20'; // Темно-зеленый
      case 4:
        return '#4CAF50'; // Зеленый
      case 3:
        return '#FFC107'; // Желтый
      case 2:
        return '#F44336'; // Красный
      case 1:
        return '#B71C1C'; // Темно-красный
      case 'Н':
        return '#9C27B0'; // Фиолетовый
      case 'У':
        return '#2196F3'; // Синий
      case 'О':
        return '#FF9800'; // Оранжевый
      default: 
        if (typeof value === 'string' && !isNaN(Number(value))) {
          return getGradeColor(Number(value));
        }
        return 'inherit';
    }
  };

  const getAverageColor = () => {
    if (average >= 4.5) return '#1B5E20'; // Темно-зеленый
    if (average >= 3.5) return '#4CAF50'; // Зеленый
    if (average >= 2.5) return '#FFC107'; // Желтый
    if (average >= 1.5) return '#F44336'; // Красный
    return '#B71C1C'; // Темно-красный
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2" color="primary">
          <CalculateIcon sx={{ mr: 1, verticalAlign: 'middle' }} color="primary" />
          Калькулятор среднего балла
        </Typography>
        {onClose && (
          <IconButton onClick={onClose} size="small" color="primary">
            <DeleteIcon />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Оценка (1-5)"
            variant="outlined"
            size="small"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            error={!!error}
            helperText={error}
            sx={{ width: '150px' }}
            type="number"
            inputProps={{ min: 1, max: 5 }}
            color="primary"
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddGrade}
          >
            Добавить
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
          >
            Сбросить
          </Button>
        </Stack>
      </Box>

      {grades.length > 0 ? (
        <>
          <Typography variant="subtitle1" gutterBottom color="primary">
            Введенные оценки:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {grades.map((grade, index) => (
              <Chip
                key={index}
                label={grade}
                onDelete={() => handleRemoveGrade(index)}
                sx={{
                  color: 'white',
                  bgcolor: getGradeColor(grade),
                  fontWeight: 'bold',
                }}
              />
            ))}
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" color="primary">
              Всего оценок: <strong>{grades.length}</strong>
            </Typography>
            <Typography variant="h5" sx={{ color: getAverageColor(), fontWeight: 'bold' }}>
              Средний балл: {average}
            </Typography>
          </Box>
        </>
      ) : (
        <Alert severity="info">
          Добавьте оценки для расчета среднего балла
        </Alert>
      )}
    </Paper>
  );
};

export default GradeCalculator; 