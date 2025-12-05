export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  roles: Role[];
}

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
