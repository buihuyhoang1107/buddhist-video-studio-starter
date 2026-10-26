import axios from "axios";

export const axiosRequest = axios.create({ baseURL: "/api" });

axiosRequest.interceptors.response.use(response => response, error => {
  if (axios.isAxiosError<{ error?: string }>(error) && error.response?.data.error) {
    error.message = error.response.data.error;
  }
  return Promise.reject(error);
});
