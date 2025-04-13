export const getGradeType = (type: string): string => {
  const gradeTypeLabels: Record<string, string> = {
    'TRIMESTER1': '1 триместр',
    'TRIMESTER2': '2 триместр',
    'TRIMESTER3': '3 триместр',
    'YEAR': 'Годовая',
    'ATTESTATION': 'Аттестат'
  };
  return gradeTypeLabels[type] || type;
};

export const getCurrentAcademicYear = (): number => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  return currentMonth >= 9 ? now.getFullYear() : now.getFullYear() - 1;
};

export const formatAcademicYear = (year: number): string => {
  return `${year}-${year + 1}`;
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}; 