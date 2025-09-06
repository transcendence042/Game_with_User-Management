import fastify from 'fastify';
import { Server } from 'socket.io';
import fastifyStatic from '@fastify/static';
import formBody from '@fastify/formbody';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import path from 'path';
import { fileURLToPath } from 'url';

//Oauth2.0
import oauthPlugin from '@fastify/oauth2';
import 'dotenv/config';//by default loads environment variables from a file named .env

import {
  authGoogleCallback,
  register, 
  login, 
  logout, 
  me, 
  authenticate, 
  updateProfile, 
  getUserProfile, 
  sendFriendRequest, 
  respondToFriendRequest,
  getFriendRequests, 
  getFriends, 
  getMatchHistory, 
  changePassword,
} from './backend/auth.js';
import { initializeDatabase, Match, User } from './backend/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = fastify({ logger: true });

// Register plugins
await app.register(cors, { origin: '*' });
await app.register(formBody);
await app.register(jwt, { secret: 'supersecretkey' }); // TODO: .env

// Serve static files
app.register(fastifyStatic, {
    root: path.join(__dirname, 'public')
});

// Google OAuth2 setup
await app.register(oauthPlugin, {
  name: 'googleOAuth2',
  scope: ['openid', 'email', 'profile'],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET,
    },
    auth: oauthPlugin.GOOGLE_CONFIGURATION,
  },
  startRedirectPath: '/auth/google',
  callbackUri: 'http://localhost:3000/auth/google/callback',
});


// Auth routes
app.get('/auth/google/callback', authGoogleCallback);
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/logout', { preHandler: authenticate }, logout);
app.get('/api/auth/me', { preHandler: authenticate }, me);

// User management routes
app.get('/api/user/profile', { preHandler: authenticate }, me); // Get current user's profile (reuse me endpoint)
app.put('/api/user/profile', { preHandler: authenticate }, updateProfile);
app.put('/api/user/profile/changePassword', { preHandler: authenticate }, changePassword);
app.get('/api/user/profile/:userId', { preHandler: authenticate }, getUserProfile);
app.get('/api/user/friends', { preHandler: authenticate }, getFriends);
app.get('/api/user/friend-getFriendRequests', { preHandler: authenticate }, getFriendRequests);
app.post('/api/user/friend-request', { preHandler: authenticate }, sendFriendRequest);
app.post('/api/user/friend-response', { preHandler: authenticate }, respondToFriendRequest);
app.get('/api/user/match-history', { preHandler: authenticate }, getMatchHistory);

// Create Socket.IO server
const io = new Server(app.server);
app.decorate('io', io);

// Game rooms
//gameRooms is an object so it store data as key-value pairs 
var gameRooms = {};
var nextRoomId = 1;
let freeRoomIds = []; 

//The shift() method returns and removes the first element in the array
function createRoomId() {
    if (freeRoomIds.length > 0) {
        return `room${freeRoomIds.shift()}`; // reuse smallest available
    }
    return `room${nextRoomId++}`;
}

function releaseRoomId(roomId) {
    const num = parseInt(roomId.replace("room", ""));
    if (!isNaN(num)) {
        freeRoomIds.push(num);
//The main purpose of "(a, b) => a - b" is to sort the array numerically in ascending order.
        freeRoomIds.sort((a, b) => a - b); // keep ascending order
    }
}

function createGameState() {
    return {
        ball: { x: 400, y: 200, vx: 2, vy: 2, radius: 10 },
        player1: { x: 10, y: 150, width: 10, height: 100, score: 0 },
        player2: { x: 780, y: 150, width: 10, height: 100, score: 0 },
        gameEnded: false
    };
}

//entries is a method of Object that returns an array of [key, value] pairs for all properties in an object.
function getLobbyInfo() {
//console.log(Object.entries(gameRooms))
    return Object.entries(gameRooms).map(([id, room]) => ({
        roomId: id,
        players: room.players.length
    }));
}

//Is not neccesary to delete the old gameRooms if any because assigning will overwrite it.
//this fucntion is not used
//function findAvailableRoom() {
//    for (let roomId in gameRooms) {
//        if (gameRooms[roomId].players.length < 2) return roomId;
//    }
//    const newRoomId =  createRoomId();
//    gameRooms[newRoomId] = { 
//        players: [], 
//        gameState: createGameState(),
//        startTime: Date.now()
//    };
//    return newRoomId;
//}

// Game loop
setInterval(async () => {
    for (let roomId in gameRooms) {
        const room = gameRooms[roomId];

        if (room.players.length === 2) {
            await updateGame(room.gameState, roomId);
            io.to(roomId).emit('gameUpdate', room.gameState);
        }

        if (room.players.length === 0) {
            delete gameRooms[roomId];
            releaseRoomId(roomId);
            io.emit("lobbyUpdate", getLobbyInfo());
        }
    }
}, 1000 / 60);

// Protect socket with JWT
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Auth required'));
    
    try {
        const decoded = await app.jwt.verify(token);
        socket.user = decoded;
        next();
    } catch (error) {
        next(new Error('Invalid token'));
    }
});

// Store online users
app.decorate('onlineUsers', new Map()); // userId -> socketId

// Socket.IO connection
io.on("connection", (socket) => {
    console.log("🎮 Player connected:", socket.user.username);

     const userId = socket.user.id; // assuming you decode token
     app.onlineUsers.set(userId, socket.id);

    // 👇 Join the user’s personal room (based on their ID)
    socket.join(socket.user.id);

    // Send current lobby info
    socket.emit("lobbyUpdate", getLobbyInfo());

    socket.on("joinRoom", (requestedRoomId) => {
		let roomId = requestedRoomId || createRoomId();

        // Create room if it doesn't exist
        if (!gameRooms[roomId]) {
            gameRooms[roomId] = 
            {
                players: [],
                gameState: createGameState(),
                startTime: Date.now(),
            };
            console.log(`🆕 Room created: ${roomId}`);
        }

		const room = gameRooms[roomId];

		// ✅ Check if this user is already in the room (reconnect case)
		const existingPlayer = room.players.find(p => p.userId === socket.user.id);
		if (existingPlayer) {
			existingPlayer.id = socket.id;
			existingPlayer.disconnected = false;

            console.log(`----------->    existing Player id: ${existingPlayer.id}`)
			if (existingPlayer.disconnectTimer) {
				clearTimeout(existingPlayer.disconnectTimer);
				delete existingPlayer.disconnectTimer;
			}

			socket.join(roomId);
			socket.roomId = roomId;
			socket.isPlayer1 = existingPlayer.isPlayer1;

			console.log(`✅ ${socket.user.id} reconnected to ${roomId}`);

			socket.emit("gameUpdate", room.gameState);
            socket.emit("playerAssignment", {
				isPlayer1: existingPlayer.isPlayer1,
				roomId,
				playersInRoom: room.players.length,
				message: `Room ${roomId} - You are Player ${existingPlayer.isPlayer1 ? "1" : "2"}`
			});

			socket.to(roomId).emit("opponentReconnected", {
				message: "✅ Opponent reconnected!"
			});

			return; // stop here, don’t add them as a new player
		}

		// 👇 if not reconnecting → normal new player join logic
        //this is handle in the emit("joinRoom") in the fron-end so it can safely be remove
		//if (room.players.length >= 2) {
		//	socket.emit("roomFull", { message: `Room ${roomId} is full.` });
		//	return;
		//}

		socket.join(roomId);
		const isPlayer1 = room.players.length === 0;
		room.players.push({ id: socket.id, isPlayer1, userId: socket.user.id });
		socket.roomId = roomId;
		socket.isPlayer1 = isPlayer1;

		socket.emit("gameUpdate", room.gameState);
		socket.emit("playerAssignment", {
			isPlayer1,
			roomId,
			playersInRoom: room.players.length,
			message: `Room ${roomId} - You are Player ${isPlayer1 ? "1" : "2"}`
		});

		io.emit("lobbyUpdate", getLobbyInfo());

		if (room.players.length === 2) {
			io.to(roomId).emit("gameReady", { message: `Game ready in ${roomId}!` });
		}
	});


    // Paddle movement
    socket.on("paddleMove", (data) => {
        const room = gameRooms[socket.roomId];
        if (!room || room.gameState.gameEnded) return;
        if (socket.isPlayer1) room.gameState.player1.y = Math.max(0, Math.min(300, data.y));
        else room.gameState.player2.y = Math.max(0, Math.min(300, data.y));
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        //onlineUsers.delete(userId);
		const roomId = socket.roomId;
		if (!roomId || !gameRooms[roomId]) return;

		const room = gameRooms[roomId];
		const player = room.players.find(p => p.id === socket.id);

		if (player) {
			console.log(`⚠️ ${player.userId} disconnected from ${roomId}, waiting 10s...`);

			// mark player as disconnected
			player.disconnected = true;

			// notify opponent
			socket.to(roomId).emit("opponentDisconnected", {
				message: "⚠️ Opponent disconnected. Waiting 10s for them to return..."
			});

			// start grace timer
			player.disconnectTimer = setTimeout(() => {
				const stillDisconnected = room.players.find(
					p => p.userId === player.userId && p.disconnected
				);

				if (stillDisconnected) {
					console.log(`❌ ${player.userId} did not return, removing from ${roomId}`);
					room.players = room.players.filter(p => p.userId !== player.userId);

					if (room.players.length === 0) {
						delete gameRooms[roomId];
						console.log(`🗑️ Room ${roomId} deleted`);
					} else {
						io.to(roomId).emit("opponentLeft", { message: "Opponent left the game." });
					}

					io.emit("lobbyUpdate", getLobbyInfo());
				}
			}, 5000); // 10s grace
		}
	});

	socket.on("continueVote", ({ roomId, vote }) => {
        if (!gameRooms[roomId]) return;

        const room = gameRooms[roomId];
        room.continueVotes[socket.user.id] = vote; // "yes" or "no"

        //If any player already voted "no" → stop immediately
        if (Object.values(room.continueVotes).some(v => v === "no")) {
            io.to(roomId).emit("gameClosed", {
                message: "Game ended. At least one player declined."
            });
            delete gameRooms[roomId];
            return;
        }

        //Only restart if both have voted and both are "yes"
        if (Object.keys(room.continueVotes).length === 2) {
            if (Object.values(room.continueVotes).every(v => v === "yes")) {
                room.gameState = createGameState();
                io.to(roomId).emit("gameRestarted", {
                    message: "Both players agreed! Restarting..."
                });
                io.to(roomId).emit("gameUpdate", room.gameState);
            }
        }
    });

});
// Game physics
async function updateGame(gameState, roomId) {
    // Don't update if game has ended
    if (gameState.gameEnded) return;
    
    gameState.ball.x += gameState.ball.vx;
    gameState.ball.y += gameState.ball.vy;
    if (gameState.ball.y <= 0 || gameState.ball.y >= 400) gameState.ball.vy *= -1;

    if (gameState.ball.x === 20 && gameState.ball.y >= gameState.player1.y && gameState.ball.y <= gameState.player1.y + 100)
        gameState.ball.vx *= -1;
    if (gameState.ball.x === 780 && gameState.ball.y >= gameState.player2.y && gameState.ball.y <= gameState.player2.y + 100)
        gameState.ball.vx *= -1;

    let gameEnded = false;
    if (gameState.ball.x < 0) { 
        gameState.player2.score++; 
        resetBall(gameState);
        if (gameState.player2.score >= 2) gameEnded = true;
    }
    else if (gameState.ball.x > 800) { 
        gameState.player1.score++; 
        resetBall(gameState);
        if (gameState.player1.score >= 2) gameEnded = true;
    }

    // Save match when game ends
    if (gameEnded && gameRooms[roomId]) {
        gameState.gameEnded = true; // Mark game as ended to stop updates
        const room = gameRooms[roomId];
        if (room.players.length === 2) {
            const player1 = room.players.find(p => p.isPlayer1);
            const player2 = room.players.find(p => !p.isPlayer1);
            
            if (player1 && player2 && player1.userId && player2.userId) {
                const winnerId = gameState.player1.score > gameState.player2.score ? player1.userId : player2.userId;
                
                // Notify players of game end
                io.to(roomId).emit("gameEnded", {
                    winner: winnerId === player1.userId ? "Player 1" : "Player 2",
                    finalScore: `${gameState.player1.score} - ${gameState.player2.score}`
                });
                // Save match to database
                await Match.create({
                    player1Id: player1.userId,
                    player2Id: player2.userId,
                    player1Score: gameState.player1.score,
                    player2Score: gameState.player2.score,
                    winnerId: winnerId,
                    duration: Math.floor((Date.now() - room.startTime) / 1000),
                    gameType: '1v1'
                });

                // Update user stats
                const winnerUser = await User.findByPk(winnerId);
                const loserUser = await User.findByPk(winnerId === player1.userId ? player2.userId : player1.userId);
                
                await winnerUser.update({ wins: winnerUser.wins + 1 });
                await loserUser.update({ losses: loserUser.losses + 1 });

                // reset votes
                gameRooms[roomId].continueVotes = {};
                setTimeout(() => {io.to(roomId).emit("continuePrompt", {
                    message: "Do you want to play again? (Yes/No)"
                })}, 300)
            }
        }
    }
}

function resetBall(gameState) {
    gameState.ball.x = 400;
    gameState.ball.y = 200;
    gameState.ball.vx = gameState.ball.vx > 0 ? -2 : 2;
    gameState.ball.vy = Math.random() > 0.5 ? 2 : -2;
}

// Start server
const start = async () => {
    try {
        // Initialize database first
        await initializeDatabase();
        
        await app.listen({ port: 3000, host: '0.0.0.0' });
        console.log('🚀 Pong server running on http://localhost:3000');
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
