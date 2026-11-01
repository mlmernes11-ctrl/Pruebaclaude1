import { NavigatorScreenParams } from '@react-navigation/native';
import { ChargeConcept } from '../types';

export type RentalsStackParamList = {
  Rentals: { view?: 'propiedades' | 'inquilinos' | 'contratos' } | undefined;
  PropertyForm: { propertyId?: string } | undefined;
  PropertyDetail: { propertyId: string };
  PropertyPayments: { propertyId: string };
  MonthDetail: { period: string; propertyId?: string };
  TenantForm: { tenantId?: string } | undefined;
  TenantDetail: { tenantId: string };
  ContractForm: { contractId?: string; propertyId?: string; tenantId?: string } | undefined;
  ContractDetail: { contractId: string };
};

export type PaymentsStackParamList = {
  PaymentsList:
    | { view?: 'pagos' | 'liquidaciones' | 'historial'; filter?: string; month?: string; propertyId?: string }
    | undefined;
  PaymentForm: { contractId?: string; concept?: ChargeConcept; chargeId?: string } | undefined;
  PaymentDetail: { paymentId: string };
  ChargeForm: { chargeId?: string; contractId?: string } | undefined;
  MonthDetail: { period: string; propertyId?: string };
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  ExchangeRate: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  ExchangeRate: undefined;
};

export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  RentalsTab: NavigatorScreenParams<RentalsStackParamList>;
  PaymentsTab: NavigatorScreenParams<PaymentsStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};
