interface Friend {
  id: number;
  username: string;
  displayName?: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string;
}

interface friendRequest {
	from: string,
	to: string
}

async function sendFriendRequest(): Promise<void> {
    const token = localStorage.getItem('token');
    const usernameElement = document.getElementById('friendUsername') as HTMLInputElement;

	console.log(`
		friend request sent to ${usernameElement.value}`)
    
    if (!usernameElement) {
        alert('Username input not found');
        return;
    }
    
    const friendUsername = usernameElement.value;
    
    if (!friendUsername) {
        alert('Please enter a username');
        return;
    }

    try {
        const res = await fetch('/api/user/friend-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ friendUsername })
        });

        const data = await res.json();
        if (res.ok) {
            alert('Friend request sent!');
            usernameElement.value = '';
            await loadFriends();
        } else {
            alert(data.error || 'Failed to send friend request');
		}
    }
    catch (error) {
        alert('Failed to send friend request');
	}
}

// ✅ Respond to a friend request
async function respondToFriendRequest(requestId: number, action: "accept" | "reject"): Promise<any> {
	const token = localStorage.getItem("token");
	if (!token) {
		window.location.href = '/login.html';
		return;
	}
	try {
		const res = await fetch(`/api/user/friend-response`, {
			method: "POST",
			headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ requestId, action }),
		});
		if (res.ok) {
			alert(`Friend request ${action}ed!`);
            showFriendRequests();
		}
	}
	catch (error) {
		alert(`Auth check failed: ${error}`);
		window.location.href = '/login.html';
	}
}

// ✅ Get list of accepted friends
async function getFriends(): Promise<Friend[] | null> {
	const token = localStorage.getItem("token");
	if (!token) {
		return null;
	}
	try {
		const res = await fetch(`/api/user/profile/:userId`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		});
		const data = await res.json();
		return data.friends || null;
	}
	catch (error) {
		console.error('Auth check failed:', error);
		return null;
	}
}

socket.on("sendFriendRequest", (requestRecieve: friendRequest) => {
	console.log(`FROM:	"${requestRecieve.from}"\nTO:	"${requestRecieve.to}"`);
	alert(`You have a Friend Request from ${requestRecieve.from}`);
	
})


async function showFriendRequests() {
	console.log("SHOWING FREINREQUESTS!!!")
	const token = localStorage.getItem('token');
	if (!token) {
		alert(`Auth check failed`);
		return ;
	}
	try {
		const res = await fetch(`/api/user/friend-getFriendRequests`, {
			method: "GET",
			headers: { 'Authorization': `Bearer ${token}` }
		});
		const data = await res.json();
		if (res.ok) {
			console.log("SHOWFRIENDREQUEST WAS OK!!!")
			const friendRequests = data.friendRequest || [];
            const container = document.getElementById('friendRequestsContainer');

			if (!container)
				return;
            // Clear any existing requests
            container.innerHTML = '';

			// Display each friend request
			if (!friendRequests.length) {
				container.innerHTML = `
					<div class="bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center">
						<p class="text-lg font-semibold text-gray-300 mb-2">No Friend Requests</p>
						<p class="text-sm text-gray-400">You don't have any friend requests at the moment.</p>
					</div>
				`;
				return;
			}
			friendRequests.forEach((request: any) => {
				const requestElement = document.createElement('div');
				requestElement.classList.add('friend-request');
				requestElement.classList.add('p-4');
				requestElement.classList.add('bg-gray-700');
				requestElement.classList.add('rounded-lg');
				requestElement.classList.add('mb-4');

				const userElement = document.createElement('div');
				userElement.classList.add('flex', 'items-center', 'justify-between');
				userElement.innerHTML = `
					<div class="flex items-center">
							<p class="font-semibold">${request.User.displayName}</p>
							<p class="text-sm text-gray-400">${request.User.username}</p>
					</div>
					<div class="flex space-x-4">
						<button onclick="respondToFriendRequest(${request.id}, 'accept')" class="px-4 py-2 bg-green-500 rounded-full">Accept</button>
						<button onclick="respondToFriendRequest(${request.id}, 'reject')" class="px-4 py-2 bg-red-500 rounded-full">Decline</button>
					</div>
				`;

				requestElement.appendChild(userElement);
				container.appendChild(requestElement);
			})
		}
		else {
			alert('Failed to send friend request');
		}
	}
	catch (error) {
		alert(`Auth check failed: ${error}`);
	}

}


(window as any).sendFriendRequest = sendFriendRequest;
(window as any).numberOfFriendRequest;
(window as any).showFriendRequests = showFriendRequests;

document.addEventListener('DOMContentLoaded', () => {
	if (!checkAuthToken())
		logoutUser();
	showFriendRequests();
});
