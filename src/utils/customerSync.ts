import API from "./AxiosInstance";

const API_KEY = "my-secret-key-123";

interface SyncCustomerPayload {
  name: string;
  email: string;
  source: string;
  password: string;
} 

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  customer?: {
    name: string;
    email: string;
    customerId: string;
  };
}

export const syncCustomer = async (data: SyncCustomerPayload) => {
  const res = await API.post(
    "/api/external/customer-sync",
    data,
    {
      headers: {
        "x-api-key": API_KEY,
      },
    }
  );

  return res.data;
};

export const checkCustomerExists = async (email: string): Promise<boolean> => {
  const res = await API.post(
    "/api/external/customer-exists",
    { email },
    {
      headers: {
        "x-api-key": API_KEY,
      },
    }
  );

  return res.data.exists;
};

// New login function with password validation
export const loginCustomer = async (data: LoginPayload): Promise<LoginResponse> => {
  const res = await API.post(
    "/api/external/customer-login",
    data,
    {
      headers: {
        "x-api-key": API_KEY,
      },
    }
  );

  return res.data;
};