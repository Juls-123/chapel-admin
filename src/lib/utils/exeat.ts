import { Exeat } from '@/hooks/useExeats';

export const getDerivedExeatStatus = (exeat: Pick<Exeat, 'status' | 'start_date' | 'end_date'>): Exeat['derived_status'] => {
  // If already canceled, return canceled
  if (exeat.status === 'canceled') return 'canceled';
  
  const now = new Date();
  const startDate = new Date(exeat.start_date);
  const endDate = new Date(exeat.end_date);
  
  // Add one day to end date to include the full end date
  endDate.setDate(endDate.getDate() + 1);
  
  if (now > endDate) {
    return 'past';
  } 
  
  return 'active'; // active includes both current and upcoming
};

export const processExeatData = (exeats: Exeat[]): Exeat[] => {
  return exeats.map(exeat => ({
    ...exeat,
    derived_status: getDerivedExeatStatus(exeat)
  }));
};
