import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const connectionString = process.env.DATABASE_URL;

if (!url || !serviceKey || !connectionString) {
  console.error(
    "Brak NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY lub DATABASE_URL w .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pgClient = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const listAllStoragePaths = async (prefix = "") => {
  const paths = [];
  const { data, error } = await supabase.storage.from("profile").list(prefix, {
    limit: 1000,
  });
  if (error) throw error;
  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) {
      paths.push(full);
    } else {
      paths.push(...(await listAllStoragePaths(full)));
    }
  }
  return paths;
};

try {
  await pgClient.connect();
  console.log("Połączono z bazą. Czyszczę użytkowników i typy…");

  const { rows: usersBefore } = await pgClient.query(
    "select count(*)::int as n from auth.users",
  );
  const { rows: predsBefore } = await pgClient.query(
    "select count(*)::int as n from public.predictions",
  );
  const { rows: dailyBefore } = await pgClient.query(
    "select count(*)::int as n from public.match_predictions",
  );

  console.log(
    `Przed: ${usersBefore[0].n} użytkowników, ${predsBefore[0].n} typów drabinki, ${dailyBefore[0].n} typów meczów dnia`,
  );

  const avatarPaths = await listAllStoragePaths();
  if (avatarPaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("profile")
      .remove(avatarPaths);
    if (storageError) throw storageError;
    console.log(`✓ Usunięto ${avatarPaths.length} plików avatara.`);
  }

  const { data: listed, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  for (const user of listed.users) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
  }

  const { rows: usersAfter } = await pgClient.query(
    "select count(*)::int as n from auth.users",
  );
  const { rows: predsAfter } = await pgClient.query(
    "select count(*)::int as n from public.predictions",
  );
  const { rows: dailyAfter } = await pgClient.query(
    "select count(*)::int as n from public.match_predictions",
  );

  console.log(
    `Po: ${usersAfter[0].n} użytkowników, ${predsAfter[0].n} typów drabinki, ${dailyAfter[0].n} typów meczów dnia`,
  );
  console.log("✓ Mecze, drużyny i struktura drabinki bez zmian.");
} catch (err) {
  console.error("✗ Błąd:", err.message);
  process.exitCode = 1;
} finally {
  await pgClient.end();
}
