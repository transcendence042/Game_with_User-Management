import bcrypt from 'bcrypt';
import { User, Friendship, Match } from './db.js';
import { Op } from 'sequelize';

export async function register(req, reply) {
  const { username, password, emailOptional, displayNameOptional } = req.body;
  let email;
  let displayName;
  if (username === "" || password === "") return reply.code(400).send({ error: 'Username and password are required' });
  if (emailOptional === "" || displayNameOptional === "") {
	email = null;
	displayName = username;
  }
  else {
	email = emailOptional;
	displayName = displayNameOptional;
  }

  try {
	const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      username, 
      password: hashed, 
      email, 
      displayName
    });
    reply.send({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      reply.code(400).send({ error: 'Username or display name already exists' });
    } else {
      reply.code(500).send({ error: 'Registration failed', details: error.message });
    }
  }
}

export async function changePassword(req, reply) {
	const {oldPassword, newPassword} = req.body;
  console.log("changing password updating!")

	try {
		const user = await User.findByPk(req.user.id);
		if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
			return reply.code(401).send({ error: 'Invalid Password' });
		}
		const passwordHash = await bcrypt.hash(newPassword, 10);
		await user.update({
			password: passwordHash
		})
    console.log("chPassword has been update!!!!!")
		reply.send({message: 'Password has been change correctly!', id: user.id, username: user.username})
	}
	catch (e) {
		 reply.code(500).send({ error: 'Password update failed' });
	}
}

export async function login(req, reply) {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  // Update online status
  await user.update({ isOnline: true, lastSeen: new Date() });

  const token = req.server.jwt.sign({ 
    id: user.id, 
    username: user.username, 
    displayName: user.displayName 
  });
  reply.send({ token, user: { id: user.id, username: user.username, displayName: user.displayName } });
}

export async function logout(req, reply) {
  const user = await User.findByPk(req.user.id);
  if (user) {
    await user.update({ isOnline: false, lastSeen: new Date() });
  }
  reply.send({ message: 'Logged out successfully' });
}

export async function me(req, reply) {
  const user = await User.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });
  reply.send({ user });
}

export async function updateProfile(req, reply) {
  const { displayName, email, avatar } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    await user.update({ 
      displayName: displayName || user.displayName,
      email: email || user.email,
      avatar: avatar || user.avatar
    });
    reply.send({ message: 'Profile updated successfully', user: { 
      id: user.id, 
      username: user.username, 
      displayName: user.displayName,
      email: user.email,
      avatar: user.avatar
    }});
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      reply.code(400).send({ error: 'Display name already exists' });
    } else {
      reply.code(500).send({ error: 'Profile update failed' });
    }
  }
}

export async function getUserProfile(req, reply) {
  const { userId } = req.params;
  try {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) return reply.code(404).send({ error: 'User not found' });
    
    // Get recent matches separately to avoid complex joins
    const recentMatches = await Match.findAll({
      where: {
        [Op.or]: [
          { player1Id: userId },
          { player2Id: userId }
        ]
      },
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'Player1', attributes: ['username', 'displayName'] },
        { model: User, as: 'Player2', attributes: ['username', 'displayName'] },
        { model: User, as: 'Winner', attributes: ['username', 'displayName'] }
      ]
    });
    
    reply.send({ user: { ...user.toJSON(), recentMatches } });
  } catch (error) {
    console.error('Get user profile error:', error);
    reply.code(500).send({ error: 'Failed to fetch user profile' });
  }
}

export async function sendFriendRequest(req, reply) {
  const { friendUsername } = req.body;
  console.log(`BACK-END     friend request sent to ${friendUsername}!`)
  try {
    const friend = await User.findOne({ where: { username: friendUsername } });
    if (!friend) return reply.code(404).send({ error: 'User not found' });
    if (friend.id === req.user.id) return reply.code(400).send({ error: 'Cannot add yourself as friend' });

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: req.user.id, friendId: friend.id },
          { userId: friend.id, friendId: req.user.id }
        ]
      }
    });

    if (existingFriendship) {
      console.log('Friendship already exists:', existingFriendship);
      return reply.code(400).send({ error: 'Friendship request already exists' });
    }

    await Friendship.create({
      userId: req.user.id,
      friendId: friend.id,
      status: 'pending'
    });
    
    // check if friend is online
    const friendSocketId = req.server.onlineUsers.get(friend.id);
  if (friendSocketId) {
    req.server.io.to(friendSocketId).emit("sendFriendRequest", {
      from: req.user.username,
      to: friend.username
    });
  }
    reply.send({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error("❌ sendFriendRequest error:", error);
    reply.code(500).send({ error: 'Failed to send friend request' });
  }
}

export async function respondToFriendRequest(req, reply) {
  const { requestId, action } = req.body; // action: 'accept' or 'reject'
  try {
    const friendship = await Friendship.findOne({
      where: { id: requestId, friendId: req.user.id, status: 'pending' }
    });

    if (!friendship) return reply.code(404).send({ error: 'Friend request not found' });

    if (action === 'accept') {
      await friendship.update({ status: 'accepted' });
      reply.send({ message: 'Friend request accepted' });
    } else {
      await friendship.destroy();
      reply.send({ message: 'Friend request rejected' });
    }
  } catch (error) {
    reply.code(500).send({ error: 'Failed to respond to friend request' });
  }
}

export async function getFriendRequests(req, reply) {
  try {
    const friendRequest = await Friendship.findAll({
      where: {
        [Op.or]: [
          { friendId: req.user.id, status: 'pending' }
        ]
      },
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'username', 'displayName', 'avatar', 'isOnline', 'lastSeen', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    })
    reply.send({friendRequest});
  }
  catch (error) {
    reply.code(500).send({ error: 'Failed to get friend-Requests' });
  }
}

export async function getFriends(req, reply) {
  try {
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { userId: req.user.id, status: 'accepted' },
          { friendId: req.user.id, status: 'accepted' }
        ]
      },
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'username', 'displayName', 'avatar', 'isOnline', 'lastSeen']
        },
        {
          model: User,
          as: 'Friend',
          attributes: ['id', 'username', 'displayName', 'avatar', 'isOnline', 'lastSeen']
        }
      ]
    });

    const friends = friendships.map(friendship => {
      return friendship.userId === req.user.id ? friendship.Friend : friendship.User;
    });

    reply.send({ friends });
  } catch (error) {
    reply.code(500).send({ error: 'Failed to fetch friends' });
  }
}

export async function getMatchHistory(req, reply) {
  try {
    const matches = await Match.findAll({
      where: {
        [Op.or]: [
          { player1Id: req.user.id },
          { player2Id: req.user.id }
        ]
      },
      include: [
        { model: User, as: 'Player1', attributes: ['username', 'displayName'] },
        { model: User, as: 'Player2', attributes: ['username', 'displayName'] },
        { model: User, as: 'Winner', attributes: ['username', 'displayName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    reply.send({ matches });
  } catch (error) {
    reply.code(500).send({ error: 'Failed to fetch match history' });
  }
}

export async function authenticate(req, reply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}
