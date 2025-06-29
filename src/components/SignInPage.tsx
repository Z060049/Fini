import React from 'react';
import CompanyLogo from '../assets/img/task-fini-logo.svg';

interface SignInPageProps {
  onGoogleSignIn: () => void;
}

export default function SignInPage({ onGoogleSignIn }: SignInPageProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
      {/* Logo */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <img
          src={CompanyLogo}
          alt="Logo"
          className="h-8 w-8"
        />
        <span className="text-3xl font-bold text-gray-800">Task Fini</span>
      </div>
      {/* Centered Card */}
      <div className="w-full max-w-md flex flex-col items-center">
        <h1 className="text-5xl font-bold mb-4 text-center text-black whitespace-nowrap">
          Finish Your Tasks
        </h1>
        <h2 className="text-gray-500 text-xl font-normal mt-2 mb-8 text-center w-3/4">
          Turn messages into tasks - across Gmail, Slack, Zoom.
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
          By signing up, I agree to the <a href="https://www.task-fini.com/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-gray-500 font-medium underline">Privacy Policy</a> and <a href="https://www.task-fini.com/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="text-gray-500 font-medium underline">Terms of Service</a>.
        </div>
      </div>
    </div>
  );
} 