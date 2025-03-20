import axios from "axios";
import Cookies from "js-cookie";

const apiClient = axios.create({
    baseURL: "http://localhost:8000",
    withCredentials: true,
})

// Attach CSRF token to every request
apiClient.interceptors.request.use((config) => {
    const csrfToken = Cookies.get("csrftoken");
    if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
});

export default apiClient;