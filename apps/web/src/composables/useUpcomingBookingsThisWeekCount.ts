import { ref } from "vue";
import { ApiError, api } from "../api";

type BookingRow = {
  starts_at: string;
};

const upcomingBookingsCount = ref<number | null>(null);
const loadingUpcomingBookings = ref(false);
const upcomingBookingsError = ref<string | null>(null);

let pendingRequest: Promise<void> | null = null;

function getNextLocalMondayStart(now: Date): Date {
  const nextMonday = new Date(now);
  const daysUntilNextMonday = (8 - now.getDay()) % 7 || 7;
  nextMonday.setDate(now.getDate() + daysUntilNextMonday);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
}

async function loadUpcomingBookingsThisWeekCount(force = false): Promise<void> {
  if (pendingRequest) {
    return pendingRequest;
  }

  if (!force && upcomingBookingsCount.value !== null) {
    return;
  }

  loadingUpcomingBookings.value = true;
  upcomingBookingsError.value = null;

  pendingRequest = (async () => {
    try {
      const response = await api.get<{ bookings: BookingRow[] }>(
        "/book/list?status=confirmed",
      );
      const now = new Date();
      const nextMonday = getNextLocalMondayStart(now);
      upcomingBookingsCount.value = (response.bookings || []).filter(
        (booking) => {
          const startsAt = new Date(booking.starts_at);
          return startsAt >= now && startsAt < nextMonday;
        },
      ).length;
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 403 || err.status === 404)
      ) {
        upcomingBookingsCount.value = null;
        upcomingBookingsError.value = null;
        return;
      }

      upcomingBookingsCount.value = null;
      upcomingBookingsError.value =
        err instanceof Error ? err.message : "Failed to load bookings";
    } finally {
      loadingUpcomingBookings.value = false;
      pendingRequest = null;
    }
  })();

  return pendingRequest;
}

export function useUpcomingBookingsThisWeekCount() {
  return {
    upcomingBookingsCount,
    loadingUpcomingBookings,
    upcomingBookingsError,
    loadUpcomingBookingsThisWeekCount,
    refreshUpcomingBookingsThisWeekCount: () =>
      loadUpcomingBookingsThisWeekCount(true),
  };
}
