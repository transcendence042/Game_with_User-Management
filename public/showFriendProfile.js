"use strict";
async function loadFriendProfile() {
    const params = new URLSearchParams(window.location.search);
    const friendId = params.get('id');
    const token = localStorage.getItem('token');
    if (!checkAuthToken()) {
        logoutUser();
        alert(`Auth check failed`);
    }
    if (!friendId || !token)
        return;
    try {
        const res = await fetch(`/api/user/profile/${friendId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            throw new Error('Failed to fetch friend profile');
        }
        const data = await res.json();
        const friend = data.user;
        const profileDiv = document.getElementById('friendProfile');
        if (!profileDiv)
            return;
        // Render profile card
        profileDiv.innerHTML = `
			<div class="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto mt-8">
				<h2 class="text-2xl font-bold text-pong-green mb-4">
					${friend.displayName || friend.username}
				</h2>
				<p class="text-gray-400 mb-2">Status: ${friend.status}</p>
				<p class="text-gray-400 mb-2">Email: ${friend.email || 'Hidden'}</p>

				<h2 class="text-2xl font-bold text-pong-green mt-8 mb-4">Match History</h2>
				<div class="bg-gray-800 border border-gray-700 rounded-lg p-6 shadow max-h-96 overflow-y-auto">
					<div id="matchHistory" class="space-y-3">
						${friend.recentMatches.map((m) => `
							<div class="bg-gray-700 p-3 rounded">
								<div class="font-medium">
									${m.Player1.displayName || m.Player1.username} 
									<span class="text-gray-400">vs</span> 
									${m.Player2.displayName || m.Player2.username}
								</div>
								<div class="text-sm text-gray-400">
									Winner: ${m.Winner ? (m.Winner.displayName || m.Winner.username) : 'N/A'}
								</div>
								<div class="text-xs text-gray-500">
									${new Date(m.createdAt).toLocaleString()}
								</div>
							</div>
						`).join('')}
					</div>
				</div>
			</div>
		`;
    }
    catch (error) {
        console.error(error);
        const profileDiv = document.getElementById('friendProfile');
        if (profileDiv) {
            profileDiv.innerHTML = `<p class="text-red-500">Failed to load friend profile.</p>`;
        }
    }
}
document.addEventListener('DOMContentLoaded', loadFriendProfile);
//# sourceMappingURL=showFriendProfile.js.map