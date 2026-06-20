import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Shield, AlertTriangle, FileText, ArrowLeft } from "lucide-react";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";
import { useLanguage } from "@/hooks/useLanguage";

const termsT = {
  sr: {
    pageTitle: "Uslovi Korišćenja",
    lastUpdated: "Poslednje ažurirano: Februar 2026",
    backButton: "Nazad na Početnu",
    sections: [
      "1. Prihvatanje Uslova",
      "2. Definicija Platforme",
      "3. ODRICANJE ODGOVORNOSTI – VAŽNO OBAVEŠTENJE",
      "4. Registracija i Korisničke Obaveze",
      "5. Obaveze Vlasnika Parking Mesta",
      "6. Obaveze Zakupaca",
      "7. Pretplate i Plaćanja",
      "10. Sadržaj Korisnika",
      "11. Sistem Ocenjivanja",
      "12. Intelektualna Svojina",
      "13. Zabranjena Ponašanja",
      "14. Raskid Naloga",
      "15. Ograničenje Odgovornosti",
      "16. Obeštećenje",
      "17. Primenljivo Pravo",
      "18. Rešavanje Sporova",
      "19. Kontakt sa Trećim Stranama",
      "20. Izmene Uslova",
      "21. Završne Odredbe",
      "22. Kontakt Informacije",
    ],
  },
  en: {
    pageTitle: "Terms of Use",
    lastUpdated: "Last updated: February 2026",
    backButton: "Back to Home",
    sections: [
      "1. Acceptance of Terms",
      "2. Definition of the Platform",
      "3. DISCLAIMER OF LIABILITY – IMPORTANT NOTICE",
      "4. Registration and User Obligations",
      "5. Obligations of Parking Space Owners",
      "6. Obligations of Tenants",
      "7. Subscriptions and Payments",
      "10. User Content",
      "11. Review System",
      "12. Intellectual Property",
      "13. Prohibited Behaviors",
      "14. Account Termination",
      "15. Limitation of Liability",
      "16. Indemnification",
      "17. Applicable Law",
      "18. Dispute Resolution",
      "19. Third-Party Services",
      "20. Amendments to Terms",
      "21. Final Provisions",
      "22. Contact Information",
    ],
  },
};

export default function Terms() {
  const { language, setLanguage } = useLanguage();
  const t = language === "sr" ? termsT.sr : termsT.en;
  const s = t.sections;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
              <img src={parkInLogo} alt="CarDrop" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold">CarDrop</span>
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <FileText className="w-8 h-8 text-primary" />
              <CardTitle className="text-3xl">{t.pageTitle}</CardTitle>
            </div>
            <p className="text-muted-foreground">{t.lastUpdated}</p>
          </CardHeader>

          <CardContent className="space-y-8">

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[0]}</h3>
              <p className="text-muted-foreground mb-3">
                This service is provided by Ai Me IT LLC, a company registered in the United States, operating globally.
              </p>
              <p className="text-muted-foreground">
                Korišćenjem CarDrop platforme (u daljem tekstu: „Platforma"), uključujući pristup veb sajtu, mobilnoj aplikaciji i svim povezanim uslugama, potvrđujete da ste pročitali, razumeli i prihvatili ove Uslove Korišćenja (u daljem tekstu: „Uslovi") u celosti. Ako se ne slažete sa bilo kojim delom ovih Uslova, molimo vas da odmah prestanete sa korišćenjem Platforme. Nastavak korišćenja Platforme nakon izmena ovih Uslova predstavlja vaše prihvatanje izmenjenih Uslova. Ovi Uslovi predstavljaju pravno obavezujući ugovor između vas i kompanije Ai Me IT LLC.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[1]}</h3>
              <p className="text-muted-foreground mb-3">
                CarDrop je oglasna tabla (platforma za oglašavanje) koja omogućava vlasnicima parking mesta da oglase svoja parking mesta, a zainteresovanim korisnicima da pronađu i kontaktiraju vlasnike tih parking mesta. CarDrop funkcioniše isključivo kao posrednik u informisanju – tehnološka platforma koja povezuje korisnike.
              </p>
              <p className="text-muted-foreground mb-3">
                CarDrop izričito:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li><strong>NE</strong> poseduje, ne upravlja i ne kontroliše nijedno parking mesto koje se oglašava na Platformi</li>
                <li><strong>NE</strong> učestvuje direktno u fizičkom pružanju usluge parkiranja</li>
                <li><strong>NE</strong> garantuje dostupnost, kvalitet, bezbednost ili zakonitost oglašenih parking mesta</li>
                <li><strong>NE</strong> pruža usluge parkiranja niti iznajmljivanja parking mesta</li>
                <li><strong>NE</strong> preuzima nikakvu odgovornost za fizičko stanje parking mesta ili štetu na vozilima</li>
                <li><strong>NE</strong> preuzima nikakvu odgovornost za ishod dogovora između korisnika van platforme</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                CarDrop <strong>obrađuje online plaćanja rezervacija</strong> kao tehnički posrednik putem Stripe platforme, pri čemu naplaćuje posredničku naknadu od <strong>15% od vrednosti svake uspešno realizovane rezervacije</strong>. Ostatak od 85% isplaćuje se vlasniku parking mesta prema kalendarskom rasporedu isplata, umanjeno za eventualne troškove bankarske transakcije.
              </p>
            </section>

            <section>
              <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-7 h-7 text-destructive mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-destructive mb-3">{s[2]}</h3>
                    <p className="text-sm font-semibold text-destructive mb-3">
                      PAŽLJIVO PROČITAJTE OVAJ ODELJAK. KORIŠĆENJEM PLATFORME PRIHVATATE SVE NAVEDENE USLOVE.
                    </p>
                    <p className="text-sm text-foreground/80 mb-3">
                      CarDrop platforma, kompanija Ai Me IT LLC, njeni vlasnici, direktori, zaposleni, partneri i povezana lica (u daljem tekstu zajedno: „CarDrop") <strong>NE SNOSE NIKAKVU ODGOVORNOST</strong> za bilo kakve probleme, štete, gubitke ili nezadovoljstva koja mogu nastati u vezi sa korišćenjem Platforme ili parking mesta oglašenih na Platformi. Ovo uključuje, ali nije ograničeno na:
                    </p>
                    <ul className="space-y-2 text-sm text-foreground/80 list-disc list-inside mb-4">
                      <li><strong>Kvalitet parking mesta</strong> – stanje, čistoća, veličina, pristupačnost ili bilo koji drugi aspekt parking mesta</li>
                      <li><strong>Sporove između korisnika</strong> – neslaganja, konflikti ili bilo kakvi problemi nastali između vlasnika i zakupaca</li>
                      <li><strong>Štete na vozilima ili imovini</strong> – oštećenja, krađa, vandalizam ili bilo kakav gubitak imovine</li>
                      <li><strong>Netačne oglase</strong> – pogrešne ili obmanjujuće informacije u oglasima korisnika</li>
                      <li><strong>Probleme sa pristupom</strong> – nemogućnost pristupa parking mestu, zaključana vrata, nedostupnost vlasnika</li>
                      <li><strong>Finansijske sporove</strong> – bilo kakvi sporovi u vezi sa plaćanjima, cenama ili povraćajem novca između korisnika</li>
                      <li><strong>Ličnu bezbednost</strong> – bilo kakvi incidenti, povrede ili problemi sa bezbednošću korisnika</li>
                      <li><strong>Zakonitost</strong> – pitanja u vezi sa pravom vlasnika da iznajmljuje ili koristi određeni prostor</li>
                      <li><strong>Poreske obaveze</strong> – poreske posledice transakcija između korisnika</li>
                    </ul>
                    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                      <p className="text-sm font-semibold text-destructive">
                        SVE TRANSAKCIJE, DOGOVORI I PLAĆANJA SU DIREKTNO IZMEĐU KORISNIKA. CarDrop pruža isključivo tehnološku platformu za oglašavanje i povezivanje korisnika i ne učestvuje ni u jednom aspektu transakcije između korisnika. Korišćenjem Platforme izričito prihvatate ovo odricanje odgovornosti.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[3]}</h3>
              <p className="text-muted-foreground mb-3">
                Da biste koristili određene funkcije Platforme, potrebno je da kreirate korisnički nalog. Registracijom na Platformu, vi:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Garantujete da imate najmanje 18 godina</li>
                <li>Garantujete da su sve informacije koje ste naveli tačne, potpune i ažurirane</li>
                <li>Ste odgovorni za čuvanje sigurnosti vašeg naloga, lozinke i pristupnih podataka</li>
                <li>Ste odgovorni za sve aktivnosti koje se obavljaju putem vašeg naloga</li>
                <li>Se obavezujete da ćete odmah obavestiti CarDrop o bilo kakvom neovlašćenom korišćenju vašeg naloga</li>
                <li>Prihvatate da CarDrop može zahtevati verifikaciju vaših podataka</li>
                <li>Prihvatate da je zabranjeno kreiranje više naloga od strane jednog korisnika</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[4]}</h3>
              <p className="text-muted-foreground mb-3">
                Korisnici koji oglašavaju parking mesta na Platformi (u daljem tekstu: „Vlasnici") su u potpunosti odgovorni za:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Tačnost i potpunost svih informacija navedenih u oglasu, uključujući lokaciju, dimenzije, fotografije, uslove korišćenja i cenu</li>
                <li>Obezbeđivanje da imaju zakonsko pravo da oglašavaju i izdaju dati prostor za parkiranje</li>
                <li>Održavanje parking mesta u stanju koje odgovara opisu u oglasu</li>
                <li>Obezbeđivanje dostupnosti parking mesta u oglašenim terminima</li>
                <li>Poštovanje svih lokalnih zakona i propisa koji se odnose na iznajmljivanje parking prostora</li>
                <li>Sve poreske obaveze koje proizlaze iz prihoda ostvarenih iznajmljivanjem parking mesta – CarDrop ne preuzima nikakvu odgovornost za poreske obaveze korisnika</li>
                <li>Komunikaciju sa zakupcima i rešavanje eventalnih problema</li>
                <li>Obezbeđivanje bezbednih uslova za parkiranje</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[5]}</h3>
              <p className="text-muted-foreground mb-3">
                Korisnici koji koriste Platformu za pronalaženje parking mesta (u daljem tekstu: „Zakupci") su odgovorni za:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Pravovremeno plaćanje dogovorene cene direktno vlasniku parking mesta</li>
                <li>Korišćenje parking mesta u skladu sa uslovima navedenim u oglasu i dogovorenim sa vlasnikom</li>
                <li>Dolazak i odlazak u dogovorenom terminu</li>
                <li>Pažljivo korišćenje parking mesta bez nanošenja štete</li>
                <li>Poštovanje pravila lokacije na kojoj se parking mesto nalazi</li>
                <li>Komunikaciju sa vlasnikom u slučaju bilo kakvih problema ili kašnjenja</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[6]}</h3>
              <p className="text-muted-foreground mb-3">
                CarDrop nudi sledeće pakete pretplate za oglašavanje parking mesta:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside mb-3">
                <li><strong>Besplatan (Free)</strong> – osnovno oglašavanje, neograničeno trajanje, 0 RSD</li>
                <li><strong>Premium mesečni</strong> – 1.000 RSD / 30 dana – zlatni okvir, prioritetno rangiranje</li>
                <li><strong>Premium polugodišnji</strong> – 5.000 RSD / 180 dana (uštedite 17%)</li>
                <li><strong>Premium godišnji</strong> – 9.000 RSD / 365 dana (uštedite 25%)</li>
                <li><strong>Za firme i kamionske parkinge</strong> – posebni planovi, dostupni na upit</li>
              </ul>
              <p className="text-muted-foreground mb-3">
                Sva plaćanja pretplata obrađuju se putem <strong>Stripe</strong> platnog procesora. CarDrop ne čuva podatke o platnim karticama – sve obrađuje isključivo Stripe (PCI DSS Level 1).
              </p>
              <p className="text-muted-foreground mb-3">
                <strong>Automatsko obnavljanje:</strong> Pretplate se automatski obnavljaju na kraju obračunskog perioda, osim ako korisnik ne otkaže pre isteka. Otkazivanje je moguće u svakom trenutku u podešavanjima naloga ili na info@cardropp.app.
              </p>
              <p className="text-muted-foreground">
                <strong>Povraćaj pretplata:</strong> Plaćene pretplate se generalno ne vraćaju. U izuzetnim slučajevima CarDrop može po sopstvenom nahođenju odobriti delimičan povraćaj. Zahteve šaljite na info@cardropp.app.
              </p>
            </section>

            {/* Naknada platforme i finansijski model */}
            <section>
              <h3 className="text-xl font-semibold mb-3">
                {language === "sr" ? "8. Naknada Platforme i Raspodela Prihoda" : "8. Platform Fee and Revenue Distribution"}
              </h3>
              <p className="text-muted-foreground mb-3">
                {language === "sr"
                  ? "Za svaku uspešno realizovanu rezervaciju putem platforme, CarDrop naplaćuje posredničku naknadu u iznosu od:"
                  : "For each successfully completed booking through the platform, CarDrop charges an intermediary fee of:"}
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-3 flex gap-6 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">15%</p>
                  <p className="text-sm text-muted-foreground">{language === "sr" ? "Naknada platforme" : "Platform fee"}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">85%</p>
                  <p className="text-sm text-muted-foreground">{language === "sr" ? "Vlasniku parking mesta" : "To parking space owner"}</p>
                </div>
              </div>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>
                  {language === "sr"
                    ? "Vlasniku pripada 85% uplaćenog iznosa, umanjeno za eventualne troškove bankarske transakcije (Stripe)."
                    : "The owner receives 85% of the paid amount, minus any bank transaction fees (Stripe)."}
                </li>
                <li>
                  {language === "sr"
                    ? "Isplate se vrše prema kalendarskom rasporedu isplata koji CarDrop objavljuje na platformi."
                    : "Payouts are made according to the payment schedule published by CarDrop on the platform."}
                </li>
                <li>
                  {language === "sr"
                    ? "CarDrop zadržava pravo izmene naknade uz prethodnu najavu od 30 dana korisnicima."
                    : "CarDrop reserves the right to change the fee with 30 days prior notice to users."}
                </li>
              </ul>
            </section>

            {/* Politika otkazivanja i povraćaja */}
            <section>
              <h3 className="text-xl font-semibold mb-3">
                {language === "sr" ? "9. Politika Otkazivanja i Povraćaja Novca" : "9. Cancellation and Refund Policy"}
              </h3>

              <p className="text-muted-foreground mb-4">
                {language === "sr"
                  ? "Pravila otkazivanja rezervacija zavise od toga ko otkazuje i kada:"
                  : "Cancellation rules depend on who cancels and when:"}
              </p>

              <div className="space-y-4">
                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">
                    {language === "sr" ? "A) Korisnik (zakupac) otkazuje rezervaciju" : "A) User (renter) cancels the booking"}
                  </h4>
                  <ul className="space-y-2 text-muted-foreground text-sm list-disc list-inside">
                    <li>
                      <strong>{language === "sr" ? "Blagovremeno otkazivanje (više od 7 dana pre početka):" : "Early cancellation (more than 7 days before start):"}</strong>{" "}
                      {language === "sr"
                        ? "Povraćaj 90% uplaćenog iznosa. Preostalih 10% zadržava platforma na ime administrativnih troškova."
                        : "90% refund of the paid amount. The remaining 10% is retained by the platform as an administrative fee."}
                    </li>
                    <li>
                      <strong>{language === "sr" ? "Kasno otkazivanje (manje od 7 dana pre početka):" : "Late cancellation (less than 7 days before start):"}</strong>{" "}
                      {language === "sr"
                        ? "Povraćaj 50% uplaćenog iznosa. Ostatak služi kao kompenzacija vlasniku parkinga i platformi."
                        : "50% refund of the paid amount. The remainder compensates the parking owner and platform."}
                    </li>
                  </ul>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold text-foreground mb-2">
                    {language === "sr" ? "B) Vlasnik parkinga otkazuje rezervaciju" : "B) Parking owner cancels the booking"}
                  </h4>
                  <ul className="space-y-2 text-muted-foreground text-sm list-disc list-inside">
                    <li>
                      {language === "sr"
                        ? "Korisniku (zakupcu) se vraća 100% uplaćenog iznosa, bez obzira na vreme otkazivanja."
                        : "The user (renter) receives a 100% refund of the paid amount, regardless of when the cancellation occurs."}
                    </li>
                    <li>
                      {language === "sr"
                        ? "Napomena: Učestalo otkazivanje od strane vlasnika može dovesti do penalizacije ili privremenog/trajnog suspendovanja profila na CarDrop platformi."
                        : "Note: Frequent cancellations by the owner may result in penalties or temporary/permanent suspension of the profile on the CarDrop platform."}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[7]}</h3>
              <p className="text-muted-foreground mb-3">
                Korisnici mogu kreirati i objavljivati sadržaj na Platformi, uključujući oglase za parking mesta, recenzije, fotografije, komentare i poruke (u daljem tekstu: „Korisnički Sadržaj"). Objavljivanjem Korisničkog Sadržaja na Platformi, vi:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside mb-3">
                <li>Garantujete da imate pravo na objavljivanje tog sadržaja i da sadržaj ne krši prava trećih lica</li>
                <li>Garantujete da je sadržaj tačan i da ne sadrži obmanjujuće informacije</li>
                <li>Ste u potpunosti odgovorni za sadržaj koji objavljujete</li>
                <li>Prihvatate da CarDrop ima pravo da ukloni bilo koji sadržaj koji smatra neprimerenim, netačnim, uvredljivim ili koji krši ove Uslove, bez prethodnog obaveštenja</li>
              </ul>
              <p className="text-muted-foreground">
                CarDrop ne pregleda sistematski sav Korisnički Sadržaj i ne snosi odgovornost za tačnost, potpunost ili zakonitost sadržaja koji korisnici objavljuju.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[8]}</h3>
              <p className="text-muted-foreground mb-3">
                Platforma omogućava korisnicima da ostavljaju ocene i recenzije nakon interakcije sa drugim korisnicima. U vezi sa sistemom ocenjivanja:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Recenzije moraju biti istinite, zasnovane na stvarnom iskustvu i konstruktivne</li>
                <li>Zabranjeno je ostavljanje lažnih, obmanjujućih ili zlonamernih recenzija</li>
                <li>CarDrop zadržava pravo da ukloni recenzije koje su lažne, uvredljive, diskriminatorne ili koje na drugi način krše ove Uslove</li>
                <li>Manipulacija sistemom ocenjivanja (uključujući kupovinu recenzija ili ucenjivanje) je strogo zabranjena i može dovesti do trajnog brisanja naloga</li>
                <li>CarDrop ne garantuje tačnost recenzija i ne snosi odgovornost za odluke donete na osnovu recenzija drugih korisnika</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[9]}</h3>
              <p className="text-muted-foreground mb-3">
                Sav sadržaj Platforme, uključujući ali ne ograničavajući se na naziv „CarDrop", logotip, dizajn, tekstove, grafiku, softver, kôd i ostale materijale, vlasništvo je kompanije Ai Me IT LLC ili njenih davatelja licence, i zaštićen je zakonima o intelektualnoj svojini.
              </p>
              <p className="text-muted-foreground mb-3">
                Objavljivanjem sadržaja na Platformi, korisnik daje CarDrop-u neekskluzivnu, besplatnu, svetsku, prenosivu licencu za korišćenje, prikazivanje, reprodukovanje i distribuciju tog sadržaja u svrhe funkcionisanja i promovisanja Platforme.
              </p>
              <p className="text-muted-foreground">
                Zabranjeno je kopiranje, distribucija, modifikacija ili korišćenje bilo kog dela Platforme ili njenog sadržaja bez prethodne pisane saglasnosti kompanije Ai Me IT LLC.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[10]}</h3>
              <p className="text-muted-foreground mb-3">
                Korišćenjem Platforme, obavezujete se da nećete:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Objavljivati lažne, obmanjujuće ili prevarantske oglase</li>
                <li>Koristiti Platformu za prevaru ili bilo kakvu nezakonitu aktivnost</li>
                <li>Uznemiravati, pretiti ili zlostavljati druge korisnike</li>
                <li>Slati neželjene poruke (spam) ili reklamni materijal</li>
                <li>Pokušavati da zaobiđete Platformu radi izbegavanja provizija ili pretplata</li>
                <li>Prikupljati lične podatke drugih korisnika bez njihove saglasnosti</li>
                <li>Koristiti automatizovane alate (botove, skrapere) za pristup Platformi</li>
                <li>Pokušavati da pristupite neovlašćenim delovima sistema ili infrastrukture Platforme</li>
                <li>Objavljivati sadržaj koji je uvredljiv, diskriminatorski, ili koji promoviše nasilje</li>
                <li>Kršiti bilo koje primenljive lokalne, nacionalne ili međunarodne zakone</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[11]}</h3>
              <p className="text-muted-foreground mb-3">
                CarDrop zadržava pravo da, po sopstvenom nahođenju i bez prethodnog obaveštenja:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside mb-3">
                <li>Privremeno suspenduje ili trajno obriše korisnički nalog</li>
                <li>Ograniči pristup određenim funkcijama Platforme</li>
                <li>Ukloni bilo koji sadržaj korisnika</li>
                <li>Odbije pružanje usluge bilo kom korisniku</li>
              </ul>
              <p className="text-muted-foreground mb-3">
                Razlozi za suspenziju ili brisanje naloga uključuju, ali nisu ograničeni na: kršenje ovih Uslova, prevarantsko ponašanje, pritužbe drugih korisnika, neaktivnost naloga ili bilo koji drugi razlog koji CarDrop smatra opravdanim.
              </p>
              <p className="text-muted-foreground">
                Korisnik može u svakom trenutku zatvoriti svoj nalog kontaktiranjem korisničke podrške na info@cardropp.app. Zatvaranje naloga ne oslobađa korisnika od obaveza nastalih pre zatvaranja naloga.
              </p>
            </section>

            <section>
              <div className="bg-destructive/5 border border-destructive/15 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-destructive mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-destructive mb-3">{s[12]}</h3>
                    <p className="text-sm text-foreground/80 mb-3">
                      PLATFORMA SE PRUŽA „KAKVA JESTE" (AS IS) I „KAKO JE DOSTUPNA" (AS AVAILABLE), BEZ BILO KAKVIH GARANCIJA, IZRIČITIH ILI PODRAZUMEVANIH, UKLJUČUJUĆI ALI NE OGRANIČAVAJUĆI SE NA GARANCIJE TRŽIŠNE VREDNOSTI, POGODNOSTI ZA ODREĐENU SVRHU ILI NEKRŠENJA PRAVA TREĆIH LICA.
                    </p>
                    <p className="text-sm text-foreground/80 mb-3">
                      CarDrop, Ai Me IT LLC, njihovi vlasnici, direktori, zaposleni i partneri neće ni u kom slučaju biti odgovorni za bilo kakvu direktnu, indirektnu, slučajnu, posebnu, posledičnu ili kaznenu štetu, uključujući ali ne ograničavajući se na gubitak dobiti, podataka, korišćenja, reputacije ili drugih nematerijalnih gubitaka, koja proizlazi iz:
                    </p>
                    <ul className="space-y-1 text-sm text-foreground/80 list-disc list-inside mb-3">
                      <li>Korišćenja ili nemogućnosti korišćenja Platforme</li>
                      <li>Bilo kakve transakcije ili odnosa između korisnika</li>
                      <li>Neovlašćenog pristupa vašim podacima</li>
                      <li>Grešaka, virusa ili kvarova na Platformi</li>
                      <li>Sadržaja objavljenog od strane korisnika</li>
                    </ul>
                    <p className="text-sm font-semibold text-foreground/80">
                      U svakom slučaju, maksimalna ukupna odgovornost CarDrop-a prema bilo kom korisniku ograničena je na iznos pretplatničkih naknada koje je taj korisnik platio CarDrop-u u periodu od 12 meseci pre nastanka spornog događaja, ili 50 USD, zavisno od toga koji je iznos manji.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[13]}</h3>
              <p className="text-muted-foreground">
                Korišćenjem Platforme, prihvatate da ćete obeštetiti, braniti i zaštititi kompaniju Ai Me IT LLC, njene vlasnike, direktore, zaposlene, agente, partnere i povezana lica od svih potraživanja, tužbi, zahteva, gubitaka, šteta, troškova i izdataka (uključujući razumne advokatske troškove) koji proizlaze iz ili su u vezi sa: (a) vašim korišćenjem Platforme, (b) vašim Korisničkim Sadržajem, (c) vašim kršenjem ovih Uslova, (d) vašim kršenjem prava trećih lica, ili (e) bilo kakvim sporom između vas i drugih korisnika Platforme. Ova obaveza obeštećenja ostaje na snazi i nakon prestanka korišćenja Platforme.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[14]}</h3>
              <p className="text-muted-foreground mb-3">
                Ovi Uslovi su regulisani i tumače se u skladu sa zakonima države Novi Meksiko (State of New Mexico), Sjedinjene Američke Države, bez obzira na odredbe o sukobu zakona.
              </p>
              <p className="text-muted-foreground">
                Za sve sporove koji ne mogu biti rešeni arbitražom ili medijacijom, nadležni su isključivo sudovi u Albuquerque-u, država Novi Meksiko, SAD. Korišćenjem Platforme pristajete na isključivu nadležnost navedenih sudova.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[15]}</h3>
              <p className="text-muted-foreground mb-3">
                U slučaju bilo kakvog spora koji proizlazi iz ovih Uslova ili korišćenja Platforme, strane se obavezuju da će najpre pokušati da reše spor mirnim putem – direktnim pregovorima.
              </p>
              <p className="text-muted-foreground mb-3">
                <strong>Medijacija:</strong> Ukoliko spor ne može biti rešen direktnim pregovorima u roku od 30 dana, strane se obavezuju da će pokušati da reše spor putem medijacije pre pokretanja formalnog postupka.
              </p>
              <p className="text-muted-foreground mb-3">
                <strong>Arbitraža:</strong> Ukoliko medijacija ne dovede do rešenja, spor će biti rešen obavezujućom arbitražom u skladu sa pravilima Američke Arbitražne Asocijacije (American Arbitration Association), koja će se održati u Albuquerque-u, Novi Meksiko, SAD. Odluka arbitraže je konačna i obavezujuća za obe strane.
              </p>
              <p className="text-muted-foreground">
                <strong>Odricanje od grupnih tužbi:</strong> Korišćenjem Platforme prihvatate da ćete sve sporove rešavati isključivo u individualnom kapacitetu, a ne kao član bilo kakve grupne ili kolektivne tužbe.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[16]}</h3>
              <p className="text-muted-foreground mb-3">
                Platforma koristi usluge trećih strana za svoje funkcionisanje. CarDrop nije odgovoran za usluge, politike privatnosti ili prakse ovih trećih strana:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside mb-3">
                <li><strong>Stripe</strong> – za obradu plaćanja pretplata. Korišćenjem platnih usluga na Platformi prihvatate Stripe-ove uslove korišćenja</li>
                <li><strong>Cloud infrastruktura</strong> – za hosting i rad Platforme</li>
                <li><strong>Geoapify</strong> – za geolokacijske usluge i prikaz mapa</li>
              </ul>
              <p className="text-muted-foreground">
                CarDrop ne garantuje neprekidnost, tačnost ili pouzdanost usluga trećih strana i ne snosi odgovornost za bilo kakve probleme nastale usled grešaka, prekida ili promena u uslugama trećih strana.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[17]}</h3>
              <p className="text-muted-foreground mb-3">
                CarDrop zadržava pravo da izmeni, dopuni ili zameni ove Uslove u bilo kom trenutku. Izmenjeni Uslovi stupaju na snagu danom objavljivanja na Platformi.
              </p>
              <p className="text-muted-foreground mb-3">
                O značajnim izmenama korisnici će biti obavešteni putem:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside mb-3">
                <li>Obaveštenja na Platformi</li>
                <li>Elektronske pošte na registrovanu adresu</li>
                <li>Obaveznog prihvatanja novih uslova pri sledećem prijavljivanju</li>
              </ul>
              <p className="text-muted-foreground">
                Nastavak korišćenja Platforme nakon izmene Uslova smatra se prihvatanjem izmenjenih Uslova. Ako se ne slažete sa izmenjenim Uslovima, vaš jedini pravni lek je da prestanete sa korišćenjem Platforme i zatvorite svoj nalog.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[18]}</h3>
              <p className="text-muted-foreground mb-3">
                <strong>Odvojivost:</strong> Ako se bilo koja odredba ovih Uslova proglasi nevažećom ili neprimenljivom, ostale odredbe ostaju na snazi u punom obimu.
              </p>
              <p className="text-muted-foreground mb-3">
                <strong>Odricanje od prava:</strong> Propust CarDrop-a da primeni bilo koje pravo ili odredbu ovih Uslova ne predstavlja odricanje od tog prava ili odredbe.
              </p>
              <p className="text-muted-foreground mb-3">
                <strong>Celokupan ugovor:</strong> Ovi Uslovi, zajedno sa <Link href="/privacy-policy" className="text-primary underline" data-testid="link-privacy-policy">Politikom Privatnosti</Link>, čine celokupan ugovor između vas i CarDrop-a u vezi sa korišćenjem Platforme i zamenjuju sve prethodne ugovore ili dogovore.
              </p>
              <p className="text-muted-foreground mb-3">
                <strong>Ustupanje:</strong> CarDrop može ustupiti svoja prava i obaveze iz ovih Uslova trećim licima bez vaše saglasnosti. Vi ne možete ustupiti svoja prava i obaveze bez prethodne pisane saglasnosti CarDrop-a.
              </p>
              <p className="text-muted-foreground">
                <strong>Viša sila:</strong> CarDrop neće biti odgovoran za kašnjenje ili nemogućnost izvršenja obaveza usled okolnosti van njegove razumne kontrole, uključujući ali ne ograničavajući se na prirodne katastrofe, ratove, pandemije, vladine mere ili tehničke kvarove.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-3">{s[19]}</h3>
              <p className="text-muted-foreground mb-3">
                Za sva pitanja u vezi sa ovim Uslovima Korišćenja, možete nas kontaktirati:
              </p>
              <div className="text-muted-foreground space-y-1">
                <p><strong>Kompanija:</strong> Ai Me IT LLC</p>
                <p><strong>Adresa:</strong> 1209 Mountain Road PL NE, STE N, Albuquerque, NM 87110, USA</p>
                <p><strong>E-pošta:</strong> <a href="mailto:info@cardropp.app" className="text-primary underline" data-testid="link-contact-email">info@cardropp.app</a></p>
              </div>
            </section>

            <div className="pt-6 border-t">
              <Link href="/">
                <Button variant="outline" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t.backButton}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
