export interface IUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IUserResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: Date;
}

export interface ICreateUserDTO {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface ILoginDTO {
  email: string;
  password: string;
}
