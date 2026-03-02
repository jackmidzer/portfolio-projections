import { Flame, PartyPopper } from 'lucide-react';
import { useProjectionStore } from '@/store/useProjectionStore';

interface Countdown {
  years: number;
  months: number;
  achieved: boolean;
}

function calculateFIRECountdown(dateOfBirth: string, fireAge: number | ''): Countdown | null {
  if (!dateOfBirth || fireAge === '' || fireAge <= 0) return null;

  const today = new Date();
  const birth = new Date(dateOfBirth);
  if (isNaN(birth.getTime())) return null;

  const fireDate = new Date(birth.getFullYear() + fireAge, birth.getMonth(), birth.getDate());

  if (fireDate <= today) {
    return { years: 0, months: 0, achieved: true };
  }

  let years = fireDate.getFullYear() - today.getFullYear();
  let months = fireDate.getMonth() - today.getMonth();

  if (fireDate.getDate() < today.getDate()) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, achieved: false };
}

export function FIRECountdown() {
  const dateOfBirth = useProjectionStore(s => s.dateOfBirth);
  const fireAge = useProjectionStore(s => s.fireAge);

  const countdown = calculateFIRECountdown(dateOfBirth, fireAge);
  if (!countdown) return null;

  if (countdown.achieved) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
        <PartyPopper className="h-6 w-6 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 leading-none">
            FIRE achieved!
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            You've reached your financial independence age.
          </p>
        </div>
      </div>
    );
  }

  const parts: string[] = [];
  if (countdown.years > 0) parts.push(`${countdown.years} year${countdown.years !== 1 ? 's' : ''}`);
  if (countdown.months > 0) parts.push(`${countdown.months} month${countdown.months !== 1 ? 's' : ''}`);
  const label = parts.length > 0 ? parts.join(', ') : 'less than a month';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-4">
      <Flame className="h-6 w-6 text-orange-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground leading-none mb-1">Time to FIRE</p>
        <p className="text-base font-bold tabular-nums text-orange-600 dark:text-orange-400 leading-none">
          {label}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground leading-none mb-1">FIRE age</p>
        <p className="text-base font-bold tabular-nums leading-none">{fireAge}</p>
      </div>
    </div>
  );
}
