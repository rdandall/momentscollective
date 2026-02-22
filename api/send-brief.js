const { Resend } = require('resend');

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: 'America/New_York',
    });
  } catch {
    return isoString;
  }
}

function buildEmailHtml(brief, visitorName, visitorEmail) {
  const toneStr = Array.isArray(brief.tone) ? brief.tone.join(' · ') : brief.tone;
  const generatedAt = formatDate(brief.generatedAt);

  const row = (label, value) => value ? `
    <tr>
      <td style="padding: 10px 0; vertical-align: top; width: 160px; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #555; font-family: 'Courier New', monospace; border-top: 1px solid #1a1a1a;">${label}</td>
      <td style="padding: 10px 0; vertical-align: top; font-size: 13px; color: #cccccc; line-height: 1.6; font-family: 'Courier New', monospace; border-top: 1px solid #1a1a1a;">${value}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Brief — ${brief.projectTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #080808; font-family: 'Courier New', monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #080808; padding: 48px 24px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 32px; border-bottom: 1px solid #222;">
              <p style="margin: 0 0 4px 0; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; color: #444;">Moments Collective</p>
              <p style="margin: 0; font-size: 18px; letter-spacing: 0.08em; color: #ffffff;">Creative Brief Intake</p>
            </td>
          </tr>

          <!-- Project identity -->
          <tr>
            <td style="padding: 28px 0 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${row('Project', `<strong style="color: #ffffff; font-size: 15px;">${brief.projectTitle}</strong>`)}
                ${row('Type', brief.projectType)}
                ${row('Client / Brand', brief.clientBrand)}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 24px 0;"><hr style="border: none; border-top: 1px solid #1a1a1a; margin: 0;"></td></tr>

          <!-- Story & substance -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${row('Brand', brief.brandDescription)}
                ${row('The Story', brief.theStory)}
                ${row('Desired Outcome', brief.desiredOutcome)}
                ${row('Tone', toneStr)}
                ${row('Aesthetic References', brief.aestheticReferences)}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 24px 0;"><hr style="border: none; border-top: 1px solid #1a1a1a; margin: 0;"></td></tr>

          <!-- Logistics -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${row('Deliverables', brief.deliverables)}
                ${row('Timeline', brief.timeline)}
                ${row('Budget', brief.budgetRange)}
                ${row('Special Requirements', brief.specialRequirements || 'None mentioned')}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 24px 0;"><hr style="border: none; border-top: 1px solid #1a1a1a; margin: 0;"></td></tr>

          <!-- Producer note -->
          <tr>
            <td>
              <p style="margin: 0 0 8px 0; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: #444;">Producer's Note</p>
              <p style="margin: 0; font-size: 13px; color: #999999; line-height: 1.7; font-style: italic;">${brief.producerNote}</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 24px 0;"><hr style="border: none; border-top: 1px solid #1a1a1a; margin: 0;"></td></tr>

          <!-- Meta -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${row('Visitor Name', visitorName || 'Not provided')}
                ${row('Visitor Email', visitorEmail || 'Not provided')}
                ${row('Session ID', brief.sessionId)}
                ${row('Generated', generatedAt)}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 40px; border-top: 1px solid #1a1a1a; text-align: center;">
              <p style="margin: 0; font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; color: #333;">momentscollective.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { brief, visitorName, visitorEmail, sessionId } = req.body;

  if (!brief || !brief.projectTitle) {
    return res.status(400).json({ error: 'Valid brief object required' });
  }

  // Attach session ID if not already on the brief object
  if (!brief.sessionId) brief.sessionId = sessionId || 'unknown';
  if (!brief.generatedAt) brief.generatedAt = new Date().toISOString();

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = `New Creative Brief — ${brief.projectTitle} (${visitorName || brief.clientBrand || 'Unknown'})`;

    const emailPayload = {
      from: process.env.FROM_EMAIL || 'briefs@momentscollective.com',
      to: [process.env.ROB_EMAIL || 'rob@momentscollective.com'],
      subject,
      html: buildEmailHtml(brief, visitorName, visitorEmail),
    };

    if (visitorEmail && visitorEmail.includes('@')) {
      emailPayload.replyTo = visitorEmail;
    }

    const result = await resend.emails.send(emailPayload);

    return res.status(200).json({ ok: true, emailId: result.id });

  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
