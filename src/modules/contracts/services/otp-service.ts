import { apiClient } from "@/shared/lib/api-client";

export type CommunicationMethod = "sms" | "email";

export interface OtpRequest {
  communication_method: CommunicationMethod;
  sender: string;
}

export interface OtpVerifyRequest {
  code: string;
  communication_method: CommunicationMethod;
}

export const otpApiService = {
  generateOtp: async (data: OtpRequest): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>("/code_otp/", data);
    return response.data;
  },

  validateOtp: async (params: OtpVerifyRequest): Promise<{ message: string }> => {
    const response = await apiClient.get<{ message: string }>("/code_otp/", {
      params,
    });
    return response.data;
  },
};
