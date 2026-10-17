import { db, AppNotification, Installment } from './db.ts';

export function runScheduledNotificationJob(): { generated: number; updatedStatusCount: number } {
  let generated = 0;
  let updatedStatusCount = 0;

  db.update((database) => {
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();
    const settings = database.settings;

    // Process APPOINTMENTS QUEUE
    if (database.appointments && database.appointments.length > 0) {
      database.appointments.forEach((apt) => {
        const remaining = Math.max(0, apt.requiredAmount - (apt.paidAmount || 0));
        apt.remainingAmount = remaining;

        // 1. Auto-update status if not manually resolved
        if (remaining <= 0) {
          if (apt.status !== 'paid') {
            apt.status = 'paid';
            updatedStatusCount++;
          }
        } else if (apt.status !== 'postponed' && apt.status !== 'no_answer' && apt.status !== 'phone_off' && apt.status !== 'refused' && apt.status !== 'referred_to_guarantor') {
          if (apt.appointmentDate < today) {
            if (apt.status !== 'overdue') {
              apt.status = 'overdue';
              updatedStatusCount++;
            }
          } else if (apt.appointmentDate === today) {
            if (apt.status !== 'today') {
              apt.status = 'today';
              updatedStatusCount++;
            }
          } else {
            if (apt.status !== 'waiting') {
              apt.status = 'waiting';
              updatedStatusCount++;
            }
          }
        }

        // 2. Check SCHEDULED ALERTS
        if (apt.scheduledAlert && !apt.scheduledAlert.isTriggered) {
          const alertTime = new Date(apt.scheduledAlert.scheduledAt).getTime();
          if (alertTime <= now) {
            apt.scheduledAlert.isTriggered = true;
            apt.scheduledAlert.triggeredAt = new Date().toISOString();

            const alertTitle = apt.scheduledAlert.note || `🔔 تنبيه موعد: ${apt.clientName}`;
            const alertMsg = `حان موعد التنبيه المجدول لموعد ${apt.clientName}. المبلغ المطلوب: ${apt.requiredAmount.toLocaleString()} ${settings.currency}. ${apt.guarantorName ? `الكفيل: ${apt.guarantorName} (${apt.guarantorPhone})` : ''}`;

            database.notifications.unshift({
              id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              type: 'scheduled_alert',
              appointmentId: apt.id,
              clientName: apt.clientName,
              clientPhone: apt.clientPhone,
              guarantorName: apt.guarantorName,
              guarantorPhone: apt.guarantorPhone,
              amount: remaining,
              dueDate: apt.appointmentDate,
              title: alertTitle,
              message: alertMsg,
              isRead: false,
              scheduledFor: apt.scheduledAlert.scheduledAt,
              createdAt: new Date().toISOString(),
            });
            generated++;
          }
        }

        // 3. Auto-notify for due today or overdue
        if (remaining > 0 && apt.status === 'today') {
          const existing = database.notifications.find(
            (n) => n.appointmentId === apt.id && n.type === 'due_today' && n.createdAt.startsWith(today)
          );
          if (!existing) {
            database.notifications.unshift({
              id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
              type: 'due_today',
              appointmentId: apt.id,
              clientName: apt.clientName,
              clientPhone: apt.clientPhone,
              guarantorName: apt.guarantorName,
              guarantorPhone: apt.guarantorPhone,
              amount: remaining,
              dueDate: apt.appointmentDate,
              title: 'موعد اليوم في الطابور!',
              message: `موعد الزبون ${apt.clientName} يحل اليوم. المبلغ المطلوب: ${remaining.toLocaleString()} ${settings.currency}. الكفيل: ${apt.guarantorName}.`,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
            generated++;
          }
        }
      });
    }

    database.settings.lastCronCheck = new Date().toISOString();
  });

  return { generated, updatedStatusCount };
}

let intervalTimer: NodeJS.Timeout | null = null;

export function initCronService(intervalMinutes: number = 10) {
  // Run immediately on boot
  try {
    const res = runScheduledNotificationJob();
    console.log(`[Cron] Initialized notification service. Generated: ${res.generated}, Updated statuses: ${res.updatedStatusCount}`);
  } catch (err) {
    console.error('[Cron] Error running initial job:', err);
  }

  // Clear any existing
  if (intervalTimer) clearInterval(intervalTimer);

  // Set recurring interval
  const ms = Math.max(1, intervalMinutes) * 60 * 1000;
  intervalTimer = setInterval(() => {
    try {
      const res = runScheduledNotificationJob();
      if (res.generated > 0 || res.updatedStatusCount > 0) {
        console.log(`[Cron] Scheduled check completed. Generated: ${res.generated}, Updated: ${res.updatedStatusCount}`);
      }
    } catch (err) {
      console.error('[Cron] Error running recurring job:', err);
    }
  }, ms);
}
