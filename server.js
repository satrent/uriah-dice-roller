const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity. For production, restrict this.
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

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


// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  let currentSessionID = null;

  socket.on('join_session', ({ username, sessionID }) => {
    
    // If user provides a session ID and it exists, join it. Otherwise, create a new one.
    if (sessionID && sessions[sessionID]) {
      currentSessionID = sessionID;
    } else {
      currentSessionID = crypto.randomUUID().slice(0, 8);
      sessions[currentSessionID] = { users: [] };
    }

    const session = sessions[currentSessionID];
    const newUser = {
        id: socket.id,
        name: username,
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

    console.log(`${username} (${socket.id}) joined session ${currentSessionID}`);
  });

  socket.on('roll_dice', ({ tableGroups, sessionID }) => {
    const session = sessions[sessionID];
    if (!session) return;

    const user = session.users.find(u => u.id === socket.id);
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
    console.log(`User disconnected: ${socket.id}`);
    if (currentSessionID && sessions[currentSessionID]) {
        const session = sessions[currentSessionID];
        // Remove the user from the session
        session.users = session.users.filter(user => user.id !== socket.id);
        
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
