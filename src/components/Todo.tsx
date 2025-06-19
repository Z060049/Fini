import { useState, useEffect } from 'react';
import { CheckIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

interface TodoItem {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project: string;
  dueDate: string;
  completed: boolean;
  creator: string;
  stakeholder: string;
  created: string;
}

export default function Todo() {
  const [user] = useAuthState(auth);

  // Clear localStorage if it contains invalid data
  useEffect(() => {
    try {
      const savedTodos = localStorage.getItem('todos');
      if (savedTodos) {
        JSON.parse(savedTodos);
      }
    } catch (error) {
      localStorage.removeItem('todos');
    }
  }, []);

  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const savedTodos = localStorage.getItem('todos');
    return savedTodos ? JSON.parse(savedTodos) : [];
  });
  
  const [newTodo, setNewTodo] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newDueDate, setNewDueDate] = useState('');

  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'todos'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const todosData = [];
      querySnapshot.forEach((doc) => {
        todosData.push({ ...doc.data(), id: doc.id });
      });
      setTodos(todosData);
    });

    return () => unsubscribe();
  }, [user]);

  const generateTaskId = () => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
                   (today.getMonth() + 1).toString().padStart(2, '0') +
                   today.getDate().toString().padStart(2, '0');
    
    // Find the highest number for today's tasks
    const todaysTasks = todos.filter(todo => todo.id.startsWith(dateStr));
    let highestNum = 0;
    
    if (todaysTasks.length > 0) {
      todaysTasks.forEach(todo => {
        const parts = todo.id.split('_');
        if (parts.length === 2) {
          const num = parseInt(parts[1]);
          if (!isNaN(num)) {
            highestNum = Math.max(highestNum, num);
          }
        }
      });
    }

    return `${dateStr}_${(highestNum + 1).toString().padStart(2, '0')}`;
  };

  const addTodo = async () => {
    if (!newTodo.trim() || !user) return;

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // Save to Firestore
    await addDoc(collection(db, 'todos'), {
      text: newTodo,
      priority: newPriority,
      project: newProject,
      dueDate: newDueDate,
      completed: false,
      creator: user.displayName || user.email || 'Unknown',
      stakeholder: user.displayName || user.email || 'Unknown',
      created: formattedDate,
      userId: user.uid,
    });

    // Optionally, clear the input fields
    setNewTodo('');
    setNewProject('');
    setNewPriority('medium');
    setNewDueDate('');
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-purple-100 text-purple-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-screen min-h-screen bg-gray-100 py-7">
      <div className="max-w-full mx-auto pl-8 pr-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-5">Task Fini: simple to-do list</h1>
        
        <div className="flex gap-5 w-full">
          {/* Add Todo Form */}
          <div className="bg-white rounded-l-lg shadow p-5 w-72 shrink-0">
            <div className="flex flex-col space-y-4">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="What needs to be done?"
                className="border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="Project name"
                className="border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                className="border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="border rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addTodo}
                className="flex items-center justify-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-base"
              >
                Add Todo
              </button>
            </div>
          </div>

          {/* Todo List Table */}
          <div className="bg-white shadow grow overflow-x-auto w-full">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">Task ID</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[6%]">Verified</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]">Project</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[50%]">Description</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]">Priority</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[6%]">Created</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[6%]">Due Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[4%]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-base">
                {todos.map((todo) => (
                  <tr key={todo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{todo.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`h-5 w-5 rounded-full bg-green-100 flex items-center justify-center ${todo.completed ? 'text-green-500' : 'text-gray-300'}`}>
                        <CheckIcon className="h-4 w-4" />
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{todo.project}</td>
                    <td className="px-4 py-3 text-gray-900 min-w-[200px] max-w-[800px]">{todo.text}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1 text-sm rounded-full ${getPriorityStyle(todo.priority)}`}>
                        {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{todo.created}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{todo.dueDate || 'Not scheduled'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => toggleTodo(todo.id)} 
                          className={`${todo.completed ? 'text-green-500' : 'text-gray-400'} hover:text-green-600`}
                          title="Mark as done"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button 
                          className="text-blue-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => deleteTodo(todo.id)} 
                          className="text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {todos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-3 text-center text-gray-500">
                      No todos yet. Add one above!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 