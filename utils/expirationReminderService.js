const Discente = require('../models/Discente');
const Course = require('../models/Course');
const { sendEmail } = require('./emailService');
const { buildExpirationReminderEmail } = require('./emailTemplates');

const DEFAULT_DAYS = [60, 30, 7, 0];

function getDaysConfig() {
  const raw = process.env.REMINDER_DAYS;
  if (!raw) return DEFAULT_DAYS;
  return raw
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => b - a);
}

function daysBetween(now, target) {
  const t = new Date(target);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  const ms = end - start;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

async function runExpirationReminderJob() {
  const daysList = getDaysConfig();
  const now = new Date();

  // Load Discenti that have at least one expiring assignment
  const discenti = await Discente.find({
    'kitAssignments.expirationDate': { $ne: null },
  }).populate('kitAssignments.courseId');

  for (const discente of discenti) {
    if (!discente.kitAssignments || discente.kitAssignments.length === 0) continue;

    let dirty = false;

    for (const assignment of discente.kitAssignments) {
      if (!assignment.expirationDate) continue;

      const daysLeft = daysBetween(now, assignment.expirationDate);
      if (!daysList.includes(daysLeft)) continue;

      const key = String(daysLeft);
      if (!assignment.remindersSent) assignment.remindersSent = new Map();
      if (assignment.remindersSent.get(key)) continue; // already sent

      const course =
        assignment.courseId && typeof assignment.courseId === 'object' ? assignment.courseId : null;

      const { subject, text } = buildExpirationReminderEmail({
        discente,
        assignment,
        course,
        daysLeft,
      });

      try {
        await sendEmail({
          to: discente.email,
          subject,
          text,
        });
        assignment.remindersSent.set(key, new Date());
        dirty = true;
      } catch (err) {
        console.error('[reminder] Failed to send email:', err.message);
      }
    }

    if (dirty) {
      try {
        await discente.save();
      } catch (e) {
        console.error('[reminder] Failed to persist remindersSent:', e.message);
      }
    }
  }
}

module.exports = { runExpirationReminderJob };