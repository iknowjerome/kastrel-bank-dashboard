import { FC } from 'react';
import { BankDashboardProvider } from './state/BankDashboardContext';
import { BankDashboardLayout } from './components/BankDashboardLayout';

export const BankDashboardPage: FC = () => {
  return (
    <BankDashboardProvider>
      <BankDashboardLayout />
    </BankDashboardProvider>
  );
};

