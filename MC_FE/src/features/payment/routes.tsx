import React from 'react';
import { Route } from 'react-router-dom';
import { PaymentResultPage } from './pages/PaymentResultPage';

export const renderPaymentRoutes = () => {
  return <Route path="/payment-result" element={<PaymentResultPage />} />;
};
