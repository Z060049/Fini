import { useEffect, useState, useRef } from 'react';
import Todo from './components/Todo';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import SignInPage from './components/SignInPage';
import { CheckIcon, ChevronDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
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
    setIsDropdownOpen(false);
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
              <div className="bg-green-100 dark:bg-gray-700 p-1 rounded-full">
                <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-100">Task Fini: simple to-do list</h1>
            </div>
            <div className="relative">
              <button ref={buttonRef} onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-200">{user.displayName?.charAt(0)}</span>
                </div>
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </button>
              {isDropdownOpen && (
                <div ref={dropdownRef} className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Appearance</label>
                    <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full p-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-300 text-black dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="system">Use system setting</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div className="py-1 border-t border-gray-200 dark:border-gray-700">
                    <a 
                      href="/privacy-policy.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      Privacy Policy
                    </a>
                  </div>
                  <div className="py-1 border-t border-gray-200 dark:border-gray-700">
                    <a 
                      href="/terms-of-service.html" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      Terms of Service
                    </a>
                  </div>
                  <div className="py-1 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <Todo />
        </div>
      )}
    </div>
  );
}

export default App;
