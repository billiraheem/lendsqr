export interface IAccount {
  id: number;
  user_id: number;
  account_number: string;
  balance: number;     // DECIMAL(15,2) in MySQL → number in TypeScript
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IAccountResponse {
  id: number;
  account_number: string;
  balance: number;
  is_active: boolean;
  created_at: Date;
}

export interface IFundAccountDTO {
  amount: number;
}

export interface IWithdrawDTO {
  amount: number;
}

export interface ITransferDTO {
  recipient_account_number: string;
  amount: number;
  description?: string;
}
