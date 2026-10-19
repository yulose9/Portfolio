// @ts-nocheck
"use client";
import { useWebHaptics } from "web-haptics/react";
import clsx from "clsx";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
} from "framer-motion";
import { Bell, Briefcase, Check, CheckCircle, ChevronRight, Plus, RotateCcw, User } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import AddTaskSheet from "@/components/seneca/AddTaskSheet";
import HabitDetailSheet from "@/components/seneca/HabitDetailSheet";
import { TasksReminderSettingsSheet } from "@/components/seneca/ObligationReminder";
import PageTransition from "@/components/seneca/PageTransition";
import Num from "@/components/seneca/Num";
import { MonthRings } from "@/components/seneca/home/GreetingColumn";
import PageHeader from "@/components/seneca/PageHeader";
import {
  ICON_ENTER,
  ICON_SPRING,
  FADE,
  FADE_EXIT,
  ICON_VISIBLE,
  LAYOUT_SPRING,
  TAP,
  TAP_CARD,
  TAP_TRANSITION,
} from "@/lib/seneca/constants/motion";
import { useProtocol } from "@/lib/seneca/context/ProtocolContext";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { holdGrabbing } from "@/app/lib/grabbing";

// iOS 18 Style Checkbox
const Checkbox = ({ done, onClick }) => {
  return (
    <motion.button
      whileTap={TAP}
      aria-pressed={done}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      data-sound={done ? "toggleOff" : "check"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={clsx(
        "ios-checkbox relative after:content-[''] after:absolute after:-inset-4 after:bg-transparent",
        done && "checked"
      )}
    >
      <AnimatePresence initial={false}>
        {done && (
          <motion.div
            key="check"
            initial={ICON_ENTER}
            animate={ICON_VISIBLE}
            exit={ICON_ENTER}
            transition={ICON_SPRING}
            className="flex items-center justify-center"
          >
            <Check
              size={14}
              strokeWidth={3}
              className="ios-checkbox-icon"
              style={{ opacity: 1, transform: "none" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// Long-press Reorder Item - requires hold before drag activates
const LONG_PRESS_DELAY = 500; // ms before drag activates
const MOVE_THRESHOLD = 8; // px - cancel long press if finger moves

const LongPressReorderItem = ({ children, value, className }) => {
  const controls = useDragControls();
  const timerRef = useRef(null);
  const startPosRef = useRef(null);
  const isDragActiveRef = useRef(false);
  // Releases the closed hand (lib/grabbing) once the row is put down.
  const releaseGrabRef = useRef(null);
  const [isHolding, setIsHolding] = useState(false);

  const clearLongPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    releaseGrabRef.current?.();
    releaseGrabRef.current = null;
    setIsHolding(false);
    isDragActiveRef.current = false;
    startPosRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      // Only handle primary button / first touch
      if (e.button !== 0 && e.button !== undefined) return;

      // Prevent text/image selection during long press
      e.preventDefault();

      startPosRef.current = { x: e.clientX, y: e.clientY };
      isDragActiveRef.current = false;
      const touch = e.pointerType === "touch";

      timerRef.current = setTimeout(() => {
        isDragActiveRef.current = true;
        setIsHolding(true);
        // The row is lifted: a mouse or pen shows the closed hand until it's put down.
        if (!touch) releaseGrabRef.current ??= holdGrabbing();

        // Haptic feedback on supported devices
        if (navigator.vibrate) navigator.vibrate(30);

        // Start drag with a fresh PointerEvent at the stored position
        const dragEvent = new PointerEvent("pointerdown", {
          clientX: startPosRef.current?.x ?? e.clientX,
          clientY: startPosRef.current?.y ?? e.clientY,
          bubbles: true,
          cancelable: true,
          pointerId: e.pointerId,
          pointerType: e.pointerType,
        });
        controls.start(dragEvent);
      }, LONG_PRESS_DELAY);
    },
    [controls],
  );

  useEffect(() => {
    const handleMove = (e) => {
      // If drag is already active, let framer-motion handle it
      if (isDragActiveRef.current) return;

      // If still in long-press wait, cancel if finger moved too much
      if (startPosRef.current && timerRef.current) {
        const dx = Math.abs(e.clientX - startPosRef.current.x);
        const dy = Math.abs(e.clientY - startPosRef.current.y);
        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
          clearLongPress();
        }
      }
    };

    const handleUp = () => {
      clearLongPress();
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      if (timerRef.current) clearTimeout(timerRef.current);
      releaseGrabRef.current?.();
      releaseGrabRef.current = null;
    };
  }, [clearLongPress]);

  return (
    <Reorder.Item
      value={value}
      as="div"
      dragListener={false}
      dragControls={controls}
      // Rings the lifted row and steps its neighbours back (seneca-sunlit.css).
      data-lifted={isHolding || undefined}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
        zIndex: 50,
      }}
      onDragEnd={clearLongPress}
      className={className}
      onPointerDown={handlePointerDown}
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "pan-y",
      }}
    >
      <motion.div
        animate={
          isHolding ? { scale: 1.01, opacity: 0.92 } : { scale: 1, opacity: 1 }
        }
        transition={LAYOUT_SPRING}
      >
        {children}
      </motion.div>
    </Reorder.Item>
  );
};

// Task Row Component
const TaskRow = ({ task, onToggle, onClick, isLast }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex items-center min-h-[52px] py-3 px-4 cursor-pointer bg-surface transition-colors active:bg-fill",
        !isLast && "border-b border-separator",
      )}
    >
      {/* overflow-visible so the ::before hit-slop isn't clipped by the row */}
      <div className="overflow-visible flex-shrink-0">
        <Checkbox done={task.done} onClick={onToggle} />
      </div>
      <span className="text-title-2 mx-3 select-none">{task.emoji}</span>
      <span
        className={clsx(
          "flex-1 text-body transition-colors duration-150",
          task.done
            ? "text-ink-3 line-through decoration-separator"
            : "text-ink",
        )}
      >
        {task.title}
      </span>
      <ChevronRight size={18} className="text-ink-3 ml-2" />
    </div>
  );
};

// Category icon mapping
const categoryIcons = {
  personal: User,
  work: Briefcase,
  other: CheckCircle,
};

// Category active colors
// Category active colors — Sunlit palette (apricot carries dark ink, see seneca-sunlit.css)
const categoryColors = {
  personal: "#F5A55B",
  work: "#4E7C58",
  other: "#C44842",
};

// Protocol Category Pill Selector (inspired by iPhone Mail app)
const CategoryPillSelector = ({ categories, activeCategory, onCategoryChange }) => {
  return (
    <div className="protocol-pill-container">
      <div className="protocol-pill-track">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          const IconComp = categoryIcons[cat.id];
          const activeColor = categoryColors[cat.id];
          return (
            <motion.button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={clsx(
                "protocol-pill",
                isActive ? "protocol-pill-active" : "protocol-pill-inactive",
              )}
              style={{
                backgroundColor: isActive ? activeColor : "var(--color-fill-strong)",
                boxShadow: isActive
                  ? `0 3px 12px ${activeColor}40`
                  : "none",
              }}
              layout
              transition={{ layout: LAYOUT_SPRING, scale: TAP_TRANSITION }}
              whileTap={TAP}
              aria-pressed={isActive}
              aria-label={cat.label}
              data-cat={cat.id}
            >
              <motion.div
                className="protocol-pill-content"
                layout
                transition={{ layout: LAYOUT_SPRING }}
              >
                <IconComp
                  size={18}
                  strokeWidth={2}
                  className="protocol-pill-icon"
                />
                <AnimatePresence mode="popLayout" initial={false}>
                  {isActive && (
                    <motion.span
                      key={`label-${cat.id}`}
                      className="protocol-pill-label ml-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: FADE }}
                      exit={{ opacity: 0, transition: FADE_EXIT }}
                      style={{ overflow: "hidden", whiteSpace: "nowrap", display: "inline-block" }}
                    >
                      {cat.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// Empty state for work/other categories
const EmptyCategoryState = ({ categoryLabel }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={LAYOUT_SPRING}
      className="protocol-empty-state"
    >
      <div className="protocol-empty-icon">📋</div>
      <h3 className="protocol-empty-title">No {categoryLabel} Tasks Yet</h3>
      <p className="protocol-empty-subtitle">
        Tap the <strong>+</strong> button above to add your first task.
      </p>
    </motion.div>
  );
};

// Phase Section Component
const PhaseSection = ({
  phaseId,
  phase,
  tasks,
  isExpanded,
  isUnlocked,
  onToggleTask,
  onToggleExpand,
  onTaskPress,
  onReorder,
  progress,
}) => {
  const allTasksDone = tasks.every((t) => t.done);
  const isPhaseComplete = allTasksDone;

  return (
    <section className="ios-list-section" data-celebrate-origin={phaseId}>
      {/* Section Header */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => onToggleExpand(phaseId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand(phaseId);
          }
        }}
        className="flex items-center justify-between px-1 mb-2 cursor-pointer active:opacity-60"
      >
        <h3 className="ios-list-header px-0 pb-0">{phase.title}</h3>
        <div className="flex items-center gap-2">
          <AnimatePresence initial={false}>
            {!isUnlocked && (
              <motion.span
                key="locked"
                exit={{ opacity: 0, scale: 0.9, transition: FADE_EXIT }}
                className="ios-pill ios-pill-gray text-caption-2"
              >
                Locked
              </motion.span>
            )}
          </AnimatePresence>
          {isPhaseComplete && (
            <motion.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={ICON_SPRING}
              className="ios-pill ios-pill-green text-caption-2"
            >
              Completed
            </motion.span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={LAYOUT_SPRING}
          >
            <ChevronRight size={16} className="text-ink-3" />
          </motion.div>
        </div>
      </div>

      {/* Grouped Phase List Card */}
      <motion.div
        layout
        transition={LAYOUT_SPRING}
        className={clsx(
          "ios-inset-grouped relative mx-1 transition-[opacity,filter] duration-300 ease-out",
          !isUnlocked && "opacity-50 grayscale",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {isExpanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: FADE }}
              exit={{ opacity: 0, transition: FADE_EXIT }}
            >
              <Reorder.Group
                axis="y"
                values={tasks}
                onReorder={(newOrder) => onReorder(phaseId, newOrder)}
                as="div"
                className="sn-task-order"
              >
                {tasks.map((task, index) => (
                  <LongPressReorderItem
                    key={task.id}
                    value={task}
                    className="relative"
                  >
                    <TaskRow
                      task={task}
                      onToggle={() => onToggleTask(phaseId, task.id)}
                      onClick={() => onTaskPress(phaseId, task)}
                      isLast={index === tasks.length - 1}
                    />
                  </LongPressReorderItem>
                ))}
              </Reorder.Group>
            </motion.div>
          ) : (
            // Collapsed Summary View
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: FADE }}
              exit={{ opacity: 0, transition: FADE_EXIT }}
              onClick={() => onToggleExpand(phaseId)}
              whileTap={TAP_CARD}
              className={clsx(
                "p-4 flex items-center justify-between cursor-pointer rounded-xl shadow-card",
                isPhaseComplete ? "bg-positive" : "bg-surface",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-title-2">{phase.emoji}</span>
                <span
                  className={clsx(
                    "text-body font-medium tabular-nums transition-colors",
                    isPhaseComplete ? "text-white" : "text-ink",
                  )}
                >
                  {isPhaseComplete
                    ? "All Habits Done"
                    : `${progress.completed}/${progress.total} Completed`}
                </span>
              </div>
              {isPhaseComplete ? (
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" strokeWidth={3} />
                </div>
              ) : (
                <ChevronRight size={18} className="text-ink-3" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
};

export default function Protocol() {
  const {
    phases,
    taskHistory,
    phaseOrder,
    allPhasesComplete,
    toggleTask,
    completePhase,
    phaseTasks,
    isPhaseUnlocked,
    getPhaseProgress,
    toggleTaskHistory,
    getTaskHistory,
    addCustomTask,
    removeCustomTask,
    reorderTasks,
    resetTaskOrder,
    isOrderCustomized,
    protocolCategory,
    protocolCategories,
    switchCategory,
  } = useProtocol();

  const haptic = useWebHaptics();
  const [expandedPhases, setExpandedPhases] = useState(["morningIgnition"]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [addTaskSheetVisible, setAddTaskSheetVisible] = useState(false);
  const [tasksReminderSettings, setTasksReminderSettings] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [showOverview, setShowOverview] = useState(true);
  useEffect(() => { try { setShowOverview(localStorage.getItem("seneca_protocol_overview") !== "hidden"); } catch { /* Storage may be disabled. */ } }, []);
  const toggleOverview = () => {
    const next = !showOverview;
    setShowOverview(next);
    try { localStorage.setItem("seneca_protocol_overview", next ? "visible" : "hidden"); } catch { /* Keep the session preference. */ }
  };

  // Check if current category has any tasks
  const hasTasks = phaseOrder.some(
    (phaseId) => phaseTasks[phaseId] && phaseTasks[phaseId].length > 0,
  );

  const dailyTasks = phaseOrder.flatMap(phaseId => (phaseTasks[phaseId] || []).map(task => ({ ...task, phaseId, key: `${phaseId}-${task.id}` })));
  const completedCount = dailyTasks.filter(task => task.done).length;
  const nextTasks = dailyTasks.filter(task => !task.done).slice(0, 3);
  const activeCategoryLabel = protocolCategories.find(
    (c) => c.id === protocolCategory,
  )?.label || "";

  // Track previous completion state to trigger auto-advance
  const prevCompletedRef = useRef({});

  useEffect(() => {
    phaseOrder.forEach((phaseId, index) => {
      const currentPhaseTasks = phaseTasks[phaseId];
      // Skip undefined or empty phases - they shouldn't trigger auto-advance
      if (!currentPhaseTasks || currentPhaseTasks.length === 0) return;

      const isComplete = currentPhaseTasks.every((t) => t.done);
      const wasComplete = prevCompletedRef.current[phaseId];

      // If phase JUST became complete (transition from incomplete -> complete)
      if (isComplete && !wasComplete) {
        haptic.trigger("success");
        const nextPhaseId = phaseOrder[index + 1];

        // Auto-collapse the completed phase and expand the next phase
        setExpandedPhases((prev) => {
          let newState = prev.filter(p => p !== phaseId); // Collapse current
          if (nextPhaseId && !newState.includes(nextPhaseId)) {
            newState = [...newState, nextPhaseId]; // Expand next
          }
          return newState;
        });
      }

      // Update ref
      prevCompletedRef.current[phaseId] = isComplete;
    });
  }, [phaseTasks, phaseOrder, haptic]);

  // Finishing a phase is celebrated by <PhaseCelebration /> in the app shell
  // (sound, confetti from this phase's card, the once-a-day "all done" burst).

  const handleTaskPress = (phaseId, task) => {
    setSelectedHabit({ ...task, phaseId });
    setSheetVisible(true);
  };

  const handleToggleExpand = (phaseId) => {
    setExpandedPhases((prev) =>
      prev.includes(phaseId)
        ? prev.filter((p) => p !== phaseId)
        : [...prev, phaseId],
    );
  };

  const handleCompletePhase = (phaseId) => {
    completePhase(phaseId);
  };

  return (
    <PageTransition className="w-full pb-8 sn-protocol-board">
      <PageHeader
        title="Protocol"
        subtitle="Daily stoic disciplines, phase rituals, and habit streaks."
        trailing={
          <>
            <AnimatePresence initial={false}>
              {isOrderCustomized && (
                <motion.button
                  initial={ICON_ENTER}
                  animate={ICON_VISIBLE}
                  exit={ICON_ENTER}
                  transition={ICON_SPRING}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { haptic.trigger("medium"); resetTaskOrder(); }}
                  className="w-8 h-8 rounded-lg bg-surface border border-separator/40 flex items-center justify-center hover:bg-fill transition-colors shadow-xs"
                  aria-label="Reset Order"
                  title="Reset Order"
                >
                  <RotateCcw size={16} className="text-ink-2" />
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { haptic.trigger("light"); setTasksReminderSettings(true); }}
              className="w-8 h-8 rounded-lg bg-surface border border-separator/40 flex items-center justify-center hover:bg-fill transition-colors shadow-xs"
              aria-label="Reminder Settings"
              title="Reminder Settings"
            >
              <Bell size={16} className="text-ink-2" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { haptic.trigger("medium"); setAddTaskSheetVisible(true); }}
              className="h-8 px-3 rounded-lg bg-accent text-white flex items-center gap-1.5 text-xs font-semibold shadow-xs hover:bg-accent/90 transition-colors"
              aria-label="Add Task"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Task</span>
            </motion.button>
          </>
        }
      />

      <div className="sn-protocol-layout"><div className="sn-protocol-main">
      <button type="button" className="sn-btn mb-3" aria-expanded={showOverview} aria-controls="protocol-overview" data-sound="select" onClick={toggleOverview}>{showOverview ? "Hide overview" : "Show overview"}</button>
      {showOverview && <section id="protocol-overview" className="sn-protocol-welcome" aria-label="Today's focus">
        <div className="sn-protocol-intro"><span className="sn-eyebrow">{activeCategoryLabel} · today</span><h2>{dailyTasks.length && completedCount === dailyTasks.length ? 'A day well spent.' : 'One good habit at a time.'}</h2><p><Num value={dailyTasks.length - completedCount} /> habits left. Give the next one your attention.</p></div>
        <div className="sn-protocol-upnext"><h3>Up next</h3>{nextTasks.length ? nextTasks.map(task => <button key={task.key} onClick={() => handleTaskPress(task.phaseId, task)}><span aria-hidden="true">{task.emoji || '○'}</span><span>{task.title}<small>{phases[task.phaseId]?.title}</small></span><ChevronRight size={16} /></button>) : <p>{dailyTasks.length ? 'Your rituals are complete. Enjoy your space.' : 'Add a habit to give your day a starting point.'}</p>}</div>
        <div className="sn-protocol-art" aria-hidden="true"><i /><i /><i /><i /></div>
      </section>}
      <div className="sn-protocol-list-head"><h2>Today's list</h2><button className="sn-btn" onClick={() => setAddTaskSheetVisible(true)}><Plus size={16} />Add a habit</button></div>
      {/* Category Pill Selector */}
      <CategoryPillSelector
        categories={protocolCategories}
        activeCategory={protocolCategory}
        onCategoryChange={(id) => { haptic.trigger("selection"); switchCategory(id); }}
      />

      {/* Phase Sections */}
      <AnimatePresence initial={false}>
        <motion.div
          key={protocolCategory}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0 } }}
          transition={FADE}
        >
         <AnimatePresence initial={false}>
          <motion.div
            key={hasTasks ? "tasks" : "empty"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={FADE}
          >
          {hasTasks ? (
            phaseOrder
              .filter((phaseId) => {
                // For non-personal: hide empty scheduled phases (but always show general if it has tasks)
                if (protocolCategory !== "personal" && phaseId !== "general") {
                  return phaseTasks[phaseId] && phaseTasks[phaseId].length > 0;
                }
                return true;
              })
              .map((phaseId) => (
                <PhaseSection
                  key={phaseId}
                  phaseId={phaseId}
                  phase={phases[phaseId]}
                  tasks={phaseTasks[phaseId] || []}
                  isExpanded={phaseId === "general" ? true : expandedPhases.includes(phaseId)}
                  isUnlocked={phaseId === "general" ? true : isPhaseUnlocked(phaseId)}
                  onToggleTask={(phaseId, taskId) => { haptic.trigger("light"); toggleTask(phaseId, taskId); }}
                  onToggleExpand={handleToggleExpand}
                  onCompletePhase={handleCompletePhase}
                  onTaskPress={handleTaskPress}
                  onReorder={reorderTasks}
                  progress={getPhaseProgress(phaseId)}
                />
              ))
          ) : (
            <EmptyCategoryState categoryLabel={activeCategoryLabel} />
          )}
          </motion.div>
         </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      </div><aside className="sn-protocol-aside" aria-label="Habit progress">
        <MonthRings history={taskHistory} taskKeys={dailyTasks.map(task => task.key)} tasks={dailyTasks} />
        <section className="sn-protocol-progress sn-card"><span className="sn-eyebrow">Small steps, every day</span><h2><Num value={completedCount} /><small> / {dailyTasks.length} complete</small></h2><div className="sn-protocol-meter" role="progressbar" aria-label="Today's habits completed" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={dailyTasks.length || 1}><i style={{ width: `${dailyTasks.length ? completedCount / dailyTasks.length * 100 : 0}%` }} /></div>{phaseOrder.filter(id => phaseTasks[id]?.length).map(id => <button key={id} onClick={() => { setExpandedPhases(prev => prev.includes(id) ? prev : [...prev, id]); document.querySelector(`[data-celebrate-origin="${id}"]`)?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }}><span>{phases[id]?.emoji} {phases[id]?.title}</span><small>{phaseTasks[id].filter(task => task.done).length}/{phaseTasks[id].length}</small></button>)}</section>
      </aside></div>
      {/* Habit Detail Sheet */}
      <HabitDetailSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        habit={selectedHabit}
        onToggleHistory={toggleTaskHistory}
        getHistory={getTaskHistory}
        onDeleteCustomTask={removeCustomTask}
      />

      {/* Add Task Sheet */}
      <AddTaskSheet
        visible={addTaskSheetVisible}
        onClose={() => setAddTaskSheetVisible(false)}
        onAddTask={addCustomTask}
        protocolCategory={protocolCategory}
      />

      {/* Tasks Reminder Settings */}
      <TasksReminderSettingsSheet
        visible={tasksReminderSettings}
        onClose={() => setTasksReminderSettings(false)}
      />
    </PageTransition>
  );
}
