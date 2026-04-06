import { apiClient, ClientsResponse } from "../../../shared/lib/api-client";
import { Client } from "../types/client";

export interface SignContractResponse {
  message: string;
  [key: string]: unknown;
}

export const clientApiService = {
  getClientById: async (id: number): Promise<Client> => {
    const response = await apiClient.get<Client>(`/clients/${id}`);
    return response.data;
  },

  searchClients: async (identification: string): Promise<ClientsResponse> => {
    const response = await apiClient.get<ClientsResponse>("/clients", {
      params: { search: identification },
    });
    return response.data;
  },

  updateClient: async (id: number, data: Partial<Client>): Promise<Client> => {
    const response = await apiClient.patch<Client>(`/clients/${id}`, data);
    return response.data;
  },

  signContract: async (
    id: number, 
    data: { 
      signature_base64: string; 
      update_terms_and_conditions: boolean; 
      vame_code: string 
    }
  ): Promise<SignContractResponse> => {
    const response = await apiClient.post<SignContractResponse>(`/contracts/${id}/signe/`, data);
    return response.data;
  },
};
