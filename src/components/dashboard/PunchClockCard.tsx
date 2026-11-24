'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  Clock,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import { AttendanceLog, ChecklistItem, PRESET_OJT_TASKS, UserProfile } from '@/types/ojt';
import ConfirmModal from '@/components/ConfirmModal';
import {
  calculateShiftHours,
  formatHoursWhole,
  formatTimeDisplay,
  getTodayDateString,
} from '@/lib/ojt-calculations';
import {
  fetchCalendarEntryByDate,
  saveCalendarEntry,
  uploadCalendarImage,
} from '@/lib/calendar-service';

interface PunchClockCardProps {
  profile: UserProfile;
  todayLog: AttendanceLog | null;
  onSaveLog: (log: Omit<AttendanceLog, 'id' | 'user_id'> & { id?: string }) => Promise<void>;
  onCalendarUpdated?: () => void;
  onUpdateChecklist?: (items: ChecklistItem[]) => Promise<void>;
  isOnline?: boolean;
  pendingSyncCount?: number;
  isSyncing?: boolean;
}

const DEFAULT_CATEGORIES = [
  'Engineering',
  'Data',
  'Quality',
  'DevOps',
  'Docs',
  'Collab',
  'Ops',
  'Design',
];

function getTodayShiftEndDate(dailyEndTime: string): Date | null {
  const clean = (dailyEndTime || '18:00').slice(0, 5);
  const [hh, mm] = clean.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

interface LiveClockTickerProps {
  todayStr: string;
  badges?: React.ReactNode;
}

const LiveClockTicker = React.memo(function LiveClockTicker({
  todayStr,
  badges,
}: LiveClockTickerProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const liveTimeStr = now
    ? now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    : '--:--:--';

  const liveDateStr = now
    ? now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : todayStr;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          suppressHydrationWarning
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400 truncate"
        >
          {liveDateStr}
        </span>
        {badges}
      </div>
      <div
        suppressHydrationWarning
        className="font-mono text-3xl sm:text-5xl font-bold tracking-tight text-white mt-1 tabular-nums"
      >
        {liveTimeStr}
      </div>
    </>
  );
});

const PunchClockCard = React.memo(function PunchClockCard({
  profile,
  todayLog,
  onSaveLog,
  onCalendarUpdated,
  onUpdateChecklist,
  isOnline = true,
  pendingSyncCount = 0,
  isSyncing = false,
}: PunchClockCardProps) {
  const [shiftTime, setShiftTime] = useState<Date>(() => new Date());
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [customTasks, setCustomTasks] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiProvider, setAiProvider] = useState('manual');
  const [tasksDirty, setTasksDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; variant: 'success' | 'error' } | null>(null);
  const [autoTimeOutBlocked, setAutoTimeOutBlocked] = useState(false);
  const [pendingAction, setPendingAction] = useState<'time-in' | 'time-out' | 'save-log' | 'format-notes' | null>(null);

  // Dynamic Checklist Management States
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(() => {
    return profile.work_checklist && profile.work_checklist.length > 0
      ? profile.work_checklist
      : PRESET_OJT_TASKS;
  });
  const [isManagingTasks, setIsManagingTasks] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingCategory, setEditingCategory] = useState('Engineering');
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Engineering');
  const [showReloadConfirm, setShowReloadConfirm] = useState(false);
  const [userCustomTags, setUserCustomTags] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('ojt_custom_tags_' + profile.id);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [newTaskCustomInput, setNewTaskCustomInput] = useState('');
  const [editingCustomInput, setEditingCustomInput] = useState('');

  const registerCustomTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || trimmed.toLowerCase() === 'custom') return;
    setUserCustomTags((prev) => {
      const lower = trimmed.toLowerCase();
      if (prev.some((t) => t.toLowerCase() === lower)) return prev;
      const updated = [...prev, trimmed];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ojt_custom_tags_' + profile.id, JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to cache custom tag:', e);
        }
      }
      return updated;
    });
  }, [profile.id]);

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    const addTag = (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed || trimmed === '__custom__') return;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(trimmed);
      }
    };

    DEFAULT_CATEGORIES.forEach(addTag);
    checklistItems.forEach((t) => {
      if (t.category) addTag(t.category);
    });
    userCustomTags.forEach(addTag);

    return list;
  }, [checklistItems, userCustomTags]);

  useEffect(() => {
    if (profile.work_checklist && profile.work_checklist.length > 0) {
      setChecklistItems(profile.work_checklist);
    }
  }, [profile.work_checklist]);

  // Photo Attachment & Calendar Sync States
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isDragOverPhoto, setIsDragOverPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autoTimeOutTriggeredRef = useRef(false);
  const justTimedOutRef = useRef(false);

  const handleRemovePhoto = useCallback(() => {
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setSelectedPhoto(null);
    setExistingPhotoUrl(null);
    setPhotoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  useEffect(() => {
    setShiftTime(new Date());
    const id = setInterval(() => setShiftTime(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (todayLog) {
      if (todayLog.time_out) {
        setSelectedTasks([]);
        setCustomTasks('');
        setAiSummary('');
        setAiProvider('manual');
        setTasksDirty(false);
        autoTimeOutTriggeredRef.current = true;
        setAutoTimeOutBlocked(false);
        handleRemovePhoto();
        return;
      }
      setSelectedTasks(todayLog.tasks_selected || []);
      setCustomTasks(todayLog.custom_tasks || '');
      setAiSummary(todayLog.ai_summary || '');
      setAiProvider(todayLog.ai_provider || 'manual');
      setTasksDirty(false);
    } else {
      setSelectedTasks([]);
      setCustomTasks('');
      setAiSummary('');
      setAiProvider('manual');
      setTasksDirty(false);
      autoTimeOutTriggeredRef.current = false;
      setAutoTimeOutBlocked(false);
      handleRemovePhoto();
    }
  }, [todayLog, handleRemovePhoto]);

  const showToast = useCallback((msg: string, variant: 'success' | 'error' = 'success') => {
    setToast({ msg, variant });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const todayStr = getTodayDateString();
  const isTimedIn = Boolean(todayLog?.time_in);
  const isTimedOut = Boolean(todayLog?.time_out);
  const isChecklistLocked = !isTimedIn || isTimedOut;

  const liveNetHours = useMemo(() => {
    if (todayLog?.hours_worked) return todayLog.hours_worked;
    if (isTimedIn && !isTimedOut && todayLog?.time_in && shiftTime) {
      return calculateShiftHours(todayLog.time_in, shiftTime.toISOString(), profile.lunch_break_minutes);
    }
    return 0;
  }, [todayLog?.hours_worked, todayLog?.time_in, isTimedIn, isTimedOut, shiftTime, profile.lunch_break_minutes]);

  // Check if today already has a calendar entry
  useEffect(() => {
    if (!profile.id) return;
    if (todayLog?.time_out) {
      setExistingPhotoUrl(null);
      setPhotoPreview(null);
      return;
    }
    let active = true;
    fetchCalendarEntryByDate(profile.id, todayStr, profile.active_internship_id)
      .then((entry) => {
        if (!active) return;
        if (entry?.image_url && !todayLog?.time_out) {
          setExistingPhotoUrl(entry.image_url);
          setPhotoPreview(entry.image_url);
        } else {
          setExistingPhotoUrl(null);
          setPhotoPreview(null);
        }
      })
      .catch((err) => {
        console.error('Error fetching today calendar entry:', err);
      });
    return () => {
      active = false;
    };
  }, [profile.id, profile.active_internship_id, todayStr, todayLog?.time_out]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handlePhotoSelect = (file: File) => {
    setPhotoError(null);
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setPhotoError('Image file exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    const objUrl = URL.createObjectURL(file);
    setSelectedPhoto(file);
    setPhotoPreview(objUrl);
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPhoto(false);
    if (isChecklistLocked) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handlePhotoSelect(file);
    }
  };

  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isChecklistLocked) return;
    setIsDragOverPhoto(true);
  };

  const handlePhotoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPhoto(false);
  };

  const syncCalendarPhoto = useCallback(
    async (summaryText: string) => {
      try {
        if (selectedPhoto) {
          const uploadedUrl = await uploadCalendarImage(profile.id, todayStr, selectedPhoto);
          await saveCalendarEntry(
            profile.id,
            todayStr,
            uploadedUrl,
            summaryText,
            'What did you work on?',
            profile.active_internship_id
          );
          setExistingPhotoUrl(uploadedUrl);
          setSelectedPhoto(null);
          setPhotoPreview(uploadedUrl);
        } else if (existingPhotoUrl) {
          await saveCalendarEntry(
            profile.id,
            todayStr,
            existingPhotoUrl,
            summaryText,
            'What did you work on?',
            profile.active_internship_id
          );
        }
      } catch (err) {
        console.error('Failed to sync calendar entry:', err);
        showToast('Saved log, but could not sync photo to calendar.', 'error');
      }
    },
    [profile.id, profile.active_internship_id, todayStr, selectedPhoto, existingPhotoUrl, showToast]
  );

  const toggleTask = (label: string) => {
    if (isChecklistLocked) return;
    setTasksDirty(true);
    const nextTasks = selectedTasks.includes(label)
      ? selectedTasks.filter((item) => item !== label)
      : [...selectedTasks, label];
    setSelectedTasks(nextTasks);

    // Immediately sync with parent logs & Day Activity Inspector if clocked in
    if (todayLog?.time_in && !todayLog?.time_out) {
      onSaveLog({
        id: todayLog.id,
        date: todayLog.date || todayStr,
        time_in: todayLog.time_in,
        time_out: null,
        hours_worked: todayLog.hours_worked || 0,
        tasks_selected: nextTasks,
        custom_tasks: customTasks,
        ai_summary: aiSummary,
        ai_provider: aiProvider,
        internship_id: todayLog.internship_id,
      });
    }
  };

  const handleReloadPreloadedTasks = async () => {
    setChecklistItems(PRESET_OJT_TASKS);
    setShowReloadConfirm(false);
    setIsManagingTasks(false);
    setEditingTaskId(null);
    if (onUpdateChecklist) {
      await onUpdateChecklist(PRESET_OJT_TASKS);
    }
    showToast('Restored 8 pre-loaded default tasks.', 'success');
  };

  const handleAddTask = async () => {
    const trimmed = newTaskLabel.trim();
    if (!trimmed) return;
    if (checklistItems.some((t) => t.label.toLowerCase() === trimmed.toLowerCase())) {
      showToast('A task with this label already exists.', 'error');
      return;
    }
    const resolvedCategory =
      newTaskCategory === '__custom__'
        ? newTaskCustomInput.trim() || 'Custom'
        : newTaskCategory.trim() || 'Custom';

    if (newTaskCategory === '__custom__' && newTaskCustomInput.trim()) {
      registerCustomTag(newTaskCustomInput.trim());
    }

    const newItem: ChecklistItem = {
      id: `task_${Date.now()}`,
      label: trimmed,
      category: resolvedCategory,
    };
    const updated = [...checklistItems, newItem];
    setChecklistItems(updated);
    setNewTaskLabel('');
    setNewTaskCustomInput('');
    setIsAddingTask(false);
    if (onUpdateChecklist) {
      await onUpdateChecklist(updated);
    }
    showToast(`Added "${trimmed}" to checklist.`, 'success');
  };

  const startEditTask = (task: ChecklistItem) => {
    setEditingTaskId(task.id);
    setEditingLabel(task.label);
    setEditingCategory(task.category || 'Custom');
    setEditingCustomInput('');
  };

  const handleSaveEdit = async () => {
    const trimmed = editingLabel.trim();
    if (!trimmed || !editingTaskId) return;

    const originalTask = checklistItems.find((t) => t.id === editingTaskId);
    if (!originalTask) return;

    if (
      checklistItems.some(
        (t) => t.id !== editingTaskId && t.label.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      showToast('Another task with this label already exists.', 'error');
      return;
    }

    if (originalTask.label !== trimmed) {
      setSelectedTasks((prev) =>
        prev.map((t) => (t === originalTask.label ? trimmed : t))
      );
    }

    const resolvedCategory =
      editingCategory === '__custom__'
        ? editingCustomInput.trim() || 'Custom'
        : editingCategory.trim() || 'Custom';

    if (editingCategory === '__custom__' && editingCustomInput.trim()) {
      registerCustomTag(editingCustomInput.trim());
    }

    const updated = checklistItems.map((t) =>
      t.id === editingTaskId
        ? { ...t, label: trimmed, category: resolvedCategory }
        : t
    );

    setChecklistItems(updated);
    setEditingTaskId(null);
    setEditingLabel('');
    setEditingCustomInput('');
    if (onUpdateChecklist) {
      await onUpdateChecklist(updated);
    }
    showToast(`Updated task "${trimmed}".`, 'success');
  };

  const handleDeleteTask = async (task: ChecklistItem) => {
    setSelectedTasks((prev) => prev.filter((t) => t !== task.label));
    const updated = checklistItems.filter((t) => t.id !== task.id);
    setChecklistItems(updated);
    if (editingTaskId === task.id) {
      setEditingTaskId(null);
    }
    if (onUpdateChecklist) {
      await onUpdateChecklist(updated);
    }
    showToast(`Removed "${task.label}" from checklist.`, 'success');
  };

  const runAutoPolish = async (tasks: string[], custom: string) => {
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, customTasks: custom }),
      });
      const data = await res.json();
      return {
        summary: data.summary || '',
        provider: data.provider || 'regex-fallback',
      };
    } catch {
      return {
        summary: '• Completed assigned internship development and support tasks.',
        provider: 'regex-fallback',
      };
    }
  };

  const getAutoPolishedOutput = useCallback(async () => {
    const hasTaskInputs = selectedTasks.length > 0 || customTasks.trim().length > 0;
    if (hasTaskInputs && (tasksDirty || !aiSummary.trim())) {
      const generated = await runAutoPolish(selectedTasks, customTasks);
      setAiSummary(generated.summary);
      setAiProvider(generated.provider);
      setTasksDirty(false);
      return generated;
    }
    return { summary: aiSummary, provider: aiProvider };
  }, [selectedTasks, customTasks, tasksDirty, aiSummary, aiProvider]);

  const executeTimeOut = useCallback(
    async (outTimestampIso: string, reason: 'manual' | 'auto') => {
      if (!todayLog?.time_in) return;
      setIsSaving(true);
      try {
        const hours = calculateShiftHours(
          todayLog.time_in,
          outTimestampIso,
          profile.lunch_break_minutes
        );
        const polished = await getAutoPolishedOutput();

        justTimedOutRef.current = true;

        await onSaveLog({
          id: todayLog.id,
          date: todayStr,
          time_in: todayLog.time_in,
          time_out: outTimestampIso,
          hours_worked: hours,
          tasks_selected: selectedTasks,
          custom_tasks: customTasks,
          ai_summary: polished.summary,
          ai_provider: polished.provider,
        });

        // Sync photo with calendar entry
        await syncCalendarPhoto(polished.summary);
        onCalendarUpdated?.();

        setAutoTimeOutBlocked(false);
        setSelectedTasks([]);
        setCustomTasks('');
        setAiSummary('');
        setAiProvider('manual');
        setTasksDirty(false);
        handleRemovePhoto();

        if (reason === 'auto') {
          showToast(
            `Shift finished! Auto timed out at ${formatTimeDisplay(outTimestampIso)} (${formatHoursWhole(hours)}).`,
            'success'
          );
        } else {
          showToast(
            `Timed Out! Logged ${formatHoursWhole(hours)} and formatted for your reports.`,
            'success'
          );
        }
      } catch {
        justTimedOutRef.current = false;
        if (reason === 'auto') {
          autoTimeOutTriggeredRef.current = false;
        }
        showToast('Failed to save time-out. Please try again.', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [
      todayLog,
      profile.lunch_break_minutes,
      getAutoPolishedOutput,
      onSaveLog,
      todayStr,
      selectedTasks,
      customTasks,
      syncCalendarPhoto,
      handleRemovePhoto,
      onCalendarUpdated,
      showToast,
    ]
  );

  // Auto Time-Out Watcher with Restrictions (5a: requires >=1 checked task, 5b: rounds up to exact whole hour)
  useEffect(() => {
    if (!shiftTime) return;
    if (profile.auto_time_out === false) return;
    if (!isTimedIn || isTimedOut || isSaving) return;
    if (autoTimeOutTriggeredRef.current) return;

    const shiftEnd = getTodayShiftEndDate(profile.daily_end_time || '18:00');
    if (!shiftEnd) return;

    // Never auto time-out to a shift end that is earlier than or equal to the actual Time-In
    const timeInMs = todayLog?.time_in ? new Date(todayLog.time_in).getTime() : NaN;
    if (Number.isNaN(timeInMs) || timeInMs >= shiftEnd.getTime()) {
      setAutoTimeOutBlocked(false);
      return;
    }

    if (shiftTime.getTime() >= shiftEnd.getTime()) {
      // Restriction 5a: Do NOT auto time-out if none of "What did you work on?" is checked
      if (selectedTasks.length === 0) {
        setAutoTimeOutBlocked(true);
        return;
      }

      autoTimeOutTriggeredRef.current = true;
      setAutoTimeOutBlocked(false);
      executeTimeOut(shiftEnd.toISOString(), 'auto');
    } else {
      setAutoTimeOutBlocked(false);
    }
  }, [
    shiftTime,
    profile.auto_time_out,
    profile.daily_end_time,
    todayLog?.time_in,
    isTimedIn,
    isTimedOut,
    isSaving,
    selectedTasks.length,
    executeTimeOut,
  ]);

  const handleTimeIn = async () => {
    setIsSaving(true);
    const stamp = new Date().toISOString();
    await onSaveLog({
      id: todayLog?.id,
      date: todayStr,
      time_in: stamp,
      time_out: todayLog?.time_out || null,
      hours_worked: calculateShiftHours(
        stamp,
        todayLog?.time_out || null,
        profile.lunch_break_minutes
      ),
      tasks_selected: selectedTasks,
      custom_tasks: customTasks,
      ai_summary: aiSummary,
      ai_provider: aiProvider,
    });
    setIsSaving(false);
    showToast('Timed In! Have a productive OJT shift.', 'success');
  };

  const handleManualTimeOut = () => {
    if (!todayLog?.time_in) return;
    if (selectedTasks.length === 0) {
      showToast('Please check at least one task under "What did you work on?" before timing out.', 'error');
      return;
    }
    setPendingAction('time-out');
  };

  const handleSaveTodayLogClick = () => {
    if (!todayLog?.time_in) return;
    if (selectedTasks.length === 0) {
      showToast('Please check at least one task under "What did you work on?" before saving.', 'error');
      return;
    }
    setPendingAction('save-log');
  };

  const handleFormatCustomNotes = async () => {
    if (!customTasks.trim()) return;
    setIsSaving(true);
    try {
      const generated = await runAutoPolish(selectedTasks, customTasks);
      setAiSummary(generated.summary);
      setAiProvider(generated.provider);
      setTasksDirty(false);
      showToast('Custom notes formatted into Weekly & Monthly Report Summary.', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmPendingAction = async () => {
    const action = pendingAction;
    if (!action) return;
    if (action === 'time-in') {
      await handleTimeIn();
    } else if (action === 'time-out') {
      await executeTimeOut(new Date().toISOString(), 'manual');
    } else if (action === 'save-log') {
      await handleSaveTasks();
    } else if (action === 'format-notes') {
      await handleFormatCustomNotes();
    }
    setPendingAction(null);
  };

  const handleSaveTasks = async () => {
    setIsSaving(true);
    try {
      const polished = await getAutoPolishedOutput();
      await onSaveLog({
        id: todayLog?.id,
        date: todayStr,
        time_in: todayLog?.time_in || null,
        time_out: todayLog?.time_out || null,
        hours_worked: todayLog?.hours_worked || 0,
        tasks_selected: selectedTasks,
        custom_tasks: customTasks,
        ai_summary: polished.summary,
        ai_provider: polished.provider,
      });
      await syncCalendarPhoto(polished.summary);
      showToast('Saved & formatted for Weekly Report and Monthly Report.', 'success');
    } catch {
      showToast('Failed to save log. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const currentFormattedTime = shiftTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const currentFormattedDate = shiftTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const renderPhotoAttachment = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-700 font-bold">
          <Camera className="w-3.5 h-3.5 text-[#C44900]" />
          Photo Attachment (Optional)
        </label>
        <span className="font-mono text-[10px] text-slate-400 uppercase">
          Syncs with Calendar
        </span>
      </div>

      {photoError && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
          {photoError}
        </div>
      )}

      {photoPreview ? (
        <div className="relative rounded-2xl border-2 border-slate-200 overflow-hidden bg-slate-900 flex items-center justify-center group aspect-[16/9] max-h-56">
          <img
            src={photoPreview}
            alt="Today's activity preview"
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
            <button
              type="button"
              disabled={isChecklistLocked || isSaving}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-900 font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer disabled:cursor-not-allowed"
            >
              <Upload className="w-3.5 h-3.5" />
              Replace
            </button>
            <button
              type="button"
              disabled={isChecklistLocked || isSaving}
              onClick={handleRemovePhoto}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105 cursor-pointer disabled:cursor-not-allowed"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>

          {/* Mobile controls bar */}
          <div className="absolute bottom-2 inset-x-2 flex sm:hidden items-center justify-between bg-black/75 backdrop-blur-xs px-3 py-1.5 rounded-xl text-white font-mono text-xs">
            <span className="truncate text-[11px]">Photo attached</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isChecklistLocked || isSaving}
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold"
              >
                Replace
              </button>
              <button
                type="button"
                disabled={isChecklistLocked || isSaving}
                onClick={handleRemovePhoto}
                className="px-2 py-0.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-[11px] font-bold"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDrop={handlePhotoDrop}
          onDragOver={handlePhotoDragOver}
          onDragLeave={handlePhotoDragLeave}
          onClick={() => {
            if (!isChecklistLocked && !isSaving) {
              fileInputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-colors flex flex-col items-center justify-center gap-2 ${
            isChecklistLocked
              ? 'border-slate-200 bg-slate-50/50 cursor-not-allowed opacity-70'
              : isDragOverPhoto
              ? 'border-[#C44900] bg-[#C44900]/10 cursor-pointer'
              : 'border-slate-300 hover:border-[#C44900] bg-slate-50/50 hover:bg-orange-50/20 cursor-pointer'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#C44900] shadow-xs">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <p className="font-sans text-xs sm:text-sm font-semibold text-slate-800">
              Drop today&apos;s photo here, or <span className="text-[#C44900] underline">browse</span>
            </p>
            <p className="font-mono text-[11px] text-slate-400 mt-0.5">
              Supports JPEG, PNG, WebP up to 5MB
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pb-36 sm:pb-36 lg:pb-6 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] lg:pb-6">
      {/* Mobile-Responsive Notification Banner */}
      {toast && (
        <div
          role="status"
          className={`fixed top-16 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-md z-50 px-4 py-3 rounded-2xl font-mono text-xs shadow-xl flex items-start sm:items-center gap-2.5 border ${
            toast.variant === 'error'
              ? 'bg-red-950 text-red-100 border-red-500/60'
              : 'bg-[#141313] text-white border-[#C44900]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full mt-1 sm:mt-0 shrink-0 ${
              toast.variant === 'error' ? 'bg-red-400' : 'bg-[#C44900]'
            }`}
          />
          <span className="leading-snug">{toast.msg}</span>
        </div>
      )}

      {/* Desktop Responsive Split Grid (5 cols Left: Clock, 7 cols Right: Checklist & Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 cols): Sticky Hero Punch Clock Card + Policy Snapshot */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <section className="bg-[#141313] text-white rounded-3xl p-5 sm:p-7 border border-slate-800 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <LiveClockTicker
                  todayStr={todayStr}
                  badges={
                    <>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono font-bold uppercase tracking-wider shrink-0 ${
                          isTimedOut
                            ? 'bg-[#C44900] text-white border border-[#C44900]'
                            : isTimedIn
                            ? 'bg-[#C44900]/20 text-orange-300 border border-[#C44900]/50'
                            : 'bg-white/10 text-slate-300 border border-white/10'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isTimedOut ? 'bg-white' : isTimedIn ? 'bg-[#C44900]' : 'bg-slate-400'
                          }`}
                        />
                        {isTimedOut ? 'Shift Done' : isTimedIn ? 'On Shift' : 'Not Timed In Yet'}
                      </span>
                      {!isOnline && (
                        <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1 shrink-0">
                          <WifiOff className="w-2.5 h-2.5" />
                          Offline
                        </span>
                      )}
                      {isSyncing && (
                        <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1 shrink-0">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          Syncing
                        </span>
                      )}
                    </>
                  }
                />
              </div>
            </div>

            {/* Timestamps Strip */}
            <div className="grid grid-cols-3 gap-2.5 mt-5">
              <div className="bg-[#201f1f] border border-white/10 rounded-2xl p-3">
                <span className="block font-mono text-[10px] uppercase text-slate-400">Time In</span>
                <span
                  suppressHydrationWarning
                  className="font-mono text-xs sm:text-base font-bold text-white mt-0.5 block"
                >
                  {formatTimeDisplay(todayLog?.time_in || null)}
                </span>
              </div>
              <div className="bg-[#201f1f] border border-white/10 rounded-2xl p-3">
                <span className="block font-mono text-[10px] uppercase text-slate-400">Time Out</span>
                <span
                  suppressHydrationWarning
                  className="font-mono text-xs sm:text-base font-bold text-white mt-0.5 block"
                >
                  {formatTimeDisplay(todayLog?.time_out || null)}
                </span>
              </div>
              <div className="bg-[#201f1f] border border-white/10 rounded-2xl p-3">
                <span className="block font-mono text-[10px] uppercase text-slate-400">Net Hours</span>
                <span className="font-mono text-xs sm:text-base font-bold text-[#C44900] mt-0.5 block">
                  {liveNetHours ? formatHoursWhole(liveNetHours) : '0h'}
                </span>
              </div>
            </div>

            {/* Auto Time-Out Blocked Warning (Restriction 5a) */}
            {autoTimeOutBlocked && (
              <div className="mt-4 p-3.5 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-100 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="font-mono text-[11px] leading-relaxed">
                  Your scheduled shift end ({profile.daily_end_time?.slice(0, 5) || '18:00'}) has passed, but auto time-out is paused because no task is checked under <strong>&ldquo;What did you work on?&rdquo;</strong> below.
                </p>
              </div>
            )}

            {/* Thumb-Friendly Punch Action Buttons */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSaving || isTimedIn}
                onClick={() => setPendingAction('time-in')}
                className={`h-14 rounded-2xl font-clash-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  isTimedIn
                    ? 'bg-white/10 text-slate-400 cursor-not-allowed'
                    : 'bg-[#C44900] hover:bg-[#9E3B00] text-white active:scale-[0.99]'
                }`}
              >
                <LogIn className="w-5 h-5" />
                {isTimedIn ? 'Timed In Today' : 'Tap to Time-In'}
              </button>

              <button
                type="button"
                disabled={isSaving || !isTimedIn || isTimedOut}
                onClick={handleManualTimeOut}
                className={`h-14 rounded-2xl font-clash-semibold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  !isTimedIn || isTimedOut
                    ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-orange-50 active:scale-[0.99]'
                }`}
              >
                <LogOut className="w-5 h-5" />
                {isTimedOut ? 'Shift Completed' : 'Tap to Time-Out'}
              </button>
            </div>
          </section>

          {/* Quick Shift Schedule Policy Sidebar on Desktop */}
          <div className="hidden lg:block bg-white border-2 border-slate-200/80 rounded-3xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Daily Shift Policy
              </span>
              <span
                className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  profile.auto_time_out !== false
                    ? 'bg-orange-50 text-[#C44900] border border-[#C44900]/40'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}
              >
                {profile.auto_time_out !== false ? 'Auto Time-Out Active' : 'Manual Time-Out'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-700">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase block">Shift Hours</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {profile.daily_start_time?.slice(0, 5) || '09:00'} - {profile.daily_end_time?.slice(0, 5) || '18:00'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase block">Lunch Break</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {profile.lunch_break_minutes || 0}m deduction
                </span>
              </div>
            </div>
            <p className="font-mono text-[10.5px] text-slate-500 leading-relaxed">
              Check off tasks as you finish them. At shift end, your daily accomplishment summary formats automatically.
            </p>
          </div>

          {/* Desktop Dedicated Photo Attachment Card (Below Daily Shift Policy) */}
          <div className="hidden lg:block bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs">
            {renderPhotoAttachment()}
          </div>
        </div>

        {/* Right Column (7 cols): Smart Task Checklist & Auto-Formatted Report Summary */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Dedicated "What did you work on?" Task Checklist Card */}
          <section className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
                    Daily Task Checklist
                  </span>
                  {selectedTasks.length > 0 && (
                    <span className="font-mono text-[10px] font-bold text-[#C44900] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                      {selectedTasks.length} selected
                    </span>
                  )}
                </div>
                <h2 className="font-clash-semibold text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                  What did you work on?
                </h2>
              </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setIsAddingTask((prev) => !prev);
                setIsManagingTasks(false);
              }}
              className="h-8 px-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#C44900] hover:text-[#C44900] text-slate-700 font-mono text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
              title="Add custom checklist item"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsManagingTasks((prev) => !prev);
                setIsAddingTask(false);
                setEditingTaskId(null);
              }}
              className={`h-8 px-2.5 rounded-xl border font-mono text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                isManagingTasks
                  ? 'border-[#C44900] bg-[#C44900] text-white'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
              }`}
              title="Edit or delete checklist items"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isManagingTasks ? 'Done Editing' : 'Customize'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReloadConfirm(true)}
              className="h-8 w-8 rounded-xl border border-slate-200 bg-white hover:border-[#C44900] hover:text-[#C44900] text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Reload Pre-loaded Items"
              aria-label="Reload Pre-loaded Items"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline Add Task Form */}
        {isAddingTask && (
          <div className="p-3.5 rounded-2xl bg-orange-50/50 border-2 border-orange-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#C44900]">
                Add New Checklist Task
              </span>
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newTaskLabel}
                onChange={(e) => setNewTaskLabel(e.target.value)}
                placeholder="e.g. Conduct user feedback interviews"
                className="sm:col-span-2 h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#C44900] focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
              />
              <select
                value={newTaskCategory}
                onChange={(e) => {
                  setNewTaskCategory(e.target.value);
                  if (e.target.value !== '__custom__') {
                    setNewTaskCustomInput('');
                  }
                }}
                className="h-10 px-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-700 focus:border-[#C44900] focus:outline-none"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__custom__">+ Custom Tag...</option>
              </select>
            </div>
            {newTaskCategory === '__custom__' && (
              <div>
                <input
                  type="text"
                  value={newTaskCustomInput}
                  onChange={(e) => setNewTaskCustomInput(e.target.value)}
                  placeholder="Enter custom tag name (e.g. Research)"
                  className="w-full h-9 px-3 rounded-xl border border-orange-300 bg-white text-xs text-slate-900 focus:border-[#C44900] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddTask}
                disabled={!newTaskLabel.trim()}
                className="h-8 px-3 rounded-lg bg-[#C44900] text-white text-xs font-mono font-bold hover:bg-[#9E3B00] disabled:opacity-50 cursor-pointer"
              >
                Save Task
              </button>
            </div>
          </div>
        )}

        {/* Task Grid: In Manage Mode, items can be edited or deleted */}
        {isManagingTasks ? (
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600 font-mono">
              <span>Editing Checklist Items ({checklistItems.length})</span>
              <button
                type="button"
                onClick={() => setIsManagingTasks(false)}
                className="text-[#C44900] font-bold hover:underline cursor-pointer"
              >
                Done
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {checklistItems.map((task) => {
                if (editingTaskId === task.id) {
                  return (
                    <div
                      key={task.id}
                      className="p-3 rounded-2xl border-2 border-[#C44900] bg-orange-50/40 space-y-2 col-span-1 sm:col-span-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-[#C44900]">
                          Edit Task
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          className="sm:col-span-2 h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:border-[#C44900] focus:outline-none"
                          placeholder="Task description"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit();
                            }
                          }}
                        />
                        <select
                          value={editingCategory}
                          onChange={(e) => {
                            setEditingCategory(e.target.value);
                            if (e.target.value !== '__custom__') {
                              setEditingCustomInput('');
                            }
                          }}
                          className="h-9 px-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-700 focus:border-[#C44900] focus:outline-none"
                        >
                          {availableCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          <option value="__custom__">+ Custom Tag...</option>
                        </select>
                      </div>
                      {editingCategory === '__custom__' && (
                        <div>
                          <input
                            type="text"
                            value={editingCustomInput}
                            onChange={(e) => setEditingCustomInput(e.target.value)}
                            placeholder="Enter custom tag name (e.g. Research)"
                            className="w-full h-8 px-3 rounded-xl border border-orange-300 bg-white text-xs text-slate-900 focus:border-[#C44900] focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEdit();
                              }
                            }}
                          />
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={!editingLabel.trim()}
                          className="h-7 px-3 rounded-lg bg-[#C44900] text-white text-xs font-mono font-bold hover:bg-[#9E3B00] disabled:opacity-50 cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={task.id}
                    className="min-h-[48px] px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 bg-white text-slate-800 flex items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block font-sans text-sm font-semibold leading-snug truncate">
                        {task.label}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                        {task.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditTask(task)}
                        className="w-7 h-7 rounded-lg border border-slate-200 hover:border-[#C44900] hover:text-[#C44900] flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                        title="Edit task"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task)}
                        className="w-7 h-7 rounded-lg border border-slate-200 hover:border-red-500 hover:text-red-600 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {checklistItems.map((task) => {
              const active = selectedTasks.includes(task.label);
              return (
                <button
                  key={task.id}
                  type="button"
                  disabled={isChecklistLocked}
                  onClick={() => toggleTask(task.label)}
                  className={`min-h-[48px] px-3.5 py-2.5 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    active
                      ? 'border-[#C44900] bg-[#C44900]/8 text-slate-900'
                      : 'border-slate-200/90 bg-slate-50/50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <span className="block font-sans text-sm font-semibold leading-snug">
                      {task.label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {task.category}
                    </span>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      active ? 'bg-[#C44900] text-white' : 'bg-white border border-slate-300'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Card 2: Dedicated "Shift Accomplishments & Reports" Card */}
      <section className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="pb-2 border-b border-slate-100 flex items-center justify-between gap-2">
          <div>
            <span className="font-array-semibold text-xs uppercase tracking-[0.2em] text-[#334155]">
              Daily Documentation
            </span>
            <h3 className="font-clash-semibold text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              Shift Accomplishments &amp; Reports
            </h3>
          </div>
          <span className="font-mono text-[10px] uppercase text-slate-400 hidden sm:inline">
            Notes, Summary &amp; Photos
          </span>
        </div>

        <div
          className={`space-y-4 transition-opacity ${
            isChecklistLocked ? 'opacity-50 pointer-events-none select-none' : ''
          }`}
        >

          <div className="space-y-2">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              Others / Custom Notes
            </label>
            <textarea
              rows={2}
              disabled={isChecklistLocked}
              value={customTasks}
              onChange={(e) => {
                setTasksDirty(true);
                setCustomTasks(e.target.value);
              }}
              placeholder="e.g. Fix login redirect bug on iOS Safari; migrate users table"
              className="w-full p-3.5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-900 disabled:cursor-not-allowed"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isChecklistLocked || isSaving || !customTasks.trim()}
                onClick={() => setPendingAction('format-notes')}
                className="h-10 px-4 rounded-xl border-2 border-slate-200 bg-white hover:border-[#C44900] hover:text-[#C44900] disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 font-mono text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                Add Notes to Summary
              </button>
            </div>
          </div>

          {/* Auto-Formatted Summary Preview for Weekly Report & Monthly Report */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700">
                  Weekly Report &amp; Monthly Report Summary
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400 uppercase">
                Auto-formatted on save
              </span>
            </div>

            <textarea
              rows={4}
              disabled={isChecklistLocked}
              value={aiSummary}
              onChange={(e) => {
                setTasksDirty(false);
                setAiSummary(e.target.value);
              }}
              placeholder="Automatically generated in past tense when you save or time-out..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:border-[#C44900] focus:outline-none text-sm text-slate-800 leading-relaxed disabled:cursor-not-allowed"
            />
          </div>

          {/* Mobile-only Photo Attachment (Preserved as is on mobile viewports) */}
          <div className="lg:hidden">
            {renderPhotoAttachment()}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            disabled={isChecklistLocked || isSaving}
            accept="image/jpeg,image/png,image/webp,image/heic,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePhotoSelect(f);
            }}
            className="hidden"
          />

          <button
            type="button"
            disabled={isChecklistLocked || isSaving}
            onClick={handleSaveTodayLogClick}
            className="w-full h-12 rounded-2xl bg-[#C44900] hover:bg-[#9E3B00] disabled:opacity-60 disabled:cursor-not-allowed text-white font-clash-semibold text-base inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Tasks...' : 'Save Today’s Log'}
          </button>
        </div>
      </section>
    </div>
  </div>

      <ConfirmModal
        isOpen={pendingAction !== null}
        loading={isSaving}
        title={
          pendingAction === 'time-in'
            ? 'Confirm Time-In'
            : pendingAction === 'time-out'
            ? 'Confirm Time-Out'
            : pendingAction === 'save-log'
            ? "Save Today's Tasks & Summary"
            : pendingAction === 'format-notes'
            ? 'Add Notes to Summary'
            : "Save Today's Log"
        }
        description={
          pendingAction === 'time-in'
            ? `Record your Time-In for ${currentFormattedDate} at ${currentFormattedTime}?`
            : pendingAction === 'time-out'
            ? `Complete your shift and record Time-Out at ${currentFormattedTime}? Your selected tasks will be formatted automatically for your reports.`
            : pendingAction === 'save-log'
            ? `Save your checked tasks and accomplishment summary to your log for ${currentFormattedDate}? (You will remain clocked in until you tap Time-Out).`
            : pendingAction === 'format-notes'
            ? 'Format your custom notes (along with any checked tasks) into past-tense statements for the Weekly & Monthly Report Summary?'
            : "Save today's checked tasks and accomplishment summary to your attendance log?"
        }
        confirmLabel={
          pendingAction === 'time-in'
            ? 'Time In'
            : pendingAction === 'time-out'
            ? 'Time Out'
            : pendingAction === 'save-log'
            ? 'Save Progress'
            : pendingAction === 'format-notes'
            ? 'Add to Summary'
            : 'Save Log'
        }
        onConfirm={handleConfirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmModal
        isOpen={showReloadConfirm}
        title="Reload Default Tasks"
        description="Are you sure you want to restore the 8 default OJT tasks? Any custom checklist items you added will be replaced with the pre-loaded items."
        confirmLabel="Reload Defaults"
        cancelLabel="Cancel"
        variant="primary"
        onConfirm={handleReloadPreloadedTasks}
        onCancel={() => setShowReloadConfirm(false)}
      />
    </div>
  );
});

export default PunchClockCard;
