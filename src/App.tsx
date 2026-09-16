/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Plus, 
  GripVertical, 
  CheckCircle2, 
  Circle, 
  Tag, 
  User as UserIcon, 
  MoreHorizontal,
  ChevronRight,
  X,
  Search,
  Filter,
  LayoutList,
  Calendar,
  Settings,
  LayoutDashboard,
  CheckSquare,
  Clock,
  Bell,
  Sun,
  Moon,
  Hash,
  ArrowRight,
  MoreVertical,
  Star,
  Folder,
  Users,
  MessageSquare,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { ProjectState, Group, Task, User, Priority, TaskStatus } from './types';

// --- Initial Data ---
const INITIAL_STATE: ProjectState = {
  id: 'p1',
  title: 'Product Launch 2026',
  nextGlobalId: 6,
  users: [
    { id: 'u1', name: 'Alex Rivera', avatar: 'https://picsum.photos/seed/alex/100/100' },
    { id: 'u2', name: 'Sarah Chen', avatar: 'https://picsum.photos/seed/sarah/100/100' },
    { id: 'u3', name: 'Marcus Thorne', avatar: 'https://picsum.photos/seed/marcus/100/100' },
  ],
  groups: [
    { id: 'g1', title: 'Backlog', taskIds: ['t1', 't2'] },
    { id: 'g2', title: 'In Progress', taskIds: ['t3', 't4'] },
    { id: 'g3', title: 'Review', taskIds: ['t5'] },
  ],
  tasks: {
    't1': { id: 't1', globalId: 1, title: 'Define core user personas', completed: false, priority: 'High', status: 'Todo', tags: ['Research'], groupId: 'g1', assigneeId: 'u1', dueDate: '2026-04-15' },
    't2': { id: 't2', globalId: 2, title: 'Draft initial wireframes', completed: false, priority: 'Medium', status: 'Todo', tags: ['Design'], groupId: 'g1', assigneeId: 'u2', dueDate: '2026-04-20' },
    't3': { id: 't3', globalId: 3, title: 'Setup CI/CD pipeline', completed: false, priority: 'Critical', status: 'In Progress', tags: ['DevOps'], groupId: 'g2', assigneeId: 'u3', dueDate: '2026-03-25' },
    't4': { id: 't4', globalId: 4, title: 'Implement auth flow', completed: false, priority: 'High', status: 'In Progress', tags: ['Backend'], groupId: 'g2', assigneeId: 'u1', dueDate: '2026-03-30' },
    't5': { id: 't5', globalId: 5, title: 'Finalize brand guidelines', completed: false, priority: 'Medium', status: 'Review', tags: ['Branding'], groupId: 'g3', assigneeId: 'u2', dueDate: '2026-03-22' },
  }
};

// --- Components ---

interface SortableItemProps {
  id: string;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const SortableItem = ({ id, children, className, disabled }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-center", className)}>
      {!disabled && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-slate-400" />
        </div>
      )}
      {children}
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<ProjectState>(INITIAL_STATE);
  const [view, setView] = useState<'list' | 'board'>('board');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // --- Handlers ---

  const toggleTaskCompletion = useCallback((taskId: string) => {
    setState(prev => {
      const task = prev.tasks[taskId];
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskId]: {
            ...task,
            completed: !task.completed,
            status: !task.completed ? 'Done' : 'Todo'
          }
        }
      };
    });
  }, []);

  const addTask = (groupId: string) => {
    const newId = `t${Math.random().toString(36).substr(2, 9)}`;
    const globalId = state.nextGlobalId;
    const newTask: Task = {
      id: newId,
      globalId,
      title: 'Untitled Task',
      completed: false,
      priority: 'Medium',
      status: 'Todo',
      tags: [],
      groupId
    };

    setState(prev => ({
      ...prev,
      nextGlobalId: prev.nextGlobalId + 1,
      tasks: { ...prev.tasks, [newId]: newTask },
      groups: prev.groups.map(g => g.id === groupId ? { ...g, taskIds: [...g.taskIds, newId] } : g)
    }));
    
    setSelectedTaskId(newId);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = state.tasks[activeId];
    if (!activeTask) return;

    const activeContainer = activeTask.groupId;
    let overContainer = state.groups.find(g => g.id === overId)?.id;
    if (!overContainer) {
      const overTask = state.tasks[overId];
      if (overTask) overContainer = overTask.groupId;
    }

    if (!overContainer || activeContainer === overContainer) return;

    setState(prev => {
      const activeGroup = prev.groups.find(g => g.id === activeContainer);
      const overGroup = prev.groups.find(g => g.id === overContainer);

      if (!activeGroup || !overGroup) return prev;

      const activeTaskIds = [...activeGroup.taskIds];
      const overTaskIds = [...overGroup.taskIds];

      const activeIndex = activeTaskIds.indexOf(activeId);
      activeTaskIds.splice(activeIndex, 1);
      
      const overIndex = overTaskIds.indexOf(overId);
      const newIndex = overIndex >= 0 ? overIndex : overTaskIds.length;
      overTaskIds.splice(newIndex, 0, activeId);

      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [activeId]: { ...prev.tasks[activeId], groupId: overContainer! }
        },
        groups: prev.groups.map(g => {
          if (g.id === activeContainer) return { ...g, taskIds: activeTaskIds };
          if (g.id === overContainer) return { ...g, taskIds: overTaskIds };
          return g;
        })
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    if (active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;

      const activeGroupIndex = state.groups.findIndex(g => g.id === activeId);
      const overGroupIndex = state.groups.findIndex(g => g.id === overId);

      if (activeGroupIndex !== -1 && overGroupIndex !== -1) {
        setState(prev => ({
          ...prev,
          groups: arrayMove(prev.groups, activeGroupIndex, overGroupIndex)
        }));
      } else {
        const activeTask = state.tasks[activeId];
        const overTask = state.tasks[overId];

        if (activeTask && overTask && activeTask.groupId === overTask.groupId) {
          const group = state.groups.find(g => g.id === activeTask.groupId);
          if (group) {
            const oldIndex = group.taskIds.indexOf(activeId);
            const newIndex = group.taskIds.indexOf(overId);
            
            setState(prev => ({
              ...prev,
              groups: prev.groups.map(g => 
                g.id === group.id 
                  ? { ...g, taskIds: arrayMove(g.taskIds, oldIndex, newIndex) } 
                  : g
              )
            }));
          }
        }
      }
    }
  };

  const filteredTasks = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return Object.values(state.tasks).filter((t: Task) => 
      t.title.toLowerCase().includes(query) || 
      t.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [state.tasks, searchQuery]);

  const selectedTask = selectedTaskId ? state.tasks[selectedTaskId] : null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FB] dark:bg-[#0F1115] transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-72 glass dark:bg-slate-900/40 border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col z-30">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">NeoTask</span>
        </div>

        <div className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
          {/* Main Nav */}
          <nav className="space-y-1">
            <SidebarItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active />
            <SidebarItem icon={<CheckSquare className="w-4 h-4" />} label="My Tasks" badge="12" />
            <SidebarItem icon={<Calendar className="w-4 h-4" />} label="Calendar" />
            <SidebarItem icon={<Users className="w-4 h-4" />} label="Team" />
            <SidebarItem icon={<Activity className="w-4 h-4" />} label="Reports" />
          </nav>

          {/* Projects */}
          <div>
            <div className="flex items-center justify-between px-4 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Projects</span>
              <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400">
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <nav className="space-y-1">
              <SidebarItem icon={<Hash className="w-4 h-4 text-brand-500" />} label="Product Launch" active />
              <SidebarItem icon={<Hash className="w-4 h-4 text-emerald-500" />} label="Marketing Campaign" />
              <SidebarItem icon={<Hash className="w-4 h-4 text-amber-500" />} label="Design System" />
            </nav>
          </div>

          {/* Favorites */}
          <div>
            <div className="flex items-center justify-between px-4 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Favorites</span>
            </div>
            <nav className="space-y-1">
              <SidebarItem icon={<Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />} label="Q2 Roadmap" />
              <SidebarItem icon={<Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />} label="User Feedback" />
            </nav>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors cursor-pointer group">
            <img src="https://picsum.photos/seed/user/100/100" className="w-10 h-10 rounded-xl object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm" alt="User" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">Alex Rivera</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Product Manager</p>
            </div>
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-24 px-10 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{state.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Folder className="w-3 h-3" />
                  Workspace
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-xs font-medium text-brand-500">Active Project</span>
              </div>
            </div>

            <div className="h-10 bg-white dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-1 flex items-center shadow-sm">
              <ViewToggle active={view === 'list'} onClick={() => setView('list')} icon={<LayoutList className="w-4 h-4" />} label="List" />
              <ViewToggle active={view === 'board'} onClick={() => setView('board')} icon={<LayoutDashboard className="w-4 h-4" />} label="Board" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search tasks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/5 rounded-xl text-sm w-64 transition-all outline-none dark:text-white"
              />
            </div>
            
            <HeaderAction icon={<Bell className="w-4 h-4" />} badge />
            <HeaderAction icon={isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} onClick={() => setIsDarkMode(!isDarkMode)} />
            
            <button 
              onClick={() => addTask(state.groups[0].id)}
              className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-900/10 dark:shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden px-10 pb-10">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => setActiveId(e.active.id as string)}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {view === 'list' ? (
              <div className="h-full overflow-y-auto custom-scrollbar pr-4">
                <SortableContext items={state.groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                  {state.groups.map((group) => (
                    <div key={group.id} className="mb-10">
                      <div className="flex items-center justify-between mb-4 group/header">
                        <div className="flex items-center gap-3">
                          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">{group.title}</h2>
                          <span className="px-2 py-0.5 bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-bold">
                            {group.taskIds.length}
                          </span>
                        </div>
                        <button onClick={() => addTask(group.id)} className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg text-slate-400 transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <SortableContext items={group.taskIds} strategy={verticalListSortingStrategy}>
                          {group.taskIds.map((taskId) => {
                            const task = state.tasks[taskId];
                            if (!task) return null;
                            return (
                              <TaskListItem 
                                key={task.id} 
                                task={task} 
                                selected={selectedTaskId === task.id}
                                onClick={() => setSelectedTaskId(task.id)}
                                onToggle={() => toggleTaskCompletion(task.id)}
                                users={state.users}
                              />
                            );
                          })}
                        </SortableContext>
                      </div>
                    </div>
                  ))}
                </SortableContext>
              </div>
            ) : (
              <div className="h-full overflow-x-auto custom-scrollbar flex gap-8 pb-4">
                <SortableContext items={state.groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                  {state.groups.map((group) => (
                    <div key={group.id} className="w-80 shrink-0 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">{group.title}</h2>
                          <span className="px-2 py-0.5 bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-bold">
                            {group.taskIds.length}
                          </span>
                        </div>
                        <button onClick={() => addTask(group.id)} className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg text-slate-400 transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        <SortableContext items={group.taskIds} strategy={verticalListSortingStrategy}>
                          {group.taskIds.map((taskId) => {
                            const task = state.tasks[taskId];
                            if (!task) return null;
                            return (
                              <TaskCard 
                                key={task.id} 
                                task={task} 
                                selected={selectedTaskId === task.id}
                                onClick={() => setSelectedTaskId(task.id)}
                                onToggle={() => toggleTaskCompletion(task.id)}
                                users={state.users}
                              />
                            );
                          })}
                        </SortableContext>
                      </div>
                    </div>
                  ))}
                </SortableContext>
                
                <button className="w-80 shrink-0 h-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-500 transition-all flex items-center justify-center gap-2 text-sm font-bold">
                  <Plus className="w-4 h-4" />
                  Add Column
                </button>
              </div>
            )}
            
            <DragOverlay>
              {activeId ? (
                <div className="w-80 opacity-80 scale-105 rotate-2">
                  <TaskCard task={state.tasks[activeId]} users={state.users} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Task Detail Slide-over */}
        <AnimatePresence>
          {selectedTaskId && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTaskId(null)}
                className="absolute inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm z-40"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute top-0 right-0 h-full w-[500px] bg-white dark:bg-[#121418] shadow-2xl z-50 flex flex-col border-l border-slate-200/50 dark:border-slate-800/50"
              >
                <div className="h-20 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-8 shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleTaskCompletion(selectedTaskId)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                        selectedTask?.completed 
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      )}
                    >
                      {selectedTask?.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {selectedTask?.completed ? 'Completed' : 'Mark Complete'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                      <Star className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setSelectedTaskId(null)}
                      className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                  <div>
                    <input 
                      type="text" 
                      value={selectedTask?.title || ''}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setState(prev => ({
                          ...prev,
                          tasks: {
                            ...prev.tasks,
                            [selectedTaskId]: { ...prev.tasks[selectedTaskId], title: newTitle }
                          }
                        }));
                      }}
                      className="text-3xl font-bold text-slate-900 dark:text-white border-none focus:ring-0 w-full p-0 mb-4 placeholder:text-slate-300 outline-none bg-transparent"
                      placeholder="Task Title"
                    />
                    <div className="flex items-center gap-4">
                      <PriorityBadge priority={selectedTask?.priority || 'Medium'} />
                      <StatusBadge status={selectedTask?.status || 'Todo'} />
                    </div>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-y-6">
                    <DetailLabel icon={<UserIcon className="w-4 h-4" />} label="Assignee" />
                          {selectedTask?.assigneeId ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                              <img src={state.users.find(u => u.id === selectedTask.assigneeId)?.avatar || ''} className="w-6 h-6 rounded-full" alt="" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {state.users.find(u => u.id === selectedTask.assigneeId)?.name}
                              </span>
                            </div>
                          ) : (
                            <button className="text-sm text-slate-400 hover:text-brand-500 transition-colors">Assign user</button>
                          )}

                    <DetailLabel icon={<Calendar className="w-4 h-4" />} label="Due Date" />
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {selectedTask?.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}
                    </div>

                    <DetailLabel icon={<Tag className="w-4 h-4" />} label="Tags" />
                    <div className="flex flex-wrap gap-2">
                      {selectedTask?.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg text-xs font-bold">
                          {tag}
                        </span>
                      ))}
                      <button className="p-1 text-slate-400 hover:text-brand-500 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                      <MessageSquare className="w-4 h-4" />
                      Description
                    </div>
                    <textarea 
                      placeholder="Add a detailed description..."
                      className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-brand-500/20 outline-none resize-none transition-all"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20">
                  <div className="flex items-center gap-3">
                    <img src="https://picsum.photos/seed/user/100/100" className="w-8 h-8 rounded-full" alt="" />
                    <input 
                      type="text" 
                      placeholder="Write a comment..." 
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 transition-all dark:text-white"
                    />
                    <button className="p-2 bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95 transition-all">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Sub-components ---

function SidebarItem({ icon, label, active, badge }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string }) {
  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition-all group",
      active 
        ? "bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white" 
        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "transition-colors",
          active ? "text-brand-500" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
        )}>
          {icon}
        </div>
        <span className="text-sm font-bold tracking-tight">{label}</span>
      </div>
      {badge && (
        <span className="px-2 py-0.5 bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-full text-[10px] font-bold">
          {badge}
        </span>
      )}
    </div>
  );
}

function ViewToggle({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
        active 
          ? "bg-slate-900 dark:bg-slate-800 text-white shadow-md" 
          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function HeaderAction({ icon, badge, onClick }: { icon: React.ReactNode, badge?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-2.5 bg-white dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-all relative shadow-sm"
    >
      {icon}
      {badge && <span className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full border-2 border-white dark:border-[#0F1115]" />}
    </button>
  );
}

function TaskCard({ task, selected, onClick, onToggle, users }: { task: Task, selected?: boolean, onClick?: () => void, onToggle?: () => void, users: User[], key?: React.Key }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task?.id || 'temp' });
  const assignee = users.find(u => u.id === task?.assigneeId);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (!task) return null;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        "group bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-neo hover:shadow-neo-hover hover:border-brand-500/30 transition-all cursor-pointer relative",
        selected && "ring-2 ring-brand-500 ring-inset border-transparent",
        task.completed && "opacity-75"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-wrap gap-1.5">
          {task.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg text-[9px] font-bold uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>
        <div {...attributes} {...listeners} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical className="w-3 h-3 text-slate-400" />
        </div>
      </div>

      <h3 className={cn(
        "text-sm font-bold mb-4 leading-relaxed tracking-tight",
        task.completed ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"
      )}>
        {task.title}
      </h3>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
            className={cn(
              "transition-all",
              task.completed ? "text-emerald-500" : "text-slate-300 hover:text-brand-500"
            )}
          >
            {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <Clock className="w-3 h-3" />
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {assignee && (
            <img src={assignee.avatar} className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-slate-800 shadow-sm" title={assignee.name} alt="" />
          )}
          <PriorityBadge priority={task.priority} compact />
        </div>
      </div>
    </div>
  );
}

function TaskListItem({ task, selected, onClick, onToggle, users }: { task: Task, selected?: boolean, onClick?: () => void, onToggle?: () => void, users: User[], key?: React.Key }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task?.id || 'temp' });
  const assignee = users.find(u => u.id === task?.assigneeId);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (!task) return null;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 px-6 py-4 rounded-2xl shadow-neo hover:shadow-neo-hover hover:border-brand-500/30 transition-all cursor-pointer",
        selected && "ring-2 ring-brand-500 ring-inset border-transparent",
        task.completed && "opacity-75"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
        className={cn(
          "transition-all shrink-0",
          task.completed ? "text-emerald-500" : "text-slate-300 hover:text-brand-500"
        )}
      >
        {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
      </button>

      <div className="flex-1 min-w-0">
        <h3 className={cn(
          "text-sm font-bold truncate tracking-tight",
          task.completed ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"
        )}>
          {task.title}
        </h3>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-2">
          {task.tags.slice(0, 1).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg text-[9px] font-bold uppercase tracking-wider">
              {tag}
            </span>
          ))}
          {task.tags.length > 1 && <span className="text-[10px] text-slate-400">+{task.tags.length - 1}</span>}
        </div>

        <div className="w-32 flex items-center gap-2">
          {assignee ? (
            <>
              <img src={assignee.avatar} className="w-6 h-6 rounded-full" alt="" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">{assignee.name.split(' ')[0]}</span>
            </>
          ) : (
            <span className="text-xs text-slate-300">Unassigned</span>
          )}
        </div>

        <div className="w-24 text-right">
          <PriorityBadge priority={task.priority} compact />
        </div>

        <div className="w-24 text-right text-[10px] font-bold text-slate-400">
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority, compact }: { priority: Priority, compact?: boolean }) {
  const colors = {
    Critical: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    High: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    Medium: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    Low: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  };

  return (
    <span className={cn(
      "rounded-lg font-bold uppercase tracking-widest",
      compact ? "px-1.5 py-0.5 text-[8px]" : "px-3 py-1 text-[10px]",
      colors[priority]
    )}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const colors = {
    Todo: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    'In Progress': "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
    Review: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    Done: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  };

  return (
    <span className={cn(
      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
      colors[status]
    )}>
      {status}
    </span>
  );
}

function DetailLabel({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
