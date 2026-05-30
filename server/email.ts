import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'mail.privateemail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || 'info@cardrop.app';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM = process.env.SMTP_FROM || 'CarDrop <info@cardrop.app>';

function createTransporter() {
  if (!SMTP_PASSWORD) {
    console.warn('[EMAIL] SMTP_PASSWORD nije podešen — slanje emailova onemogućeno');
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
    console.log(`[EMAIL] Poslat "${subject}" na ${to}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL GREŠKA] Nije moguće poslati "${subject}" na ${to}:`, err);
    return false;
  }
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CarDrop</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#1b4332;padding:24px 32px;">
            <h1 style="margin:0;color:#40916c;font-size:28px;letter-spacing:1px;">CarDrop</h1>
            <p style="margin:4px 0 0;color:#95d5b2;font-size:13px;">Pametno parkiranje u Novom Sadu</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background:#f4f4f4;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#888;font-size:12px;">
              CarDrop &bull; Novi Sad &bull;
              <a href="https://cardrop.app" style="color:#40916c;text-decoration:none;">cardrop.app</a>
            </p>
            <p style="margin:8px 0 0;color:#aaa;font-size:11px;">
              Pitanja? Piši nam na
              <a href="mailto:info@cardrop.app" style="color:#40916c;text-decoration:none;">info@cardrop.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function planLabel(plan: string): string {
  const labels: Record<string, string> = {
    premium: 'Map Hack Premium (30 dana)',
    godisnji_premium: 'Map Hack Godišnji Premium (365 dana)',
    day_pass: 'Map Hack Day Pass (24 sata)',
  };
  return labels[plan] || plan;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function sendMapHackPurchaseEmail(
  to: string,
  name: string,
  plan: string,
  expiresAt: Date,
): Promise<void> {
  const label = planLabel(plan);
  const expires = formatDate(expiresAt);
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1b4332;font-size:22px;">Uspešna kupovina!</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 12px;">Zdravo ${name},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Tvoj <strong>${label}</strong> plan je aktiviran. Sada imaš pristup svim premium funkcijama Map Hack NS mape.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:6px;padding:16px;margin:0 0 24px;">
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Plan:</strong> ${label}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Važi do:</strong> ${expires}</td></tr>
    </table>
    <a href="https://cardrop.app/map-hack" style="display:inline-block;background:#40916c;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px;">Otvori Map Hack</a>
    <p style="color:#888;font-size:13px;margin-top:24px;">Hvala što koristiš CarDrop!</p>
  `);
  await sendMail(to, `Map Hack aktiviran — ${label}`, html);
}

export async function sendMapHackRenewalEmail(
  to: string,
  name: string,
  plan: string,
  expiresAt: Date,
): Promise<void> {
  const label = planLabel(plan);
  const expires = formatDate(expiresAt);
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1b4332;font-size:22px;">Pretplata obnovljena</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 12px;">Zdravo ${name},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Tvoj <strong>${label}</strong> plan je uspešno obnovljen. Nastavljaš da koristiš sve premium funkcije bez prekida.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:6px;padding:16px;margin:0 0 24px;">
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Plan:</strong> ${label}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Nova važnost do:</strong> ${expires}</td></tr>
    </table>
    <a href="https://cardrop.app/map-hack" style="display:inline-block;background:#40916c;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px;">Otvori Map Hack</a>
    <p style="color:#888;font-size:13px;margin-top:24px;">Hvala što koristiš CarDrop!</p>
  `);
  await sendMail(to, `Map Hack pretplata obnovljena — ${label}`, html);
}

export async function sendMapHackCancellationEmail(
  to: string,
  name: string,
  plan: string,
): Promise<void> {
  const label = planLabel(plan);
  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1b4332;font-size:22px;">Pretplata otkazana</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 12px;">Zdravo ${name},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Tvoja <strong>${label}</strong> pretplata je otkazana. I dalje možeš koristiti Map Hack u okviru besplatnog plana.
    </p>
    <p style="color:#555;line-height:1.6;margin:0 0 24px;">
      Ako se predomisliš, uvek možeš ponovo aktivirati premium plan.
    </p>
    <a href="https://cardrop.app/map-hack/subscribe" style="display:inline-block;background:#40916c;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px;">Pogledaj planove</a>
    <p style="color:#888;font-size:13px;margin-top:24px;">Hvala što si koristio/la CarDrop!</p>
  `);
  await sendMail(to, 'Map Hack pretplata otkazana', html);
}

export async function sendBookingOwnerEmail(opts: {
  ownerEmail: string;
  ownerName: string;
  spotTitle: string;
  spotAddress: string;
  renterName: string;
  licensePlate?: string;
  renterPhone?: string;
  startTime: Date;
  endTime: Date;
  totalPrice: string | number;
  currency: string;
}): Promise<void> {
  const {
    ownerEmail, ownerName, spotTitle, spotAddress,
    renterName, licensePlate, renterPhone, startTime, endTime,
    totalPrice, currency,
  } = opts;

  const fmt = (d: Date) =>
    d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' });

  const plateValue = licensePlate || '—';
  const phoneValue = renterPhone || '—';

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1b4332;font-size:22px;">Nova rezervacija!</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 12px;">Zdravo ${ownerName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Tvoj parking <strong>${spotTitle}</strong> je upravo rezervisan i plaćen.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:6px;padding:16px;margin:0 0 24px;">
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Parking:</strong> ${spotTitle}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Adresa:</strong> ${spotAddress}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Zakupac:</strong> ${renterName}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Tablica:</strong> ${plateValue}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Telefon zakupca:</strong> ${phoneValue}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Od:</strong> ${fmt(startTime)}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Do:</strong> ${fmt(endTime)}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Iznos:</strong> ${Number(totalPrice).toLocaleString('sr-RS')} ${currency}</td></tr>
    </table>
    <a href="https://cardrop.app/dashboard" style="display:inline-block;background:#40916c;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px;">Pogledaj u Dashboard-u</a>
    <p style="color:#888;font-size:13px;margin-top:24px;">Hvala što koristiš CarDrop!</p>
  `);

  await sendMail(ownerEmail, `Nova rezervacija potvrđena — ${spotTitle}`, html);
}

export async function sendBookingRenterConfirmationEmail(opts: {
  renterEmail: string;
  renterName: string;
  spotTitle: string;
  spotAddress: string;
  ownerPhone?: string;
  startTime: Date;
  endTime: Date;
  totalPrice: string | number;
  currency: string;
}): Promise<void> {
  const {
    renterEmail, renterName, spotTitle, spotAddress,
    ownerPhone, startTime, endTime,
    totalPrice, currency,
  } = opts;

  const fmt = (d: Date) =>
    d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' });

  const ownerContactValue = ownerPhone || '—';

  const html = baseTemplate(`
    <h2 style="margin:0 0 16px;color:#1b4332;font-size:22px;">Rezervacija potvrđena!</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 12px;">Zdravo ${renterName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Tvoja rezervacija parkinga <strong>${spotTitle}</strong> je potvrđena.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:6px;padding:16px;margin:0 0 24px;">
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Parking:</strong> ${spotTitle}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Adresa:</strong> ${spotAddress}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Od:</strong> ${fmt(startTime)}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Do:</strong> ${fmt(endTime)}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Iznos:</strong> ${Number(totalPrice).toLocaleString('sr-RS')} ${currency}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Kontakt vlasnika:</strong> ${ownerContactValue}</td></tr>
    </table>
    <a href="https://cardrop.app/dashboard" style="display:inline-block;background:#40916c;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px;">Pogledaj moje rezervacije</a>
    <p style="color:#555;font-size:14px;line-height:1.6;margin-top:20px;padding:16px;background:#fffbeb;border-radius:6px;border:1px solid #fde68a;">
      Preporučujemo vam da pogledate specifičnosti vašeg parkinga u CarDrop aplikaciji (na stranici parking spota) ako već niste — radi vaše sigurnosti i najboljeg mogućeg iskustva za obe strane.
    </p>
    <p style="color:#888;font-size:13px;margin-top:16px;">Hvala što koristiš CarDrop!</p>
  `);

  await sendMail(renterEmail, `Potvrda rezervacije — ${spotTitle}`, html);
}
