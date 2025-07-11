import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CircularProgress } from './CircularProgress';

interface ProjectItem {
  id: string;
  text: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  status: 'To do' | 'Doing' | 'Done';
  creator: string;
  stakeholder: string;
  created: string;
  source: 'manual' | 'slack' | 'zoom' | 'gmail';
  progress: number;
  description?: string;
}

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectItem | null;
  onUpdate: (projectId: string, updatedData: Partial<ProjectItem>) => void;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ isOpen, onClose, project, onUpdate }) => {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project) {
      setText(project.text);
      setDueDate(project.dueDate);
      setPriority(project.priority || 'none');
      setDescription(project.description || '');
      setStatus(project.status || '');
    }
  }, [project]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (!project) return;
    onUpdate(project.id, { text, dueDate, priority: priority === 'none' ? undefined : priority, description, status });
    onClose();
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'urgent': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        ref={modalRef}
        className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform ease-in-out duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {project && (
          <>
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200">Project Details</h2>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ml-4">
                <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start">
                <span className="w-1/4 text-sm text-gray-500 dark:text-gray-400 pt-2">Project Name</span>
                <div className="w-3/4">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full p-2 text-base font-medium bg-white text-gray-900 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex items-center">
                <span className="w-1/4 text-sm text-gray-500 dark:text-gray-400">Due Date</span>
                <div className="w-3/4">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <span className="w-1/4 text-sm font-medium text-gray-500 dark:text-gray-300">Priority</span>
                <div className="w-3/4 flex gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`px-3 py-1 text-sm rounded-full capitalize ${priority === p ? getPriorityStyle(p) + ' ring-2 ring-blue-500' : getPriorityStyle(p)}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <span className="w-1/4 text-sm font-medium text-gray-500 dark:text-gray-300">Status</span>
                <div className="w-3/4">
                  <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded-md px-2 py-1 text-sm w-full">
                    <option value="">No Status</option>
                    <option value="On-going">On-going</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-300 mb-2">What is this project about?</span>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full p-2 border rounded-md bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="What is this project about?"
                />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex justify-end items-center p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 gap-x-2">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500">
                    Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Save Changes
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectDetailModal; 