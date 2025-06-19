import { useEffect, useState } from 'react';
import Todo from './components/Todo';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import SignInPage from './components/SignInPage';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      alert('Sign in failed');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (loading) return <div className="w-screen h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div>
      {!user ? (
        <SignInPage onGoogleSignIn={handleSignIn} />
      ) : (
        <div>
          <div className="flex justify-end p-4 bg-white shadow">
            <span className="mr-4 text-gray-700">{user.displayName}</span>
            <button
              onClick={handleSignOut}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Sign out
            </button>
          </div>
          <Todo />
        </div>
      )}
    </div>
  );
}

export default App;
