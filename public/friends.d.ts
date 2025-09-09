interface Friend {
    id: number;
    username: string;
    displayName?: string;
    avatar: string;
    isOnline: boolean;
    lastSeen: string;
}
interface friendRequest {
    from: string;
    to: string;
}
declare function sendFriendRequest(): Promise<void>;
declare function respondToFriendRequest(requestId: number, action: "accept" | "reject"): Promise<any>;
declare function getFriends(): Promise<Friend[] | null>;
declare function showFriendRequests(): Promise<void>;
