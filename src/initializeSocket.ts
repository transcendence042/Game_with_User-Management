// Declare global io function
declare const io: any;

// Get authentication token
const token: string | null = localStorage.getItem('token');
const socket = io({ auth: { token } });

(window as any).socket = socket;