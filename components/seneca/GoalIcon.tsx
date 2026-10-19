"use client";
import { Fluent } from "@/app/admin/ui/extensions/emoji";
export default function GoalIcon({ goal }: { goal: { emoji?: string; iconSrc?: string } }) {
  // Goal images use the same uploaded media URLs as the editor's icon picker.
  // eslint-disable-next-line @next/next/no-img-element
  return goal.iconSrc ? <img className="sn-goal-icon" src={goal.iconSrc} alt="" /> : <Fluent emoji={goal.emoji || '🎯'} size={28} />;
}
