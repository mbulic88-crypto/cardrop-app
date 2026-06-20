import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Shield, Lock, Eye, Globe, Users, Server, Mail, CreditCard, FileText, AlertTriangle, MapPin } from "lucide-react";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { useLanguage } from "@/hooks/useLanguage";

const privacyT = {
  sr: {
    pageTitle: "Politika Privatnosti",
    lastUpdated: "Poslednje ažurirano: Maj 2026 · CarDrop LLC",
    warningText: "Važno: Sve parkirne, radar i saobraćajne informacije prikazane u aplikaciji su isključivo korisničke (crowdsourced). CarDrop nije odgovoran za tačnost, ažurnost ni potpunost tih podataka. Korisnici snose punu odgovornost za sopstvene odluke.",
    termsLink: "Uslovi korišćenja",
    sections: [
      "1. Ko smo mi",
      "2. Šta je Map Hack RS",
      "3. Odricanje od odgovornosti",
      "4. Koje podatke prikupljamo",
      "5. Plaćanje i pretplata",
      "6. Platforma za posredovanje i procesuiranje plaćanja",
      "7. Vaša prava (GDPR)",
      "8. Kolačići (Cookies)",
      "9. Deljenje podataka sa trećim stranama",
      "10. Međunarodni prenos podataka",
      "11. Čuvanje i brisanje podataka",
      "12. Primenljivo pravo i nadležnost",
      "13. Kontakt i DPO",
    ],
  },
  en: {
    pageTitle: "Privacy Policy",
    lastUpdated: "Last updated: May 2026 · CarDrop LLC",
    warningText: "Important: All parking, radar and traffic information shown in the app is exclusively user-generated (crowdsourced). CarDrop is not responsible for the accuracy, timeliness or completeness of that data. Users bear full responsibility for their own decisions.",
    termsLink: "Terms of Use",
    sections: [
      "1. Who we are",
      "2. What is Map Hack RS",
      "3. Disclaimer of liability",
      "4. What data we collect",
      "5. Payment and subscription",
      "6. Intermediary platform and payment processing",
      "7. Your rights (GDPR)",
      "8. Cookies",
      "9. Data sharing with third parties",
      "10. International data transfer",
      "11. Data retention and deletion",
      "12. Applicable law and jurisdiction",
      "13. Contact and DPO",
    ],
  },
};

export default function PrivacyPolicy() {
  const { language, setLanguage } = useLanguage();
  const t = language === "sr" ? privacyT.sr : privacyT.en;
  const s = t.sections;

  return (
    <div className="min-h-screen bg-background" data-testid="page-privacy-policy">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-back">
              <img src={parkInLogo} alt="CarDrop" className="w-7 h-7 rounded-lg" />
              <span className="text-lg font-bold">CarDrop</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {(["sr", "en"] as const).map((code) => (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                data-testid={`flag-${code}`}
                className={`text-xl leading-none transition-opacity ${language === code ? "opacity-100" : "opacity-40 hover:opacity-75"}`}
              >
                {code === "sr" ? "🇷🇸" : "🇬🇧"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">{t.pageTitle}</h1>
          </div>
          <p className="text-muted-foreground text-sm">{t.lastUpdated}</p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>{language === "sr" ? "Važno" : "Important"}:</strong>{" "}
              {language === "sr"
                ? "Sve parkirne, radar i saobraćajne informacije prikazane u aplikaciji su isključivo korisničke (crowdsourced). CarDrop nije odgovoran za tačnost, ažurnost ni potpunost tih podataka. Korisnici snose punu odgovornost za sopstvene odluke."
                : "All parking, radar and traffic information shown in the app is exclusively user-generated (crowdsourced). CarDrop is not responsible for the accuracy, timeliness or completeness of that data."}
            </p>
          </div>
        </div>

        <div className="space-y-10">

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[0]}</h2>
            </div>
            <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
              <p>
                CarDrop platformu vodi kompanija <strong className="text-foreground">CarDrop LLC</strong>, registrovana u Sjedinjenim Američkim Državama. Platforma primarno posluje na teritoriji Srbije i šire regije, pružajući usluge korisnicima u Evropskoj uniji.
              </p>
              <ul className="space-y-1.5 list-none pl-0">
                <li><strong className="text-foreground">Naziv:</strong> CarDrop LLC</li>
                <li><strong className="text-foreground">Email:</strong>{" "}
                  <a href="mailto:info@cardrop.app" className="text-primary underline" data-testid="link-contact-email">info@cardrop.app</a>
                </li>
              </ul>
              <p>
                Kao kompanija registrovana u SAD koja pruža usluge korisnicima u EU, poštujemo i primenljive odredbe Opšte uredbe o zaštiti podataka (<strong className="text-foreground">GDPR — Uredba (EU) 2016/679</strong>), kao i relevantne amerčke propise o privatnosti (CCPA i dr.).
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[1]}</h2>
            </div>
            <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
              <p>
                Map Hack RS je funkcionalnost unutar platforme CarDrop koja korisnicima omogućava da <strong className="text-foreground">međusobno razmenjuju informacije</strong> o parkiranju, prisustvu pauka (evakuatora), policijskim radarima i slobodnim "štek" mestima širom Srbije.
              </p>
              <p>
                CarDrop je isključivo <strong className="text-foreground">tehnička platforma i posrednik</strong>. Mi ne generišemo, ne verifikujemo i ne garantujemo tačnost informacija koje korisnici postavljaju. Sav sadržaj je korisnički (crowdsourced).
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[2]}</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <div className="bg-muted/60 rounded-md p-4 space-y-3">
                <p>
                  <strong className="text-foreground">3.1 Tačnost podataka.</strong>{" "}
                  Sve informacije o pauku, radarima, parkirnim mestima i slobodnim lokacijama prikazane u aplikaciji su isključivo korisničke i mogu biti netačne, zastarele ili nepotpune. CarDrop ne garantuje tačnost, ažurnost ni potpunost bilo koje objave.
                </p>
                <p>
                  <strong className="text-foreground">3.2 Odgovornost za štetu.</strong>{" "}
                  CarDrop LLC, njeni zaposleni, direktori, partneri ni saradnici nisu odgovorni za bilo kakvu direktnu ili indirektnu štetu, uključujući ali ne ograničavajući se na: novčane kazne za neispravno parkiranje, troškove šlepanja vozila, oštećenje vozila, gubitak prihoda ili bilo koji drugi finansijski ili nefinansijski gubitak nastao oslanjanjem na podatke prikazane u aplikaciji.
                </p>
                <p>
                  <strong className="text-foreground">3.3 Korišćenje na sopstvenu odgovornost.</strong>{" "}
                  Korisnik prihvata da koristi sve informacije i funkcionalnosti aplikacije isključivo na sopstvenu odgovornost. Preporučujemo da uvek proverite aktuelno stanje na licu mesta.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[3]}</h2>
            </div>
            <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
              <p>Prikupljamo samo podatke neophodne za funkcionisanje platforme:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong className="text-foreground">Email adresa</strong> — za autentifikaciju i komunikaciju</li>
                <li><strong className="text-foreground">Nadimak (nickname) i avatar</strong> — vidljivi svim korisnicima u chatu i na mapi</li>
                <li><strong className="text-foreground">Sadržaj chat poruka</strong> — javne poruke unutar Map Hack chat-a</li>
                <li><strong className="text-foreground">Koordinate postavljenih markera</strong> — lokacije koje korisnici sami unose (pauk, radar, štek, zlatni minut). <em>Mi ne prikupljamo realtime GPS lokaciju uređaja korisnika.</em></li>
                <li><strong className="text-foreground">Podaci o pretplati</strong> — plan, datum aktivacije i isteka</li>
                <li><strong className="text-foreground">Podaci o rezervacijama</strong> — datum i vreme rezervacije, registarska oznaka vozila, iznos transakcije, status plaćanja i metod plaćanja. Ovi podaci se čuvaju u svrhu realizacije usluge, rešavanja sporova i zakonskih obaveza.</li>
                <li><strong className="text-foreground">Push notifikacija endpoint</strong> — za slanje obaveštenja (samo uz eksplicitnu dozvolu)</li>
                <li><strong className="text-foreground">Podaci o sesiji</strong> — tehnički kolačići za prijavu</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Napomena: Lozinke se čuvaju isključivo u hashovanom obliku (bcrypt) i nikada u čistom tekstu.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[4]}</h2>
            </div>
            <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Lock className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="font-semibold text-green-800 dark:text-green-200 text-sm">
                    Sva plaćanja obrađuje Stripe — jedan od najsigurnijih platnih procesora na svetu.
                  </p>
                </div>
                <p className="text-green-700 dark:text-green-300 text-xs">
                  Stripe je sertifikovan prema <strong>PCI DSS Level 1</strong> standardu (najviši nivo bezbednosti u industriji platnog prometa) i obrađuje plaćanja za Amazon, Google, Microsoft i milione drugih kompanija. CarDrop nikada ne vidi, ne prikuplja i ne čuva podatke o vašoj platnoj kartici — svi podaci idu direktno Stripe-u.
                </p>
              </div>

              <p><strong className="text-foreground">Dostupni paketi (cene u RSD):</strong></p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Paket</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Cena</th>
                      <th className="text-left py-2 font-semibold text-foreground">Trajanje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-2 pr-4">Besplatan</td>
                      <td className="py-2 pr-4">0 RSD</td>
                      <td className="py-2">Neograničeno</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Premium (mesečno)</td>
                      <td className="py-2 pr-4">390 RSD</td>
                      <td className="py-2">30 dana</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Day Pass</td>
                      <td className="py-2 pr-4">120 RSD</td>
                      <td className="py-2">24 sata</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Godišnji Premium</td>
                      <td className="py-2 pr-4">3.500 RSD</td>
                      <td className="py-2">365 dana</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Za Firme</td>
                      <td className="py-2 pr-4">Na upit</td>
                      <td className="py-2"><a href="mailto:info@cardrop.app" className="text-primary underline">info@cardrop.app</a></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-muted/50 rounded-md p-3 space-y-1.5 text-xs">
                <p><strong className="text-foreground">Automatska pretplata:</strong> Premium (mesečni) i Godišnji paketi se automatski obnavljaju na kraju perioda, osim ako korisnik ne otkaže pre isteka.</p>
                <p><strong className="text-foreground">Otkazivanje:</strong> Pretplatu možete otkazati u bilo kom trenutku direktno u aplikaciji ili slanjem zahteva na <a href="mailto:info@cardrop.app" className="text-primary underline">info@cardrop.app</a>. Otkazivanje stupa na snagu na kraju tekućeg obračunskog perioda.</p>
                <p><strong className="text-foreground">Day Pass:</strong> Jednokratna uplata, bez automatskog obnavljanja.</p>
              </div>

              <p>
                Za detalje o tome kako Stripe obrađuje vaše podatke, pogledajte{" "}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline" data-testid="link-stripe-privacy">
                  Stripe Politiku privatnosti
                </a>.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[5]}</h2>
            </div>
            <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
              <p>
                CarDrop je isključivo <strong className="text-foreground">platforma za posredovanje</strong> između vlasnika parking prostora i zakupaca. CarDrop ne poseduje, ne upravlja niti direktno iznajmljuje parking prostore koji su prikazani na platformi.
              </p>
              <div className="bg-muted/60 rounded-md p-4 space-y-3">
                <p>
                  <strong className="text-foreground">6.1 Odgovornost vlasnika prostora.</strong>{" "}
                  Vlasnici parking prostora su jedini odgovorni za tačnost podataka o prostoru, uslove iznajmljivanja, dostupnost, bezbednost prostora i ispunjavanje zakonskih obaveza vezanih za iznajmljivanje.
                </p>
                <p>
                  <strong className="text-foreground">6.2 Procesuiranje plaćanja.</strong>{" "}
                  Sva plaćanja na platformi — kako pretplata za oglašavanje, tako i <strong className="text-foreground">online plaćanja rezervacija parking mesta</strong> — obrađuje <strong className="text-foreground">Stripe Inc.</strong>, certificiran prema PCI DSS Level 1 standardu. CarDrop ne prikuplja, ne čuva ni ne obrađuje podatke o platnim karticama korisnika.
                </p>
                <p>
                  <strong className="text-foreground">6.3 Finansijski model — naknada platforme.</strong>{" "}
                  Za svaku uspešno realizovanu rezervaciju, CarDrop zadržava <strong className="text-foreground">15% posredničke naknade</strong>. Preostalih <strong className="text-foreground">85% isplaćuje se vlasniku parking mesta</strong> prema kalendarskom rasporedu isplata, umanjeno za eventualne troškove bankarske transakcije. Ovi finansijski podaci čuvaju se minimum 5 godina u skladu sa zakonskim obavezama.
                </p>
                <p>
                  <strong className="text-foreground">6.4 Ograničenje odgovornosti.</strong>{" "}
                  CarDrop nije strana u ugovoru između vlasnika parking prostora i zakupca i ne snosi odgovornost za sporove, štetu ili neispunjavanje obaveza između tih strana.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[6]}</h2>
            </div>
            <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
              <p>Korisnicima u EU garantujemo sledeća prava u pogledu ličnih podataka:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong className="text-foreground">Pravo na pristup</strong> — možete zatražiti kopiju svih podataka koje čuvamo o vama</li>
                <li><strong className="text-foreground">Pravo na ispravku</strong> — možete zatražiti ispravku netačnih podataka</li>
                <li><strong className="text-foreground">Pravo na brisanje ("pravo na zaborav")</strong> — možete zatražiti brisanje vaših podataka, osim u slučaju zakonske obaveze čuvanja</li>
                <li><strong className="text-foreground">Pravo na prenosivost</strong> — možete primiti vaše podatke u strukturiranom, mašinski čitljivom formatu</li>
                <li><strong className="text-foreground">Pravo na prigovor</strong> — možete se usprotiviti obradi na osnovu legitimnog interesa</li>
                <li><strong className="text-foreground">Pravo na povlačenje saglasnosti</strong> — možete u svakom trenutku povući saglasnost za obradu</li>
              </ul>
              <p>
                Sve zahteve šaljite na: <a href="mailto:info@cardrop.app" className="text-primary underline">info@cardrop.app</a>. Odgovaramo u roku od 30 dana.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[7]}</h2>
            </div>
            <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">
              <p>
                Koristimo isključivo <strong className="text-foreground">neophodne tehničke kolačiće</strong> za funkcionisanje sesije i autentifikacije. Ne koristimo reklamne, analitičke ni kolačiće trećih strana osim Stripe-a (za obradu plaćanja).
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[8]}</h2>
            </div>
            <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
              <p>Vaše podatke <strong className="text-foreground">ne prodajemo</strong> trećim stranama. Delimo ih samo sa:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong className="text-foreground">Stripe Inc.</strong> (SAD) — za obradu plaćanja</li>
                <li><strong className="text-foreground">Mapbox Inc.</strong> (SAD) — za prikaz mape (koordinate markera)</li>
                <li><strong className="text-foreground">Nadležni organi</strong> — isključivo na zakonski utemeljen zahtev</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[9]}</h2>
            </div>
            <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
              <p>
                Kao kompanija registrovana u SAD, vaši podaci se obrađuju i čuvaju na serverima u SAD. Naši pružaoci usluga (Stripe, Mapbox) poseduju odgovarajuće mehanizme usklađenosti sa GDPR regulativom (standardne ugovorne klauzule — SCC). Sav prenos podataka odvija se putem šifrovanih kanala (HTTPS/TLS).
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[10]}</h2>
            </div>
            <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">
              <ul className="space-y-2 list-disc list-inside">
                <li><strong className="text-foreground">Nalog i profil:</strong> čuvaju se dok je nalog aktivan; brišu se u roku od 30 dana po zahtevu</li>
                <li><strong className="text-foreground">Chat poruke i markeri:</strong> čuvaju se dok su aktivni ili dok se ne zatraži brisanje</li>
                <li><strong className="text-foreground">Finansijski podaci:</strong> minimum 5 godina u skladu sa zakonskim obavezama</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[11]}</h2>
            </div>
            <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">
              <p>
                Ova politika podleže zakonima Republike Srbije i, gde je primenljivo, Opštoj uredbi EU o zaštiti podataka (GDPR). Za korisnike iz SAD primenljivi su savezni i državni propisi o privatnosti (uključujući CCPA). U slučaju spora, primenjuje se uvek viši standard zaštite korisnika.
              </p>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">{s[12]}</h2>
            </div>
            <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">
              <p>Za sva pitanja u vezi sa privatnošću, zahteve za pristup ili brisanje podataka, kontaktirajte nas:</p>
              <p>
                <strong className="text-foreground">Email:</strong>{" "}
                <a href="mailto:info@cardrop.app" className="text-primary underline font-medium" data-testid="link-dpo-email">
                  info@cardrop.app
                </a>
              </p>
              <p className="text-xs">CarDrop LLC odgovara na sve zahteve u roku od 30 dana od prijema.</p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 CarDrop LLC &nbsp;·&nbsp;
            <Link href="/terms" className="underline hover:text-foreground" data-testid="link-terms">{t.termsLink}</Link>
            &nbsp;·&nbsp;
            <a href="mailto:info@cardrop.app" className="underline hover:text-foreground">info@cardrop.app</a>
          </p>
        </div>
      </div>
    </div>
  );
}
