// This file has been moved to use-auth.tsx
// Please use that file instead
export * from './use-auth.tsx';

type User = {
  id: string;
  email: string;
  username: string;
  role: 'photographer' | 'assistant';
  business_name?: string;
  vat_number?: string;
  fiscal_code?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  province?: string;
  sdi_code?: string;
  pec_email?: string;
};