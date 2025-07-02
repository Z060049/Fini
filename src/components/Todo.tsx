import { useState, useEffect } from 'react';
import { CheckIcon, PencilIcon, TrashIcon, Bars3Icon, PencilSquareIcon, DocumentDuplicateIcon, PlusIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy, Timestamp, writeBatch, deleteField } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import SlackIconSrc from '../assets/img/slack.svg';
import ZoomIconSrc from '../assets/img/zoom.svg';
import GmailIconSrc from '../assets/img/gmail.svg';
import { CircularProgress } from './CircularProgress';
import { useGoogleLogin } from '@react-oauth/google';
import { gapi } from 'gapi-script';
import { GmailModal } from './GmailModal';
import TaskDetailModal from './TaskDetailModal';
import ProjectDetailModal from './ProjectDetailModal';
import type { LlmTodo } from './GmailModal';

interface GmailEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
}

interface TodoItem {
  id: string;
  text: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  project: string;
  dueDate: string;
  status: 'To do' | 'Doing' | 'Done';
  creator: string;
  stakeholder: string;
  created: string;
  source: 'manual' | 'slack' | 'zoom' | 'gmail';
  progress: number;
  userId?: string;
  timestamp?: any;
  description?: string;
  parentId?: string | null;
  order?: number;
  isDefault?: boolean;
  tag?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | null;
}

// Tag color mapping helper
const tagColorMap: Record<string, string> = {
  red: '#ef4444',
  orange: '#f59e42',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
};
const tagBgMap: Record<string, string> = {
  red: 'bg-red-100 text-red-800',
  orange: 'bg-orange-100 text-orange-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
};

export default function Todo() {
  const [user] = useAuthState(auth);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todosLoaded, setTodosLoaded] = useState(false);
  const [newTodo, setNewTodo] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [isGmailLoading, setIsGmailLoading] = useState(false);
  const [gmailEmails, setGmailEmails] = useState<GmailEmail[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [editingTodo, setEditingTodo] = useState<{ id: string, field: 'text' | 'project' } | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selectedTask, setSelectedTask] = useState<TodoItem | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<string[]>([]);
  const [editingDueDate, setEditingDueDate] = useState<{ id: string } | null>(null);
  const [editingDueDateValue, setEditingDueDateValue] = useState('');
  const [selectedProject, setSelectedProject] = useState<TodoItem | null>(null);

  useEffect(() => {
    if (!user) {
      setTodos([]);
      setTodosLoaded(false);
      return;
    }

    const q = query(collection(db, 'todos'), where('userId', '==', user.uid), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const todosData: TodoItem[] = [];
      querySnapshot.forEach((doc) => {
        todosData.push({ ...doc.data(), id: doc.id } as TodoItem);
      });
      setTodos(todosData);
      setTodosLoaded(true);
      console.log('Todos from Firestore:', todosData.map(t => `${t.text} (order ${t.order})`));
    });

    return () => unsubscribe();
  }, [user]);

  const handleGmailAuth = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log(tokenResponse);
      const accessToken = tokenResponse.access_token;
      
      setIsGmailModalOpen(true);
      setIsGmailLoading(true);

      gapi.load('client', async () => {
        gapi.client.setApiKey(import.meta.env.VITE_GOOGLE_API_KEY!);
        gapi.client.setToken({ access_token: accessToken });
        await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest');
        
        try {
          const response = await (gapi.client as any).gmail.users.messages.list({
            'userId': 'me',
            'q': 'category:primary',
            'maxResults': 10,
          });

          const messages = response.result.messages;
          console.log(`Found ${messages ? messages.length : 0} emails in Primary inbox.`);
          if (messages && messages.length > 0) {
            const fetchedEmails: GmailEmail[] = [];
            for (const message of messages) {
              const msg = await (gapi.client as any).gmail.users.messages.get({
                'userId': 'me',
                'id': message.id!,
                'format': 'metadata',
                'metadataHeaders': ['Subject', 'From', 'Date']
              });
              const headers = msg.result.payload!.headers!;
              const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
              const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
              const date = headers.find((h: any) => h.name === 'Date')?.value || '';

              fetchedEmails.push({ id: message.id, subject, from, date });
            }
            setGmailEmails(fetchedEmails);
          } else {
            console.log('No emails found in the last 7 days.');
            setGmailEmails([]);
          }
        } catch (error) {
            console.error('Error fetching emails:', error);
            // Optionally, handle the error in the UI
        } finally {
            setIsGmailLoading(false);
        }
      });
    },
    onError: (error) => {
      console.log('Login Failed:', error)
      setIsGmailModalOpen(false);
      setIsGmailLoading(false);
    },
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
  });

  const handleEmailSelect = (emailId: string) => {
    setSelectedEmails(prev => 
      prev.includes(emailId) ? prev.filter(id => id !== emailId) : [...prev, emailId]
    );
  };

  const convertEmailsToTodos = async () => {
    if (!user) return;
    const emailsToConvert = gmailEmails.filter(email => selectedEmails.includes(email.id));
    if (emailsToConvert.length === 0) return;

    // 1. Find Gmail project in To do or Doing
    let gmailProject = todos.find(
      t => !t.parentId && t.text === 'Gmail' && (t.status === 'To do' || t.status === 'Doing')
    );

    // 2. If not found, check in Done
    if (!gmailProject) {
      const doneGmailProject = todos.find(
        t => !t.parentId && t.text === 'Gmail' && t.status === 'Done'
      );
      if (doneGmailProject) {
        // Move to Doing
        await handleUpdateTodo(doneGmailProject.id, { status: 'Doing' });
        gmailProject = { ...doneGmailProject, status: 'Doing' };
      }
    }

    // 3. If still not found, create new in To do
    if (!gmailProject) {
      const topLevelProjects = todos.filter(t => !t.parentId);
      const newProjectRef = await addDoc(collection(db, 'todos'), {
        text: 'Gmail',
        priority: 'medium',
        project: 'Gmail',
        dueDate: '',
        status: 'To do',
        creator: user.displayName || user.email || 'Unknown',
        stakeholder: user.displayName || user.email || 'Unknown',
        created: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        userId: user.uid,
        timestamp: new Date(),
        source: 'gmail',
        progress: 0,
        order: getNextOrder(topLevelProjects),
        tag: null,
      });
      gmailProject = { id: newProjectRef.id, text: 'Gmail', status: 'To do', tag: null } as TodoItem;
    }

    // Helper to get sender name
    const getSenderName = (fromHeader: string) => {
      const match = fromHeader.match(/(.*)<.*>/);
      return match ? match[1].trim().replace(/"/g, '') : fromHeader;
    };

    // Find current subtasks for ordering
    const subtasks = todos.filter(t => t.parentId === gmailProject.id);
    let order = getNextOrder(subtasks);

    for (const email of emailsToConvert) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const senderName = getSenderName(email.from);
      const truncatedSender = senderName.length > 10 ? `${senderName.substring(0, 10)}...` : senderName;
      const truncatedSubject = email.subject.length > 20 ? `${email.subject.substring(0, 20)}...` : email.subject;
      await addDoc(collection(db, 'todos'), {
        text: `reply ${truncatedSender} about ${truncatedSubject}`,
        priority: 'medium',
        project: 'Gmail',
        dueDate: tomorrow.toISOString().split('T')[0],
        status: gmailProject.status || 'To do',
        creator: user.displayName || user.email || 'Unknown',
        stakeholder: senderName,
        created: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        userId: user.uid,
        timestamp: new Date(),
        source: 'gmail',
        progress: 0,
        parentId: gmailProject.id,
        order: order++,
        tag: null,
      });
    }

    setIsGmailModalOpen(false);
    setSelectedEmails([]);
  };

  const getNextOrder = (items: TodoItem[]) => (items.length > 0 ? Math.max(...items.map(t => t.order ?? 0)) + 1 : 0);

  const addTodo = async () => {
    if (!newTodo.trim() || !user) return;
    const topLevelProjects = todos.filter(t => !t.parentId);
    await addDoc(collection(db, 'todos'), {
      text: newTodo,
      priority: newPriority,
      project: newTodo,
      dueDate: newDueDate,
      status: 'To do',
      creator: user.displayName || user.email || 'Unknown',
      stakeholder: user.displayName || user.email || 'Unknown',
      created: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      userId: user.uid,
      timestamp: new Date(),
      source: 'manual',
      progress: 0,
      order: getNextOrder(topLevelProjects),
      tag: null,
    });
    setNewTodo('');
    setNewProject('');
    setNewPriority('medium');
    setNewDueDate('');
  };

  const toggleCollapse = (taskId: string) => {
    setCollapsedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleAddSubTask = async (parentTask: TodoItem) => {
    console.log('Add subtask button clicked');
    console.log('user:', user);
    console.log('parentTask:', parentTask);
    if (!user) return;
    try {
      const subtasks = todos.filter(t => t.parentId === parentTask.id);
      console.log('Adding subtask...');
      await addDoc(collection(db, 'todos'), {
        text: 'task',
        project: parentTask.text,
        dueDate: parentTask.dueDate,
        status: parentTask.status,
        creator: user.displayName || user.email || 'Unknown',
        stakeholder: user.displayName || user.email || 'Unknown',
        created: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        userId: user.uid,
        timestamp: new Date(),
        source: 'manual',
        progress: 0,
        parentId: parentTask.id,
        order: getNextOrder(subtasks),
        tag: null,
      });
      // Auto-expand after adding
      setCollapsedTasks(prev => prev.filter(id => id !== parentTask.id));
      console.log('Subtask added successfully');
    } catch (err) {
      console.error('Failed to add subtask:', err);
      alert('Failed to add subtask: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const deleteTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (todo?.isDefault) return; // Prevent deleting default project
    await deleteDoc(doc(db, 'todos', id));
  };
  
  const toggleTodoStatus = async (id: string, currentStatus: 'To do' | 'Doing' | 'Done') => {
    let newStatus: 'To do' | 'Doing' | 'Done' = 'Done';
    const updatedData: Partial<TodoItem> = {};

    if (currentStatus === 'Done') {
      newStatus = 'Doing';
      updatedData.progress = 50;
    } else {
      newStatus = 'Done';
      updatedData.progress = 100;
    }
    
    updatedData.status = newStatus;
    await handleUpdateTodo(id, updatedData);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const draggedTodo = todos.find(todo => todo.id === draggableId);
    if (!draggedTodo) return;

    if (type === 'PROJECT') {
      // Dragging a project between status columns
      const projectsInStatus = todos.filter(t => !t.parentId && t.status === destination.droppableId);
      const reordered = [...projectsInStatus];
      const fromIndex = reordered.findIndex(t => t.id === draggedTodo.id);
      if (fromIndex !== -1) reordered.splice(fromIndex, 1);
      reordered.splice(destination.index, 0, draggedTodo);
      reordered.forEach((proj, idx) => {
        handleUpdateTodo(proj.id, { order: idx, status: destination.droppableId as 'To do' | 'Doing' | 'Done' });
        if (proj.id === draggedTodo.id) {
          // Move all subtasks to new status
          const subtasks = todos.filter(todo => todo.parentId === proj.id);
          subtasks.forEach(subtask => {
            handleUpdateTodo(subtask.id, { status: destination.droppableId as 'To do' | 'Doing' | 'Done' });
          });
        }
      });
      return;
    }

    if (type === 'SUBTASK') {
      const sourceProject = todos.find(todo => todo.id === source.droppableId && !todo.parentId);
      const destProject = todos.find(todo => todo.id === destination.droppableId && !todo.parentId);
      if (!sourceProject || !destProject) return;

      const sourceSubtasks = todos.filter(t => t.parentId === sourceProject.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const destSubtasks = sourceProject.id === destProject.id
        ? sourceSubtasks
        : todos.filter(t => t.parentId === destProject.id)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const fromIndex = sourceSubtasks.findIndex(t => t.id === draggableId);
      let [movedTask] = sourceSubtasks.splice(fromIndex, 1);

      if (sourceProject.id !== destProject.id) {
        movedTask = { ...movedTask, parentId: destProject.id };
      }

      destSubtasks.splice(destination.index, 0, movedTask);

      // --- Batch update ---
      const batch = writeBatch(db);
      // Update source subtasks
      sourceSubtasks.forEach((task, idx) => {
        batch.update(doc(db, 'todos', task.id), { order: idx, parentId: sourceProject.id });
      });
      // Update dest subtasks if different
      if (sourceProject.id !== destProject.id) {
        destSubtasks.forEach((task, idx) => {
          batch.update(doc(db, 'todos', task.id), { order: idx, parentId: destProject.id });
        });
      } else {
        // If same project, update destSubtasks (which is the same as sourceSubtasks after move)
        destSubtasks.forEach((task, idx) => {
          batch.update(doc(db, 'todos', task.id), { order: idx, parentId: destProject.id });
        });
      }
      batch.commit();
    }
  };

  const getPriorityStyle = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'urgent':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const SourceIcon = ({ source }: { source: string }) => {
    switch (source) {
      case 'slack':
        return <img src={SlackIconSrc} alt="Slack" className="h-5 w-5" />;
      case 'zoom':
        return <img src={ZoomIconSrc} alt="Zoom" className="h-5 w-5" />;
      case 'gmail':
        return <img src={GmailIconSrc} alt="Gmail" className="h-5 w-5" />;
      case 'manual':
      default:
        return <PencilSquareIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleUpdateTodo = async (id: string, updatedData: Partial<TodoItem>) => {
    if (!user) return;
    
    // Optimistic update (do not set priority to deleteField() here)
    setTodos(prevTodos => 
      prevTodos.map(todo => {
        if (todo.id === id) {
          // If priority is being cleared, set to undefined
          if (updatedData.hasOwnProperty('priority') && updatedData.priority === undefined) {
            const { priority, ...rest } = updatedData;
            return { ...todo, ...rest, priority: undefined };
          }
          return { ...todo, ...updatedData };
        }
        return todo;
      })
    );

    const todoDoc = doc(db, 'todos', id);
    // Only use deleteField() in the Firestore update, not in any object used for local state
    const firestoreUpdate: any = { ...updatedData };
    if (updatedData.hasOwnProperty('priority') && updatedData.priority === undefined) {
      firestoreUpdate.priority = deleteField();
    }
    await updateDoc(todoDoc, firestoreUpdate);
  };

  const startEditing = (todo: TodoItem, field: 'text' | 'project') => {
    if (todo.isDefault) return; // Prevent editing default project
    setEditingTodo({ id: todo.id, field });
    setEditingText(field === 'text' ? todo.text : todo.project || '');
  };

  const cancelEditing = () => {
    setEditingTodo(null);
    setEditingText('');
  };

  const saveEditing = async () => {
    if (!editingTodo) return;
    
    await handleUpdateTodo(editingTodo.id, { [editingTodo.field]: editingText });
    cancelEditing();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const openTaskDetail = (task: TodoItem) => {
    if (editingTodo && editingTodo.id === task.id) return;
    setSelectedTask(task);
  };

  const openProjectDetail = (project: TodoItem) => {
    setSelectedProject(project);
  };

  const startEditingDueDate = (todo: TodoItem) => {
    setEditingDueDate({ id: todo.id });
    setEditingDueDateValue(todo.dueDate || '');
  };

  const saveEditingDueDate = async () => {
    if (!editingDueDate) return;
    await handleUpdateTodo(editingDueDate.id, { dueDate: editingDueDateValue });
    setEditingDueDate(null);
    setEditingDueDateValue('');
  };

  const handleDueDateInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveEditingDueDate();
    } else if (e.key === 'Escape') {
      setEditingDueDate(null);
      setEditingDueDateValue('');
    }
  };

  const renderTodoList = (status: 'To do') => {
    const subtasksByParentId = todos.reduce((acc, todo) => {
      if (todo.parentId) {
        if (!acc[todo.parentId]) {
          acc[todo.parentId] = [];
        }
        acc[todo.parentId].push(todo);
      }
      return acc;
    }, {} as Record<string, TodoItem[]>);

    // Only show user-created top-level projects
    const topLevelTodos = todos.filter(todo => todo.status === status && !todo.parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || ((a.timestamp?.toDate?.() || 0) - (b.timestamp?.toDate?.() || 0)));

    return (
      <div key={status}>
        <h2 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">{status}</h2>
        <Droppable droppableId={status} type="PROJECT">
          {(provided, snapshot) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {topLevelTodos.length > 0 && (
                <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="w-12 shrink-0"></span>
                  <span className="flex-1 px-2 text-left">Project</span>
                  <span className="w-20 shrink-0 px-2 text-center">Tag</span>
                  <span className="w-24 shrink-0 px-2 text-center">Source</span>
                  <span className="w-28 shrink-0 px-2 text-center">Priority</span>
                  <span className="w-24 shrink-0 text-center">Progress</span>
                  <span className="w-28 shrink-0 px-2 text-left">Due Date</span>
                </div>
              )}
              {/* Draggable projects */}
              {topLevelTodos.map((parent, projectIndex) => {
                const isCollapsed = collapsedTasks.includes(parent.id);
                const subtasks = subtasksByParentId[parent.id] || [];
                subtasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                console.log('Subtasks:', subtasks.map(t => `${t.text} (order ${t.order})`));
                // Helper to calculate progress for main tasks with subtasks
                const getSubtaskProgress = (parentId: string) => {
                  const subtasks = subtasksByParentId[parentId] || [];
                  if (subtasks.length === 0) return 0;
                  const completed = subtasks.filter(st => st.status === 'Done').length;
                  return Math.round((completed / subtasks.length) * 100);
                };
                return (
                  <Draggable key={parent.id} draggableId={parent.id} index={projectIndex}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`mb-4 bg-white dark:bg-gray-800 rounded-md shadow-sm border ${snapshot.isDragging ? 'border-blue-400 dark:border-blue-600' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        {/* Project row */}
                        <div className={`group flex items-center p-2 rounded-md text-sm`}>
                          {/* Handle */}
                          <span {...provided.dragHandleProps} className="w-12 shrink-0 cursor-grab px-2 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                            <Bars3Icon className="h-4 w-4" />
                          </span>
                          {/* Name */}
                          <div className="flex-1 flex items-center justify-between">
                            <div className="flex items-center">
                              {subtasks.length > 0 ? (
                                <button onClick={() => toggleCollapse(parent.id)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                  {isCollapsed ? <ChevronRightIcon className="h-4 w-4 text-gray-500" /> : <ChevronDownIcon className="h-4 w-4 text-gray-500" />}
                                </button>
                              ) : (
                                <span className="w-6 block"></span>
                              )}
                              {editingTodo?.id === parent.id && editingTodo.field === 'project' ? (
                                <input
                                  type="text"
                                  value={editingText}
                                  onChange={e => setEditingText(e.target.value)}
                                  onBlur={saveEditing}
                                  onKeyDown={handleInputKeyDown}
                                  autoFocus
                                  className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                                  style={{ minWidth: 80 }}
                                />
                              ) : (
                                <span
                                  onClick={e => { e.stopPropagation(); startEditing(parent, 'project'); }}
                                  className="px-2 text-gray-800 dark:text-gray-200 cursor-pointer rounded-md hover:border hover:border-gray-300 dark:hover:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                                  title="Click to edit project name"
                                >
                                  {parent.project}
                                </span>
                              )}
                            </div>
                            {/* Actions (Open/Add/Delete) at far right of project name cell */}
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openProjectDetail(parent);
                                }}
                                className="flex items-center space-x-1 px-2 py-1 border rounded-md text-xs bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                              >
                                <DocumentDuplicateIcon className="h-3 w-3" />
                                <span>Open</span>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleAddSubTask(parent); }} className="p-1 border rounded-md bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600">
                                <PlusIcon className="h-4 w-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); deleteTodo(parent.id); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 dark:text-red-400" title="Delete">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {/* Tags column */}
                          <span className="w-20 shrink-0 px-2 flex items-center justify-center">
                            {parent.tag ? (
                              <span className="relative group flex items-center justify-center">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tagBgMap[parent.tag.toLowerCase()] || 'bg-gray-200 text-gray-700'}`}>{parent.tag.charAt(0).toUpperCase() + parent.tag.slice(1).toLowerCase()}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTodo(parent.id, { tag: null })}
                                  className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500 z-20 shadow opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                  style={{ fontSize: '10px', lineHeight: 1 }}
                                  aria-label="Remove tag"
                                >
                                  ×
                                </button>
                              </span>
                            ) : null}
                          </span>
                          {/* Source */}
                          <span className="w-24 shrink-0 px-2 flex justify-center items-center">
                            <SourceIcon source={parent.source} />
                          </span>
                          {/* Priority */}
                          <span className="w-28 shrink-0 px-2 flex justify-center items-center">
                            {parent.priority && (
                              <span className={`relative group flex items-center justify-center`}>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityStyle(parent.priority)}`}>{parent.priority.charAt(0).toUpperCase() + parent.priority.slice(1)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTodo(parent.id, { priority: undefined })}
                                  className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500 z-20 shadow opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                  style={{ fontSize: '10px', lineHeight: 1 }}
                                  aria-label="Remove priority"
                                >
                                  ×
                                </button>
                              </span>
                            )}
                          </span>
                          {/* Progress */}
                          <span className="w-24 shrink-0 flex justify-center items-center">
                            {subtasks.length > 0 ? (
                              <CircularProgress progress={getSubtaskProgress(parent.id)} size={32} />
                            ) : null}
                          </span>
                          {/* Due Date */}
                          <span className="w-28 shrink-0 px-2 flex items-center text-left">
                            {editingDueDate?.id === parent.id ? (
                              <input
                                type="date"
                                value={editingDueDateValue}
                                onChange={e => setEditingDueDateValue(e.target.value)}
                                onBlur={saveEditingDueDate}
                                onKeyDown={handleDueDateInputKeyDown}
                                autoFocus
                                className="w-full px-2 py-1 border-b border-blue-500 bg-white dark:bg-gray-700 dark:text-white focus:outline-none rounded-md"
                                style={{ minWidth: 100, maxWidth: 120 }}
                              />
                            ) : (
                              <span
                                onClick={e => { e.stopPropagation(); startEditingDueDate(parent); }}
                                className="w-full text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 rounded-md transition"
                                title="Click to edit due date"
                              >
                                {parent.dueDate || 'Not scheduled'}
                              </span>
                            )}
                          </span>
                        </div>
                        {/* Subtasks (Draggables) */}
                        {!isCollapsed && (
                          <Droppable droppableId={parent.id} type="SUBTASK">
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.droppableProps}>
                                {subtasks.map((todo, index) => (
                                  <Draggable key={todo.id} draggableId={todo.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`group flex items-center p-2 rounded-md text-sm ${snapshot.isDragging ? 'shadow-lg border-blue-400 dark:border-blue-600' : ''}`}
                                      >
                                        {/* Handle */}
                                        <span {...provided.dragHandleProps} className="w-12 shrink-0 cursor-grab px-2 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400">
                                          <Bars3Icon className="h-4 w-4" />
                                        </span>
                                        {/* Name (with indent for tasks) */}
                                        <div className="flex-1 flex items-center justify-between pl-6">
                                          <div className="flex items-center">
                                            <button onClick={(e) => { e.stopPropagation(); toggleTodoStatus(todo.id, todo.status); }} className="p-0 align-middle">
                                              <span className={`h-4 w-4 rounded-full flex items-center justify-center ${todo.status === 'Done' ? 'bg-green-100 dark:bg-green-800' : 'border border-black dark:border-white'}`} style={{ minWidth: '1rem', minHeight: '1rem' }}>
                                                {todo.status === 'Done' && <CheckIcon className="h-3 w-3 text-green-600 dark:text-green-300" />}
                                              </span>
                                            </button>
                                            {editingTodo?.id === todo.id && editingTodo.field === 'text' ? (
                                              <input
                                                type="text"
                                                value={editingText}
                                                onChange={(e) => setEditingText(e.target.value)}
                                                onBlur={saveEditing}
                                                onKeyDown={handleInputKeyDown}
                                                autoFocus
                                                className="flex-1 bg-transparent border-b border-blue-500 focus:outline-none dark:text-white ml-2"
                                              />
                                            ) : (
                                              <span onClick={(e) => { e.stopPropagation(); startEditing(todo, 'text'); }} className="ml-2 text-gray-800 dark:text-gray-200 cursor-pointer rounded-md hover:border hover:border-gray-300 dark:hover:border-gray-600">{todo.text}</span>
                                            )}
                                          </div>
                                          {/* Actions (Open/Delete) at far right of task name cell */}
                                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-2">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openTaskDetail(todo);
                                              }}
                                              className="flex items-center space-x-1 px-2 py-1 border rounded-md text-xs bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                            >
                                              <DocumentDuplicateIcon className="h-3 w-3" />
                                              <span>Open</span>
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 dark:text-red-400" title="Delete">
                                              <TrashIcon className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </div>
                                        {/* Tags column */}
                                        <span className="w-20 shrink-0 px-2 flex items-center justify-center">
                                          {todo.tag ? (
                                            <span className="relative group flex items-center justify-center">
                                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tagBgMap[todo.tag.toLowerCase()] || 'bg-gray-200 text-gray-700'}`}>{todo.tag.charAt(0).toUpperCase() + todo.tag.slice(1).toLowerCase()}</span>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateTodo(todo.id, { tag: null })}
                                                className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500 z-20 shadow opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                                style={{ fontSize: '10px', lineHeight: 1 }}
                                                aria-label="Remove tag"
                                              >
                                                ×
                                              </button>
                                            </span>
                                          ) : null}
                                        </span>
                                        {/* Source */}
                                        <span className="w-24 shrink-0 px-2 flex justify-center items-center">
                                          <SourceIcon source={todo.source} />
                                        </span>
                                        {/* Priority */}
                                        <span className="w-28 shrink-0 px-2 flex justify-center items-center">
                                          {todo.priority && (
                                            <span className={`relative group flex items-center justify-center`}>
                                              <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityStyle(todo.priority)}`}>{todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}</span>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateTodo(todo.id, { priority: undefined })}
                                                className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500 z-20 shadow opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                                style={{ fontSize: '10px', lineHeight: 1 }}
                                                aria-label="Remove priority"
                                              >
                                                ×
                                              </button>
                                            </span>
                                          )}
                                        </span>
                                        {/* Progress (empty for tasks) */}
                                        <span className="w-24 shrink-0 flex justify-center items-center"></span>
                                        {/* Due Date */}
                                        <span className="w-28 shrink-0 px-2 flex items-center text-left">
                                          {editingDueDate?.id === todo.id ? (
                                            <input
                                              type="date"
                                              value={editingDueDateValue}
                                              onChange={e => setEditingDueDateValue(e.target.value)}
                                              onBlur={saveEditingDueDate}
                                              onKeyDown={handleDueDateInputKeyDown}
                                              autoFocus
                                              className="w-full px-2 py-1 border-b border-blue-500 bg-white dark:bg-gray-700 dark:text-white focus:outline-none rounded-md"
                                              style={{ minWidth: 100, maxWidth: 120 }}
                                            />
                                          ) : (
                                            <span
                                              onClick={e => { e.stopPropagation(); startEditingDueDate(todo); }}
                                              className="w-full text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 rounded-md transition"
                                              title="Click to edit due date"
                                            >
                                              {todo.dueDate || 'Not scheduled'}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              {topLevelTodos.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-3 text-sm">No tasks in this section.</div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  // Handler to add LLM-generated todos to a project in To do
  const handleAddLlmTodosToProject = async (llmTodos: LlmTodo[]) => {
    if (!user || !llmTodos || llmTodos.length === 0) return;
    const projectName = llmTodos[0].project;
    let project = todos.find(t => !t.parentId && t.text === projectName && t.status === 'To do');
    if (!project) {
      const topLevelProjects = todos.filter(t => !t.parentId);
      const newProjectRef = await addDoc(collection(db, 'todos'), {
        text: projectName,
        priority: 'medium',
        project: projectName,
        dueDate: '',
        status: 'To do',
        creator: user.displayName || user.email || 'Unknown',
        stakeholder: user.displayName || user.email || 'Unknown',
        created: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        userId: user.uid,
        timestamp: new Date(),
        source: 'gmail',
        progress: 0,
        order: getNextOrder(topLevelProjects),
        tag: null,
      });
      project = {
        id: newProjectRef.id,
        text: projectName,
        priority: 'medium',
        project: projectName,
        dueDate: '',
        status: 'To do',
        creator: user.displayName || user.email || 'Unknown',
        stakeholder: user.displayName || user.email || 'Unknown',
        created: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        userId: user.uid,
        timestamp: new Date(),
        source: 'gmail',
        progress: 0,
        order: getNextOrder(topLevelProjects),
        tag: null,
      };
    }
    if (!project) return;
    const subtasks = todos.filter(t => t.parentId === project.id);
    let order = getNextOrder(subtasks);
    for (const todo of llmTodos) {
      await addDoc(collection(db, 'todos'), {
        text: todo.description,
        priority: 'medium',
        project: projectName,
        dueDate: todo.dueDate,
        status: 'To do',
        creator: user.displayName || user.email || 'Unknown',
        stakeholder: user.displayName || user.email || 'Unknown',
        created: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        userId: user.uid,
        timestamp: new Date(),
        source: 'gmail',
        progress: 0,
        parentId: project.id,
        order: order++,
        tag: null,
      });
    }
    setIsGmailModalOpen(false);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="w-screen min-h-screen bg-gray-100 dark:bg-gray-900 py-6">
        <div className="max-w-full mx-auto px-6">
          <div className="flex gap-6 w-full">
            {/* Left Sidebar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 w-72 shrink-0 h-fit">
              <h2 className="text-md font-semibold mb-3 text-black dark:text-white">Add a Project</h2>
              <div className="flex flex-col space-y-3">
                <input type="text" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="Project name" className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white" />
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)} className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white">
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white" />
                <button onClick={addTodo} className="flex items-center justify-center bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition-colors text-sm dark:bg-blue-600 dark:hover:bg-blue-700">Add Project</button>
              </div>

              <div className="mt-6">
                <h3 className="text-md font-semibold mb-3 dark:text-gray-200">Import Tasks</h3>
                <div className="flex flex-col space-y-2">
                  <button onClick={() => handleGmailAuth()} className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors text-sm dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                    <img src={GmailIconSrc} alt="Gmail" className="h-5 w-5" />
                    <span>Gmail</span>
                  </button>
                  <button disabled className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md transition-colors text-sm dark:bg-gray-700 dark:text-gray-200 opacity-50 cursor-not-allowed">
                    <img src={SlackIconSrc} alt="Slack" className="h-5 w-5" />
                    <span>Slack</span>
                  </button>
                  <button disabled className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md transition-colors text-sm dark:bg-gray-700 dark:text-gray-200 opacity-50 cursor-not-allowed">
                    <img src={ZoomIconSrc} alt="Zoom" className="h-5 w-5" />
                    <span>Zoom</span>
                  </button>
                </div>
              </div>
            </div>
            {/* Main Content Area */}
            <div className="flex-grow">
              <div className="space-y-6">
                {renderTodoList('To do')}
              </div>
            </div>
          </div>
        </div>
        <GmailModal 
          isOpen={isGmailModalOpen} 
          onClose={() => setIsGmailModalOpen(false)} 
          emails={gmailEmails}
          isLoading={isGmailLoading}
          selectedEmails={selectedEmails}
          onEmailSelect={handleEmailSelect}
          onConvertToTodo={convertEmailsToTodos}
          projectOptions={[...new Set(todos.map(t => t.project).filter(Boolean))]}
          onAddLlmTodosToProject={handleAddLlmTodosToProject as (llmTodos: LlmTodo[]) => void}
        />
        <TaskDetailModal 
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          onUpdate={handleUpdateTodo}
        />
        <ProjectDetailModal
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          project={selectedProject}
          onUpdate={handleUpdateTodo}
        />
      </div>
    </DragDropContext>
  );
} 