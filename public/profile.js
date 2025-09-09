"use strict";
let currentUser;
// Load user profile data
async function loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }
    try {
        const res = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error('Failed to fetch profile');
        }
        const data = await res.json();
        currentUser = data.user;
        // Update UI with user data
        const usernameElement = document.getElementById('username');
        const displayNameElement = document.getElementById('displayName');
        const emailElement = document.getElementById('email');
        const winsElement = document.getElementById('wins');
        const lossesElement = document.getElementById('losses');
        const winRateElement = document.getElementById('winRate');
        const avatarElement = document.getElementById('userAvatar');
        if (usernameElement)
            usernameElement.textContent = currentUser.username;
        if (displayNameElement)
            displayNameElement.value = currentUser.displayName || '';
        if (emailElement)
            emailElement.value = currentUser.email || '';
        if (winsElement)
            winsElement.textContent = currentUser.wins.toString();
        if (lossesElement)
            lossesElement.textContent = currentUser.losses.toString();
        const winRate = currentUser.wins + currentUser.losses > 0
            ? Math.round((currentUser.wins / (currentUser.wins + currentUser.losses)) * 100)
            : 0;
        if (winRateElement)
            winRateElement.textContent = winRate + '%';
        // Set avatar
        if (avatarElement) {
            avatarElement.src = currentUser.avatar ||
                `https://ui-avatars.com/api/?name=${currentUser.displayName || currentUser.username}&size=128`;
        }
        // Load friends and match history
        await loadFriends();
        await loadMatchHistory();
    }
    catch (error) {
        console.error('Failed to load profile:', error);
        alert('Failed to load profile');
    }
}
function showPasswordMessage(message, type) {
    const msgEl = document.getElementById("message");
    msgEl.textContent = message;
    msgEl.className =
        "text-sm mt-3 text-center " +
            (type === "success" ? "text-green-600" : "text-red-500");
}
function checkStrength() {
    const pwd = document.getElementById("newPassword").value;
    const strengthText = document.getElementById("strengthText");
    let strength = "Weak";
    let color = "text-red-500";
    if (pwd.length >= 8 &&
        /[A-Z]/.test(pwd) &&
        /\d/.test(pwd) &&
        /[^A-Za-z0-9]/.test(pwd)) {
        strength = "Strong";
        color = "text-green-600";
    }
    else if (pwd.length >= 6) {
        strength = "Medium";
        3;
        color = "text-yellow-500";
    }
    strengthText.textContent = `Password strength: ${strength}`;
    strengthText.className = `text-xs mt-1 ${color}`;
}
async function changePassword(event) {
    const token = localStorage.getItem('token');
    console.log("changing password typescript!");
    if (!event)
        return;
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const oldPassword = formData.get("oldPassword") || "";
    const newPassword = formData.get("newPassword") || "";
    const confirmPassword = formData.get("confirmPassword") || "";
    if (!oldPassword || !newPassword || !confirmPassword) {
        showPasswordMessage("⚠️ Please fill in all required fields", "error");
        return;
    }
    if (newPassword !== confirmPassword) {
        showPasswordMessage("❌ New passwords do not match", "error");
        return;
    }
    if (!isValidPassword(newPassword)) {
        showPasswordMessage("⚠️ Password must be at least 8 characters long, with one lowercase, one uppercase, one number, and one special character.", "error");
        return;
    }
    console.log("changing password typescript! after 123");
    try {
        const response = await fetch("/api/user/profile/changePassword", {
            method: "PUT",
            headers: { "Content-Type": "application/json",
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ oldPassword, newPassword }),
        });
        console.log("changing password typescript! after 123");
        const result = await response.json();
        if (response.ok) {
            showPasswordMessage("✅ Password updated successfully!", "success");
            form.reset();
            setTimeout(() => { window.location.href = '/profile.html'; }, 1500);
        }
        else {
            showPasswordMessage(result.error || "❌ Password update failed", "error");
        }
    }
    catch (error) {
        showPasswordMessage(error.message || "⚠️ An unexpected error occurred", "error");
    }
}
async function updateProfile() {
    const token = localStorage.getItem('token');
    const displayNameElement = document.getElementById('displayName');
    const emailElement = document.getElementById('email');
    if (!displayNameElement || !emailElement) {
        alert('Form elements not found');
        return;
    }
    const displayName = displayNameElement.value;
    const email = emailElement.value;
    try {
        const res = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ displayName, email })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Profile updated successfully!');
            await loadProfile();
        }
        else {
            alert(data.error || 'Update failed');
        }
    }
    catch (error) {
        alert('Update failed');
    }
}
function ShowFriendProfile(friendId) {
    window.location.href = `/showFriendProfile.html?id=${friendId}`;
}
async function loadFriends() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/user/friends', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const friendsList = document.getElementById('friendsList');
        if (!friendsList)
            return;
        friendsList.innerHTML = '';
        if (data.friends && data.friends.length > 0) {
            data.friends.forEach(friend => {
                const friendElement = document.createElement('div');
                friendElement.className = 'friend-item bg-indigo-600 p-3 rounded-lg flex justify-between items-center';
                friendElement.innerHTML = `
                    <button class="w-full text-left px-4 py-2 bg-indigo-600 rounded-lg hover:bg-gray-200 transition"
                        onclick="ShowFriendProfile('${friend.id}')">
                        <span class="font-medium">${friend.displayName || friend.username}</span>
                        <span class="text-sm text-gray-500 ml-2">(gmail: ${friend.email})</span>
                    </button>
                `;
                friendsList.appendChild(friendElement);
            });
        }
        else {
            friendsList.innerHTML = '<p class="text-gray-500">No friends added yet.</p>';
        }
    }
    catch (error) {
        console.error('Failed to load friends:', error);
    }
}
async function loadMatchHistory() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/user/match-history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const matchHistory = document.getElementById('matchHistory');
        if (!matchHistory)
            return;
        matchHistory.innerHTML = '';
        if (data.matches && data.matches.length > 0) {
            data.matches.forEach(match => {
                const isPlayer1 = match.player1Id === currentUser.id; //currentUser is set by loadProfile() when the page loads
                const opponent = isPlayer1 ? match.Player2 : match.Player1;
                const myScore = isPlayer1 ? match.player1Score : match.player2Score;
                const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
                const won = match.winnerId === currentUser.id;
                const matchElement = document.createElement('div');
                matchElement.className = `p-3 rounded-lg ${won ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'} border`;
                matchElement.innerHTML = `
                    <div class="flex justify-between items-center">
                        <span class="font-medium">vs ${opponent.displayName || opponent.username}</span>
                        <span class="text-lg font-bold">${myScore} - ${opponentScore}</span>
                        <span class="px-2 py-1 rounded text-sm font-medium ${won ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}">${won ? 'WIN' : 'LOSS'}</span>
                    </div>
                    <div class="text-sm text-gray-500 mt-1">${new Date(match.createdAt).toLocaleDateString()}</div>
                `;
                matchHistory.appendChild(matchElement);
            });
        }
        else {
            matchHistory.innerHTML = '<p class="text-gray-500">No matches played yet.</p>';
        }
    }
    catch (error) {
        console.error('Failed to load match history:', error);
    }
}
async function logoutProfile() {
    const token = localStorage.getItem('token');
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }
    catch (error) {
        console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}
// Handle avatar upload
function initializeAvatarUpload() {
    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) {
        avatarInput.addEventListener('change', async function (e) {
            const target = e.target;
            const file = target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async function (e) {
                    const avatar = e.target?.result;
                    const token = localStorage.getItem('token');
                    try {
                        const res = await fetch('/api/user/profile', {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ avatar })
                        });
                        if (res.ok) {
                            const avatarElement = document.getElementById('userAvatar');
                            if (avatarElement) {
                                avatarElement.src = avatar;
                            }
                            alert('Avatar updated!');
                        }
                        else {
                            alert('Failed to update avatar');
                        }
                    }
                    catch (error) {
                        alert('Failed to update avatar');
                    }
                };
                //onload was define before calling readAsDataURL so we don’t miss the event.
                reader.readAsDataURL(file);
            }
        });
    }
}
// Make functions available globally
window.loadProfile = loadProfile;
window.updateProfile = updateProfile;
window.logout = logoutProfile;
window.changePassword = changePassword;
window.checkStrength = checkStrength;
window.showPasswordMessage = showPasswordMessage;
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuthToken())
        logoutUser();
    initializeAvatarUpload();
    loadProfile();
    loadFriends();
    //friendRequestNotification();
});
//# sourceMappingURL=profile.js.map