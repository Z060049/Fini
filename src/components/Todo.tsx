import { useState, useEffect } from 'react';
import { CheckIcon, PencilIcon, TrashIcon, Bars3Icon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
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

interface GmailEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
}

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
  source: 'manual' | 'slack' | 'zoom' | 'gmail';
  progress: number;
  userId?: string;
  timestamp?: any;
}

export default function Todo() {
  const [user] = useAuthState(auth);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [gmailEmails, setGmailEmails] = useState<GmailEmail[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setTodos([]);
      return;
    }

    const q = query(collection(db, 'todos'), where('userId', '==', user.uid), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const todosData: TodoItem[] = [];
      querySnapshot.forEach((doc) => {
        todosData.push({ ...doc.data(), id: doc.id } as TodoItem);
      });
      setTodos(todosData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleGmailAuth = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log(tokenResponse);
      const accessToken = tokenResponse.access_token;
      
      gapi.load('client', async () => {
        gapi.client.setApiKey(import.meta.env.VITE_GOOGLE_API_KEY!);
        gapi.client.setToken({ access_token: accessToken });
        await gapi.client.load('https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest');
        
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
          setIsGmailModalOpen(true);
        } else {
          console.log('No emails found in the last 7 days.');
        }
      });
    },
    onError: (error) => console.log('Login Failed:', error),
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
    
    for (const email of emailsToConvert) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await addDoc(collection(db, 'todos'), {
        text: email.subject,
        priority: 'medium',
        project: 'Inbox',
        dueDate: tomorrow.toISOString().split('T')[0],
        status: 'To do',
        creator: user.displayName || user.email || 'Unknown',
        stakeholder: email.from,
        created: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        userId: user.uid,
        timestamp: new Date(),
        source: 'gmail',
        progress: 0,
      });
    }

    setIsGmailModalOpen(false);
    setSelectedEmails([]);
  };

  const addTodo = async () => {
    if (!newTodo.trim() || !user) return;

    await addDoc(collection(db, 'todos'), {
      text: newTodo,
      priority: newPriority,
      project: newProject,
      dueDate: newDueDate,
      status: 'To do',
      creator: user.displayName || user.email || 'Unknown',
      stakeholder: user.displayName || user.email || 'Unknown',
      created: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      userId: user.uid,
      timestamp: new Date(),
      source: 'manual',
      progress: 0,
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
    let newStatus: 'To do' | 'Doing' | 'Done';

    if (currentStatus === 'Done') {
      newStatus = 'Doing'; // If it's done, move it to 'Doing'
    } else {
      newStatus = 'Done'; // If it's 'To do' or 'Doing', move it to 'Done'
    }
    
    await updateDoc(doc(db, 'todos', id), { status: newStatus });
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as 'To do' | 'Doing' | 'Done';
    updateDoc(doc(db, 'todos', draggableId), { status: newStatus });
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

  const renderTodoList = (status: 'To do' | 'Doing' | 'Done') => {
    const filteredTodos = todos.filter(todo => todo.status === status);
    
    return (
      <div key={status}>
        <h2 className="text-md font-semibold text-gray-800 mb-3">{status}</h2>
        {filteredTodos.length > 0 && (
          <div className="flex items-center text-xs font-medium text-gray-500 uppercase px-4 pb-2 border-b border-gray-200">
            <span className="w-12 shrink-0"></span> {/* Spacer for handle + checkbox */}
            <span className="flex-1 px-2">Task</span>
            <span className="w-40 shrink-0">Project</span>
            <span className="w-24 shrink-0 text-center">Source</span>
            <span className="w-28 shrink-0 text-center">Priority</span>
            <span className="w-24 shrink-0 text-center">Progress</span>
            <span className="w-28 shrink-0 text-center">Due Date</span>
            <span className="w-20 shrink-0 text-center">Actions</span>
          </div>
        )}
        <Droppable droppableId={status}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 mt-2 p-2 rounded-lg min-h-[100px] ${snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-transparent'}`}
            >
              {filteredTodos.map((todo, index) => (
                <Draggable key={todo.id} draggableId={todo.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`group flex items-center bg-white p-2 rounded-md shadow-sm border text-sm ${snapshot.isDragging ? 'shadow-lg border-blue-400' : 'border-gray-200'}`}
                    >
                      <span {...provided.dragHandleProps} className="opacity-0 group-hover:opacity-100 cursor-grab px-2">
                        <Bars3Icon className="h-4 w-4 text-gray-400" />
                      </span>
                      <button onClick={() => toggleTodoStatus(todo.id, todo.status)} className="p-1">
                        <span className={`h-5 w-5 rounded-full flex items-center justify-center ${todo.status === 'Done' ? 'bg-green-100' : 'border border-gray-300'}`}>
                          {todo.status === 'Done' && <CheckIcon className="h-4 w-4 text-green-600" />}
                        </span>
                      </button>
                      <span className="flex-1 px-2 text-gray-800">{todo.text}</span>
                      <span className="w-40 shrink-0 text-gray-600">{todo.project}</span>
                      <span className="w-24 shrink-0 flex justify-center">
                        <SourceIcon source={todo.source} />
                      </span>
                      <span className="w-28 shrink-0 text-center">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityStyle(todo.priority)}`}>
                          {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                        </span>
                      </span>
                      <span className="w-24 shrink-0 flex justify-center">
                        <CircularProgress progress={todo.progress || 0} size={32} />
                      </span>
                      <span className="w-28 shrink-0 text-center text-gray-600">{todo.dueDate || 'Not scheduled'}</span>
                      <div className="w-20 shrink-0 flex justify-center space-x-2">
                        <button className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-blue-500" title="Edit"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => deleteTodo(todo.id)} className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-red-500" title="Delete"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        {filteredTodos.length === 0 && (
          <div className="text-center text-gray-500 py-3 text-sm">No tasks in this section.</div>
        )}
      </div>
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="w-screen min-h-screen bg-gray-100 py-6">
        <div className="max-w-full mx-auto px-6">
          <div className="flex gap-6 w-full">
            {/* Left Sidebar */}
            <div className="bg-white rounded-lg shadow p-4 w-72 shrink-0 h-fit">
              <h2 className="text-md font-semibold mb-3">Add a Task</h2>
              <div className="flex flex-col space-y-3">
                <input type="text" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="What needs to be done?" className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder="Project name" className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)} className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={addTodo} className="flex items-center justify-center bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition-colors text-sm">Add Todo</button>
              </div>

              <div className="mt-6">
                <h3 className="text-md font-semibold mb-3">Import Tasks</h3>
                <div className="flex flex-col space-y-2">
                  <button onClick={() => handleGmailAuth()} className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors text-sm">
                    <img src={GmailIconSrc} alt="Gmail" className="h-5 w-5" />
                    <span>Gmail</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors text-sm">
                    <img src={SlackIconSrc} alt="Slack" className="h-5 w-5" />
                    <span>Slack</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors text-sm">
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
                {renderTodoList('Doing')}
                {renderTodoList('Done')}
              </div>
            </div>
          </div>
        </div>
        <GmailModal 
          isOpen={isGmailModalOpen} 
          onClose={() => setIsGmailModalOpen(false)} 
          emails={gmailEmails}
          selectedEmails={selectedEmails}
          onEmailSelect={handleEmailSelect}
          onConvertToTodo={convertEmailsToTodos}
        />
      </div>
    </DragDropContext>
  );
} 