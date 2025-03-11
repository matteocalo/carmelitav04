
-- Aggiunta dei campi bancari alla tabella users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_address TEXT,
ADD COLUMN IF NOT EXISTS bic_code TEXT;
