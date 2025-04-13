import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  Typography,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { createFinalGrade, FinalGrade } from '../services/api';
import { getGradeRoundingThreshold, roundGrade } from '../utils/gradeUtils';
import { getGradeType, formatAcademicYear } from '../utils/formatUtils';

interface FinalGradeEditorProps {
  open: boolean;
  onClose: () => void;
  onGradeAdded: (grade: FinalGrade) => void;
  studentId: string;
  subject: string;
  studentGrade: number;
  currentYear: number;
}

const FinalGradeEditor: React.FC<FinalGradeEditorProps> = ({
  open,
  onClose,
  onGradeAdded,
  studentId,
  subject,
  studentGrade,
  currentYear,
}) => {
  const [gradeType, setGradeType] = useState<FinalGrade['gradeType']>('TRIMESTER1');
  const [value, setValue] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const finalValue = useRounding ? roundGrade(value, roundingThreshold) : value;

      const newGrade = await createFinalGrade({
        studentId,
        subject,
        gradeType,
        value: finalValue,
        year: currentYear,
        comment: comment.trim() || undefined
      });

      onGradeAdded(newGrade);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при выставлении оценки');
    } finally {
      setLoading(false);
    }
  };

  const canSetAttestation = studentGrade === 9 || studentGrade === 11;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Выставление итоговой оценки
        <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
          Учебный год: {formatAcademicYear(currentYear)}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <FormControl fullWidth>
            <InputLabel>Тип оценки</InputLabel>
            <Select
              value={gradeType}
              label="Тип оценки"
              onChange={(e) => setGradeType(e.target.value as FinalGrade['gradeType'])}
            >
              <MenuItem value="TRIMESTER1">{getGradeType('TRIMESTER1')}</MenuItem>
              <MenuItem value="TRIMESTER2">{getGradeType('TRIMESTER2')}</MenuItem>
              <MenuItem value="TRIMESTER3">{getGradeType('TRIMESTER3')}</MenuItem>
              <MenuItem value="YEAR">{getGradeType('YEAR')}</MenuItem>
              {canSetAttestation && (
                <MenuItem value="ATTESTATION">{getGradeType('ATTESTATION')}</MenuItem>
              )}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Оценка</InputLabel>
            <Select
              value={value}
              label="Оценка"
              onChange={(e) => setValue(Number(e.target.value))}
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={4}>4</MenuItem>
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={2}>2</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={useRounding}
                onChange={(e) => setUseRounding(e.target.checked)}
              />
            }
            label={`Округление (порог ${roundingThreshold})`}
          />

          <TextField
            fullWidth
            label="Комментарий"
            multiline
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          Выставить оценку
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FinalGradeEditor; 