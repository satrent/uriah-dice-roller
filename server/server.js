const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { router: authRouter, verifyToken, JWT_SECRET } = require('./routes/auth');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json()); // For parsing JSON request bodies

// Auth routes
app.use('/api/auth', authRouter);

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/uriah-dice-roller';

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ Connected to MongoDB database: uriah-dice-roller');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // Set CORS_ORIGIN in production
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// --- In-Memory Session Storage ---
const sessions = {};

const USER_COLORS = [
    'text-red-400',
    'text-blue-400',
    'text-green-400',
    'text-yellow-400',
    'text-purple-400',
    'text-pink-400',
    'text-indigo-400',
    'text-teal-400',
];

// --- Dice Rolling Logic ---
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;

const performRoll = (groups) => {
    // Preserve the order of groups as received from client
    const rolledGroups = [];
    let finalTotal = 0;

    groups.forEach(group => {
        const groupResults = [];
        let groupDiceTotal = 0;
        for (let i = 0; i < group.count; i++) {
            const result = rollDie(group.die);
            groupResults.push(result);
            groupDiceTotal += result;
        }
        
        rolledGroups.push({
            die: group.die,
            count: group.count,
            modifier: group.modifier,
            results: groupResults,
        });
        finalTotal += groupDiceTotal + group.modifier;
    });
    
    return { rolledGroups, total: finalTotal };
};


// --- Socket.IO Connection Handling with Authentication ---
io.use(async (socket, next) => {
  // Extract token from handshake auth or query
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    next();
  } catch (error) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.id} (${socket.userEmail})`);
  let currentSessionID = null;
  let authenticatedUser = null;

  // Fetch user data from database
  try {
    authenticatedUser = await User.findById(socket.userId);
    if (!authenticatedUser) {
      socket.disconnect();
      return;
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    socket.disconnect();
    return;
  }

  socket.on('join_session', async ({ sessionID }) => {
    // If user provides a session ID and it exists, join it. Otherwise, create a new one.
    if (sessionID && sessions[sessionID]) {
      currentSessionID = sessionID;
    } else {
      currentSessionID = crypto.randomUUID().slice(0, 8);
      sessions[currentSessionID] = { users: [] };
    }

    const session = sessions[currentSessionID];
    
    // Check if user is already in this session
    const existingUser = session.users.find(u => u.id === authenticatedUser._id.toString());
    
    if (existingUser) {
      // User already in session, just send them the current state
      socket.join(currentSessionID);
      socket.emit('session_joined', {
        sessionID: currentSessionID,
        users: session.users,
        self: existingUser
      });
      return;
    }

    // Create user object from authenticated user data
    const newUser = {
        id: authenticatedUser._id.toString(),
        name: `${authenticatedUser.firstName} ${authenticatedUser.lastName}`,
        email: authenticatedUser.email,
        color: USER_COLORS[session.users.length % USER_COLORS.length]
    };
    session.users.push(newUser);

    socket.join(currentSessionID);

    // Let the joining user know they've successfully joined
    socket.emit('session_joined', {
        sessionID: currentSessionID,
        users: session.users,
        self: newUser
    });

    // Let everyone else in the room know the user list has been updated
    socket.to(currentSessionID).emit('user_list_updated', session.users);

    console.log(`${newUser.name} (${socket.userEmail}) joined session ${currentSessionID}`);
  });

  socket.on('roll_dice', ({ tableGroups, sessionID }) => {
    const session = sessions[sessionID];
    if (!session) return;

    const user = session.users.find(u => u.id === authenticatedUser._id.toString());
    if (!user) return;

    const { rolledGroups, total } = performRoll(tableGroups);
    const newRoll = {
        id: crypto.randomUUID(),
        user: user.name,
        userColor: user.color,
        groups: rolledGroups,
        total,
        timestamp: Date.now()
    };
    
    // Broadcast the roll result to everyone in the room
    io.in(sessionID).emit('new_roll', newRoll);
    console.log(`Roll in session ${sessionID} by ${user.name}: Total ${total}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id} (${socket.userEmail})`);
    if (currentSessionID && sessions[currentSessionID] && authenticatedUser) {
        const session = sessions[currentSessionID];
        // Remove the user from the session
        session.users = session.users.filter(user => user.id !== authenticatedUser._id.toString());
        
        // If the session is empty, delete it
        if (session.users.length === 0) {
            delete sessions[currentSessionID];
            console.log(`Session ${currentSessionID} is empty and has been closed.`);
        } else {
            // Otherwise, just notify the remaining users
            io.in(currentSessionID).emit('user_list_updated', session.users);
            console.log(`Updated user list for session ${currentSessionID}`);
        }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on *:${PORT}`);
});
