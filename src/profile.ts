// Type definitions for profile functionality
interface UserProfile {
    id: string;
    username: string;
    displayName?: string;
    email?: string;
    avatar?: string;
    wins: number;
    losses: number;
}

interface Friend {
    id: number;
    username: string;
    displayName?: string;
    status: string;
    email: string
}

interface Match {
    id: string;
    player1Id: string;
    player2Id: string;
    player1Score: number;
    player2Score: number;
    winnerId: string;
    createdAt: string;
    Player1: UserProfile;
    Player2: UserProfile;
}

interface MatchHistoryResponse {
    matches: Match[];
}

interface FriendsResponse {
    friends: Friend[];
}

let currentUser: UserProfile;

// Load user profile data
async function loadProfile(): Promise<void> {
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
        const displayNameElement = document.getElementById('displayName') as HTMLInputElement;
        const emailElement = document.getElementById('email') as HTMLInputElement;
        const winsElement = document.getElementById('wins');
        const lossesElement = document.getElementById('losses');
        const winRateElement = document.getElementById('winRate');
        const avatarElement = document.getElementById('userAvatar') as HTMLImageElement;
        
        if (usernameElement) usernameElement.textContent = currentUser.username;
        if (displayNameElement) displayNameElement.value = currentUser.displayName || '';
        if (emailElement) emailElement.value = currentUser.email || '';
        if (winsElement) winsElement.textContent = currentUser.wins.toString();
        if (lossesElement) lossesElement.textContent = currentUser.losses.toString();
        
        const winRate = currentUser.wins + currentUser.losses > 0 
            ? Math.round((currentUser.wins / (currentUser.wins + currentUser.losses)) * 100)
            : 0;
        if (winRateElement) winRateElement.textContent = winRate + '%';

        // Set avatar
        if (avatarElement) {
            avatarElement.src = currentUser.avatar || 
                `https://ui-avatars.com/api/?name=${currentUser.displayName || currentUser.username}&size=128`;
        }

        // Load friends and match history
        await loadFriends();
        await loadMatchHistory();
    } catch (error) {
        console.error('Failed to load profile:', error);
        alert('Failed to load profile');
    }
}

function showPasswordMessage(message: string, type: "success" | "error"): void {
  const msgEl = document.getElementById("message") as HTMLElement;
  msgEl.textContent = message;
  msgEl.className =
    "text-sm mt-3 text-center " +
    (type === "success" ? "text-green-600" : "text-red-500");
}

function checkStrength(): void {
  const pwd = (document.getElementById("newPassword") as HTMLInputElement).value;
  const strengthText = document.getElementById("strengthText") as HTMLElement;

  let strength = "Weak";
  let color = "text-red-500";

  if (
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /\d/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd)
  ) {
    strength = "Strong";
    color = "text-green-600";
  } else if (pwd.length >= 6) {
    strength = "Medium";3
    color = "text-yellow-500";
  }

  strengthText.textContent = `Password strength: ${strength}`;
  strengthText.className = `text-xs mt-1 ${color}`;
}

async function changePassword(event?: SubmitEvent): Promise<void> {
    const token = localStorage.getItem('token');
    console.log("changing password typescript!")
  if (!event) return;
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);

  const oldPassword = (formData.get("oldPassword") as string) || "";
  const newPassword = (formData.get("newPassword") as string) || "";
  const confirmPassword = (formData.get("confirmPassword") as string) || "";

  if (!oldPassword || !newPassword || !confirmPassword) {
    showPasswordMessage("⚠️ Please fill in all required fields", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    showPasswordMessage("❌ New passwords do not match", "error");
    return;
  }

  if (!isValidPassword(newPassword)) {
    showPasswordMessage(
      "⚠️ Password must be at least 8 characters long, with one lowercase, one uppercase, one number, and one special character.",
      "error"
    );
    return;
  }
    console.log("changing password typescript! after 123")

  try {
    const response = await fetch("/api/user/profile/changePassword", {
      method: "PUT",
      headers: { "Content-Type": "application/json",
                  'Authorization': `Bearer ${token}`
       },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    console.log("changing password typescript! after 123")

    const result = await response.json();

    if (response.ok) {
      showPasswordMessage("✅ Password updated successfully!", "success");
      form.reset();
      setTimeout(() => {window.location.href = '/profile.html'}, 1500);
    } else {
      showPasswordMessage(result.error || "❌ Password update failed", "error");
    }
  } catch (error: any) {
    showPasswordMessage(error.message || "⚠️ An unexpected error occurred", "error");
  }
}


async function updateProfile(): Promise<void> {
    const token = localStorage.getItem('token');
    const displayNameElement = document.getElementById('displayName') as HTMLInputElement;
    const emailElement = document.getElementById('email') as HTMLInputElement;
    
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
        } else {
            alert(data.error || 'Update failed');
        }
    } catch (error) {
        alert('Update failed');
    }
}

function ShowFriendProfile(friendId: number): void {
    window.location.href = `/showFriendProfile.html?id=${friendId}`;
}
 
async function loadFriends(): Promise<void> {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/user/friends', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data: FriendsResponse = await res.json();
        
        const friendsList = document.getElementById('friendsList');
        if (!friendsList) return;
        
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
        } else {
            friendsList.innerHTML = '<p class="text-gray-500">No friends added yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load friends:', error);
    }
}

async function loadMatchHistory(): Promise<void> {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/user/match-history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data: MatchHistoryResponse = await res.json();
        
        const matchHistory = document.getElementById('matchHistory');
        if (!matchHistory) return;
        
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
        } else {
            matchHistory.innerHTML = '<p class="text-gray-500">No matches played yet.</p>';
        }
    } catch (error) {
        console.error('Failed to load match history:', error);
    }
}

async function logoutProfile(): Promise<void> {
    const token = localStorage.getItem('token');
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Handle avatar upload
function initializeAvatarUpload(): void {
    const avatarInput = document.getElementById('avatarInput') as HTMLInputElement;
    if (avatarInput) {
        avatarInput.addEventListener('change', async function(e: Event) {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async function(e: ProgressEvent<FileReader>) {
                    const avatar = e.target?.result as string;
                    
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
                            const avatarElement = document.getElementById('userAvatar') as HTMLImageElement;
                            if (avatarElement) {
                                avatarElement.src = avatar;
                            }
                            alert('Avatar updated!');
                        } else {
                            alert('Failed to update avatar');
                        }
                    } catch (error) {
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
(window as any).loadProfile = loadProfile;
(window as any).updateProfile = updateProfile;
(window as any).logout = logoutProfile;
(window as any).changePassword = changePassword;
(window as any).checkStrength = checkStrength;
(window as any).showPasswordMessage = showPasswordMessage;


// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuthToken())
        logoutUser();
    initializeAvatarUpload();
    loadProfile();
    loadFriends();
    //friendRequestNotification();
});
