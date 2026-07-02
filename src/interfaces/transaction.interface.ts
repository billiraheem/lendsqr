export interface ITransaction {
  id: number;
  reference: string;
  account_id: number;
  type: 'funding' | 'transfer' | 'withdrawal';
  amount: number;
  balance_before: number;
  balance_after: number;
  metadata: Record<string, unknown> | null;
  counterparty_account_id: number | null;
  description: string | null;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  created_at: Date;
}


export interface ITransactionResponse {
  id: number;
  reference: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  status: string;
  created_at: Date;
}


export interface ICreateTransactionDTO {
  reference: string;
  account_id: number;
  type: 'funding' | 'transfer' | 'withdrawal';
  amount: number;
  balance_before: number;
  balance_after: number;
  metadata?: Record<string, unknown>;
  counterparty_account_id?: number;
  description?: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
}
