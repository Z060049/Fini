import { useState, useEffect } from 'react';
import { CheckIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

interface TodoItem {
  id: string;
  text: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project: string;
  dueDate: string;
  status: 'To do' | 'Doing' | 'Done';
  creator: string;
  stakeholder: string;
  created: string;
  userId?: string;
}

export default function Todo() {
  const [user] = useAuthState(auth);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    if (!user) {
      setTodos([]);
      return;
    }

    const q = query(collection(db, 'todos'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const todosData: TodoItem[] = [];
      querySnapshot.forEach((doc) => {
        todosData.push({ ...doc.data(), id: doc.id } as TodoItem);
      });
      setTodos(todosData);
    });

    return () => unsubscribe();
  }, [user]);

  const addTodo = async () => {
    if (!newTodo.trim() || !user) return;

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    await addDoc(collection(db, 'todos'), {
      text: newTodo,
      priority: newPriority,
      project: newProject,
      dueDate: newDueDate,
      status: 'To do',
      creator: user.displayName || user.email || 'Unknown',
      stakeholder: user.displayName || user.email || 'Unknown',
      created: formattedDate,
      userId: user.uid,
    });

    setNewTodo('');
    setNewProject('');
    setNewPriority('medium');
    setNewDueDate('');
  };

  const deleteTodo = async (id: string) => {
    await deleteDoc(doc(db, 'todos', id));
  };
  
  const toggleTodoStatus = async (id: string, currentStatus: 'To do' | 'Doing' | 'Done') => {
    const todoRef = doc(db, 'todos', id);
    const newStatus = currentStatus === 'Done' ? 'To do' : 'Done';
    await updateDoc(todoRef, {
      status: newStatus
    });
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

  const renderTodoList = (status: 'To do' | 'Doing' | 'Done') => {
    const filteredTodos = todos.filter(todo => todo.status === status);
    
    return (
      <div key={status}>
        <h2 className="text-md font-semibold text-gray-800 mb-3">{status}</h2>
        {filteredTodos.length > 0 && (
          <div className="flex items-center text-xs font-medium text-gray-500 uppercase px-4 pb-2 border-b border-gray-200">
            <span className="w-6 mr-2"></span> {/* Spacer for checkbox */}
            <span className="flex-1 px-2">Task</span>
            <span className="w-40">Project</span>
            <span className="w-28 text-center">Priority</span>
            <span className="w-28 text-center">Due Date</span>
            <span className="w-20 text-center">Actions</span>
          </div>
        )}
        <div className="space-y-2 mt-2">
          {filteredTodos.map(todo => (
            <div key={todo.id} className="flex items-center bg-white p-2 rounded-md shadow-sm border border-gray-200 text-sm">
              <button onClick={() => toggleTodoStatus(todo.id, todo.status)} className="p-1">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center ${todo.status === 'Done' ? 'bg-green-100' : 'border border-gray-300'}`}>
                  {todo.status === 'Done' && <CheckIcon className="h-4 w-4 text-green-600" />}
                </span>
              </button>
              <span className="flex-1 px-2 text-gray-800">{todo.text}</span>
              <span className="w-40 text-gray-600">{todo.project}</span>
              <span className="w-28 text-center">
                <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityStyle(todo.priority)}`}>
                  {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                </span>
              </span>
              <span className="w-28 text-center text-gray-600">{todo.dueDate || 'Not scheduled'}</span>
              <div className="w-20 flex justify-center space-x-2">
                <button className="text-blue-400 hover:text-blue-600" title="Edit">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button onClick={() => deleteTodo(todo.id)} className="text-red-400 hover:text-red-600" title="Delete">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {filteredTodos.length === 0 && (
            <div className="text-center text-gray-500 py-3 text-sm">No tasks in this section.</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-screen min-h-screen bg-gray-100 py-6">
      <div className="max-w-full mx-auto px-6">
        <div className="flex gap-6 w-full">
          {/* Left Sidebar for Adding Todos */}
          <div className="bg-white rounded-lg shadow p-4 w-72 shrink-0 h-fit">
            <h2 className="text-md font-semibold mb-3">Add a Task</h2>
            <div className="flex flex-col space-y-3">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="What needs to be done?"
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                placeholder="Project name"
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addTodo}
                className="flex items-center justify-center bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition-colors text-sm"
              >
                Add Todo
              </button>
            </div>
          </div>

          {/* Main Content Area for Todo Lists */}
          <div className="flex-grow">
            <div className="space-y-6">
              {renderTodoList('To do')}
              {renderTodoList('Doing')}
              {renderTodoList('Done')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 