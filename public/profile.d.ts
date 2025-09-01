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
    email: string;
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
declare let currentUser: UserProfile;
declare function loadProfile(): Promise<void>;
declare function showPasswordMessage(message: string, type: "success" | "error"): void;
declare function checkStrength(): void;
declare function changePassword(event?: SubmitEvent): Promise<void>;
declare function updateProfile(): Promise<void>;
declare function ShowFriendProfile(friendId: number): void;
declare function loadFriends(): Promise<void>;
declare function loadMatchHistory(): Promise<void>;
declare function logoutProfile(): Promise<void>;
declare function initializeAvatarUpload(): void;
