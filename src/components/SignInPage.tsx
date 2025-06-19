import React from 'react';

interface SignInPageProps {
  onGoogleSignIn: () => void;
}

export default function SignInPage({ onGoogleSignIn }: SignInPageProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <img
          src="/vite.svg" // Use your own logo here if you want
          alt="Logo"
          className="h-8"
        />
      </div>
      {/* Centered Card */}
      <div className="w-full max-w-md flex flex-col items-center">
        <h1 className="text-5xl font-bold mb-4 text-center text-black whitespace-nowrap">
          Task Fini: Finish Your Tasks
        </h1>
        <h2 className="text-gray-400 text-xl font-normal mt-2 mb-8 text-center">
          The minimalist to-do list management tool
        </h2>
        {/* Google Sign In Button */}
        <button
          onClick={onGoogleSignIn}
          className="flex items-center justify-center w-auto bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg shadow mb-4 text-lg"
          style={{ boxShadow: '0 1px 2px rgba(60,64,67,.3)' }}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="h-6 w-6 mr-3 bg-white rounded"
          />
          Continue with your Google work account
        </button>
        {/* Privacy/Terms */}
        <div className="text-center text-gray-400 text-xs mt-4">
          By signing up, I agree to the <span className="text-gray-500 font-medium">Privacy Policy</span> and <span className="text-gray-500 font-medium">Terms of Service</span>.
        </div>
      </div>
    </div>
  );
} 