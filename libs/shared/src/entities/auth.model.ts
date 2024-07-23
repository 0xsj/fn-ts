export class AuthEntity {
  username?: string;
  password?: string;
  email?: string;
  token?: string;
  refreshToken?: string;
  accessToken?: string;
  provider?: string; // Federated provider (for FederatedSignInRequest)

  success?: boolean;
  message?: string;
  status?: string;

  constructor(init?: Partial<AuthEntity>) {
    Object.assign(this, init);
  }
}
