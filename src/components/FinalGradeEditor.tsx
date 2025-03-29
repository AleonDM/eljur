import React, { useState } from 'react';
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
} from '@mui/material';
import { createFinalGrade, FinalGrade } from '../services/api';

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

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const newGrade = await createFinalGrade({
        studentId,
        subject,
        gradeType,
        value,
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
      <DialogTitle>Выставление итоговой оценки</DialogTitle>
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
              <MenuItem value="TRIMESTER1">1 триместр</MenuItem>
              <MenuItem value="TRIMESTER2">2 триместр</MenuItem>
              <MenuItem value="TRIMESTER3">3 триместр</MenuItem>
              <MenuItem value="YEAR">Годовая</MenuItem>
              {canSetAttestation && (
                <MenuItem value="ATTESTATION">Аттестат</MenuItem>
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