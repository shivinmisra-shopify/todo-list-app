import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import './App.css'

type TodoStatus = 'todo' | 'progress' | 'completed';
type Priority = 'meh' | 'do this' | 'drop everything';

interface Todo {
  id: string;
  text: string;
  status: TodoStatus;
  date: Date;
  priority: Priority;
}

interface SprintReflection {
  vision: string;
  gaps: string;
  frustrations: string;
  nuclearAction: string;
  question: string;
  thoughts: string;
}

const autoResizeTextarea = (element: HTMLTextAreaElement) => {
  element.style.height = 'auto';
  element.style.height = element.scrollHeight + 'px';
};

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(true);
  const [reflectionDraft, setReflectionDraft] = useState<Record<string, SprintReflection>>({});

  // Load todos from Firebase
  useEffect(() => {
    const q = query(collection(db, 'todos'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q,
      (querySnapshot) => {
        const todosData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate()
        })) as Todo[];
        setTodos(todosData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading todos:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load reflections from Firebase
  useEffect(() => {
    const loadReflections = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'reflections'));
        const reflectionsData: Record<string, SprintReflection> = {};
        querySnapshot.forEach((doc) => {
          reflectionsData[doc.id] = doc.data() as SprintReflection;
        });
        setReflectionDraft(reflectionsData);
      } catch (error) {
        console.error("Error loading reflections:", error);
      }
    };
    loadReflections();
  }, []);

  // Add this after the other useEffect hooks
  useEffect(() => {
    // Function to resize all textareas
    const resizeAllTextareas = () => {
      const textareas = document.querySelectorAll('.reflection-item textarea');
      textareas.forEach(textarea => {
        if (textarea instanceof HTMLTextAreaElement) {
          autoResizeTextarea(textarea);
        }
      });
    };

    // Initial resize
    resizeAllTextareas();

    // Add resize observer to handle dynamic content changes
    const resizeObserver = new ResizeObserver(() => {
      resizeAllTextareas();
    });

    // Observe the reflection form container
    const reflectionForm = document.querySelector('.reflection-form');
    if (reflectionForm) {
      resizeObserver.observe(reflectionForm);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [reflectionDraft]); // Re-run when reflection data changes

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim() === '') return;

    try {
      await addDoc(collection(db, 'todos'), {
        text: newTodo.trim(),
        status: 'todo',
        date: new Date(),
        priority: 'meh' // default priority
      });
      setNewTodo('');
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const updateTodoStatus = async (id: string, newStatus: TodoStatus) => {
    try {
      const todoRef = doc(db, 'todos', id);
      await updateDoc(todoRef, { status: newStatus });
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const updateTodoPriority = async (id: string, newPriority: Priority) => {
    try {
      const todoRef = doc(db, 'todos', id);
      await updateDoc(todoRef, { priority: newPriority });
    } catch (error) {
      console.error('Error updating todo priority:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const updateSprintReflection = async (weekKey: string, field: keyof SprintReflection, value: string) => {
    setReflectionDraft(prev => ({
      ...prev,
      [weekKey]: {
        ...prev[weekKey] || {
          vision: '',
          gaps: '',
          frustrations: '',
          nuclearAction: '',
          question: '',
          thoughts: ''
        },
        [field]: value
      }
    }));
  };

  const submitReflection = async (weekKey: string) => {
    try {
      const reflectionRef = doc(db, 'reflections', weekKey);
      const reflectionData = reflectionDraft[weekKey];

      if (reflectionData) {
        await setDoc(reflectionRef, reflectionData);
      }
    } catch (error) {
      console.error('Error submitting reflection:', error);
    }
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getWeekDateRange = (date: Date) => {
    const weekNumber = getWeekNumber(date);
    const year = date.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const firstWeekday = firstDayOfYear.getDay();
    const daysToAdd = (weekNumber - 1) * 7 - firstWeekday;

    const startDate = new Date(year, 0, 1 + daysToAdd);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return {
      startDate,
      endDate,
      weekNumber
    };
  };

  const formatDateRange = (startDate: Date, endDate: Date) => {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getWeekStats = (weekTodos: Todo[]) => {
    const total = weekTodos.length;
    const completed = weekTodos.filter(todo => todo.status === 'completed').length;
    const inProgress = weekTodos.filter(todo => todo.status === 'progress').length;
    const todo = weekTodos.filter(todo => todo.status === 'todo').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      todo,
      completionRate
    };
  };

  const groupTodosByWeek = () => {
    const grouped = todos.reduce((acc, todo) => {
      const { startDate, endDate } = getWeekDateRange(todo.date);
      const weekKey = formatDateRange(startDate, endDate);
      if (!acc[weekKey]) {
        acc[weekKey] = [];
      }
      acc[weekKey].push(todo);
      return acc;
    }, {} as Record<string, Todo[]>);

    return Object.entries(grouped).sort((a, b) => {
      const dateA = new Date(a[0].split(' - ')[0]);
      const dateB = new Date(b[0].split(' - ')[0]);
      return dateB.getTime() - dateA.getTime();
    });
  };

  const getStatusColor = (status: TodoStatus) => {
    switch (status) {
      case 'todo':
        return '#ff9800';
      case 'progress':
        return '#2196f3';
      case 'completed':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const getCurrentWeekRange = () => {
    const today = new Date();
    const { startDate, endDate } = getWeekDateRange(today);
    return formatDateRange(startDate, endDate);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="todo-app">
      <h1>Week planner</h1>

      <form onSubmit={addTodo} className="todo-form">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
          className="todo-input"
        />
        <button type="submit" className="add-button">Add</button>
      </form>

      <div className="weeks-container">
        {(() => {
          const groupedTodos = groupTodosByWeek();
          const currentWeekRange = getCurrentWeekRange();

          // If there are no todos, show at least the current week
          if (groupedTodos.length === 0) {
            return (
              <div className="week-section">
                <h2>{currentWeekRange}</h2>
                <div className="week-content">
                  <div className="tasks-column">
                    <div className="week-summary">
                      <div className="summary-item">
                        <span className="summary-label">Total Tasks:</span>
                        <span className="summary-value">0</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Completed:</span>
                        <span className="summary-value completed">0</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">In Progress:</span>
                        <span className="summary-value progress">0</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">To Do:</span>
                        <span className="summary-value todo">0</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Completion Rate:</span>
                        <span className="summary-value">0%</span>
                      </div>
                    </div>
                    <ul className="todo-list">
                      {/* Empty list */}
                    </ul>
                  </div>

                  <div className="reflection-column">
                    <div className="sprint-reflection">
                      <h3>Sprint Reflection & Planning</h3>
                      <div className="reflection-form">
                        <div className="reflection-item">
                          <label>1. What is the current sprint VISION you are working towards?</label>
                          <textarea
                            value={reflectionDraft[currentWeekRange]?.vision || ''}
                            onChange={(e) => updateSprintReflection(currentWeekRange, 'vision', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="What is the most important sprint goal for you right now?"
                          />
                        </div>
                        <div className="reflection-item">
                          <label>2. What are the current GAPS between reality and your sprint vision?</label>
                          <textarea
                            value={reflectionDraft[currentWeekRange]?.gaps || ''}
                            onChange={(e) => updateSprintReflection(currentWeekRange, 'gaps', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="Describe the gaps between where you are and where you want to be"
                          />
                        </div>
                        <div className="reflection-item">
                          <label>3. What are you frustrated with, avoiding, complaining about, or tolerating?</label>
                          <textarea
                            value={reflectionDraft[currentWeekRange]?.frustrations || ''}
                            onChange={(e) => updateSprintReflection(currentWeekRange, 'frustrations', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="What challenges are you facing in relation to your sprint vision?"
                          />
                        </div>
                        <div className="reflection-item">
                          <label>4. What is one nuclear action you can take this week?</label>
                          <textarea
                            value={reflectionDraft[currentWeekRange]?.nuclearAction || ''}
                            onChange={(e) => updateSprintReflection(currentWeekRange, 'nuclearAction', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="What small action could have a big impact on your sprint goal?"
                          />
                        </div>
                        <div className="reflection-item">
                          <label>5. What question would bring MAX VALUE for you?</label>
                          <textarea
                            value={reflectionDraft[currentWeekRange]?.question || ''}
                            onChange={(e) => updateSprintReflection(currentWeekRange, 'question', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="What question would provide the highest value for you?"
                          />
                        </div>
                        <div className="reflection-item">
                          <label>6. Thoughts for the week</label>
                          <textarea
                            value={reflectionDraft[currentWeekRange]?.thoughts || ''}
                            onChange={(e) => updateSprintReflection(currentWeekRange, 'thoughts', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="Any additional thoughts or notes for this week..."
                          />
                        </div>
                        <button
                          className="reflection-submit"
                          onClick={() => submitReflection(currentWeekRange)}
                        >
                          Save Reflection
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return groupedTodos.map(([weekRange, weekTodos]) => {
            const stats = getWeekStats(weekTodos);
            const reflection = reflectionDraft[weekRange] || {
              vision: '',
              gaps: '',
              frustrations: '',
              nuclearAction: '',
              question: '',
              thoughts: ''
            };

            return (
              <div key={weekRange} className="week-section">
                <h2>{weekRange}</h2>
                <div className="week-content">
                  <div className="tasks-column">
                    <div className="week-summary">
                      <div className="summary-item">
                        <span className="summary-label">Total Tasks:</span>
                        <span className="summary-value">{stats.total}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Completed:</span>
                        <span className="summary-value completed">{stats.completed}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">In Progress:</span>
                        <span className="summary-value progress">{stats.inProgress}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">To Do:</span>
                        <span className="summary-value todo">{stats.todo}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Completion Rate:</span>
                        <span className="summary-value">{stats.completionRate}%</span>
                      </div>
                    </div>

                    <ul className="todo-list">
                      {weekTodos.map(todo => (
                        <li key={todo.id} className={`todo-item status-${todo.status} priority-${todo.priority}`}>
                          <div className="todo-content">
                            <span className="todo-text">{todo.text}</span>
                            <span className="todo-date">
                              {todo.date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="todo-actions">
                            <select
                              value={todo.status}
                              onChange={(e) => updateTodoStatus(todo.id, e.target.value as TodoStatus)}
                              className="status-select"
                              style={{ borderColor: getStatusColor(todo.status) }}
                            >
                              <option value="" disabled>Status</option>
                              <option value="todo">Todo</option>
                              <option value="progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                            <select
                              value={todo.priority}
                              onChange={(e) => updateTodoPriority(todo.id, e.target.value as Priority)}
                              className="priority-select"
                            >
                              <option value="" disabled>Priority</option>
                              <option value="meh">Meh</option>
                              <option value="do this">Do This</option>
                              <option value="drop everything">Drop Everything</option>
                            </select>
                            <button
                              onClick={() => deleteTodo(todo.id)}
                              className="delete-button"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="reflection-column">
                    <div className="sprint-reflection">
                      <h3>Sprint Reflection & Planning</h3>
                      <div className="reflection-form">
                        <div className="reflection-item">
                          <label>1. What is the current sprint VISION you are working towards?</label>
                          <textarea
                            value={reflection.vision}
                            onChange={(e) => updateSprintReflection(weekRange, 'vision', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="What is the most important sprint goal for you right now?"
                          />
                        </div>
                        <div className="reflection-item">
                          <label>2. What are the current GAPS between reality and your sprint vision?</label>
                          <textarea
                            value={reflection.gaps}
                            onChange={(e) => updateSprintReflection(weekRange, 'gaps', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="Describe the gaps between where you are and where you want to be"
                          />
                        </div>
                        <div className="reflection-item">
                          <label>3. What are you frustrated with, avoiding, complaining about, or tolerating?</label>
                          <textarea
                            value={reflection.frustrations}
                            onChange={(e) => updateSprintReflection(weekRange, 'frustrations', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="What challenges are you facing in relation to your sprint vision?"
                          />
                        </div>
                        <div className="reflection-item">
                          <label>4. What is one nuclear action you can take this week?</label>
                          <textarea
                            value={reflection.nuclearAction}
                            onChange={(e) => updateSprintReflection(weekRange, 'nuclearAction', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="What small action could have a big impact on your sprint goal?"
                          />
                        </div>
                        <div className="reflection-item">
                          <label>5. What question would bring MAX VALUE for you?</label>
                          <textarea
                            value={reflection.question}
                            onChange={(e) => updateSprintReflection(weekRange, 'question', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="What question would provide the highest value for you?"
                          />
                        </div>
                        <div className="reflection-item">
                          <label>6. Thoughts for the week</label>
                          <textarea
                            value={reflection.thoughts}
                            onChange={(e) => updateSprintReflection(weekRange, 'thoughts', e.target.value)}
                            onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                            placeholder="Any additional thoughts or notes for this week..."
                          />
                        </div>
                        <button
                          className="reflection-submit"
                          onClick={() => submitReflection(weekRange)}
                        >
                          Save Reflection
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  )
}

export default App
