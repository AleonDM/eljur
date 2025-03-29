import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  SelectChangeEvent,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { getTrimesters, createTrimester, updateTrimester, deleteTrimester, Trimester } from '../services/api';

const gradeTypeLabels: Record<string, string> = {
  TRIMESTER1: '1 триместр',
  TRIMESTER2: '2 триместр',
  TRIMESTER3: '3 триместр',
};

interface TrimesterFormData {
  type: 'TRIMESTER1' | 'TRIMESTER2' | 'TRIMESTER3';
  startDate: string;
  endDate: string;
  academicYear: number;
  isActive: boolean;
}

const initialFormData: TrimesterFormData = {
  type: 'TRIMESTER1',
  startDate: '',
  endDate: '',
  academicYear: new Date().getFullYear(),
  isActive: true,
};

const TrimetersManager: React.FC = () => {
  const [trimesters, setTrimesters] = useState<Trimester[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TrimesterFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadTrimesters();
  }, []);

  const loadTrimesters = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getTrimesters();
      setTrimesters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке триместров');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (trimester?: Trimester) => {
    if (trimester) {
      setFormData({
        type: trimester.type,
        startDate: trimester.startDate,
        endDate: trimester.endDate,
        academicYear: trimester.academicYear,
        isActive: trimester.isActive,
      });
      setEditingId(trimester.id.toString());
    } else {
      setFormData(initialFormData);
      setEditingId(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData(initialFormData);
    setEditingId(null);
  };

  const handleOpenDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as keyof TrimesterFormData]: value,
    });
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const validateForm = () => {
    if (!formData.type || !formData.startDate || !formData.endDate || !formData.academicYear) {
      setError('Все поля обязательны для заполнения');
      return false;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('Дата начала должна быть раньше даты окончания');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (editingId) {
        await updateTrimester(editingId, formData);
        setSuccess('Триместр успешно обновлен');
      } else {
        await createTrimester(formData);
        setSuccess('Триместр успешно создан');
      }

      handleCloseDialog();
      loadTrimesters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении триместра');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      await deleteTrimester(deletingId);
      setSuccess('Триместр успешно удален');

      handleCloseDeleteDialog();
      loadTrimesters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении триместра');
    } finally {
      setLoading(false);
    }
  };

  // Группируем триместры по учебному году
  const trimestersByYear = trimesters.reduce((acc, trimester) => {
    if (!acc[trimester.academicYear]) {
      acc[trimester.academicYear] = [];
    }
    acc[trimester.academicYear].push(trimester);
    return acc;
  }, {} as Record<number, Trimester[]>);

  // Сортируем годы в обратном порядке (сначала новые)
  const sortedYears = Object.keys(trimestersByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Управление триместрами</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить триместр
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {loading && !trimesters.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        sortedYears.map(year => (
          <Paper key={year} sx={{ mb: 3, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 1, px: 2 }}>
              <Typography variant="h6">Учебный год {year}-{year + 1}</Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Триместр</TableCell>
                    <TableCell>Дата начала</TableCell>
                    <TableCell>Дата окончания</TableCell>
                    <TableCell>Активен</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trimestersByYear[year]
                    .sort((a, b) => {
                      // Сортируем по типу триместра
                      const typeOrder = { TRIMESTER1: 1, TRIMESTER2: 2, TRIMESTER3: 3 };
                      return typeOrder[a.type] - typeOrder[b.type];
                    })
                    .map(trimester => (
                      <TableRow key={trimester.id}>
                        <TableCell>{gradeTypeLabels[trimester.type]}</TableCell>
                        <TableCell>{new Date(trimester.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(trimester.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {trimester.isActive ? (
                            <Typography color="success.main">Да</Typography>
                          ) : (
                            <Typography color="text.secondary">Нет</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenDialog(trimester)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDeleteDialog(trimester.id)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))
      )}

      {/* Диалог для создания/редактирования триместра */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Редактировать триместр' : 'Добавить триместр'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Триместр</InputLabel>
              <Select
                name="type"
                value={formData.type}
                label="Триместр"
                onChange={handleSelectChange}
              >
                <MenuItem value="TRIMESTER1">1 триместр</MenuItem>
                <MenuItem value="TRIMESTER2">2 триместр</MenuItem>
                <MenuItem value="TRIMESTER3">3 триместр</MenuItem>
              </Select>
            </FormControl>

            <TextField
              name="academicYear"
              label="Учебный год (начало)"
              type="number"
              value={formData.academicYear}
              onChange={handleInputChange}
              fullWidth
              InputProps={{ inputProps: { min: 2000, max: 2100 } }}
              helperText="Год начала учебного года"
            />

            <TextField
              name="startDate"
              label="Дата начала"
              type="date"
              value={formData.startDate}
              onChange={handleInputChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              name="endDate"
              label="Дата окончания"
              type="date"
              value={formData.endDate}
              onChange={handleInputChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleSwitchChange}
                  color="primary"
                />
              }
              label="Активен"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы действительно хотите удалить этот триместр? Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrimetersManager; 