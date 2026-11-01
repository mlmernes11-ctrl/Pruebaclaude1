import { NavigatorScreenParams } from '@react-navigation/native';
import { ChargeConcept } from '../types';

export type PropertiesStackParamList = {
  PropertiesList: undefined;
  PropertyForm: { propertyId?: string } | undefined;
  PropertyDetail: { propertyId: string };
  PropertyPayments: { propertyId: string };
  MonthDetail: { period: string; propertyId?: string };
};

export type TenantsStackParamList = {
  TenantsList: undefined;
  TenantForm: { tenantId?: string } | undefined;
  TenantDetail: { tenantId: string };
};

export type ContractsStackParamList = {
  ContractsList: undefined;
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
  Settings: undefined;
};

export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  PropertiesTab: NavigatorScreenParams<PropertiesStackParamList>;
  TenantsTab: NavigatorScreenParams<TenantsStackParamList>;
  ContractsTab: NavigatorScreenParams<ContractsStackParamList>;
  PaymentsTab: NavigatorScreenParams<PaymentsStackParamList>;
};
