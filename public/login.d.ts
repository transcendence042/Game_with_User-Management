interface LoginData {
    username: string;
    password: string;
}
interface LoginResponse {
    token?: string;
    error?: string;
}
interface userDataType {
    username: string;
    email?: string;
    displayName?: string;
    password: string;
}
declare function showTab(tabName: "login" | "register"): void;
declare function isValidPassword(password: string): boolean;
/**
 * Generalized Register handler
 */
declare function register(event?: SubmitEvent): Promise<void>;
/**
 * Generalized Login handler
 */
declare function login(event?: SubmitEvent): Promise<void>;
/**
 * Show messages
 */
declare function showMessage(text: string, type: "success" | "error"): void;
