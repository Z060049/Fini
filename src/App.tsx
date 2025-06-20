import { useEffect, useState } from 'react';
import Todo from './components/Todo';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import SignInPage from './components/SignInPage';
import { CheckIcon } from '@heroicons/react/24/outline';

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
          <div className="flex justify-between items-center p-4 bg-gray-800 shadow">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-1 rounded-full">
                <CheckIcon className="h-5 w-5 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-100">Task Fini: simple to-do list</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-200">{user.displayName?.charAt(0)}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-gray-700 px-3 py-1.5 rounded-md text-sm font-medium text-gray-200 hover:bg-gray-600"
              >
                Sign out
              </button>
            </div>
          </div>
          <Todo importSources={['gmail', 'slack', 'zoom']} />
        </div>
      )}
    </div>
  );
}

export default App;
