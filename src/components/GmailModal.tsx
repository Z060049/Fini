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
  selectedEmails: string[];
  onEmailSelect: (emailId: string) => void;
  onConvertToTodo: () => void;
}

export const GmailModal: React.FC<GmailModalProps> = ({ isOpen, onClose, emails, selectedEmails, onEmailSelect, onConvertToTodo }) => {
  if (!isOpen) return null;

  const getSenderName = (fromHeader: string) => {
    const match = fromHeader.match(/(.*)<.*>/);
    return match ? match[1].trim().replace(/"/g, '') : fromHeader;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-6 sm:p-8 md:p-12">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <h2 className="text-lg font-semibold">Select Emails to Convert to to-dos</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3">
                  <div className="flex items-center">
                    <input id="checkbox-all-search" type="checkbox" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor="checkbox-all-search" className="sr-only">checkbox</label>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3">From</th>
                <th scope="col" className="px-6 py-3">Subject</th>
                <th scope="col" className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {emails.map(email => (
                <tr key={email.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="w-4 px-6 py-4">
                    <div className="flex items-center">
                      <input 
                        id={`checkbox-table-search-${email.id}`} 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        checked={selectedEmails.includes(email.id)}
                        onChange={() => onEmailSelect(email.id)}
                      />
                      <label htmlFor={`checkbox-table-search-${email.id}`} className="sr-only">checkbox</label>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{getSenderName(email.from)}</td>
                  <td className="px-6 py-4 max-w-xs truncate" title={email.subject}>{email.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{format(new Date(email.date), 'MMM d, yyyy p')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end items-center p-4 md:p-6 border-t gap-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                Cancel
            </button>
            <button 
              onClick={onConvertToTodo} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              disabled={selectedEmails.length === 0}
            >
                {`Convert to To-do (${selectedEmails.length})`}
            </button>
        </div>
      </div>
    </div>
  );
}; 