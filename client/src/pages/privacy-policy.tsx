import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Shield, Lock, Eye, Globe, Bell, Users, Server, Baby, Mail, CreditCard, Cookie, FileText, ArrowLeft } from "lucide-react";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-privacy-policy">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
              <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-lg" />
              <span className="text-2xl font-bold">CarDrop</span>
            </div>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-primary" />
              <CardTitle className="text-3xl">Politika Privatnosti</CardTitle>
            </div>
            <p className="text-muted-foreground">
              Poslednje ažurirano: Februar 2026
            </p>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="bg-muted/50 border rounded-lg p-6">
              <p className="text-sm text-muted-foreground">
                Ova Politika privatnosti opisuje kako Ai Me IT LLC ("mi", "nas", "naš"), operater platforme CarDrop,
                prikuplja, koristi, čuva i štiti vaše lične podatke. CarDrop je oglasna tabla (classified ads board)
                koja povezuje vlasnike parking mesta sa korisnicima koji traže parking. Molimo vas da pažljivo
                pročitate ovu politiku kako biste razumeli naše prakse u vezi sa vašim podacima.
              </p>
            </div>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">1. Ko smo mi / O nama</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  CarDrop platformu vodi i njome upravlja kompanija <strong className="text-foreground">Ai Me IT LLC</strong>,
                  registrovana u Sjedinjenim Američkim Državama.
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  <li><strong className="text-foreground">Naziv kompanije:</strong> Ai Me IT LLC</li>
                  <li><strong className="text-foreground">Adresa:</strong> 1209 Mountain Road PL NE, STE N, Albuquerque, NM 87110, USA</li>
                  <li><strong className="text-foreground">Email kontakt:</strong> info@cardropp.app</li>
                </ul>
                <p>
                  Iako je kompanija registrovana u SAD-u, CarDrop platforma primarno posluje na teritoriji
                  Srbije i regiona Balkana. Kao rezultat toga, poštujemo kako američke zakone o privatnosti
                  (uključujući CCPA - California Consumer Privacy Act), tako i evropske standarde zaštite podataka
                  (GDPR - General Data Protection Regulation), primenjujući uvek viši standard zaštite.
                </p>
                <p>
                  CarDrop funkcioniše isključivo kao <strong className="text-foreground">oglasna tabla (classified ads board)</strong> -
                  platforma koja omogućava korisnicima da oglašavaju i pronalaze parking mesta. Mi nismo strana
                  u bilo kojoj transakciji ili dogovoru između korisnika i ne preuzimamo odgovornost za ishod
                  takvih aranžmana.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">2. Koje podatke prikupljamo</h3>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">2.1 Lični podaci (podaci o identitetu)</h4>
                  <p className="mb-2">
                    Prilikom registracije na platformi, prikupljamo:
                  </p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Korisnički ID (jedinstveni identifikator)</li>
                    <li>Korisničko ime (display name)</li>
                    <li>URL adresa profilne slike</li>
                  </ul>
                  <p className="mt-2 text-sm">
                    Napomena: Lozinke se čuvaju u šifrovanom obliku i nikada se ne skladište u čistom tekstu.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">2.2 Podaci o lokaciji</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>GPS koordinate parking mesta (geografska širina i dužina)</li>
                    <li>Adresa parking mesta</li>
                    <li>Izbor grada (Beograd, Novi Sad, Niš, Kragujevac i drugi)</li>
                    <li>Podaci o lokaciji vašeg uređaja (samo uz vašu eksplicitnu dozvolu, za funkciju "parking u blizini")</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">2.3 Podaci o oglasima i sadržaju</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Fotografije parking mesta (čuvaju se u cloud skladištu)</li>
                    <li>Opis parking mesta, cena, uslovi korišćenja</li>
                    <li>Recenzije i ocene</li>
                    <li>Direktne poruke između korisnika</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">2.4 Podaci o uređaju i korišćenju</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Tip uređaja i operativni sistem</li>
                    <li>Tip i verzija web pregledača</li>
                    <li>IP adresa</li>
                    <li>Podaci o push notifikaciji pretplati (endpoint, VAPID ključevi)</li>
                    <li>Podaci o korišćenju platforme (koje stranice posećujete, kada pristupate platformi)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">2.5 Podaci o transakcijama</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Istorija rezervacija i njihov status</li>
                    <li>Podaci o plaćanjima (ID transakcija, iznos, status) - bez kartičnih podataka</li>
                    <li>Stripe Customer ID i Payment Intent ID</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">3. Kako koristimo vaše podatke</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <p>Vaše podatke koristimo u sledeće svrhe:</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li><strong className="text-foreground">Pružanje usluge:</strong> Omogućavanje objavljivanja i pretraživanja oglasa za parking mesta, upravljanje rezervacijama i komunikacijom između korisnika</li>
                  <li><strong className="text-foreground">Autentifikacija:</strong> Identifikacija korisnika i upravljanje korisničkim nalozima</li>
                  <li><strong className="text-foreground">Obrada plaćanja:</strong> Prosleđivanje potrebnih podataka Stripe platformi za sigurnu obradu plaćanja</li>
                  <li><strong className="text-foreground">Lokacijske usluge:</strong> Prikazivanje parking mesta na mapi i funkcija pronalaženja parkinga u blizini</li>
                  <li><strong className="text-foreground">Komunikacija:</strong> Slanje push notifikacija o statusu rezervacija, novih poruka i drugih relevantnih ažuriranja</li>
                  <li><strong className="text-foreground">Poboljšanje platforme:</strong> Analiza korišćenja platforme radi unapređenja korisničkog iskustva</li>
                  <li><strong className="text-foreground">Bezbednost:</strong> Sprečavanje prevara, zloupotreba i neovlašćenog pristupa</li>
                  <li><strong className="text-foreground">Zakonske obaveze:</strong> Ispunjavanje pravnih obaveza i odgovaranje na zakonske zahteve</li>
                </ul>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">4. Pravni osnov za obradu podataka</h3>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Vaše podatke obrađujemo na osnovu sledećih pravnih osnova, u skladu sa GDPR regulativom
                  i relevantnim američkim zakonima o privatnosti:
                </p>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4.1 Saglasnost (član 6(1)(a) GDPR)</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Push notifikacije - šaljemo ih samo uz vašu eksplicitnu dozvolu</li>
                    <li>Pristup lokaciji vašeg uređaja</li>
                    <li>Kolačići koji nisu striktno neophodni</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4.2 Izvršenje ugovora (član 6(1)(b) GDPR)</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Kreiranje i upravljanje vašim nalogom</li>
                    <li>Obrada rezervacija i transakcija</li>
                    <li>Omogućavanje komunikacije između korisnika</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4.3 Legitimni interes (član 6(1)(f) GDPR)</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Poboljšanje i zaštita platforme</li>
                    <li>Prevencija prevara i zloupotreba</li>
                    <li>Analitika korišćenja u cilju unapređenja korisničkog iskustva</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4.4 Zakonska obaveza (član 6(1)(c) GDPR)</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Čuvanje podataka o transakcijama u skladu sa poreskim zakonima</li>
                    <li>Odgovaranje na zakonske zahteve nadležnih organa</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">4.5 Američki zakoni o privatnosti</h4>
                  <p>
                    Pored GDPR standarda, poštujemo i relevantne američke zakone o privatnosti,
                    uključujući California Consumer Privacy Act (CCPA) i druge državne propise o
                    zaštiti potrošača. Detalje o vašim pravima prema CCPA možete pronaći u odeljku 10.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">5. Stripe plaćanja</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <div className="bg-muted/50 border rounded-lg p-4">
                  <p className="font-semibold text-foreground mb-2">
                    CarDrop nikada ne vidi, ne prikuplja i ne čuva vaše kartične podatke.
                  </p>
                  <p className="text-sm">
                    Sva plaćanja se obrađuju isključivo putem Stripe platne platforme, koja je
                    sertifikovana prema PCI DSS Level 1 standardu - najvišem nivou bezbednosti
                    u industriji plaćanja.
                  </p>
                </div>
                <p>Kada izvršite plaćanje na CarDrop platformi:</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Vaši kartični podaci (broj kartice, CVV, datum isteka) se unose direktno na Stripe-ov siguran formular</li>
                  <li>CarDrop serveri nikada ne primaju, ne obrađuju niti čuvaju vaše kartične podatke</li>
                  <li>Mi primamo samo potvrdu o uspešnoj transakciji, ID transakcije i iznos</li>
                  <li>Stripe kreira siguran Customer ID koji koristimo za povezivanje transakcija sa vašim nalogom</li>
                </ul>
                <p>
                  Za više informacija o tome kako Stripe obrađuje vaše podatke, posetite{" "}
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                    data-testid="link-stripe-privacy"
                  >
                    Stripe Politiku privatnosti
                  </a>.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Cookie className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">6. Kolačići i tehnologije praćenja</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <p>CarDrop koristi sledeće tehnologije:</p>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">6.1 Neophodni kolačići</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong className="text-foreground">Sesijski kolačići:</strong> Održavanje vaše prijave na platformu</li>
                    <li><strong className="text-foreground">CSRF zaštita:</strong> Sprečavanje Cross-Site Request Forgery napada</li>
                    <li><strong className="text-foreground">Podešavanja teme:</strong> Čuvanje vašeg izbora svetle/tamne teme</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">6.2 Funkcionalni kolačići</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong className="text-foreground">Izbor grada:</strong> Pamćenje vašeg poslednjeg izabranog grada</li>
                    <li><strong className="text-foreground">Korisničke preference:</strong> Čuvanje podešavanja filtera i prikaza</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">6.3 Treće strane</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong className="text-foreground">Stripe:</strong> Koristi sopstvene kolačiće za sigurnu obradu plaćanja</li>
                  </ul>
                </div>

                <p>
                  Možete upravljati kolačićima putem podešavanja vašeg web pregledača. Imajte u vidu
                  da onemogućavanje neophodnih kolačića može uticati na funkcionalnost platforme.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">7. Deljenje podataka sa trećim stranama</h3>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Vaše podatke ne prodajemo trećim stranama. Delimo podatke samo sa sledećim
                  pružaocima usluga koji su neophodni za funkcionisanje platforme:
                </p>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">7.1 Stripe (obrada plaćanja)</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Sedište: San Francisco, CA, SAD</li>
                    <li>Svrha: Sigurna obrada online plaćanja</li>
                    <li>Podaci: Podaci neophodni za obradu transakcije (bez direktnog prenosa kartičnih podataka sa naše strane)</li>
                    <li>Privatnost: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">stripe.com/privacy</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">7.2 Geoapify (mapiranje i geolokacija)</h4>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Svrha: Prikaz mapa, geokodiranje adresa, pretraga lokacija</li>
                    <li>Podaci: Koordinate lokacija, upiti za pretragu adresa</li>
                    <li>Privatnost: <a href="https://www.geoapify.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">geoapify.com/privacy-policy</a></li>
                  </ul>
                </div>

                <p>
                  Takođe možemo deliti vaše podatke ukoliko je to zakonski potrebno, na primer
                  na zahtev nadležnih državnih organa ili sudskih institucija.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">8. Međunarodni prenos podataka</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  S obzirom da je Ai Me IT LLC registrovana u SAD-u, a CarDrop platforma primarno
                  posluje u Srbiji i regionu Balkana, vaši podaci mogu biti preneti i obrađeni u
                  Sjedinjenim Američkim Državama.
                </p>
                <p>Kako štitimo vaše podatke prilikom međunarodnog prenosa:</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Primenjujemo odgovarajuće tehničke i organizacione mere zaštite</li>
                  <li>Koristimo šifrovane komunikacione kanale (HTTPS/TLS) za sav prenos podataka</li>
                  <li>Naši pružaoci usluga (Stripe i drugi) imaju sopstvene mehanizme usklađenosti sa GDPR regulativom, uključujući standardne ugovorne klauzule (SCC)</li>
                  <li>Primenjujemo principe minimizacije podataka - prikupljamo samo podatke koji su neophodni za funkcionisanje platforme</li>
                </ul>
                <p>
                  Korišćenjem CarDrop platforme, saglasni ste sa prenosom vaših podataka u SAD
                  u skladu sa merama zaštite opisanim u ovoj politici.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Server className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">9. Čuvanje i brisanje podataka</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <p>Vaše podatke čuvamo samo onoliko dugo koliko je potrebno za ispunjenje svrha opisanih u ovoj politici:</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li><strong className="text-foreground">Podaci o nalogu:</strong> Čuvaju se dok je vaš nalog aktivan. Nakon brisanja naloga, podaci se brišu u roku od 30 dana</li>
                  <li><strong className="text-foreground">Oglasi za parking mesta:</strong> Čuvaju se dok su aktivni. Istekli ili uklonjeni oglasi mogu biti zadržani do 90 dana u arhivi</li>
                  <li><strong className="text-foreground">Podaci o transakcijama:</strong> Čuvaju se najmanje 5 godina u skladu sa zakonskim obavezama za finansijsku dokumentaciju</li>
                  <li><strong className="text-foreground">Poruke između korisnika:</strong> Čuvaju se dok korisnici ne zatraže brisanje ili dok je nalog aktivan</li>
                  <li><strong className="text-foreground">Fotografije parking mesta:</strong> Brišu se kada se obriše odgovarajući oglas</li>
                  <li><strong className="text-foreground">Push notifikacija pretplate:</strong> Brišu se kada korisnik odjavi notifikacije ili obriše nalog</li>
                  <li><strong className="text-foreground">Log podaci:</strong> Čuvaju se do 12 meseci</li>
                </ul>
                <p>
                  Možete zatražiti brisanje vaših podataka kontaktiranjem na info@cardropp.app.
                  Obradićemo vaš zahtev u roku od 30 dana.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">10. Vaša prava</h3>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">10.1 Prava prema GDPR regulativi</h4>
                  <p className="mb-2">Kao korisnik, imate sledeća prava u vezi sa vašim ličnim podacima:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong className="text-foreground">Pravo na pristup:</strong> Imate pravo da zatražite kopiju svih podataka koje čuvamo o vama</li>
                    <li><strong className="text-foreground">Pravo na ispravku:</strong> Možete zatražiti ispravku netačnih ili nepotpunih podataka</li>
                    <li><strong className="text-foreground">Pravo na brisanje ("pravo na zaborav"):</strong> Možete zatražiti brisanje vaših ličnih podataka, osim kada postoji zakonska obaveza čuvanja</li>
                    <li><strong className="text-foreground">Pravo na ograničenje obrade:</strong> Možete zatražiti da ograničimo obradu vaših podataka u određenim okolnostima</li>
                    <li><strong className="text-foreground">Pravo na prenosivost podataka:</strong> Imate pravo da primite vaše podatke u strukturiranom, mašinski čitljivom formatu</li>
                    <li><strong className="text-foreground">Pravo na prigovor:</strong> Možete se usprotiviti obradi vaših podataka na osnovu legitimnog interesa</li>
                    <li><strong className="text-foreground">Pravo na povlačenje saglasnosti:</strong> Možete povući saglasnost za obradu podataka u bilo kom trenutku</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">10.2 Prava prema California Consumer Privacy Act (CCPA)</h4>
                  <p className="mb-2">
                    Ukoliko ste rezident Kalifornije, imate dodatna prava:
                  </p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong className="text-foreground">Pravo na informisanje:</strong> Pravo da znate koje kategorije ličnih podataka prikupljamo i u koje svrhe</li>
                    <li><strong className="text-foreground">Pravo na brisanje:</strong> Pravo da zatražite brisanje vaših ličnih podataka</li>
                    <li><strong className="text-foreground">Pravo da se ne diskriminiše:</strong> Nećete biti diskriminisani zbog ostvarivanja vaših prava na privatnost</li>
                    <li><strong className="text-foreground">Pravo na odjavu od prodaje:</strong> Ne prodajemo vaše lične podatke trećim stranama</li>
                  </ul>
                </div>

                <p>
                  Da biste ostvarili bilo koje od navedenih prava, kontaktirajte nas na{" "}
                  <a href="mailto:info@cardropp.app" className="text-primary underline" data-testid="link-contact-rights">
                    info@cardropp.app
                  </a>.
                  Odgovorićemo na vaš zahtev u roku od 30 dana.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">11. Push notifikacije</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  CarDrop koristi Web Push tehnologiju za slanje notifikacija. Ova funkcija
                  je potpuno opciona i zahteva vašu eksplicitnu saglasnost.
                </p>
                <p>Kada omogućite push notifikacije:</p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Vaš pregledač generiše jedinstvenu push pretplatu (subscription endpoint)</li>
                  <li>Koristimo VAPID (Voluntary Application Server Identification) ključeve za sigurnu komunikaciju</li>
                  <li>Podaci o pretplati se čuvaju u našoj bazi podataka</li>
                  <li>Šaljemo notifikacije o: novim porukama, promenama statusa rezervacija, i drugim relevantnim ažuriranjima</li>
                </ul>
                <p>
                  Možete onemogućiti push notifikacije u bilo kom trenutku putem podešavanja
                  vašeg web pregledača ili putem CarDrop platforme. Nakon onemogućavanja,
                  vaši podaci o pretplati se brišu iz naše baze podataka.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">12. Bezbednost podataka</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Preduzimamo odgovarajuće tehničke i organizacione mere za zaštitu vaših
                  ličnih podataka od neovlašćenog pristupa, izmene, otkrivanja ili uništenja:
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  <li><strong className="text-foreground">Šifrovanje u prenosu:</strong> Sva komunikacija sa platformom koristi HTTPS/TLS protokol</li>
                  <li><strong className="text-foreground">Sigurna autentifikacija:</strong> Koristimo sigurne metode autentifikacije sa šifrovanim lozinkama i Google OAuth</li>
                  <li><strong className="text-foreground">Sigurna obrada plaćanja:</strong> Stripe PCI DSS Level 1 sertifikacija garantuje najviši nivo zaštite finansijskih podataka</li>
                  <li><strong className="text-foreground">Kontrola pristupa:</strong> Pristup ličnim podacima je ograničen na ovlašćene osobe</li>
                  <li><strong className="text-foreground">Sigurno skladištenje:</strong> Baza podataka i cloud skladište fajlova koriste šifrovanje</li>
                  <li><strong className="text-foreground">Redovni pregledi:</strong> Redovno proveravamo naše bezbednosne prakse</li>
                </ul>
                <p>
                  Uprkos našim naporima, nijedan sistem za prenos ili skladištenje podataka
                  nije potpuno bezbedan. U slučaju bezbednosnog incidenta, obavestićemo
                  pogođene korisnike i nadležne organe u skladu sa zakonskim obavezama.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Baby className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">13. Privatnost dece</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  CarDrop platforma je namenjena isključivo osobama starijim od 18 godina.
                  Ne prikupljamo svesno lične podatke od dece mlađe od 18 godina.
                </p>
                <p>
                  Ukoliko saznamo da smo prikupili lične podatke od osobe mlađe od 18 godina,
                  preduzećemo korake da odmah obrišemo te podatke. Ako verujete da smo možda
                  prikupili informacije od maloletne osobe, kontaktirajte nas na{" "}
                  <a href="mailto:info@cardropp.app" className="text-primary underline" data-testid="link-contact-children">
                    info@cardropp.app
                  </a>.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">14. Izmene politike privatnosti</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Zadržavamo pravo da ažuriramo ovu Politiku privatnosti u bilo kom trenutku.
                  O značajnim izmenama ćemo vas obavestiti putem:
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Obaveštenja na platformi (push notifikacija, ukoliko ste ih omogućili)</li>
                  <li>Istaknutog obaveštenja na web stranici</li>
                  <li>Ažuriranja datuma "Poslednje ažurirano" na vrhu ovog dokumenta</li>
                </ul>
                <p>
                  Nastavak korišćenja CarDrop platforme nakon objave izmena smatraće se
                  vašim prihvatanjem ažurirane Politike privatnosti. Preporučujemo da
                  povremeno proveravate ovu stranicu radi eventualnih promena.
                </p>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-semibold">15. Kontakt informacije</h3>
              </div>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Za sva pitanja, zahteve ili pritužbe u vezi sa ovom Politikom privatnosti
                  ili obradom vaših ličnih podataka, kontaktirajte nas:
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  <li><strong className="text-foreground">Kompanija:</strong> Ai Me IT LLC</li>
                  <li><strong className="text-foreground">Adresa:</strong> 1209 Mountain Road PL NE, STE N, Albuquerque, NM 87110, USA</li>
                  <li>
                    <strong className="text-foreground">Email:</strong>{" "}
                    <a href="mailto:info@cardropp.app" className="text-primary underline" data-testid="link-contact-email">
                      info@cardropp.app
                    </a>
                  </li>
                </ul>
                <p>
                  Potrudićemo se da odgovorimo na vaš zahtev u roku od 30 dana. Ukoliko
                  niste zadovoljni našim odgovorom, imate pravo da podnesete pritužbu
                  nadležnom organu za zaštitu podataka.
                </p>
              </div>
            </section>

            <div className="pt-6 border-t">
              <Link href="/">
                <Button variant="outline" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Nazad na Početnu
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}