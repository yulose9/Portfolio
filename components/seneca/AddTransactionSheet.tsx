// @ts-nocheck
"use client";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, X } from "lucide-react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import {
  DIALOG_SPRING,
  EASE_OUT,
  FADE,
  LAYOUT_SPRING,
  TAP,
  TAP_TRANSITION,
} from "@/lib/seneca/constants/motion";
import Sheet from "./Sheet";
import Num from "./Num";
import AdminSelect from "@/app/admin/ui/AdminSelect";
import { Calendar } from "@/app/components/kit/inputs/calendar";
import { getPhDateKey } from "@/lib/seneca/utils/timeUtils";
import { SPENDING_CATEGORIES, adjustAmount } from "@/lib/seneca/utils/wealthPlanning";

// Step-to-step slide inside the sheet
const STEP_MOTION = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: FADE,
};

// iOS-style Selection Row
const SelectionRow = ({
  icon,
  label,
  sublabel,
  isSelected,
  onClick,
  color = "text-ink",
}) => (
  <motion.button
    type="button"
    onClick={onClick}
    whileTap={{ backgroundColor: "rgba(0,0,0,0.04)" }}
    className="w-full flex items-center p-4 border-b border-separator last:border-b-0"
  >
    <div
      className={clsx(
        "w-10 h-10 rounded-full flex items-center justify-center text-body mr-3 shrink-0",
        isSelected ? "bg-accent/10" : "bg-fill",
      )}
    >
      {icon}
    </div>
    <div className="flex-1 text-left">
      <p className={clsx("text-callout font-semibold", color)}>{label}</p>
      {sublabel && (
        <p className="text-footnote text-ink-2">{sublabel}</p>
      )}
    </div>
    {isSelected && <Check size={20} className="text-accent" />}
  </motion.button>
);

// Number Pad Component
const NumberPad = ({ value, onChange, onClear, maxLength = 10 }) => {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  const [holding, setHolding] = useState(false);

  const handlePress = (key) => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    if (key === "⌫") {
      onChange(value.slice(0, -1));
    } else if (key === ".") {
      if (!value.includes(".")) {
        onChange(value + key);
      }
    } else {
      if (value.includes('.') && value.split('.')[1].length >= 2) return;
      if (value.length < maxLength) {
        if (value === "0" && key !== ".") {
          onChange(key);
        } else {
          onChange(value + key);
        }
      }
    }
  };

  const handlePointerDown = (key) => {
    if (key === "⌫") {
      isLongPress.current = false;
      setHolding(true);
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        setHolding(false);
        onClear && onClear();
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    }
  };

  const handlePointerUp = () => {
    setHolding(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {keys.map((key) => (
        <motion.button
          key={key}
          type="button"
          aria-label={key === "⌫" ? "Delete (hold to clear)" : key === "." ? "Decimal point" : key}
          whileTap={{ ...TAP, backgroundColor: "rgba(0,0,0,0.1)" }}
          transition={TAP_TRANSITION}
          onClick={() => handlePress(key)}
          onPointerDown={() => handlePointerDown(key)}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative overflow-hidden h-12 rounded-xl bg-fill text-title-2 font-semibold text-ink flex items-center justify-center select-none"
          style={{ touchAction: "manipulation" }}
        >
          {key === "⌫" && (
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-negative/20 rounded-[inherit] pointer-events-none"
              style={{
                clipPath: holding ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
                transition: holding
                  ? "clip-path 500ms linear"
                  : "clip-path 200ms var(--ease-out)",
              }}
            />
          )}
          <span className="relative">{key}</span>
        </motion.button>
      ))}
    </div>
  );
};

// Animated Height Container
const AnimatedHeight = ({ children, className }) => {
  const containerRef = useRef(null);
  const [height, setHeight] = useState("auto");

  useLayoutEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setHeight(entry.contentRect.height);
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  return (
    <motion.div
      animate={{ height }}
      transition={LAYOUT_SPRING}
      className={clsx("overflow-hidden", className)}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};

export default function AddTransactionSheet({
  isOpen,
  visible,
  onClose,
  currentCategory = "All Assets",
  savingsAccounts = [],
  investmentAccounts = [],
  liabilities = [],
  accounts = [],
  onAddTransaction,
  onAdd,
}) {
  const isSheetOpen = isOpen ?? visible ?? false;
  const handleAddTransaction = onAddTransaction ?? onAdd ?? (() => {});
  const haptic = useWebHaptics();

  const derivedSavingsAccounts =
    savingsAccounts.length > 0
      ? savingsAccounts
      : accounts.filter((a) => a.category === "Savings");
  const derivedInvestmentAccounts =
    investmentAccounts.length > 0
      ? investmentAccounts
      : accounts.filter((a) => a.category === "Investments");

  const [step, setStep] = useState("type");
  const [transactionType, setTransactionType] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [paymentSource, setPaymentSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [spendingCategory, setSpendingCategory] = useState("Other");
  const [transactionDate, setTransactionDate] = useState(getPhDateKey());
  const [choosingDate, setChoosingDate] = useState(false);

  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Paste Modal State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  const closeTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  useEffect(() => {
    if (isSheetOpen) {
      if (currentCategory === "Savings") {
        setTransactionType("savings");
        setStep("account");
      } else if (currentCategory === "Investments") {
        setTransactionType("investment");
        setStep("account");
      } else if (currentCategory === "Liabilities") {
        setTransactionType("liability");
        setStep("account");
      } else {
        setTransactionType(null);
        setStep("type");
      }
      setSelectedAccount(null);
      setAmount("");
      setNote("");
      setSpendingCategory("Other");
      setTransactionDate(getPhDateKey());
      setChoosingDate(false);
      setLocation(null);
      setLocationName("");
    }
  }, [isSheetOpen, currentCategory]);

  // Auto-fetch location removed to support Safari's user-gesture requirement.
  // User must tap the button manually.

  const getLocation = async () => {
    if (!navigator.geolocation) {
      setLocationName("Location not available");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          );
          const data = await response.json();
          const address = data.address;
          const shortLocation =
            address?.suburb ||
            address?.neighbourhood ||
            address?.city_district ||
            address?.city ||
            address?.town ||
            "Unknown";
          const city =
            address?.city || address?.town || address?.municipality || "";
          setLocationName(city ? `${shortLocation}, ${city}` : shortLocation);
        } catch {
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setIsGettingLocation(false);
      },
      () => {
        setLocationName("Location access denied. Tap to retry ↻");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleTypeSelect = (type) => {
    haptic.trigger("selection");
    setTransactionType(type);
    setStep("account");
  };

  const handleAccountSelect = (account) => {
    haptic.trigger("selection");
    setSelectedAccount(account);
    setStep("amount");
  };

  const handleQuickAdd = (value) => {
    setAmount(current=>adjustAmount(current,value));
  };

  const processText = (text) => {
    if (!text) return;
    const clean = text.replace(/,/g, "");
    const match = clean.match(/[\d]*\.?[\d]+/);
    if (match && Number.isFinite(Number(match[0])) && Number(match[0])<=999999999.99) setAmount(Number(match[0]).toFixed(2));
  };

  const handlePaste = async () => {
    try {
      // Try standard Clipboard API (works on HTTPS/Localhost)
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        processText(text);
      } else {
        throw new Error("Clipboard unavailable");
      }
    } catch {
      // Fallback: Open custom modal
      setPasteValue("");
      setShowPasteModal(true);
    }
  };

  const confirmPaste = () => {
    processText(pasteValue);
    setShowPasteModal(false);
  };

  const handleClearAmount = () => {
    setAmount("");
  };

  const handleSubmit = async () => {
    if(saving) return;
    setSaveError("");
    const cashSource = [...derivedSavingsAccounts, ...derivedInvestmentAccounts].find(a => String(a.id) === paymentSource && !a.archived);
    if (transactionType === "liability" && !cashSource) {
      setSaveError("Choose the account paying this debt.");
      return;
    }
    if (!selectedAccount || !amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount)>999999999.99 || ((transactionType==='expense' || transactionType==='liability') && Number(amount)>Number(selectedAccount.amount))) {
      haptic.trigger("error");
      return;
    }

    const transaction = {
      id: Date.now(),
      date: transactionDate===getPhDateKey() ? new Date().toISOString() : new Date(`${transactionDate}T12:00:00+08:00`).toISOString(),
      type: transactionType === "expense" ? "withdrawal" : transactionType === "liability" ? "payment" : "deposit",
      ...(transactionType === "expense" ? {spendingCategory} : {}),
      accountId: selectedAccount.id,
      ...(transactionType === "liability" ? {destinationId: cashSource.id} : {}),
      bank: selectedAccount.name,
      location: locationName || "Unknown Location",
      gps: location,
      amount: Math.round(Number(amount)*100)/100,
      note: note || null,
      category:
        transactionType === "expense" ? selectedAccount.category : transactionType === "savings"
          ? "Savings"
          : transactionType === "investment"
            ? "Investments"
            : transactionType === "liability"
              ? "Liabilities"
              : transactionType,
    };

    setSaving(true);
    try { await handleAddTransaction(transaction); } catch(error) {setSaveError(error.message || "Could not save. Please retry.");setSaving(false);return;}
    setSaving(false);
    haptic.trigger("success");
    setStep("success");

    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 1500);
  };

  const getAccountsForType = () => {
    switch (transactionType) {
      case "expense":
        return [...derivedSavingsAccounts, ...derivedInvestmentAccounts].filter(a => !a.archived);
      case "savings":
        return derivedSavingsAccounts.filter(a=>!a.archived);
      case "investment":
        return derivedInvestmentAccounts.filter(a=>!a.archived);
      case "liability":
        return liabilities.filter(a=>!a.archived);
      default:
        return [];
    }
  };

  const getTitle = () => {
    if (step === "type") return "Add Transaction";
    if (step === "account") {
      if (transactionType === "expense") return "Expense from which account?";
      if (transactionType === "liability") return "Pay Liability";
      return `Add to ${
        transactionType === "savings" ? "Savings" : "Investment"
      }`;
    }
    if (step === "amount") {
      if (transactionType === "expense") return `Expense from ${selectedAccount?.name}`;
      if (transactionType === "liability")
        return `Pay ${selectedAccount?.name}`;
      return `Add to ${selectedAccount?.name}`;
    }
    if (step === "success") return "Complete";
    return "Add Transaction";
  };

  const canGoBack = () => {
    if (step === "type") return false;

    return true;
  };

  const handleBack = () => {
    if (step === "amount") setStep("account");
    else if (step === "account") setStep("type");
  };

  return (
    <>
    <Sheet
      open={isSheetOpen}
      onClose={() => { haptic.trigger("medium"); onClose(); }}
      zIndex={400}
      label="New transaction"
      className="fixed inset-x-0 bottom-0 bg-surface rounded-t-sheet overflow-hidden max-h-[90vh]"
    >
        {/* Handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          onClick={() => { haptic.trigger("medium"); onClose(); }}
        >
          <div className="w-12 h-1.5 rounded-full bg-ink-3" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-separator">
          <div className="w-12">
            {canGoBack() && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={FADE}
                whileTap={TAP}
                onClick={handleBack}
                className="text-body text-accent font-medium"
              >
                Back
              </motion.button>
            )}
          </div>
          <motion.h2
            key={step + transactionType}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={FADE}
            className="text-body font-semibold text-ink"
          >
            {getTitle()}
          </motion.h2>
          <motion.button
            whileTap={TAP}
            transition={TAP_TRANSITION}
            aria-label="Close"
            onClick={() => { haptic.trigger("medium"); onClose(); }}
            className="w-8 h-8 rounded-full bg-fill flex items-center justify-center"
          >
            <X size={18} className="text-ink-2" />
          </motion.button>
        </div>

        {/* Content with animated height */}
        <AnimatedHeight>
          <AnimatePresence mode="wait" initial={false}>
            {/* Step 1: Select Type */}
            {step === "type" && (
              <motion.div
                key="type"
                {...STEP_MOTION}
                className="p-5"
              >
                <p className="text-subhead text-ink-2 mb-4">
                  What type of transaction would you like to add?
                </p>

                <div className="bg-surface rounded-xl border border-separator overflow-hidden">
                  <SelectionRow icon="↗" label="Record expense" sublabel="Track spending by category" onClick={() => handleTypeSelect("expense")} />
                  <SelectionRow
                    icon="💰"
                    label="Add to Savings"
                    sublabel="Deposit to Maya Bank or GCash"
                    onClick={() => handleTypeSelect("savings")}
                  />
                  <SelectionRow
                    icon="📈"
                    label="Add to Investment"
                    sublabel="Deposit to Trading212 or other"
                    onClick={() => handleTypeSelect("investment")}
                  />
                  <SelectionRow
                    icon="💸"
                    label="Pay Liability"
                    sublabel="Make a payment towards a debt"
                    color="text-negative"
                    onClick={() => handleTypeSelect("liability")}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Select Account */}
            {step === "account" && (
              <motion.div
                key="account"
                {...STEP_MOTION}
                className="p-5"
              >
                <p className="text-subhead text-ink-2 mb-4">
                  {transactionType === "liability"
                    ? "Select which liability to pay:"
                    : transactionType === "expense" ? "Select the account you spent from:" : "Select account to add funds:"}
                </p>

                <div className="bg-surface rounded-xl border border-separator overflow-hidden">
                  {getAccountsForType().length === 0 && <p className="p-5 text-sm text-ink-2">No eligible accounts yet. Add an account in Wealth first.</p>}
                  {getAccountsForType().map((account) => (
                    <SelectionRow
                      key={account.id}
                      icon={account.icon}
                      label={account.name}
                      sublabel={
                        transactionType === "liability"
                          ? `Outstanding: ₱${account.amount.toLocaleString()}`
                          : account.platform
                      }
                      isSelected={selectedAccount?.id === account.id}
                      onClick={() => handleAccountSelect(account)}
                      color={
                        transactionType === "liability"
                          ? "text-negative"
                          : "text-ink"
                      }
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Enter Amount */}
            {step === "amount" && (
              <motion.div
                key="amount"
                {...STEP_MOTION}
                className="flex flex-col"
              >
                {/* Amount Display */}
                <div className="text-center py-5 px-5">
                  <p className="text-footnote text-ink-2 mb-1">
                    {transactionType === "liability"
                      ? "Payment amount"
                      : transactionType === "expense" ? "Expense amount" : "Deposit amount"}
                  </p>
                  <div className="flex items-center justify-center">
                    <span
                      className={clsx(
                        "font-bold tabular-nums select-none text-[clamp(24px,6vw,48px)]",
                        transactionType === "liability"
                          ? "text-negative"
                          : "text-positive",
                      )}
                    >
                      <Num value={Number(amount)||0} prefix={transactionType==='expense'||transactionType==='liability' ? '−₱' : '+₱'} suffix={amount.endsWith('.') ? '.' : undefined} format={{maximumFractionDigits:2,minimumFractionDigits:Math.min(2,amount.split('.')[1]?.length||0)}} />
                    </span>
                  </div>
                  {transactionType === "liability" && selectedAccount && (
                    <p className="text-subhead text-ink-2 mt-1 tabular-nums">
                      Remaining: <Num value={Math.max(0, selectedAccount.amount - (Number(amount) || 0))} prefix="₱" />
                    </p>
                  )}
                </div>

                {/* Location & Note */}
                <div className="px-5 space-y-2 mb-2">
                  {transactionType==='liability' && <AdminSelect popupZIndex={410} label="Pay from" value={paymentSource} onValueChange={setPaymentSource} options={[...derivedSavingsAccounts,...derivedInvestmentAccounts].filter(a=>!a.archived).map(a=>({value:String(a.id),label:a.name}))} />}
                  {transactionType==='expense' && <AdminSelect popupZIndex={410} label="Spending category" value={spendingCategory} onValueChange={setSpendingCategory} options={SPENDING_CATEGORIES.map(value=>({value,label:value}))} />}
                  <button type="button" className="sn-btn sn-btn-outline sn-btn-block" aria-expanded={choosingDate} onClick={()=>setChoosingDate(!choosingDate)}>Transaction date: {transactionDate}</button>
                  {choosingDate && <div className="sn-goal-calendar"><Calendar mode="single" selected={new Date(`${transactionDate}T12:00:00`)} disabled={{after:new Date()}} onSelect={date=>{if(date){setTransactionDate(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);setChoosingDate(false);}}} /></div>}
                  <button
                    type="button"
                    onClick={getLocation}
                    className="w-full text-left flex items-center gap-2 px-4 py-2.5 bg-fill rounded-xl cursor-pointer active:scale-[0.96] transition-transform duration-150 ease-out"
                  >
                    {isGettingLocation ? (
                      <Loader2
                        size={14}
                        className="text-accent animate-spin"
                      />
                    ) : (
                      <MapPin size={14} className="text-accent" />
                    )}
                    <span className="text-subhead text-ink-2">
                      {isGettingLocation
                        ? "Getting location..."
                        : locationName || "Tap to add location (Optional)"}
                    </span>
                  </button>

                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note (optional)"
                    className="w-full px-4 py-2.5 bg-fill rounded-xl text-subhead text-ink placeholder:text-ink-3 outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>

                <div className="px-5 mb-2">
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 no-scrollbar">
                    <motion.button
                      whileTap={TAP}
                      transition={TAP_TRANSITION}
                      onClick={handlePaste}
                      className="sn-btn sn-btn-outline shrink-0" data-sound="tick"
                    >
                      Paste
                    </motion.button>
                    {[-100, -10, 10, 50, 100, 1000].map((val) => (
                      <motion.button
                        key={val}
                        whileTap={TAP}
                        transition={TAP_TRANSITION}
                        onClick={() => handleQuickAdd(val)}
                        className="sn-btn sn-btn-outline shrink-0" data-sound="tick"
                      >
                        {val>0 ? '+' : '−'}{Math.abs(val).toLocaleString()}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Number Pad */}
                <NumberPad
                  value={amount}
                  onChange={setAmount}
                  onClear={handleClearAmount}
                />

                {(transactionType==='expense'||transactionType==='liability') && Number(amount)>Number(selectedAccount?.amount) && <p role="alert" className="px-5 text-negative text-sm">Amount exceeds the {transactionType==='expense'?'available balance':'outstanding debt'}.</p>}
                {saveError && <p role="alert" className="px-5 text-negative text-sm">{saveError}</p>}
                {/* Submit Button */}
                <div className="px-5 pb-8 pt-2">
                  <motion.button
                    whileTap={TAP}
                    transition={TAP_TRANSITION}
                    onClick={handleSubmit}
                    disabled={saving || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || ((transactionType === "expense" || transactionType === "liability") && Number(amount) > Number(selectedAccount?.amount))}
                    className="sn-btn sn-btn-primary sn-btn-block"
                  >
                    {transactionType === "expense" ? "Record expense" : transactionType === "liability"
                      ? "Confirm Payment"
                      : "Add Funds"}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className="p-10 flex flex-col items-center justify-center text-center min-h-[300px]"
              >
                <div className="w-24 h-24 bg-positive rounded-full flex items-center justify-center mb-6 shadow-float">
                  <motion.svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: 0.4,
                      ease: EASE_OUT,
                      delay: 0.1,
                    }}
                  >
                    <motion.path d="M20 6L9 17l-5-5" />
                  </motion.svg>
                </div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.15 }}
                  className="text-title-2 font-bold text-ink mb-2"
                >
                  {transactionType === "liability"
                    ? "Payment recorded"
                    : transactionType === "expense" ? "Expense recorded" : "Funds added"}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.2 }}
                  className="text-body text-ink-2 font-medium"
                >
                  {transactionType === "liability"
                    ? `Successfully paid ₱${parseFloat(
                        amount,
                      ).toLocaleString()}`
                    : `${transactionType === "expense" ? "Recorded expense of" : "Deposited"} ₱${parseFloat(
                        amount,
                      ).toLocaleString()}`}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatedHeight>
    </Sheet>

    {/* Custom Paste Modal — own AnimatePresence so its exit actually plays */}
    <AnimatePresence>
      {showPasteModal && (
        <motion.div
          key="paste-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={FADE}
          className="fixed inset-0 z-[500] flex items-center justify-center p-5"
        >
          <div
            onClick={() => setShowPasteModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            transition={DIALOG_SPRING}
            className="relative bg-surface w-full max-w-xs rounded-2xl p-5 shadow-float space-y-4"
          >
            <div className="text-center">
              <h3 className="text-body font-semibold mb-1">Paste Amount</h3>
              <p className="text-footnote text-ink-2">
                Enter or paste the amount below
              </p>
            </div>
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              className="w-full bg-fill rounded-xl px-4 py-3 text-center text-body font-semibold outline-none focus:ring-2 focus:ring-accent transition-shadow duration-150"
              placeholder="0.00"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="flex-1 py-2.5 rounded-xl font-medium bg-fill text-ink-2 active:scale-[0.96] transition-transform duration-150 ease-out"
              >
                Cancel
              </button>
              <button
                onClick={confirmPaste}
                className="flex-1 py-2.5 rounded-xl font-semibold bg-accent text-white active:scale-[0.96] transition-transform duration-150 ease-out"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

