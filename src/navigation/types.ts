import { NavigatorScreenParams } from '@react-navigation/native';

export type PropertiesStackParamList = {
  PropertiesList: undefined;
  PropertyForm: { propertyId?: string } | undefined;
  PropertyDetail: { propertyId: string };
  PropertyPayments: { propertyId: string };
};

export type TenantsStackParamList = {
  TenantsList: undefined;
  TenantForm: { tenantId?: string } | undefined;
  TenantDetail: { tenantId: string };
};

export type ContractsStackParamList = {
  ContractsList: undefined;
  ContractForm: { contractId?: string } | undefined;
  ContractDetail: { contractId: string };
};

export type PaymentsStackParamList = {
  PaymentsList: undefined;
  PaymentForm: { paymentId?: string; contractId?: string } | undefined;
};

export type DashboardStackParamList = {
  Dashboard: undefined;
  ExchangeRate: undefined;
};

export type MainTabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList>;
  PropertiesTab: NavigatorScreenParams<PropertiesStackParamList>;
  TenantsTab: NavigatorScreenParams<TenantsStackParamList>;
  ContractsTab: NavigatorScreenParams<ContractsStackParamList>;
  PaymentsTab: NavigatorScreenParams<PaymentsStackParamList>;
};
