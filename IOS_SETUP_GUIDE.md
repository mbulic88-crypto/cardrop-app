# CarDrop — Vodič za objavu na Apple App Store

**Pre nego što počneš:** Ovaj vodič te vodi korak po korak kroz ceo proces.  
Sve što moraš da uradiš ovde je označeno sa ✅.  
Tehničke stvari (kod, konfiguracija) su već završene automatski.

---

## Pregled procesa

```
[A] Apple Developer    →    [B] App Store Connect    →    [C] GitHub    →    [D] Codemagic    →    [E] App Store
   (registracija ID)          (kreiranje app zapisa)       (upload koda)      (automatski build)     (review)
```

Ukupno vreme: oko **45-60 minuta** (uglavnom čekanje na Apple potvrde)

> **Važno:** Ne treba ti Mac računar ni Xcode. Codemagic kompajlira sve u oblaku.  
> Ne treba ručno da skidaš certifikate ni provisioning profile — Codemagic to radi automatski  
> koristeći API Key koji kreiraš u Koraku A.

---

## KORAK A — Apple Developer Portal

**Sajt:** https://developer.apple.com/account

Ovde registruješ jedinstveni ID (Bundle ID) tvoje iOS aplikacije i kreiraš API ključ
koji Codemagic koristi da automatski potpiše i objavi app.

### A1. Idi na Identifiers

1. Otvori: https://developer.apple.com/account/resources/identifiers/list
2. Klikni **"+"** (plus dugme, gore desno)
3. Izaberi **"App IDs"** → klikni **Continue**
4. Izaberi **"App"** → klikni **Continue**

### A2. Upiši podatke o app-u

- **Description:** `CarDrop`
- **Bundle ID:** izaberi **Explicit** i upiši: `rs.cardrop.app`
- Dole u listi **Capabilities**, ne moras ništa posebno da uključuješ za prvu verziju

Klikni **Continue**, pa **Register**.

### A3. Napravi API Key za Codemagic

Ovaj API Key omogućava Codemagicu da automatski:
- Preuzme tvoj Distribution Certificate i Provisioning Profile direktno od Apple-a
- Potpiše (sign) aplikaciju
- Uploaduje .ipa na App Store Connect / TestFlight

**Ne trebaš ručno da skidaš nikakav certifikat!** Codemagic to radi sam.

1. Idi na: https://appstoreconnect.apple.com/access/integrations/api
2. Klikni **"Generate API Key"** (ili **"+"** dugme)
3. Upiši ime: `Codemagic`
4. Role: izaberi **Admin**
5. Klikni **Generate**

**SAČUVAJ OVE PODATKE** — biće ti potrebni u Koraku D:
- **Issuer ID** (prikazan na vrhu stranice, format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- **Key ID** (u tabeli, 10 znakova, npr. `AB1CD2EF3G`)
- Klikni **Download API Key** — preuzme se fajl koji se zove npr. `AuthKey_AB1CD2EF3G.p8`

> ⚠️ Fajl .p8 možeš skinuti **samo jednom**! Ne zatvori stranicu dok ga ne skineš.

---

## KORAK B — App Store Connect

**Sajt:** https://appstoreconnect.apple.com

Ovde kreiraš "policu" za tvoju app u App Store-u.

### B1. Kreiraj novi app

1. Idi na: https://appstoreconnect.apple.com/apps
2. Klikni **"+"** → **"New App"**
3. Popuni:
   - **Platforms:** ✅ iOS
   - **Name:** `CarDrop`
   - **Primary Language:** Serbian (ako nema, izaberi English)
   - **Bundle ID:** izaberi `rs.cardrop.app` (koji si malopre registrovao)
   - **SKU:** upiši `cardrop-ios-001` (bilo što jedinstveno)
   - **User Access:** Full Access
4. Klikni **Create**

### B2. Popuni metadata (opis, screenshots)

> ⚠️ Ovo možeš uraditi i kasnije, ali mora biti završeno pre konačnog submitovanja.

**App Information:**
- Subtitle: `Parking za sve`
- Category: `Navigation` ili `Lifestyle`
- Privacy Policy URL: `https://cardrop.app/privacy`

**Description (copy-paste):**
```
CarDrop je platforma za deljenje parking mesta u Srbiji.

• Iznajmi svoje parking mesto i zaradti
• Pronađi slobodan parking u svom gradu
• Map Hack NS — zajednica za parkiranje u Novom Sadu
• Zlatni minut, Pauk radar, Štek parkinzi
• Instant rezervacije i sigurno plaćanje
```

**Keywords:** `parking, garaža, Novi Sad, Beograd, CarDrop, parking mesta`

**Screenshots (obavezno):**
- Treba ti bar 3 screenshot sa telefona dimenzija **1290×2796** (iPhone 16 Pro Max)
- Možeš koristiti simulator ili prave snimke ekrana
- Možeš ih napraviti i u PowerPointu/Canvi ako nemaš telefon

---

## KORAK C — GitHub (Poveži Replit sa GitHub-om)

Codemagic mora da preuzme kod odavde. Replit ima direktnu vezu sa GitHub-om.

### C1. Poveži Replit sa GitHub-om

1. U Replitu, klikni na ikonu za **Version Control** (leva traka, ikona grananja)
2. Klikni **"Connect to GitHub"**
3. Prijavi se sa GitHub nalogom (ako nemaš, napravi besplatno na github.com)
4. Izaberi **"Create a new GitHub repository"**
5. Naziv repozitorijuma: `cardrop-app`
6. Klikni **"Create Repository"**
7. Klikni **"Push to GitHub"**

> GitHub je kao "online kopija" tvog projekta. Codemagic odatle preuzima kod.

---

## KORAK D — Codemagic (Cloud Build Servis)

**Sajt:** https://codemagic.io

Codemagic kompajlira tvoju iOS app na Maku u oblaku, bez da ti trebaš Mac.  
**Šta Codemagic radi automatski koristeći API Key:**
1. Preuzima Distribution Certificate od Apple-a (kreira ga ako ne postoji)
2. Preuzima Provisioning Profile (kreira ga ako ne postoji)
3. Potpisuje (sign) aplikaciju
4. Uploaduje .ipa na TestFlight

### D1. Napravi nalog

1. Idi na: https://codemagic.io
2. Klikni **"Get started for free"**
3. Prijavi se sa **GitHub nalogom** (isto kao u Koraku C)

### D2. Dodaj projekat

1. Klikni **"Add your first app"**
2. Izaberi **GitHub**
3. Pronađi repozitorijum `cardrop-app` i klikni **Select**
4. Kada pita za workflow, izaberi **"codemagic.yaml"**
5. Klikni **Finish setup**

### D3. Dodaj Environment Variables (tajne vrednosti)

Ovo su vrednosti koje si preuzeo u Koraku A. Bez ovih vrednosti Codemagic ne može da
preuzme certifikate od Apple-a niti da pošalje app na TestFlight.

1. U Codemagic, klikni na ime projekta `cardrop-app`
2. Klikni na **"Environment variables"** (leva traka)
3. Klikni **"+ Add variable"** i dodaj svaku od ovih:

---

**Varijabla 1:**
- Name: `APP_STORE_CONNECT_KEY_IDENTIFIER`
- Value: *(Key ID iz Koraka A3, npr. `AB1CD2EF3G`)*
- Group: upiši `apple_credentials`
- ✅ Secure: uključi

**Varijabla 2:**
- Name: `APP_STORE_CONNECT_ISSUER_ID`
- Value: *(Issuer ID iz Koraka A3, npr. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)*
- Group: `apple_credentials`
- ✅ Secure: uključi

**Varijabla 3:**
- Name: `APP_STORE_CONNECT_PRIVATE_KEY`
- Value: *(Otvori .p8 fajl iz Koraka A3 u Notepadu, kopiraj ceo sadržaj uključujući `-----BEGIN PRIVATE KEY-----` i `-----END PRIVATE KEY-----`)*
- Group: `apple_credentials`
- ✅ Secure: uključi

---

> **Šta se dešava sa ovim varijablama?**  
> Codemagic ih koristi da pozove Apple-ov API i automatski preuzme/kreira Distribution  
> Certificate i Provisioning Profile. **Nikada ih ne vidiš u kodu** — čuvaju se enkriptovano.

4. U `codemagic.yaml` fajlu (koji je već kreiran), pronađi liniju:
   ```
   - TVOJ_EMAIL@gmail.com
   ```
   I zameni je sa svojom email adresom — tu ćeš dobiti obaveštenje kad build završi.

   Da bi ovo promenio, idi u Replit, otvori fajl `codemagic.yaml`, nađi tu liniju i ispravi.

### D4. Pokreni prvi build

1. Klikni **"Start new build"**
2. Branch: `main`
3. Workflow: `ios-release`
4. Klikni **"Start build"**

Build traje oko **20-30 minuta**. Dobiješ email kad završi.

**Šta Codemagic radi tokom builda (automatski):**
- Korak 1-3: Preuzima certifikate i profile od Apple-a automatski
- Korak 4-7: Priprema iOS projekat
- Korak 8-10: Generiše ikone, splash screen, privacy manifest
- Korak 11: Instalira iOS biblioteke (CocoaPods)
- Korak 12: Primenjuje code signing na projekat
- Korak 13-14: Kompajlira i potpisuje .ipa fajl
- Automatski šalje na TestFlight

> ✅ Ako build prođe uspešno — app je automatski poslata u TestFlight!  
> ❌ Ako ne prođe — pošalji mi screenshot greške i popravljamo zajedno.

---

## KORAK E — Finalizacija na App Store Connect

### E1. TestFlight (interni test)

1. Idi na: https://appstoreconnect.apple.com/apps
2. Otvori CarDrop → klikni na **TestFlight** tab
3. Trebalo bi da vidiš novi build (može potrajati 5-10 minuta da se pojavi)
4. Klikni na build → **Submit for Beta App Review**
5. Odgovori na pitanja (da li app koristi encryption — izaberi **No**)

### E2. Submiting na App Store

Kada si zadovoljan sa TestFlight verzijom:

1. Idi na **App Store** tab (levo)
2. Klikni na **"1.0 Prepare for submission"**
3. Dodaj screenshots ako nisu već dodati
4. Proveri da je sve popunjeno (zeleni checkovi)
5. Klikni **"Submit for Review"**

Apple pregleda app za **1-3 radna dana**.

---

## Česta pitanja

**Q: Šta ako Codemagic build pukne?**
A: Pošalji mi link na log greške — popravljamo zajedno.

**Q: Koliko košta Codemagic?**
A: Besplatni plan ima 500 minuta mesečno — dovoljno za ~15-20 buildova. Besplatno je.

**Q: Treba li mi iPhone za testiranje?**
A: Nije obavezno. Možeš pozvati nekog ko ima iPhone da testa kroz TestFlight.

**Q: Šta je TestFlight?**
A: Apple-ova aplikacija za testiranje — instalaš je na iPhone i vidiš app pre nego što izađe u App Store.

**Q: Moram li da skinem Distribution Certificate ručno?**
A: Ne! Codemagic to radi automatski koristeći API Key koji si kreirao u Koraku A3.

**Q: Šta ako Apple odbije app?**
A: Odbiješ poruku sa razlogom. Najčešći razlozi su sitnice koje se lako poprave. Javi mi i rešavamo.

---

## Kontakt za probleme

Ako nešto ne radi — idi nazad u Replit, opiši šta se desilo i gde si zapao. Zajedno to rešavamo.
