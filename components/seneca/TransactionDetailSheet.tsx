// @ts-nocheck
"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { ArrowDownLeft, ArrowUpRight, Copy, Share, Tag, Calendar, MapPin, CreditCard, Pen, Trash2 } from 'lucide-react';
import { useWebHaptics } from "web-haptics/react";
import { TAP, TAP_TRANSITION } from "@/lib/seneca/constants/motion";
import Sheet from "./Sheet";

/**
 * One money record: what it was, when, and from which account. Edit changes
 * its note, category, amount or date through the ledger (so balances follow);
 * Delete hands back to the list's confirm dialog.
 */
export default function TransactionDetailSheet({ visible, onClose, transaction, onAccountClick, onSave, onDelete }) {
    const [cachedTransaction, setCachedTransaction] = useState(transaction);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [problem, setProblem] = useState('');
    const [shared, setShared] = useState('');
    const haptic = useWebHaptics();

    // Keep the last transaction so the sheet can finish its exit after the parent clears it
    if (transaction && transaction !== cachedTransaction) setCachedTransaction(transaction);

    const activeTransaction = transaction || cachedTransaction;

    // The record's own id, so it can be found in a backup or the CSV.
    const reference = String(activeTransaction?.id ?? '—');

    useEffect(() => {
        if (!visible) { setEditing(false); setProblem(''); setShared(''); }
    }, [visible]);

    if (!activeTransaction) return null;

    const startEdit = () => {
        const d = new Date(activeTransaction.date);
        setDraft({
            note: activeTransaction.note || '',
            spendingCategory: activeTransaction.spendingCategory || '',
            amount: String(activeTransaction.amount),
            date: Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(d) : '',
        });
        setProblem('');
        setEditing(true);
    };

    const save = async () => {
        if (!onSave || saving) return;
        const original = new Date(activeTransaction.date);
        // Keep the time of day; only the calendar day changes.
        const time = Number.isFinite(original.getTime())
            ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(original)
            : '12:00:00';
        const next = {
            ...activeTransaction,
            note: draft.note.trim() || null,
            amount: Number(draft.amount),
            date: draft.date ? new Date(`${draft.date}T${time}+08:00`).toISOString() : activeTransaction.date,
            ...(activeTransaction.type === 'withdrawal' ? { spendingCategory: draft.spendingCategory.trim() || 'Other' } : {}),
        };
        setSaving(true);
        setProblem('');
        try {
            await onSave(next, activeTransaction);
            haptic.trigger('success');
            setCachedTransaction(next);
            setEditing(false);
        } catch (error) {
            haptic.trigger('error');
            setProblem(error?.message || "Couldn't save this record.");
        } finally {
            setSaving(false);
        }
    };

    const share = async () => {
        const text = [
            `${activeTransaction.type === 'deposit' ? '+' : '-'}₱${activeTransaction.amount.toLocaleString()}`,
            activeTransaction.note,
            activeTransaction.bank,
            new Date(activeTransaction.date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        ].filter(Boolean).join(' · ');
        try {
            if (navigator.share) await navigator.share({ title: 'Money record', text });
            else { await navigator.clipboard.writeText(text); setShared('Copied to the clipboard.'); }
            haptic.trigger('success');
        } catch { /* closing the share sheet isn't an error */ }
    };

    const isDeposit = activeTransaction.type === 'deposit';
    // Income reads positive, spending negative (HIG semantic tints)
    const tint = isDeposit ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative";
    const dateObj = new Date(activeTransaction.date);
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Metadata describes the saved record, not a bank settlement.
    const details = [
        { label: 'Status', value: 'Recorded', icon: <div className="w-2 h-2 rounded-full bg-positive" /> },
        { label: 'Record ID', value: reference, icon: <Copy size={14} className="text-ink-3" /> },
        { label: 'Category', value: activeTransaction.spendingCategory || activeTransaction.type, icon: <Tag size={16} className="text-ink-2" /> },
    ];

    return (
        <Sheet
            open={visible}
            onClose={() => { haptic.trigger("medium"); onClose(); }}
            zIndex={200}
            label="Transaction details"
            backdropClassName="ios-sheet-backdrop"
            className="ios-sheet"
        >
                {/* Handle */}
                <div
                    className="flex justify-center pt-3 pb-2 cursor-pointer"
                    onClick={() => { haptic.trigger("medium"); onClose(); }}
                >
                    <div className="ios-sheet-handle w-12 h-1.5" />
                </div>

                <div className="ios-sheet-content px-6 pb-12 pt-4">
                    {/* Icon & Title */}
                    <div className="flex flex-col items-center justify-center mb-6 text-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${tint}`}>
                            {isDeposit ? (
                                <ArrowDownLeft size={32} />
                            ) : (
                                <ArrowUpRight size={32} />
                            )}
                        </div>
                        <h2 className="text-large-title font-bold text-ink leading-tight mb-1 tabular-nums">
                            {isDeposit ? '+' : '-'}₱{activeTransaction.amount.toLocaleString()}
                        </h2>
                        <p
                            onClick={() => onAccountClick && onAccountClick(activeTransaction)}
                            className={clsx(
                                "text-body font-medium text-ink-2",
                                onAccountClick && "cursor-pointer hover:text-ink transition-colors duration-150"
                            )}
                        >
                            {activeTransaction.bank}
                        </p>
                    </div>

                    {activeTransaction.spendingCategory && <p className="text-sm text-ink-2 mb-4">Category · {activeTransaction.spendingCategory}</p>}
                    {/* Details List */}
                    <div className="bg-fill rounded-2xl overflow-hidden mb-6">
                        <div className="flex items-center p-4 border-b border-separator">
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center mr-3 shrink-0 text-ink-2">
                                <Calendar size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-footnote text-ink-2">Date & Time</p>
                                <p className="text-subhead font-semibold text-ink">{dateStr} • {timeStr}</p>
                            </div>
                        </div>
                        <div className="flex items-center p-4 border-b border-separator">
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center mr-3 shrink-0 text-ink-2">
                                <MapPin size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-footnote text-ink-2">Location</p>
                                <p className="text-subhead font-semibold text-ink">{activeTransaction.location || 'Not recorded'}</p>
                            </div>
                        </div>
                        <div
                            className={clsx("flex items-center p-4 cursor-pointer active:bg-fill transition-colors duration-150")}
                            onClick={() => onAccountClick && onAccountClick(activeTransaction)}
                        >
                            <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center mr-3 shrink-0 text-ink-2">
                                <CreditCard size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="text-footnote text-ink-2">Account</p>
                                <p className={clsx("text-subhead font-semibold", onAccountClick ? "text-accent" : "text-ink")}>
                                    {activeTransaction.bank}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Meta Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        {details.map((detail, i) => (
                            <div key={i} className="bg-fill p-4 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-footnote text-ink-2 font-medium">{detail.label}</span>
                                    {detail.icon}
                                </div>
                                <p className="text-subhead font-semibold text-ink">{detail.value}</p>
                            </div>
                        ))}
                    </div>

                    {editing && (
                        <div className="bg-fill rounded-2xl p-4 mb-4 flex flex-col gap-3" role="group" aria-label="Edit record">
                            <label className="flex flex-col gap-1 text-footnote text-ink-2">
                                Note
                                <input className="h-11 px-3 rounded-xl bg-surface text-[16px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-[var(--sn-apricot)]" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} maxLength={120} />
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex flex-col gap-1 text-footnote text-ink-2">
                                    Amount (₱)
                                    <input type="number" inputMode="decimal" step="0.01" min="0.01" className="h-11 px-3 rounded-xl bg-surface text-[16px] text-ink tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[var(--sn-apricot)]" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
                                </label>
                                <label className="flex flex-col gap-1 text-footnote text-ink-2">
                                    Date
                                    <input type="date" className="h-11 px-3 rounded-xl bg-surface text-[16px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-[var(--sn-apricot)]" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                                </label>
                            </div>
                            {activeTransaction.type === 'withdrawal' && (
                                <label className="flex flex-col gap-1 text-footnote text-ink-2">
                                    Category
                                    <input className="h-11 px-3 rounded-xl bg-surface text-[16px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-[var(--sn-apricot)]" value={draft.spendingCategory} onChange={(e) => setDraft({ ...draft, spendingCategory: e.target.value })} maxLength={40} />
                                </label>
                            )}
                            {problem && <p className="text-footnote text-negative" role="alert">{problem}</p>}
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" className="h-11 rounded-xl bg-surface text-ink font-semibold" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
                                <button type="button" className="h-11 rounded-xl bg-black text-white font-semibold disabled:opacity-50" onClick={save} disabled={saving || !(Number(draft.amount) > 0)} aria-busy={saving || undefined}>{saving ? 'Saving…' : 'Save'}</button>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {!editing && (onSave || onDelete) && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            {onSave && (
                                <motion.button whileTap={TAP} transition={TAP_TRANSITION} onClick={startEdit} className="h-[52px] bg-fill text-ink rounded-xl font-semibold text-body flex items-center justify-center gap-2">
                                    <Pen size={17} aria-hidden="true" />
                                    Edit
                                </motion.button>
                            )}
                            {onDelete && (
                                <motion.button whileTap={TAP} transition={TAP_TRANSITION} onClick={() => onDelete(activeTransaction)} data-variant="destructive" className="h-[52px] bg-negative/10 text-negative rounded-xl font-semibold text-body flex items-center justify-center gap-2">
                                    <Trash2 size={17} aria-hidden="true" />
                                    Delete
                                </motion.button>
                            )}
                        </div>
                    )}
                    <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={share}
                        className="w-full h-[52px] bg-black text-white rounded-xl font-bold text-body flex items-center justify-center mb-3 shadow-float"
                    >
                        <Share size={18} className="mr-2" />
                        Share
                    </motion.button>
                    <p className="text-center text-footnote text-ink-2 min-h-[1.2em]" role="status">{shared}</p>

                    <motion.button
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={() => { haptic.trigger("medium"); onClose(); }}
                        className="w-full h-[52px] bg-fill text-ink rounded-xl font-semibold text-body flex items-center justify-center"
                    >
                        Close
                    </motion.button>
                </div>
        </Sheet>
    );
}
