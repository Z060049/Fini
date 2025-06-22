import React from 'react';
import { format } from 'date-fns';

interface GmailEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
}

interface GmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  emails: GmailEmail[];
  isLoading: boolean;
  selectedEmails: string[];
  onEmailSelect: (emailId: string) => void;
  onConvertToTodo: () => void;
}

export const GmailModal: React.FC<GmailModalProps> = ({ isOpen, onClose, emails, isLoading, selectedEmails, onEmailSelect, onConvertToTodo }) => {
  if (!isOpen) return null;

  const getSenderName = (fromHeader: string) => {
    const match = fromHeader.match(/(.*)<.*>/);
    return match ? match[1].trim().replace(/"/g, '') : fromHeader;
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
  };

  const allSelected = emails.length > 0 && selectedEmails.length === emails.length;

  const handleSelectAllChange = () => {
    if (allSelected) {
      // Unselect all
      selectedEmails.forEach(emailId => onEmailSelect(emailId));
    } else {
      // Select all
      emails.forEach(email => {
        if (!selectedEmails.includes(email.id)) {
          onEmailSelect(email.id);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-6 sm:p-8 md:p-12">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 md:p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-gray-200">Select Emails to Convert to to-dos</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-2xl">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-full py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Loading emails...</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                <tr>
                  <th scope="col" className="pl-12 pr-3 py-3">
                    <div className="flex items-center">
                      <input 
                        id="checkbox-all-search" 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" 
                        checked={allSelected}
                        onChange={handleSelectAllChange}
                      />
                      <label htmlFor="checkbox-all-search" className="sr-only">checkbox</label>
                    </div>
                  </th>
                  <th scope="col" className="px-3 py-3">From</th>
                  <th scope="col" className="px-3 py-3">Subject</th>
                  <th scope="col" className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {emails.map(email => (
                  <tr key={email.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="w-4 pl-12 pr-3 py-4">
                      <div className="flex items-center">
                        <input 
                          id={`checkbox-table-search-${email.id}`} 
                          type="checkbox" 
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          checked={selectedEmails.includes(email.id)}
                          onChange={() => onEmailSelect(email.id)}
                        />
                        <label htmlFor={`checkbox-table-search-${email.id}`} className="sr-only">checkbox</label>
                      </div>
                    </td>
                    <td className="px-3 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap" title={getSenderName(email.from)}>{truncateText(getSenderName(email.from), 30)}</td>
                    <td className="px-3 py-4 max-w-xs truncate dark:text-gray-400" title={email.subject}>{email.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap dark:text-gray-400">{format(new Date(email.date), 'MMM d, yyyy p')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end items-center p-4 md:p-6 border-t dark:border-gray-700 gap-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500">
                Cancel
            </button>
            <button 
              onClick={onConvertToTodo} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800"
              disabled={selectedEmails.length === 0 || isLoading}
            >
                {`Convert to To-do (${selectedEmails.length})`}
            </button>
        </div>
      </div>
    </div>
  );
}; 