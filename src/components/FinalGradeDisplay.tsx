import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Chip,
  Paper,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { FinalGrade } from '../services/api';
import { getGradeType } from '../utils/formatUtils';
import { getGradeColor, getGradeRoundingThreshold, formatGrade, roundGrade } from '../utils/gradeUtils';

interface FinalGradeDisplayProps {
  grades: FinalGrade[];
  title?: string;
  compact?: boolean;
}

const FinalGradeDisplay: React.FC<FinalGradeDisplayProps> = ({ grades = [], title, compact = false }) => {
  const [roundingThreshold, setRoundingThreshold] = useState<number>(0.5);
  const [useRounding, setUseRounding] = useState<boolean>(true);

  // Загружаем настройки округления при монтировании компонента
  useEffect(() => {
    const loadRoundingThreshold = async () => {
      try {
        const threshold = await getGradeRoundingThreshold();
        setRoundingThreshold(threshold);
      } catch (error) {
        console.error('Ошибка при загрузке порога округления:', error);
      }
    };
    
    loadRoundingThreshold();
  }, []);

  // Группируем оценки по предметам
  const groupedGrades = grades.reduce((acc, grade) => {
    if (!acc[grade.subject]) {
      acc[grade.subject] = [];
    }
    acc[grade.subject].push(grade);
    return acc;
  }, {} as Record<string, FinalGrade[]>);

  if (grades.length === 0) {
    return null;
  }

  // Функция для получения отформатированного значения с учетом округления
  const getFormattedValue = (value: number): string => {
    const finalValue = useRounding ? roundGrade(value, roundingThreshold) : value;
    return formatGrade(finalValue);
  };

  // Создаем элементы для отображения оценок
  const gradeItems = Object.entries(groupedGrades).map(([subject, subjectGrades]) => {
    // Сортируем оценки по типу
    const sortedGrades = [...subjectGrades].sort((a, b) => {
      const gradeOrder = {
        'TRIMESTER1': 1,
        'TRIMESTER2': 2,
        'TRIMESTER3': 3,
        'YEAR': 4,
        'ATTESTATION': 5
      };
      return gradeOrder[a.gradeType] - gradeOrder[b.gradeType];
    });

    return (
      <Grid item xs={12} sm={6} md={4} key={subject}>
        <Paper
          elevation={2}
          sx={{
            p: compact ? 1 : 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant={compact ? 'subtitle2' : 'subtitle1'}
            fontWeight="bold"
            sx={{ mb: 1, wordBreak: 'break-word' }}
          >
            {subject}
          </Typography>

          <Box display="flex" flexDirection="column" gap={1} sx={{ flexGrow: 1 }}>
            {sortedGrades.map((grade) => {
              const displayValue = getFormattedValue(grade.value);
              return (
                <Box 
                  key={grade.id} 
                  display="flex" 
                  justifyContent="space-between" 
                  alignItems="center"
                  sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {getGradeType(grade.gradeType)}:
                  </Typography>
                  <Tooltip title={grade.comment || ''}>
                    <Chip
                      label={displayValue}
                      size={compact ? 'small' : 'medium'}
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: getGradeColor(useRounding ? roundGrade(grade.value, roundingThreshold) : grade.value),
                        color: 'white',
                      }}
                    />
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Grid>
    );
  });

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {title && (
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
        )}
        <FormControlLabel
          control={
            <Switch
              checked={useRounding}
              onChange={(e) => setUseRounding(e.target.checked)}
            />
          }
          label={`Округление (порог ${roundingThreshold})`}
        />
      </Box>
      <Grid container spacing={2}>
        {gradeItems}
      </Grid>
    </Box>
  );
};

export default FinalGradeDisplay; 