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
  FormControlLabel,
  Tooltip,
  Switch,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { roundGrade, getGradeRoundingThreshold, formatGrade } from '../utils/gradeUtils';

interface GradeCalculatorProps {
  subjectGrades?: (number | string)[];
  onClose?: () => void;
}

const GradeCalculator: React.FC<GradeCalculatorProps> = ({ subjectGrades = [], onClose }) => {
  const [grades, setGrades] = useState<(number | string)[]>([]);
  const [newGrade, setNewGrade] = useState<string>('');
  const [average, setAverage] = useState<number>(0);
  const [roundingThreshold, setRoundingThreshold] = useState<number>(0.5);
  const [useRounding, setUseRounding] = useState<boolean>(false);

  useEffect(() => {
    // Фильтруем только числовые оценки для расчета среднего
    const numericGrades = subjectGrades.filter(
      grade => typeof grade === 'number' || (!isNaN(Number(grade)) && grade !== '')
    );
    
    setGrades(numericGrades.map(g => typeof g === 'string' ? Number(g) : g));
    
    // Загружаем настройки округления
    const loadRoundingThreshold = async () => {
      try {
        const threshold = await getGradeRoundingThreshold();
        setRoundingThreshold(threshold);
      } catch (error) {
        console.error('Ошибка при загрузке порога округления:', error);
      }
    };
    
    loadRoundingThreshold();
  }, [subjectGrades]);

  useEffect(() => {
    calculateAverage();
  }, [grades, useRounding]);

  const calculateAverage = () => {
    if (grades.length === 0) {
      setAverage(0);
      return;
    }

    const numericGrades = grades.filter(
      grade => typeof grade === 'number' || (!isNaN(Number(grade)) && grade !== '')
    ) as number[];

    if (numericGrades.length === 0) {
      setAverage(0);
      return;
    }

    const sum = numericGrades.reduce((a, b) => a + b, 0);
    const avg = sum / numericGrades.length;
    
    setAverage(useRounding ? roundGrade(avg, roundingThreshold) : avg);
  };

  const handleAddGrade = () => {
    if (newGrade.trim() === '') return;
    
    // Проверяем, является ли ввод числом и он в диапазоне от 1 до 5
    const gradeValue = Number(newGrade);
    if (!isNaN(gradeValue) && gradeValue >= 1 && gradeValue <= 5) {
      setGrades([...grades, gradeValue]);
      setNewGrade('');
    }
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGrade(e.target.value);
  };

  const handleRemoveGrade = (index: number) => {
    const updatedGrades = [...grades];
    updatedGrades.splice(index, 1);
    setGrades(updatedGrades);
  };

  const handleReset = () => {
    setGrades([]);
    setNewGrade('');
    setAverage(0);
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
    return getGradeColor(average);
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
        <FormControlLabel
          control={
            <Switch 
              checked={useRounding} 
              onChange={(e) => setUseRounding(e.target.checked)} 
              color="primary"
            />
          }
          label={
            <Tooltip title={`Порог округления: ${roundingThreshold}. Пример: 3.${Math.round(roundingThreshold * 100)} → 4`}>
              <Typography variant="body2">Округлять оценки</Typography>
            </Tooltip>
          }
        />
      </Box>

      <Box sx={{ display: 'flex', mb: 3 }}>
        <TextField
          label="Оценка"
          variant="outlined"
          size="small"
          value={newGrade}
          onChange={handleGradeChange}
          onKeyPress={handleKeyPress}
          sx={{ mr: 1, flexGrow: 1 }}
          inputProps={{ inputMode: 'decimal', pattern: '[1-5]', max: 5, min: 1, step: 0.1 }}
        />
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAddGrade}
        >
          Добавить
        </Button>
      </Box>
      
      {grades.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Текущие оценки:
          </Typography>
          <Grid container spacing={1}>
            {grades.map((grade, index) => (
              <Grid item key={index}>
                <Chip
                  label={grade}
                  onDelete={() => handleRemoveGrade(index)}
                  deleteIcon={<DeleteIcon />}
                  sx={{ 
                    bgcolor: getGradeColor(grade), 
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Средний балл:
        </Typography>
        <Chip
          label={average === 0 ? '—' : formatGrade(average)}
          sx={{
            bgcolor: average === 0 ? 'grey.500' : getAverageColor(),
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.25rem',
            py: 1,
            height: 'auto',
          }}
        />
      </Box>
      
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button variant="outlined" color="error" onClick={handleReset}>
          Сбросить все
        </Button>
        {onClose && (
          <Button variant="contained" onClick={onClose}>
            Закрыть
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

export default GradeCalculator; 