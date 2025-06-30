import React, { useState } from 'react';
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
  projectOptions: string[];
}

// Add a type for the LLM-generated todo
interface LlmTodo {
  id: string;
  project: string;
  description: string;
  dueDate: string;
}

export const GmailModal: React.FC<GmailModalProps> = ({ isOpen, onClose, emails, isLoading, selectedEmails, onEmailSelect, onConvertToTodo, projectOptions }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [llmResults, setLlmResults] = useState<LlmTodo[] | null>(null);
  const [editing, setEditing] = useState<{ id: string; field: 'project' | 'description' | 'dueDate'; value: string } | null>(null);

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

  const handleConvertToTodo = async () => {
    setIsProcessing(true);
    setLlmResults(null);
    // Simulate LLM API call
    setTimeout(() => {
      // For demo, create one todo per selected email
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const results = emails.filter(e => selectedEmails.includes(e.id)).map(email => ({
        id: email.id,
        project: 'Gmail',
        description: `Reply ${getSenderName(email.from)}: ${email.subject}`,
        dueDate: tomorrow.toISOString().split('T')[0],
      }));
      setLlmResults(results);
      setIsProcessing(false);
    }, 2000);
  };

  const handleAddToProjects = () => {
    // TODO: Implement actual add logic
    setLlmResults(null);
    setIsProcessing(false);
    onClose();
  };

  const handleCancelLlm = () => {
    setLlmResults(null);
    setIsProcessing(false);
  };

  // Helper to update a field in llmResults
  const updateLlmResult = (id: string, field: 'project' | 'description' | 'dueDate', value: string) => {
    setLlmResults(results => results ? results.map(todo => todo.id === id ? { ...todo, [field]: value } : todo) : results);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-6 sm:p-8 md:p-12">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 md:p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-gray-200">
            {llmResults ? 'Auto generated to-dos based on email title' : 'Select Emails to Convert to to-dos'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-2xl">&times;</button>
        </div>
        {llmResults && (
          <div className="w-full px-4 pt-6 pb-2">
            <div className="flex w-full text-xs font-semibold text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 rounded-t-md">
              <div className="flex-1 px-2 py-2">Email Title</div>
              <div className="flex-1 px-2 py-2">Task Description</div>
              <div className="flex-1 px-2 py-2">Project</div>
              <div className="flex-1 px-2 py-2">Due Date</div>
            </div>
          </div>
        )}
        <div className="flex-grow overflow-y-auto">
          {isProcessing ? (
            <div className="flex flex-col justify-center items-center h-full py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Processing...</p>
            </div>
          ) : llmResults ? (
            <div className="flex flex-col items-center py-4 w-full">
              <table className="w-full text-sm text-left mb-6">
                <tbody>
                  {llmResults.map(todo => (
                    <tr key={todo.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                      <td className="px-2 py-2 flex-1">{emails.find(e => e.id === todo.id)?.subject || ''}</td>
                      <td className="px-2 py-2 flex-1">
                        {editing?.id === todo.id && editing.field === 'description' ? (
                          <input
                            type="text"
                            value={editing.value}
                            onChange={e => updateLlmResult(todo.id, 'description', e.target.value)}
                            onBlur={() => setEditing(null)}
                            autoFocus
                            className="border rounded-md px-2 py-1 text-sm w-full"
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() => setEditing({ id: todo.id, field: 'description', value: todo.description })}
                          >
                            {todo.description}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 flex-1">
                        {editing?.id === todo.id && editing.field === 'project' ? (
                          <select
                            value={editing.value}
                            onChange={e => updateLlmResult(todo.id, 'project', e.target.value)}
                            onBlur={() => setEditing(null)}
                            autoFocus
                            className="border rounded-md px-2 py-1 text-sm w-full"
                          >
                            {projectOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() => setEditing({ id: todo.id, field: 'project', value: todo.project })}
                          >
                            {todo.project}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 flex-1">
                        {editing?.id === todo.id && editing.field === 'dueDate' ? (
                          <input
                            type="date"
                            value={editing.value}
                            onChange={e => updateLlmResult(todo.id, 'dueDate', e.target.value)}
                            onBlur={() => setEditing(null)}
                            autoFocus
                            className="border rounded-md px-2 py-1 text-sm w-full"
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() => setEditing({ id: todo.id, field: 'dueDate', value: todo.dueDate })}
                          >
                            {todo.dueDate}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-4 justify-end w-full pr-8">
                <button onClick={handleCancelLlm} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button onClick={handleAddToProjects} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ml-2">Add to projects</button>
              </div>
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
        {!llmResults && (
          <div className="flex justify-end items-center p-4 md:p-6 border-t dark:border-gray-700 gap-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500">
                Cancel
            </button>
            <button 
              onClick={handleConvertToTodo} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800"
              disabled={selectedEmails.length === 0 || isLoading || isProcessing}
            >
                {`Convert to To-do (${selectedEmails.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 