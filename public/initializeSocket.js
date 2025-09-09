"use strict";
// Get authentication token
const token = localStorage.getItem('token');
const socket = io({ auth: { token } });
window.socket = socket;
//# sourceMappingURL=initializeSocket.js.map