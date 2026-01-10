import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Shield, AlertTriangle, FileText } from "lucide-react";
import parkInLogo from "@assets/Parkin pic_1763062246399.png";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8 text-primary" />
              <CardTitle className="text-3xl">Uslovi Korišćenja</CardTitle>
            </div>
            <p className="text-muted-foreground">
              Poslednje ažurirano: Oktobar 2024
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Disclaimer Section */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-destructive mb-2">
                    Važno Obaveštenje - Odricanje Odgovornosti
                  </h3>
                  <p className="text-sm text-foreground/80">
                    <strong>CarDrop platforma i vlasnik sajta nisu odgovorni</strong> za bilo kakve probleme, 
                    štete ili nezadovoljstva koja mogu nastati u vezi sa parking mestom. Ovo uključuje, ali nije 
                    ograničeno na:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/80 list-disc list-inside">
                    <li>Vlasnik parking mesta nije obezbedio mesto na vreme</li>
                    <li>Parking mesto nije bilo u očekivanom stanju</li>
                    <li>Netačne informacije o lokaciji ili uslovima parking mesta</li>
                    <li>Bilo kakva šteta na vozilu ili ličnoj imovini</li>
                    <li>Problemi sa pristupom parking mestu</li>
                    <li>Bilo koji drugi problemi između vlasnika i iznajmljivača</li>
                  </ul>
                  <p className="mt-3 text-sm text-foreground/80">
                    Sve transakcije i dogovori su direktno između vlasnika parking mesta i iznajmljivača. 
                    CarDrop je samo platforma koja omogućava povezivanje korisnika.
                  </p>
                </div>
              </div>
            </div>

            {/* General Terms */}
            <div>
              <h3 className="text-xl font-semibold mb-3">1. Prihvatanje Uslova</h3>
              <p className="text-muted-foreground">
                Korišćenjem CarDrop platforme, prihvatate sve uslove korišćenja navedene u ovom dokumentu. 
                Ako se ne slažete sa ovim uslovima, molimo vas da ne koristite našu platformu.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">2. Odgovornost Korisnika</h3>
              <p className="text-muted-foreground mb-3">
                Kao korisnik CarDrop platforme, vi ste odgovorni za:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Tačnost svih informacija koje navedete</li>
                <li>Poštovanje dogovorenih termina i uslova</li>
                <li>Direktnu komunikaciju sa drugom stranom u slučaju problema</li>
                <li>Poštovanje svih lokalnih zakona i propisa o parkiranju</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">3. Odgovornost Vlasnika Parking Mesta</h3>
              <p className="text-muted-foreground mb-3">
                Vlasnici parking mesta su odgovorni za:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Tačan opis parking mesta i svih uslova</li>
                <li>Obezbeđivanje pristupa parking mestu u dogovoreno vreme</li>
                <li>Osiguravanje da je mesto slobodne i dostupno kako je oglašeno</li>
                <li>Održavanje parking mesta u bezbednom stanju</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">4. Odgovornost Iznajmljivača</h3>
              <p className="text-muted-foreground mb-3">
                Iznajmljivači parking mesta su odgovorni za:
              </p>
              <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                <li>Plaćanje rezervacije u dogovorenom iznosu</li>
                <li>Dolazak u dogovoreno vreme</li>
                <li>Korišćenje parking mesta u skladu sa pravilima</li>
                <li>Napuštanje parking mesta u očekivanom roku</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">5. Plaćanja i Povraćaj Novca</h3>
              <p className="text-muted-foreground">
                Sva plaćanja se obrađuju putem Monri platnog sistema. CarDrop zadržava pravo provizije 
                na svaku transakciju. Politike povraćaja novca se određuju direktno između vlasnika i 
                iznajmljivača, i CarDrop ne učestvuje u procesu povraćaja novca.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">6. Sistem Ocenjivanja</h3>
              <p className="text-muted-foreground">
                Korisnici mogu ocenjivati i ostavljati recenzije nakon završene transakcije. 
                Recenzije moraju biti istinite i konstruktivne. CarDrop zadržava pravo da ukloni 
                neodgovarajuće ili uvredljive recenzije.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">7. Privatnost Podataka</h3>
              <p className="text-muted-foreground">
                Vaši lični podaci se koriste isključivo za funkcionisanje platforme. 
                Nećemo deliti vaše podatke sa trećim stranama bez vaše saglasnosti, osim kada to zahteva zakon.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">8. Izmene Uslova</h3>
              <p className="text-muted-foreground">
                ParkShare zadržava pravo da izmeni ove uslove korišćenja u bilo kom trenutku. 
                Korisnici će biti obavešteni o značajnim izmenama.
              </p>
            </div>

            {/* Back Button */}
            <div className="pt-6 border-t">
              <Link href="/">
                <Button variant="outline" data-testid="button-back">
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
