import React, { useState } from 'react';
import { format } from 'date-fns';
import { CircularProgress } from './CircularProgress';
import type { TodoItem } from './types';
import { DocumentDuplicateIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface GmailEmail {
  id: string;
  subject: string;
  from: string;
  to: string;
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
  onLoadMoreEmails?: () => void;
  projectOptions: string[];
  onAddLlmTodosToProject: (llmTodos: LlmTodo[]) => void;
  allTodos: TodoItem[];
}

// Add a type for the LLM-generated todo
export interface LlmTodo {
  id: string;
  project: string;
  description: string;
  dueDate: string;
}

export const GmailModal: React.FC<GmailModalProps> = ({ isOpen, onClose, emails, isLoading, selectedEmails, onEmailSelect, onConvertToTodo, onLoadMoreEmails, projectOptions, onAddLlmTodosToProject, allTodos }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [llmResults, setLlmResults] = useState<LlmTodo[] | null>(null);
  const [editing, setEditing] = useState<{ id: string; field: 'project' | 'description' | 'dueDate'; value: string } | null>(null);
  const [selectedLlmTodos, setSelectedLlmTodos] = useState<string[]>([]);
  const [showEmailDetails, setShowEmailDetails] = useState<{ open: boolean, emailId: string | null }>({ open: false, emailId: null });

  // Pre-select all tasks when llmResults is set
  React.useEffect(() => {
    if (llmResults) {
      setSelectedLlmTodos(llmResults.map(todo => todo.id));
    }
  }, [llmResults]);

  // Close modals on Escape key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEmailDetails.open) {
          setShowEmailDetails({ open: false, emailId: null });
        } else if (isOpen) {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, showEmailDetails.open, onClose]);

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
    try {
      // Prepare data for API
      // Deduplicate emails by subject (keep the first occurrence)
      const uniqueEmailsMap = new Map();
      emails.filter(e => selectedEmails.includes(e.id)).forEach(e => {
        if (!uniqueEmailsMap.has(e.subject)) {
          uniqueEmailsMap.set(e.subject, e);
        }
      });
      const uniqueEmails = Array.from(uniqueEmailsMap.values());
      // Only include unique, active project names from top-level todos
      const activeProjectNames = [
        ...new Set(
          allTodos
            .filter(t => !t.parentId)
            .map(t => t.project)
            .filter(Boolean)
        ),
      ];
      const apiBody = {
        projects: activeProjectNames.map(title => ({ title })),
        emails: uniqueEmails.map(e => ({ id: e.id, subject: e.subject, sender: getSenderName(e.from) })),
      };
      console.log('Sending to OpenAI backend:', apiBody);
      // Call your deployed Firebase function
      const response = await fetch(
        "https://us-central1-task-fini.cloudfunctions.net/generateTodos",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(apiBody),
        }
      );
      if (!response.ok) throw new Error("Failed to call LLM function");
      const data = await response.json();
      console.log('Received from OpenAI backend:', data);
      // data.todos: [{ emailId, project, description, priority? }]
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const results = data.todos.map((todo: any) => ({
        id: todo.emailId,
        project: todo.project,
        description: todo.description,
        dueDate: tomorrow.toISOString().split('T')[0],
        priority: todo.priority || 'medium',
      }));
      setLlmResults(results);
    } catch (err) {
      alert("Failed to generate todos: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddToProjects = () => {
    if (!llmResults) return;
    const selectedTodos = llmResults.filter(todo => selectedLlmTodos.includes(todo.id));
    if (selectedTodos.length === 0) return;
    onAddLlmTodosToProject(selectedTodos);
    setLlmResults(null);
    setIsProcessing(false);
    setSelectedLlmTodos([]);
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col pl-10 pr-4">
        <div className="flex justify-between items-center px-4 pt-4 pb-1">
          <h2 className="text-lg font-semibold dark:text-gray-200">
            {llmResults ? 'Auto generated to-dos based on email title' : 'Select Emails to Convert to to-dos'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white text-2xl">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {isLoading && !llmResults ? (
            <div className="flex flex-col justify-center items-center h-full py-10">
              <CircularProgress progress={70} size={48} />
              <p className="mt-4 text-gray-600">Loading emails...</p>
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col justify-center items-center h-full py-10">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Processing...</p>
            </div>
          ) : llmResults ? (
            <div className="flex flex-col items-center py-0 w-full">
              <table className="w-full text-sm text-left mb-4">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={llmResults.length > 0 && selectedLlmTodos.length === llmResults.length}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedLlmTodos(llmResults.map(todo => todo.id));
                          } else {
                            setSelectedLlmTodos([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2"></th>
                    <th className="px-2 py-2">Task Description</th>
                    <th className="px-2 py-2">Project</th>
                    <th className="px-2 py-2">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {llmResults.map(todo => {
                    const email = emails.find(e => e.id === todo.id);
                    return (
                      <tr key={todo.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 group">
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            checked={selectedLlmTodos.includes(todo.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedLlmTodos(prev => [...prev, todo.id]);
                              } else {
                                setSelectedLlmTodos(prev => prev.filter(id => id !== todo.id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-2 py-2">{truncateText(email?.subject || '', 30)}</td>
                        <td className="px-2 py-2">
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center px-2 py-1 border rounded-md text-xs bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            onClick={() => setShowEmailDetails({ open: true, emailId: todo.id })}
                            title="View email details"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                            <span>Open</span>
                          </button>
                        </td>
                        <td className="px-2 py-2">
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
                              {truncateText(todo.description, 30)}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {editing?.id === todo.id && editing.field === 'project' ? (
                            <select
                              value={editing.value}
                              onChange={e => updateLlmResult(todo.id, 'project', e.target.value)}
                              onBlur={() => setEditing(null)}
                              autoFocus
                              className="border rounded-md px-2 py-1 text-sm w-full"
                            >
                              <option value="Gmail">Gmail</option>
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
                        <td className="px-2 py-2">
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
                    );
                  })}
                </tbody>
              </table>
              {/* Email Details Modal */}
              {showEmailDetails.open && (
                <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl min-w-md relative">
                    <button
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                      onClick={() => setShowEmailDetails({ open: false, emailId: null })}
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                    {(() => {
                      const email = emails.find(e => e.id === showEmailDetails.emailId);
                      if (!email) return <div>Email not found.</div>;
                      // Find all emails in the chain (same subject)
                      const chainEmails = emails.filter(e => e.subject === email.subject);
                      // Helper to get primary receiver (To) from email object if available
                      const getPrimaryReceiver = (emailObj: any) => {
                        if (emailObj.to) {
                          // If 'to' is a string like 'Name <email>', extract name
                          const match = emailObj.to.match(/(.*)<.*>/);
                          return match ? match[1].trim().replace(/"/g, '') : emailObj.to;
                        }
                        return '-';
                      };
                      // Helper to cap text
                      const capText = (text: string) => text && text.length > 20 ? text.substring(0, 20) + '…' : text;
                      return (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Email Details (Thread)</h3>
                          <div className="mb-4"><span className="font-medium">Subject:</span> {email.subject}</div>
                          <table className="w-full text-sm mb-2">
                            <thead>
                              <tr>
                                <th className="text-left py-1">Sender</th>
                                <th className="text-left py-1">Receiver</th>
                                <th className="text-left py-1">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chainEmails.map((em, idx) => (
                                <tr key={em.id} className="border-t border-gray-200 dark:border-gray-700">
                                  <td className="py-1">{capText(getSenderName(em.from))}</td>
                                  <td className="py-1">{capText(getPrimaryReceiver(em))}</td>
                                  <td className="py-1">{em.date ? format(new Date(em.date), 'MMM d, yyyy p') : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
              <div className="flex gap-4 justify-end w-full pr-8 pt-2 pb-4">
                <button onClick={handleCancelLlm} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button onClick={handleAddToProjects} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ml-2" disabled={selectedLlmTodos.length === 0}>Add to projects</button>
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
          <>
            {onLoadMoreEmails && !isLoading && !isProcessing && !llmResults && (
              <div className="flex justify-center p-3 border-t dark:border-gray-700">
                <button
                  onClick={onLoadMoreEmails}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  Load more
                </button>
              </div>
            )}
            <div className="flex justify-end items-center p-4 md:p-4 gap-x-2">
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
          </>
        )}
      </div>
    </div>
  );
}; 