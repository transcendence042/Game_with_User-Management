interface LobbyRoom {
    roomId: string;
    players: number;
}
interface GameState {
    player1: Player;
    player2: Player;
    ball: Ball;
    gameEnded: boolean;
    gameRendering: boolean;
}
interface Player {
    x: number;
    y: number;
    width: number;
    height: number;
    score: number;
    render: boolean;
}
interface Ball {
    x: number;
    y: number;
    radius: number;
}
interface PlayerAssignment {
    isPlayer1: boolean;
    roomId: string;
    message: string;
}
interface GameMessage {
    message: string;
}
interface GameEndData {
    winner: string;
    finalScore: string;
}
interface Roomstatus {
    roomId: string;
    status: string;
    message: string;
    isPlayer1: boolean;
}
interface GameReset {
    message: string;
    roomId: string;
}
declare const canvas: HTMLCanvasElement;
declare const ctx: CanvasRenderingContext2D;
declare let gameState: GameState | null;
declare let isPlayer1: boolean;
declare let roomId: string | null;
declare function updateScore(): void;
declare function draw(): void;
