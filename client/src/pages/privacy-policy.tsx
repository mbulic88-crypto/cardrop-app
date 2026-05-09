import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Shield, Lock, Eye, Globe, Users, Server, Mail, CreditCard, FileText, ArrowLeft, AlertTriangle, MapPin } from "lucide-react";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-privacy-policy">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="link-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <img src={parkInLogo} alt="CarDrop" className="w-7 h-7 rounded-lg" />
            <span className="text-lg font-bold">CarDrop</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Politika Privatnosti</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Poslednje ažurirano: April 2026 &nbsp;·&nbsp; CarDrop LLC
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Važno:</strong> Sve parkirne, radar i saobraćajne informacije prikazane u aplikaciji su isključivo korisničke (crowdsourced). CarDrop nije odgovoran za tačnost, ažurnost ni potpunost tih podataka. Korisnici snose punu odgovornost za sopstvene odluke.
            </p>
          </div>
        </div>

        <div className="space-y-10">

          {/* 1. Ko smo */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">1. Ko smo mi</h2>
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

          {/* 2. Šta je CarDrop Map Hack */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">2. Šta je Map Hack RS</h2>
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

          {/* 3. Odricanje od odgovornosti */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              <h2 className="text-xl font-semibold">3. Odricanje od odgovornosti</h2>
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

          {/* 4. Prikupljeni podaci */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">4. Koje podatke prikupljamo</h2>
            </div>
            <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
              <p>Prikupljamo samo podatke neophodne za funkcionisanje platforme:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong className="text-foreground">Email adresa</strong> — za autentifikaciju i komunikaciju</li>
                <li><strong className="text-foreground">Nadimak (nickname) i avatar</strong> — vidljivi svim korisnicima u chatu i na mapi</li>
                <li><strong className="text-foreground">Sadržaj chat poruka</strong> — javne poruke unutar Map Hack chat-a</li>
                <li><strong className="text-foreground">Koordinate postavljenih markera</strong> — lokacije koje korisnici sami unose (pauk, radar, štek, zlatni minut). <em>Mi ne prikupljamo realtime GPS lokaciju uređaja korisnika.</em></li>
                <li><strong className="text-foreground">Podaci o pretplati</strong> — plan, datum aktivacije i isteka</li>
                <li><strong className="text-foreground">Push notifikacija endpoint</strong> — za slanje obaveštenja (samo uz eksplicitnu dozvolu)</li>
                <li><strong className="text-foreground">Podaci o sesiji</strong> — tehnički kolačići za prijavu</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Napomena: Lozinke se čuvaju isključivo u hashovanom obliku (bcrypt) i nikada u čistom tekstu.
              </p>
            </div>
          </section>

          {/* 5. Plaćanje i pretplata */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">5. Plaćanje i pretplata</h2>
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

          {/* 6. GDPR prava */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">6. Vaša prava (GDPR)</h2>
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

          {/* 7. Kolačići */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">7. Kolačići (Cookies)</h2>
            </div>
            <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">
              <p>
                Koristimo isključivo <strong className="text-foreground">neophodne tehničke kolačiće</strong> za funkcionisanje sesije i autentifikacije. Ne koristimo reklamne, analitičke ni kolačiće trećih strana osim Stripe-a (za obradu plaćanja).
              </p>
            </div>
          </section>

          {/* 8. Deljenje podataka */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">8. Deljenje podataka sa trećim stranama</h2>
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

          {/* 9. Prenos podataka */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">9. Međunarodni prenos podataka</h2>
            </div>
            <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
              <p>
                Kao kompanija registrovana u SAD, vaši podaci se obrađuju i čuvaju na serverima u SAD. Naši pružaoci usluga (Stripe, Mapbox) poseduju odgovarajuće mehanizme usklađenosti sa GDPR regulativom (standardne ugovorne klauzule — SCC). Sav prenos podataka odvija se putem šifrovanih kanala (HTTPS/TLS).
              </p>
            </div>
          </section>

          {/* 10. Čuvanje podataka */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">10. Čuvanje i brisanje podataka</h2>
            </div>
            <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">
              <ul className="space-y-2 list-disc list-inside">
                <li><strong className="text-foreground">Nalog i profil:</strong> čuvaju se dok je nalog aktivan; brišu se u roku od 30 dana po zahtevu</li>
                <li><strong className="text-foreground">Chat poruke i markeri:</strong> čuvaju se dok su aktivni ili dok se ne zatraži brisanje</li>
                <li><strong className="text-foreground">Finansijski podaci:</strong> minimum 5 godina u skladu sa zakonskim obavezama</li>
              </ul>
            </div>
          </section>

          {/* 11. Primenljivo pravo */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">11. Primenljivo pravo i nadležnost</h2>
            </div>
            <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">
              <p>
                Ova politika podleže zakonima Republike Srbije i, gde je primenljivo, Opštoj uredbi EU o zaštiti podataka (GDPR). Za korisnike iz SAD primenljivi su savezni i državni propisi o privatnosti (uključujući CCPA). U slučaju spora, primenjuje se uvek viši standard zaštite korisnika.
              </p>
            </div>
          </section>

          {/* 12. Kontakt */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-primary flex-shrink-0" />
              <h2 className="text-xl font-semibold">12. Kontakt i DPO</h2>
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
            <Link href="/terms" className="underline hover:text-foreground" data-testid="link-terms">Uslovi korišćenja</Link>
            &nbsp;·&nbsp;
            <a href="mailto:info@cardrop.app" className="underline hover:text-foreground">info@cardrop.app</a>
          </p>
        </div>
      </div>
    </div>
  );
}
