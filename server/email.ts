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

const ADMIN_EMAIL = 'info@cardrop.app';

async function sendMail(to: string, subject: string, html: string, cc?: string): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) return false;
  try {
    await transporter.sendMail({ from: SMTP_FROM, to, cc, subject, html });
    console.log(`[EMAIL] Poslat "${subject}" na ${to}${cc ? ` (cc: ${cc})` : ''}`);
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
  approveUrl: string;
  rejectUrl: string;
  isCreditBooking?: boolean;
  isInstantBooking?: boolean;
}): Promise<void> {
  const {
    ownerEmail, ownerName, spotTitle, spotAddress,
    renterName, licensePlate, renterPhone, startTime, endTime,
    totalPrice, currency, approveUrl, rejectUrl, isCreditBooking, isInstantBooking,
  } = opts;

  const fmt = (d: Date) =>
    d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' });

  const plateValue = licensePlate || '—';
  const phoneValue = renterPhone || '—';

  const html = baseTemplate(`
    <div style="background:#f0fdf4;border:2px solid #40916c;border-radius:8px;padding:20px;margin:0 0 24px;text-align:center;">
      <p style="margin:0 0 6px;color:#1b4332;font-size:16px;font-weight:bold;">Nova rezervacija ceka tvoje odobrenje!</p>
      <p style="margin:0 0 16px;color:#555;font-size:13px;">Klikni dugme ispod da prihvatis ili odbijas rezervaciju.</p>
      <table cellpadding="0" cellspacing="0" style="display:inline-table;margin:0 auto;">
        <tr>
          <td style="padding:0 6px;"><a href="${approveUrl}" style="display:inline-block;background:#40916c;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-weight:bold;font-size:16px;">ODOBRI</a></td>
          <td style="padding:0 6px;"><a href="${rejectUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:6px;font-weight:bold;font-size:16px;">ODBIJ</a></td>
        </tr>
      </table>
    </div>
    <h2 style="margin:0 0 16px;color:#1b4332;font-size:22px;">Nova rezervacija!</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 12px;">Zdravo ${ownerName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      ${isCreditBooking
        ? `Neko je zatrazio rezervaciju tvog parkinga <strong>${spotTitle}</strong> putem CarDrop kredita. Kredit <strong>jos nije skinut</strong> — skinuce se tek kada odobris rezervaciju.`
        : isInstantBooking
          ? `Neko je rezervisao tvoj parking <strong>${spotTitle}</strong> i platio karticom. Iznos od <strong>${Number(totalPrice).toLocaleString('sr-RS')} ${currency}</strong> je blokiran na kartici zakupca — <strong>bice naplacen kada odobris</strong>, a oslobodjen ako odbijes.`
          : `Neko je rezervisao tvoj parking <strong>${spotTitle}</strong>.`
      } Potrebno je tvoje odobrenje.
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
    <p style="color:#888;font-size:13px;margin-top:24px;">Hvala sto koristis CarDrop!</p>
  `);

  const ccAddr = ownerEmail === ADMIN_EMAIL ? undefined : ADMIN_EMAIL;
  await sendMail(ownerEmail, `Nova rezervacija ceka odobrenje — ${spotTitle}`, html, ccAddr);
}

export async function sendBookingApprovedEmail(opts: {
  renterEmail: string;
  renterName: string;
  spotTitle: string;
  spotAddress: string;
  ownerPhone?: string;
  startTime: Date;
  endTime: Date;
  totalPrice: string | number;
  currency: string;
  isInstantBooking?: boolean;
}): Promise<void> {
  const { renterEmail, renterName, spotTitle, spotAddress, ownerPhone, startTime, endTime, totalPrice, currency, isInstantBooking } = opts;
  const fmt = (d: Date) => d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = baseTemplate(`
    <div style="background:#f0fdf4;border:2px solid #40916c;border-radius:8px;padding:16px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;color:#1b4332;font-size:18px;font-weight:bold;">Rezervacija odobrena!</p>
    </div>
    <h2 style="margin:0 0 16px;color:#1b4332;font-size:22px;">Tvoja rezervacija je odobrena</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 12px;">Zdravo ${renterName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Vlasnik je odobrio tvoju rezervaciju parkinga <strong>${spotTitle}</strong>. Sve je spremno!
      ${isInstantBooking ? `Uplata od <strong>${Number(totalPrice).toLocaleString('sr-RS')} ${currency}</strong> je uspesno izvrsena sa tvoje kartice.` : ''}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:6px;padding:16px;margin:0 0 24px;">
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Parking:</strong> ${spotTitle}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Adresa:</strong> ${spotAddress}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Od:</strong> ${fmt(startTime)}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Do:</strong> ${fmt(endTime)}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Iznos:</strong> ${Number(totalPrice).toLocaleString('sr-RS')} ${currency}</td></tr>
      ${ownerPhone ? `<tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Kontakt vlasnika:</strong> ${ownerPhone}</td></tr>` : ''}
    </table>
    <a href="https://cardrop.app/dashboard" style="display:inline-block;background:#40916c;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px;">Pogledaj moje rezervacije</a>
    <p style="color:#888;font-size:13px;margin-top:24px;">Hvala sto koristis CarDrop!</p>
  `);

  const ccAddr = renterEmail === ADMIN_EMAIL ? undefined : ADMIN_EMAIL;
  await sendMail(renterEmail, `Rezervacija odobrena — ${spotTitle}`, html, ccAddr);
}

export async function sendBookingPendingApprovalEmail(opts: {
  renterEmail: string;
  renterName: string;
  spotTitle: string;
  spotAddress: string;
  startTime: Date;
  endTime: Date;
  totalPrice: string | number;
  currency: string;
  isInstantBooking?: boolean;
}): Promise<void> {
  const { renterEmail, renterName, spotTitle, spotAddress, startTime, endTime, totalPrice, currency, isInstantBooking } = opts;
  const fmt = (d: Date) => d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = baseTemplate(`
    <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:8px;padding:16px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;color:#92400e;font-size:18px;font-weight:bold;">Rezervacija ceka odobrenje vlasnika</p>
    </div>
    <h2 style="margin:0 0 16px;color:#1b4332;font-size:22px;">Zahtev za rezervaciju poslat!</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 12px;">Zdravo ${renterName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Tvoj zahtev za rezervaciju parkinga <strong>${spotTitle}</strong> je primljen i ceka odobrenje od strane vlasnika.
      ${isInstantBooking
        ? `Kartica je blokirana na iznos <strong>${Number(totalPrice).toLocaleString('sr-RS')} ${currency}</strong> — bice naplacena tek kada vlasnik odobri. Ako vlasnik odbije, blokada se automatski otpusta i kartica <strong>nece biti naplacena</strong>.`
        : `Krediti jos uvek nisu skinuti — bice skinuti tek kada vlasnik odobri rezervaciju.`
      }
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:6px;padding:16px;margin:0 0 24px;">
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Parking:</strong> ${spotTitle}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Adresa:</strong> ${spotAddress}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Od:</strong> ${fmt(startTime)}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Do:</strong> ${fmt(endTime)}</td></tr>
      <tr><td style="color:#1b4332;font-size:14px;padding:4px 0;"><strong>Iznos (na cekanju):</strong> ${Number(totalPrice).toLocaleString('sr-RS')} ${currency}</td></tr>
    </table>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">Dobices email cim vlasnik donese odluku. Status rezervacije mozete videti i u svom Dashboard-u.</p>
    <a href="https://cardrop.app/dashboard" style="display:inline-block;background:#40916c;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px;">Otvori Dashboard</a>
    <p style="color:#888;font-size:13px;margin-top:24px;">Hvala sto koristis CarDrop!</p>
  `);

  await sendMail(renterEmail, `Rezervacija na cekanju — ${spotTitle}`, html);
}

export async function sendBookingRejectedEmail(opts: {
  renterEmail: string;
  renterName: string;
  spotTitle: string;
  startTime: Date;
  endTime: Date;
  totalPrice: string | number;
  currency: string;
  paymentMethod?: string;
}): Promise<void> {
  const { renterEmail, renterName, spotTitle, startTime, endTime, totalPrice, currency, paymentMethod } = opts;
  const fmt = (d: Date) => d.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' });
  const isCredit = paymentMethod === 'credit';
  const isInstant = paymentMethod === 'instant';

  const html = baseTemplate(`
    <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;color:#991b1b;font-size:18px;font-weight:bold;">Rezervacija odbijena</p>
    </div>
    <h2 style="margin:0 0 16px;color:#1b4332;font-size:22px;">Nismo uspeli da potvrdimo rezervaciju</h2>
    <p style="color:#555;line-height:1.6;margin:0 0 12px;">Zdravo ${renterName},</p>
    <p style="color:#555;line-height:1.6;margin:0 0 20px;">
      Zao nam je, vlasnik nije mogao da prihvati tvoju rezervaciju parkinga <strong>${spotTitle}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:6px;padding:16px;margin:0 0 24px;">
      <tr><td style="color:#991b1b;font-size:14px;padding:4px 0;"><strong>Parking:</strong> ${spotTitle}</td></tr>
      <tr><td style="color:#991b1b;font-size:14px;padding:4px 0;"><strong>Od:</strong> ${fmt(startTime)}</td></tr>
      <tr><td style="color:#991b1b;font-size:14px;padding:4px 0;"><strong>Do:</strong> ${fmt(endTime)}</td></tr>
      <tr><td style="color:#991b1b;font-size:14px;padding:4px 0;"><strong>Iznos:</strong> ${Number(totalPrice).toLocaleString('sr-RS')} ${currency}</td></tr>
    </table>
    ${isCredit
      ? `<p style="color:#555;line-height:1.6;margin:0 0 20px;">Dobra vest — krediti <strong>nisu skinuti</strong> sa tvog naloga. Mozete pokusati sa rezervacijom drugog parkinga.</p>`
      : isInstant
        ? `<p style="color:#555;line-height:1.6;margin:0 0 20px;">Dobra vest — tvoja kartica <strong>nije naplacena</strong>. Blokada iznosa je automatski otpustena. Mozete pokusati sa rezervacijom drugog parkinga.</p>`
        : `<p style="color:#555;line-height:1.6;margin:0 0 20px;">Kontaktuj nas na <a href="mailto:info@cardrop.app" style="color:#40916c;">info@cardrop.app</a> ako imas pitanja.</p>`
    }
    <a href="https://cardrop.app" style="display:inline-block;background:#40916c;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px;">Nadji drugi parking</a>
    <p style="color:#888;font-size:13px;margin-top:24px;">Hvala sto koristis CarDrop!</p>
  `);

  const ccAddr = renterEmail === ADMIN_EMAIL ? undefined : ADMIN_EMAIL;
  await sendMail(renterEmail, `Rezervacija odbijena — ${spotTitle}`, html, ccAddr);
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
