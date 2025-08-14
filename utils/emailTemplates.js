
function buildExpirationReminderEmail({ discente, assignment, course, daysLeft }) {
  const fullName = `${discente?.nome || ''} ${discente?.cognome || ''}`.trim();
  const courseName = course?.tipologia?.type || assignment?.courseName || 'Corso';

  const subject =
    daysLeft > 0
      ? `Promemoria: il tuo certificato ${courseName} scade tra ${daysLeft} giorni`
      : `Attenzione: il tuo certificato ${courseName} è scaduto`;

  const lines = [
    `Ciao ${fullName || 'Studente'},`,
    daysLeft > 0
      ? `il tuo certificato per il corso "${courseName}" scadrà tra ${daysLeft} giorni.`
      : `il tuo certificato per il corso "${courseName}" è appena scaduto.`,
    'Ti invitiamo ad aggiornare il corso per mantenere la validità.',
    '',
    'Cordiali saluti,',
    'Team Sirioform',
  ];

  return {
    subject,
    text: lines.join('\n'),
  };
}

module.exports = { buildExpirationReminderEmail };