import axios from "axios";

const API_URL = "http://localhost:5000"; // Adjust if backend runs on a different port

// Register API Call
export const registerUser = async (userData: {
  name: string;
  surname: string;
  email: string;
  role: string;
  password: string;
}) => {
  try {
    const response = await axios.post(`${API_URL}/register`, userData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.message || "Registration failed";
  }
};

// Login API Call
export const loginUser = async (loginData: { email: string; password: string }) => {
  try {
    const response = await axios.post(`${API_URL}/login`, loginData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.message || "Login failed";
  }
};
