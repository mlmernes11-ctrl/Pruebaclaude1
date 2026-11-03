-- La extensión pg_net (la que usa la tarea diaria para llamar a la función del servidor) se
-- instala en el esquema "extensions" en vez de "public", como recomienda Supabase.
-- Sus funciones siguen en el esquema "net", así que la tarea programada no cambia.
drop extension if exists pg_net;
create extension pg_net with schema extensions;
