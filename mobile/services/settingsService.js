import * as SecureStore from 'expo-secure-store';

const REMINDER_KEY = 'reminderMinutes';
const NOTIFICATIONS_KEY = 'notificationsEnabled';

const getReminderMinutes = async () => {
  const v = await SecureStore.getItemAsync(REMINDER_KEY);
  if (!v) return 30;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 30;
};

const setReminderMinutes = async (minutes) => {
  await SecureStore.setItemAsync(REMINDER_KEY, String(minutes));
};

const getNotificationsEnabled = async () => {
  const v = await SecureStore.getItemAsync(NOTIFICATIONS_KEY);
  if (!v) return true;
  return v === 'true';
};

const setNotificationsEnabled = async (enabled) => {
  await SecureStore.setItemAsync(NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
};

export default { getReminderMinutes, setReminderMinutes, getNotificationsEnabled, setNotificationsEnabled };
