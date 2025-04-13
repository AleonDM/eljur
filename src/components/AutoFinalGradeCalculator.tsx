import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  Stack,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { createFinalGrade, FinalGrade, Grade, getActiveTrimesters, Trimester } from '../services/api';
import { getGradeColor, getGradeRoundingThreshold } from '../utils/gradeUtils';
import { getGradeType } from '../utils/formatUtils';

interface AutoFinalGradeCalculatorProps {
  open: boolean;
  onClose: () => void;
  onGradesAdded: (grades: FinalGrade[]) => void;
  studentId: string;
  subject: string;
  studentGrade: number;
  currentYear: number;
  studentGrades: Grade[];
  existingFinalGrades: FinalGrade[];
}

type GradeType = 'TRIMESTER1' | 'TRIMESTER2' | 'TRIMESTER3' | 'YEAR';

const AutoFinalGradeCalculator: React.FC<AutoFinalGradeCalculatorProps> = ({
  open,
  onClose,
  onGradesAdded,
  studentId,
  subject,
  currentYear,
  existingFinalGrades,
}) => {
  const [selectedGradeType, setSelectedGradeType] = useState<GradeType>('TRIMESTER1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedGrades, setCalculatedGrades] = useState<Record<GradeType, number | null>>({
    TRIMESTER1: null,
    TRIMESTER2: null,
    TRIMESTER3: null,
    YEAR: null
  });
  const [usedGrades, setUsedGrades] = useState<Grade[]>([]);

  const [trimesters, setTrimesters] = useState<Trimester[]>([]);
  const [loadingTrimesters, setLoadingTrimesters] = useState(false);
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

  // Загружаем триместры при открытии диалога
  useEffect(() => {
    if (open) {
      loadTrimesters();
    }
  }, [open]);

  // Функция загрузки триместров
  const loadTrimesters = async () => {
    try {
      setLoadingTrimesters(true);
      const activeTrimesters = await getActiveTrimesters();
      setTrimesters(activeTrimesters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке триместров');
    } finally {
      setLoadingTrimesters(false);
    }
  };


  // Получаем существующие итоговые оценки для этого предмета
  const subjectFinalGrades = existingFinalGrades.filter(grade => 
    grade.subject === subject
  );

  // Определяем, какие типы итоговых оценок уже выставлены
  const existingGradeTypes = subjectFinalGrades.map(grade => grade.gradeType);

  // Определяем, какие типы итоговых оценок доступны для выставления
  const availableGradeTypes = ['TRIMESTER1', 'TRIMESTER2', 'TRIMESTER3', 'YEAR']
    .filter(type => !existingGradeTypes.includes(type as GradeType)) as GradeType[];

  // Сбрасываем выбранный тип, если он недоступен
  useEffect(() => {
    if (!availableGradeTypes.includes(selectedGradeType)) {
      setSelectedGradeType(availableGradeTypes[0] || 'TRIMESTER1');
    }
  }, [availableGradeTypes, selectedGradeType]);

  // Сохранение итоговой оценки
  const handleSaveGrade = async () => {
    if (!Object.values(calculatedGrades).some(grade => grade !== null)) {
      setError('Невозможно сохранить оценки. Недостаточно данных.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Определяем учебный год на основе триместров или текущей даты
      let academicYear = currentYear;
      if (!academicYear && trimesters.length > 0) {
        const trimester = trimesters.find(t => t.type === selectedGradeType);
        if (trimester) {
          academicYear = trimester.academicYear;
        }
      }
      
      if (!academicYear) {
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        academicYear = currentMonth >= 9 ? now.getFullYear() : now.getFullYear() - 1;
      }
      
      const finalGrades = await Promise.all(Object.entries(calculatedGrades).map(([type, grade]) => {
        if (grade !== null) {
          return createFinalGrade({
            studentId,
            subject,
            gradeType: type as GradeType,
            value: grade,
            year: academicYear,
            comment: `Автоматически рассчитано на основе ${usedGrades.length} оценок`
          });
        }
        return null;
      }));
      
      const newGrades = finalGrades.filter(grade => grade !== null) as FinalGrade[];
      onGradesAdded(newGrades);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении оценок');
    } finally {
      setLoading(false);
    }
  };

  // Форматируем учебный год в виде "2024-2025"
  const formatAcademicYear = (year: number) => {
    return `${year}-${year + 1}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Автоматический расчет итоговых оценок
        <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
          Учебный год: {formatAcademicYear(currentYear)}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
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

          <Typography variant="subtitle1" gutterBottom>
            Предварительный расчет оценок:
          </Typography>

          {Object.entries(calculatedGrades).map(([type, grade]) => (
            <Box
              key={type}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography>
                {getGradeType(type)}
              </Typography>
              {grade !== null ? (
                <Chip
                  label={grade}
                  sx={{
                    fontWeight: 'bold',
                    color: 'white',
                    bgcolor: getGradeColor(grade)
                  }}
                />
              ) : (
                <Typography color="text.secondary">
                  Нет оценок
                </Typography>
              )}
            </Box>
          ))}

          {existingFinalGrades.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Внимание: некоторые итоговые оценки уже выставлены. Они будут обновлены.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button
          onClick={handleSaveGrade}
          variant="contained"
          disabled={loading || !Object.values(calculatedGrades).some(grade => grade !== null)}
        >
          Сохранить оценки
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutoFinalGradeCalculator; 