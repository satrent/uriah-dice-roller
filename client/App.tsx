import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { DieType, Roll, User } from './types';
import { DICE_OPTIONS } from './constants';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// --- HELPER FUNCTIONS ---
const rollDie = (sides: DieType): number => Math.floor(Math.random() * sides) + 1; // Kept for animation only

// --- TYPE DEFINITIONS ---
interface TableDiceGroup {
  id: string;
  die: DieType;
  count: number;
  modifier: number;
}

// --- UI COMPONENTS ---

interface LoginScreenProps {
  onAuthSuccess: (token: string, user: { id: string; email: string; firstName: string; lastName: string }) => void;
}

type AuthStep = 'email' | 'register' | 'code';

const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthSuccess }) => {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  // Check if email is registered
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error(`Server error (${response.status}). Make sure your backend server is running at ${API_BASE_URL}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check email');
      }

      setIsRegistered(data.isRegistered);
      
      if (data.isRegistered) {
        // User is registered, send code immediately
        await handleSendCode();
      } else {
        // User is not registered, show registration form
        setStep('register');
      }
    } catch (err: any) {
      // Handle network errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError(`Cannot connect to server at ${API_BASE_URL}. Make sure your backend server is running.`);
      } else {
        setError(err.message || 'Failed to check email');
      }
      console.error('Error checking email:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send login code
  const handleSendCode = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          ...(isRegistered === false && { firstName, lastName }) // Only include if not registered
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error(`Server error (${response.status}). Make sure your backend server is running at ${API_BASE_URL}`);
      }

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresRegistration) {
          setStep('register');
          setError('');
        } else {
          throw new Error(data.error || 'Failed to send code');
        }
        return;
      }

      // Code sent successfully, move to code entry step
      setStep('code');
      if (data.devCode) {
        setDevCode(data.devCode);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send login code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        throw new Error(`Server error (${response.status}). Make sure your backend server is running at ${API_BASE_URL}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Success! Store token and user info
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setError('');
    setIsRegistered(null);
    setFirstName('');
    setLastName('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-cyan-400 mb-2">Uriah's Dice Roller</h1>
        <p className="text-center text-slate-400 mb-8">Join a session and roll with friends</p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 text-sm">
            {error}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleCheckEmail}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-3 text-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              required
            />
            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md mt-6 text-lg transition-transform transform active:scale-95"
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode}>
            <p className="text-slate-300 mb-4 text-sm">
              We sent a 6-digit code to <span className="font-semibold text-cyan-400">{email}</span>
              <br />
              <span className="text-slate-400 text-xs">Please check your email and enter the code below.</span>
            </p>
            {devCode && (
              <div className="mb-4 p-3 bg-cyan-900/30 border border-cyan-700 rounded-md">
                <p className="text-xs text-slate-400 mb-1">Dev Mode - Your code is:</p>
                <p className="text-2xl font-bold text-cyan-400 text-center">{devCode}</p>
              </div>
            )}
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-3 text-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition text-center tracking-widest"
              maxLength={6}
              required
            />
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={handleBackToEmail}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-md text-lg transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={code.length !== 6 || loading}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md text-lg transition-transform transform active:scale-95"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={(e) => { e.preventDefault(); handleSendCode(); }}>
            <p className="text-slate-300 mb-4 text-sm">
              New user detected. Please provide your name to complete registration.
            </p>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-3 text-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition mb-4"
              required
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              className="w-full bg-slate-700 border border-slate-600 rounded-md px-4 py-3 text-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              required
            />
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={handleBackToEmail}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-md text-lg transition"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!firstName.trim() || !lastName.trim() || loading}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md text-lg transition-transform transform active:scale-95"
              >
                {loading ? 'Sending Code...' : 'Send Login Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const RollingAnimation: React.FC<{ dice: Partial<Record<DieType, number>> }> = ({ dice }) => {
  const diceString = useMemo(() => {
    return Object.entries(dice)
      .filter(([, count]) => count && count > 0)
      .map(([d, c]) => `${c}d${d}`)
      .join(' + ');
  }, [dice]);

  const animatedDice = useMemo(() => {
    return Object.entries(dice)
      .flatMap(([die, count]) => Array(count || 0).fill(parseInt(die) as DieType))
      .sort(() => Math.random() - 0.5)
      .slice(0, 12);
  }, [dice]);
  
  const [diceValues, setDiceValues] = useState<number[]>([]);

  useEffect(() => {
    setDiceValues(animatedDice.map(die => rollDie(die)));
    const interval = setInterval(() => {
      setDiceValues(animatedDice.map(die => rollDie(die)));
    }, 90);
    return () => clearInterval(interval);
  }, [animatedDice]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-cyan-300 mb-4 animate-pulse">Rolling...</h2>
        <p className="text-xl text-slate-300 mb-12 font-mono">{diceString}</p>
        <div className="flex flex-wrap justify-center gap-4 p-4 max-w-md">
          {animatedDice.map((die, index) => (
            <div
              key={index}
              className="w-16 h-16 bg-slate-700/80 border border-slate-600 shadow-lg rounded-lg flex items-center justify-center text-2xl font-bold text-white animate-tumble"
              style={{ animationDelay: `${index * 80}ms`, animationDuration: '1s' }}
            >
              {diceValues[index] ?? '?'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

function App() {
  const socketRef = useRef<Socket | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('authToken');
  });
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sessionID, setSessionID] = useState<string | null>(null);
  const [rollLog, setRollLog] = useState<Roll[]>([]);
  const [tableGroups, setTableGroups] = useState<TableDiceGroup[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [rollingDice, setRollingDice] = useState<Partial<Record<DieType, number>> | null>(null);
  const rollStartTimeRef = useRef<number | null>(null);
  const isRollingRef = useRef(false);
  const pendingRollRef = useRef<Roll | null>(null);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isDiceBagExpanded, setIsDiceBagExpanded] = useState(true);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (!authToken) return;

    const socket = io(SOCKET_SERVER_URL, {
      auth: {
        token: authToken
      }
    });
    socketRef.current = socket;

    socket.on('session_joined', ({ sessionID, users, self }) => {
      setUser(self);
      setUsers(users);
      setSessionID(sessionID);
    });

    socket.on('user_list_updated', (updatedUsers) => {
      setUsers(updatedUsers);
      // Ensure our user state is preserved if we're still in the list
      setUser(prevUser => {
        if (!prevUser) return prevUser;
        // Find our user in the updated list to make sure we still have the latest data
        const updatedSelf = updatedUsers.find((u: User) => u.id === prevUser.id);
        return updatedSelf || prevUser;
      });
    });

    socket.on('new_roll', (newRoll: Roll) => {
      // Check if this roll is from the current user (who is animating) or from another user
      const isCurrentUserRoll = !!(userRef.current && newRoll.user === userRef.current.name && isRollingRef.current);
      
      if (isCurrentUserRoll) {
        // This is our roll - wait for animation to complete
        pendingRollRef.current = newRoll;
        
        // Ensure animation shows for at least 1 second
        const elapsed = rollStartTimeRef.current ? Date.now() - rollStartTimeRef.current : 0;
        const minAnimationTime = 1000; // 1 second minimum
        
        const finishAnimation = () => {
          // Capture the pending roll before any async operations
          const rollToAdd = pendingRollRef.current;
          
          // First hide the animation overlay
          setIsRolling(false);
          setRollingDice(null);
          rollStartTimeRef.current = null;
          isRollingRef.current = false;
          pendingRollRef.current = null;

          // Then, after a short delay, append the log so it appears post-animation
          setTimeout(() => {
            if (rollToAdd) {
              setRollLog(prevLog => [rollToAdd, ...prevLog].slice(0, 50));
            }
          }, 50);
        };
        
        if (elapsed < minAnimationTime) {
          const remainingTime = minAnimationTime - elapsed;
          setTimeout(() => {
            finishAnimation();
          }, remainingTime);
        } else {
          finishAnimation();
        }
      } else {
        // This is a roll from another user - add it to the log immediately
        setRollLog(prevLog => [newRoll, ...prevLog].slice(0, 50));
      }
    });

    // Auto-join session when socket connects
    socket.on('connect', () => {
      const sessionIDFromUrl = window.location.hash.substring(1);
      socket.emit('join_session', {
        sessionID: sessionIDFromUrl || null,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [authToken]);
  
  const handleAuthSuccess = (token: string) => {
    setAuthToken(token);
    // Socket will reconnect automatically with the new token via useEffect
  };
  
  const handlePlayerRoll = () => {
    if (!user || !sessionID || tableGroups.length === 0) return;

    const diceForAnimation = tableGroups.reduce<Partial<Record<DieType, number>>>((acc, group) => {
        acc[group.die] = (acc[group.die] || 0) + group.count;
        return acc;
    }, {});

    setRollingDice(diceForAnimation);
    setIsRolling(true);
    isRollingRef.current = true;
    rollStartTimeRef.current = Date.now();

    // Emit the roll event to the server
    // tableGroups order is preserved - matches the order on the table after drag-and-drop
    socketRef.current?.emit('roll_dice', { tableGroups, sessionID });

    // Failsafe: hide animation after 5 seconds if server doesn't respond
    setTimeout(() => {
      if (isRollingRef.current) {
         const rollToAdd = pendingRollRef.current;
         
         setIsRolling(false);
         setRollingDice(null);
         rollStartTimeRef.current = null;
         isRollingRef.current = false;
         pendingRollRef.current = null;
         
         // If there's a pending roll, add it to the log even if animation was interrupted
         if (rollToAdd) {
           setRollLog(prevLog => [rollToAdd, ...prevLog].slice(0, 50));
         }
      }
    }, 5000);
  }

  const addGroup = (die: DieType) => {
    if (tableGroups.length >= 10) return; // Limit groups on table
    const newGroup: TableDiceGroup = {
      id: crypto.randomUUID(),
      die,
      count: 1,
      modifier: 0,
    };
    setTableGroups(prev => [...prev, newGroup]);
  };

  const updateGroup = (id: string, newValues: Partial<Omit<TableDiceGroup, 'id' | 'die'>>) => {
    setTableGroups(prev => 
      prev
        .map(group => (group.id === id ? { ...group, ...newValues } : group))
        .filter(group => group.count > 0) // Remove group if count is 0 or less
    );
  };
  
  const totalDiceOnTable = useMemo(() => tableGroups.reduce((sum, g) => sum + g.count, 0), [tableGroups]);

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedGroupId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, id: string) => {
      e.preventDefault();
      if (draggedGroupId && draggedGroupId !== id) {
          setDragOverGroupId(id);
      }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOverGroupId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropTargetId: string) => {
      e.preventDefault();
      if (!draggedGroupId || draggedGroupId === dropTargetId) return;

      setTableGroups(prevGroups => {
          const draggedIndex = prevGroups.findIndex(g => g.id === draggedGroupId);
          const dropIndex = prevGroups.findIndex(g => g.id === dropTargetId);

          if (draggedIndex === -1 || dropIndex === -1) return prevGroups;

          const newGroups = [...prevGroups];
          const [draggedItem] = newGroups.splice(draggedIndex, 1);
          newGroups.splice(dropIndex, 0, draggedItem);
          return newGroups;
      });
      setDraggedGroupId(null);
      setDragOverGroupId(null);
  };

  const handleDragEnd = () => {
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  };


  if (!authToken) {
    return <LoginScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (!user) {
    // Waiting for socket connection and session join
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">Connecting...</h2>
          <p className="text-slate-400">Joining session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isRolling && rollingDice && <RollingAnimation dice={rollingDice} />}
      <div className="flex flex-col lg:flex-row h-screen font-sans">
        {/* Left Panel */}
        <div className="w-full lg:w-96 bg-slate-800/50 border-r border-slate-700/50 p-4 flex flex-col gap-4 order-1 lg:order-1">
          
          {/* Mobile: Collapsed view - just roll button with expand icon */}
          {!isDiceBagExpanded && (
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={handlePlayerRoll}
                disabled={tableGroups.length === 0 || isRolling}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-lg transition-transform transform active:scale-95"
              >
                {isRolling ? 'Rolling...' : `Roll (${totalDiceOnTable})`}
              </button>
              <button
                onClick={() => setIsDiceBagExpanded(true)}
                className="bg-slate-700/50 hover:bg-slate-700 p-3 rounded-lg transition-colors flex-shrink-0"
                aria-label="Expand dice bag"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Expanded view */}
          <div className={`${!isDiceBagExpanded ? 'hidden lg:flex' : 'flex'} flex-grow flex-col min-h-0`}>
            <div className="flex-grow flex flex-col min-h-0">
            {/* On the Table */}
            <h2 className="text-lg font-bold text-cyan-400 mb-3 flex-shrink-0">On the Table</h2>
            <div className="bg-slate-900/70 rounded-lg p-3 flex-grow overflow-y-auto">
                {tableGroups.length === 0 ? (
                    <div className="flex items-center justify-center w-full h-full text-slate-500">
                        <p>Select dice from the bag to add a group</p>
                    </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {tableGroups.map((group) => (
                      <div 
                        key={group.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, group.id)}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, group.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, group.id)}
                        onDragEnd={handleDragEnd}
                        className={`relative flex items-center justify-between gap-2 bg-slate-800/50 p-2 rounded-md transition-opacity duration-200 cursor-grab active:cursor-grabbing ${draggedGroupId === group.id ? 'opacity-30' : 'opacity-100'}`}>
                          
                          {dragOverGroupId === group.id && draggedGroupId !== group.id && (
                              <div className="absolute -top-1 left-0 right-0 h-1 bg-cyan-400 rounded-full animate-pulse" />
                          )}
                          
                          <div className="flex items-center gap-2">
                              <button onClick={() => updateGroup(group.id, { count: group.count - 1 })} className="w-8 h-8 bg-slate-700/50 rounded-md text-lg font-bold transition-transform transform hover:scale-105 hover:bg-red-500/80 active:scale-95 flex-shrink-0 touch-manipulation">-</button>
                              <span className="font-semibold text-cyan-400 text-lg w-20 text-center">{group.count}d{group.die}</span>
                              <button onClick={() => updateGroup(group.id, { count: group.count + 1 })} className="w-8 h-8 bg-slate-700/50 rounded-md text-lg font-bold transition-transform transform hover:scale-105 hover:bg-slate-700 active:scale-95 flex-shrink-0 touch-manipulation">+</button>
                          </div>
                          <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400">Mod:</span>
                              <button 
                                onClick={() => updateGroup(group.id, { modifier: group.modifier - 1 })} 
                                className="w-8 h-8 bg-slate-700/50 rounded-md text-lg font-bold transition-transform transform hover:scale-105 hover:bg-red-500/80 active:scale-95 flex-shrink-0 touch-manipulation"
                              >
                                -
                              </button>
                              <input 
                                  type="number"
                                  value={group.modifier}
                                  onChange={e => updateGroup(group.id, { modifier: parseInt(e.target.value) || 0})}
                                  className="w-14 h-8 bg-slate-800 border border-slate-700 rounded-md text-center text-md font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500"
                              />
                              <button 
                                onClick={() => updateGroup(group.id, { modifier: group.modifier + 1 })} 
                                className="w-8 h-8 bg-slate-700/50 rounded-md text-lg font-bold transition-transform transform hover:scale-105 hover:bg-slate-700 active:scale-95 flex-shrink-0 touch-manipulation"
                              >
                                +
                              </button>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          {/* Dice Options */}
          <div className="flex-shrink-0">
            <h2 className="text-lg font-bold text-cyan-400 mb-3">Dice Bag</h2>
            <div className="grid grid-cols-3 gap-3">
              {DICE_OPTIONS.map(die => (
                <button 
                    key={die} 
                    onClick={() => addGroup(die)}
                    className="bg-slate-700/50 p-3 rounded-lg flex items-center justify-center font-bold text-lg transition-transform transform hover:scale-105 hover:bg-cyan-700 active:scale-95"
                >
                  {`d${die}`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handlePlayerRoll}
                disabled={tableGroups.length === 0 || isRolling}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg text-lg transition-transform transform active:scale-95"
              >
                {isRolling ? 'Rolling...' : `Roll (${totalDiceOnTable})`}
              </button>
              {/* Collapse button next to roll button - only visible on mobile */}
              <button
                onClick={() => setIsDiceBagExpanded(false)}
                className="lg:hidden bg-slate-700/50 hover:bg-slate-700 p-3 rounded-lg transition-colors flex-shrink-0"
                aria-label="Collapse dice bag"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
          </div>
        </div>
        
        {/* Center Panel (Roll Log) */}
        <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden order-2 lg:order-2">
          <header className="p-4 border-b border-slate-700/50">
            <h1 className="text-xl font-bold">Roll Log</h1>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {rollLog.filter(roll => roll && roll.groups && Array.isArray(roll.groups)).map(roll => {
              const totalModifier = roll.groups.reduce((sum, g) => sum + g.modifier, 0);
              const diceTotal = roll.total - totalModifier;
              return (
              <div key={roll.id} className="bg-slate-800/60 rounded-lg p-3 animate-fade-in">
                <div className="flex justify-between items-start">
                  <div>
                    <p>
                        <span className={`font-bold ${roll.userColor}`}>{roll.user}</span> rolled{' '}
                        <span className="font-semibold text-cyan-400">
                           {roll.groups.map(g => {
                                const countStr = `${g.count}d${g.die}`;
                                if (g.modifier > 0) return `${countStr}+${g.modifier}`;
                                if (g.modifier < 0) return `${countStr}${g.modifier}`;
                                return countStr;
                           }).join(' + ')}
                        </span>
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {roll.groups.map((g, i) => {
                        const diceSum = g.results.reduce((sum, result) => sum + result, 0);
                        const groupTotal = diceSum + g.modifier;
                        return (
                          <span key={i} className="mr-2">
                            {`${g.count}d${g.die}:(${g.results.join(',')})${g.modifier !== 0 ? `${g.modifier > 0 ? '+' : ''}${g.modifier}` : ''} = ${groupTotal}`}
                          </span>
                        );
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-3xl font-bold">{roll.total}</p>
                    {totalModifier !== 0 && (
                        <p className="text-xs text-slate-400 text-right">({diceTotal} + {totalModifier})</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">{new Date(roll.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-64 bg-slate-800/50 border-l border-slate-700/50 p-4 flex flex-col gap-6 order-3">
          <div>
            <h2 className="text-lg font-bold text-cyan-400 mb-3">Session Info</h2>
            <div className="bg-slate-700/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-400">SHARE LINK</label>
                <button
                  onClick={async () => {
                    const shareLink = `${window.location.origin}${window.location.pathname}#${sessionID}`;
                    try {
                      await navigator.clipboard.writeText(shareLink);
                      setLinkCopied(true);
                      setTimeout(() => {
                        setLinkCopied(false);
                      }, 2000);
                    } catch (err) {
                      console.error('Failed to copy:', err);
                    }
                  }}
                  className="text-slate-400 hover:text-cyan-400 transition-colors"
                  title={linkCopied ? "Link copied!" : "Copy link to clipboard"}
                >
                  {linkCopied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 transition-opacity duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-opacity duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              <input readOnly value={`${window.location.origin}${window.location.pathname}#${sessionID}`} className="w-full bg-slate-600 text-xs p-1.5 rounded mt-1 border border-slate-500" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-cyan-400 mb-3">Users ({users.length})</h2>
            <ul className="space-y-2">
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${u.color.replace('text', 'bg')}`}></span>
                  <span className="font-medium">{u.name} {u.id === user?.id ? '(You)' : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
