# WC 2026 Predictions ⚽🏆

Forfun aplikacja do typowania fazy pucharowej Mistrzostw Świata 2026 (od 1/16 finału do finału) — z **drabinką na żywo**, **typowaniem przez przeciąganie drużyn** i **rankingiem znajomych**.

Zbudowane w **Next.js 16 (App Router) + TypeScript + TailwindCSS + Supabase** (Auth, Postgres, Realtime), z **dnd-kit** i **Framer Motion**.

## Funkcje

- **`/` — Drabinka live**: pełna dwustronna siatka pucharowa z wynikami na żywo (Supabase Realtime), animowany wskaźnik LIVE, automatyczna progresja zwycięzców oraz licznik auto-synchronizacji (odliczanie do następnego odświeżenia danych).
- **`/predict` — Typowanie**: kliknij lub przeciągnij drużynę, by awansowała dalej; kolejne rundy wypełniają się automatycznie. Zapis na koncie z **modalem potwierdzenia** — po zatwierdzeniu drabinka zostaje **zablokowana** (bez możliwości zmiany).
- **`/daily` — Mecze dnia**: obstawianie zwycięzcy pojedynczych meczów (pogrupowane po dniach), **niezależnie od drabinki**, z **osobnym rankingiem** (1 pkt za trafienie). Typy można zmieniać tylko do rozpoczęcia meczu (egzekwowane także przez RLS). Pod każdym meczem widać, kto co obstawił.
- **`/leaderboard` — Ranking**: 1 punkt za każdy trafiony typ w drabince w zakończonych meczach.
- **`/users` — Użytkownicy**: lista zarejestrowanych graczy z avatarami; wejście na profil gracza.
- **`/profile/[id]` — Profil**: avatar (upload do bucketa `profile`), edycja nicku, punkty oraz **podgląd drabinki** (własnej i znajomych).
- **`/login`, `/register`** — rejestracja i logowanie (Supabase Auth, e-mail + hasło).

Ciemny, nowoczesny motyw UI; działa od razu na danych demo (seed), zanim podłączysz API.

## Architektura wyników live

```
football-data.org ──(serwer, tajny token)──▶ /api/sync ──▶ Supabase (tabela matches)
                                                                  │
                            Przeglądarki ◀──(Realtime + read)─────┘
```

Klienci nigdy nie odpytują API bezpośrednio (limity zapytań). Serwerowy `/api/sync` pobiera dane, normalizuje do drabinki i zapisuje do Supabase; przeglądarki czytają z bazy i subskrybują zmiany przez Realtime.

## Szybki start

1. **Zainstaluj zależności**
   ```bash
   npm install
   ```

2. **Skonfiguruj `.env.local`** (wzór w [`.env.example`](./.env.example)):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # tylko serwer — nigdy nie trafia do przeglądarki
   DATABASE_URL=...                # używane przez `npm run db:setup`
   FOOTBALL_DATA_TOKEN=            # opcjonalnie — bez tokena działa demo (seed)
   CRON_SECRET=                    # sekret chroniący /api/sync (cron Vercel)
   ADMIN_EMAILS=                   # e-maile adminów po przecinku (ręczny sync)
   ```

3. **Załóż tabele w Supabase**: wklej zawartość [`supabase/schema.sql`](./supabase/schema.sql) do SQL Editora w panelu Supabase i uruchom.

4. **Włącz potwierdzanie e-mail (opcjonalnie)**: dla łatwiejszych testów w panelu Supabase → Authentication → Providers → Email możesz wyłączyć „Confirm email".

5. **Załaduj dane do bazy**: zaloguj się kontem z `ADMIN_EMAILS` i kliknij ↻ na stronie głównej, albo wywołaj `/api/sync` z nagłówkiem `Authorization: Bearer ${CRON_SECRET}` (zaseeduje drabinkę; z tokenem pobierze prawdziwe mecze).

6. **Uruchom**
   ```bash
   npm run dev
   ```
   Otwórz http://localhost:3000

## Token football-data.org

Darmowy token: [football-data.org/client/register](https://www.football-data.org/client/register). Darmowy tier obejmuje Mistrzostwa Świata (kod `WC`), limit ~10 zapytań/min — dlatego synchronizujemy serwerowo, a nie z przeglądarki.

## Synchronizacja na żywo

`/api/sync` jest **chronione** — wywoła je tylko cron Vercel (nagłówek `Authorization: Bearer ${CRON_SECRET}`) albo zalogowany **admin** (e-mail z `ADMIN_EMAILS`). Ręczny przycisk synchronizacji na stronie głównej widzą wyłącznie admini.

- Ręcznie (admin): przycisk ↻ przy liczniku auto-synchronizacji.
- Automatycznie: cron ([`vercel.json`](./vercel.json)) co 2 minuty odpytuje `/api/sync`.

## Deploy na Vercel

1. Wypchnij repo na GitHub i zaimportuj projekt w Vercel.
2. W **Project → Settings → Environment Variables** dodaj wszystkie zmienne z `.env.example`. **`CRON_SECRET` jest wymagane**, inaczej cron dostanie `401` i dane się nie zsynchronizują. Ustaw też `ADMIN_EMAILS` na swój e-mail.
3. Zastosuj schemat bazy: `npm run db:setup` (lokalnie, z `DATABASE_URL`) albo wklej [`supabase/schema.sql`](./supabase/schema.sql) do SQL Editora w Supabase.
4. Deploy. Cron z `vercel.json` ruszy automatycznie.

## Bezpieczeństwo

- Klucz `SUPABASE_SERVICE_ROLE_KEY` używany jest wyłącznie po stronie serwera (`src/lib/supabase/admin.ts`, `/api/sync`) i nigdy nie jest importowany do kodu klienta.
- Dostęp do danych chroni **RLS** w Supabase: każdy modyfikuje tylko własny profil/typy, pliki avatara trzymane są w folderze `user-id/` (polityki storage), a typy meczów dnia można zapisać tylko przed kickoffem.
- Po zatwierdzeniu drabinki blokada (`predictions_locked`) jest **egzekwowana po stronie bazy** (RLS + trigger jednokierunkowy) — gracz nie odblokuje typów przez API. Reset (np. na nowy sezon) wykonasz jako admin/`service_role`.
- Sekrety trzymane są w `.env*` (ignorowane przez git); commitowany jest tylko `.env.example`.

## Punktacja

**1 punkt za każdy trafiony typ** — czyli za poprawnie wytypowanego zwycięzcę zakończonego meczu na danej pozycji w drabince. Ranking sortowany malejąco po punktach.

## Struktura

```
src/
  app/            # strony (/, /predict, /leaderboard, /login, /register) + /api/sync
  components/     # Nav, BracketFrame, MatchCard, LiveBracket, PredictBracket, AuthForm...
  lib/
    bracket.ts    # model drabinki, slots, progresja zwycięzców
    seed.ts       # 32 drużyny + przykładowa drabinka demo
    scoring.ts    # punktacja
    football-data.ts  # adapter API
    data.ts       # odczyt z Supabase + fallback na seed
    supabase/     # klienci browser / server / admin
supabase/schema.sql  # tabele, RLS, trigger profilu, Realtime
```
