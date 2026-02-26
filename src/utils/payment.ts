import axios from "axios";

import API from "./AxiosInstance";

type BillingCycle = "monthly" | "half-yearly" | "quarterly" | "yearly";

export const createOrder = async ({
  userId,
  licenseId,
  billingCycle,
  amount,
}: {
  userId: string;
  licenseId: string;
  billingCycle: BillingCycle;
  amount: number;
}) => {
  const res = await API.post(`/api/payment/create-order`, {
    userId,
    licenseId,
    billingCycle,
    amount,
  });
  return res.data;
};

// Verify payment after Razorpay returns handler response
export const verifyPayment = async (details: any) => {
  const res = await API.post(`/api/payment/verify-payment`, details);
  return res.data;
};

export const getTransactionDetails = async (transactionId: string) => {
  const res = await API.get(`/api/payment/transaction/${transactionId}`);
  return res.data;
};

export const getMyTransactions = async (userId: string) => {
  const res = await API.get(`/api/payment/my-transactions?userId=${userId}`);
  return res.data;
};

export const downloadInvoice = (transactionId: string) => {
  if (!transactionId) return;

  window.open(
    `https://lisence-system.onrender.com/api/payment/invoice/${transactionId}`,
    "_blank"
  );
};

// Calculate upgrade pricing
export const calculateUpgradePricing = async ({
  licenseId,
  newUserLimit,
  email,
}: {
  licenseId: string;
  newUserLimit: number;
  email: string;
}) => {
  const res = await API.post(`/api/lms/calculate-user-upgrade`, {
    licenseId,
    newUserLimit,
    email,
  });
  return res.data;
};

// Initiate upgrade transaction
export const initiateUserUpgrade = async ({
  licenseId,
  newUserLimit,
  email,
}: {
  licenseId: string;
  newUserLimit: number;
  email: string;
}) => {
  const res = await API.post(`/api/lms/initiate-user-upgrade`, {
    licenseId,
    newUserLimit,
    email,
  });
  return res.data;
};

// Create Razorpay order for user upgrade
export const createOrderForUserUpgrade = async ({
  transactionId,
}: {
  transactionId: string;
}) => {
  const res = await API.post(`/api/payment/create-order-user-upgrade`, {
    transactionId,
  });
  return res.data;
};

// Check upgrade status (polling)
export const getUpgradeStatus = async (transactionId: string) => {
  const res = await API.get(`/api/lms/upgrade-status/${transactionId}`);
  return res.data;
};

// Cancel pending upgrade transaction
export const cancelUpgradeTransaction = async ({
  transactionId,
}: {
  transactionId: string;
}) => {
  const res = await API.post(`/api/lms/cancel-upgrade-transaction`, {
    transactionId,
  });
  return res.data;
};