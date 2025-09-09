interface User {
    username: string;
    displayName?: string;
}
interface AuthResponse {
    user: User;
}
interface LoginResponse {
    token?: string;
    error?: string;
}
declare function checkAuthToken(): Promise<boolean>;
declare function checkAuth(): Promise<void>;
declare function logoutUser(): void;
