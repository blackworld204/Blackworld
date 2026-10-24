"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { DayPicker, useDayPicker, type Matcher, type MonthGridProps } from "react-day-picker";
import "react-day-picker/style.css";
import { useI18n } from "@/i18n/provider";
import { localeById } from "@/i18n/locales";
import { localeTag } from "@/lib/bank";

type PickState = {
  pick: (value: string) => void;
  value: string;
  tag: string;
};

const PickContext = createContext<PickState>({
  pick: () => {},
  value: "",
  tag: "en",
});

function parseDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
}

function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseExpiry(value: string) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return undefined;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return undefined;
  return { month, year, token: value };
}

function calendarTag(locale: string) {
  const mapped = locale === "zh" ? "zh-Hans" : locale;
  try {
    const [supported] = Intl.DateTimeFormat.supportedLocalesOf([mapped]);
    if (supported) return supported;
  } catch {
    /* Use the mapped tag the rest of the app already formats with. */
  }
  return localeTag(locale);
}

function weekStartsOn(tag: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  try {
    const locale = new Intl.Locale(tag);
    const week = "getWeekInfo" in locale && typeof locale.getWeekInfo === "function" ? locale.getWeekInfo() : undefined;
    const first = week?.firstDay;
    if (first === 7) return 0;
    if (first === 1 || first === 2 || first === 3 || first === 4 || first === 5 || first === 6) return first;
  } catch {
    return 0;
  }
  return 0;
}

function Caret({ forward = false }: { forward?: boolean }) {
  return (
    <svg className={forward ? "date-caret is-forward" : "date-caret"} viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M4 2.2 7.8 6 4 9.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MonthBoard(_props: MonthGridProps) {
  const { pick, value, tag } = useContext(PickContext);
  const { t } = useI18n();
  const { months, goToMonth } = useDayPicker();
  const shown = months[0]?.date ?? new Date();
  const year = shown.getFullYear();
  const selected = parseExpiry(value);
  const names = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(tag, { month: "short" }).format(new Date(year, month, 1)),
  );

  return (
    <div className="date-board">
      <div className="date-year">
        <button type="button" aria-label={t("Previous year")} disabled={year <= 2000} onClick={() => goToMonth(new Date(year - 1, 0, 1))}>
          <Caret />
        </button>
        <span>{new Intl.DateTimeFormat(tag, { year: "numeric" }).format(shown)}</span>
        <button type="button" aria-label={t("Next year")} disabled={year >= 2099} onClick={() => goToMonth(new Date(year + 1, 0, 1))}>
          <Caret forward />
        </button>
      </div>
      <div className="date-months" role="listbox" aria-label={t("Expiry")}>
        {names.map((name, index) => {
          const token = `${String(index + 1).padStart(2, "0")}/${String(year).slice(-2)}`;
          const pressed = selected?.token === token;
          return (
            <button key={token} type="button" role="option" aria-selected={pressed} onClick={() => pick(token)}>
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateSelect({
  value,
  onChange,
  min,
  max,
  kind = "day",
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  kind?: "day" | "month";
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [lift, setLift] = useState(false);
  const [view, setView] = useState<Date>(() => new Date());
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popId = useId();
  const tag = calendarTag(locale);
  const selected = kind === "day" ? parseDay(value) : undefined;
  const minDate = min ? parseDay(min) : undefined;
  const maxDate = max ? parseDay(max) : undefined;
  const shown =
    kind === "month"
      ? value || t("MM/YY")
      : selected
        ? new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(selected)
        : t("Choose a date");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  function toggle() {
    if (!open && root.current) {
      const rect = root.current.getBoundingClientRect();
      setLift(rect.bottom + 360 > window.innerHeight && rect.top > 360);
      if (kind === "month") {
        const expiry = parseExpiry(value);
        setView(expiry ? new Date(expiry.year, expiry.month - 1, 1) : new Date());
      } else {
        setView(selected ?? minDate ?? new Date());
      }
    }
    setOpen((next) => !next);
  }

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  }

  const disabled: Matcher[] = [];
  if (minDate) disabled.push({ before: minDate });
  if (maxDate) disabled.push({ after: maxDate });

  return (
    <div className="date-select" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="date-select-button"
        data-empty={value ? undefined : "true"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popId}
        onClick={toggle}
      >
        {shown}
      </button>
      {open ? (
        <div id={popId} className={`date-select-pop${lift ? " is-up" : ""}`} role="dialog" aria-label={shown}>
          <PickContext.Provider value={{ pick, value, tag }}>
            {kind === "month" ? (
              <DayPicker
                mode="single"
                className="date-select-month"
                month={view}
                onMonthChange={setView}
                startMonth={new Date(2000, 0)}
                endMonth={new Date(2099, 11)}
                hideNavigation
                hideWeekdays
                components={{ MonthGrid: MonthBoard }}
                dir={localeById(locale).dir}
                lang={tag}
              />
            ) : (
              <DayPicker
                mode="single"
                required
                autoFocus
                animate={false}
                navLayout="around"
                showOutsideDays
                fixedWeeks
                month={view}
                onMonthChange={setView}
                selected={selected}
                onSelect={(date) => {
                  if (date) pick(dayKey(date));
                }}
                disabled={disabled.length ? disabled : undefined}
                startMonth={minDate}
                endMonth={maxDate}
                weekStartsOn={weekStartsOn(tag)}
                dir={localeById(locale).dir}
                lang={tag}
                formatters={{
                  formatCaption: (month) => new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }).format(month),
                  formatWeekdayName: (weekday) => new Intl.DateTimeFormat(tag, { weekday: "narrow" }).format(weekday),
                  formatDay: (day) => new Intl.NumberFormat(tag).format(day.getDate()),
                }}
                labels={{
                  labelPrevious: () => t("Previous month"),
                  labelNext: () => t("Next month"),
                  labelWeekday: (weekday) => new Intl.DateTimeFormat(tag, { weekday: "long" }).format(weekday),
                  labelDayButton: (day) =>
                    new Intl.DateTimeFormat(tag, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(day),
                  labelGrid: (month) => new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }).format(month),
                }}
              />
            )}
          </PickContext.Provider>
        </div>
      ) : null}
    </div>
  );
}
