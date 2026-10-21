const test = require("node:test");
const assert = require("node:assert/strict");
const { sequelize } = require("./helpers");
const { QueryTypes } = require("sequelize");

test.after(() => sequelize.close());

// PostgreSQL no indexa las llaves foráneas por sí solo. Sin índice, los JOIN y los borrados en cascada recorren la tabla entera.
// Esta prueba falla si una migración futura añade una llave foránea sin un índice que empiece por sus columnas.
test("toda llave foránea tiene un índice que empieza por sus columnas", async () => {
  const sinIndice = await sequelize.query(
    `SELECT c.conrelid::regclass::text AS tabla,
            (SELECT string_agg(a.attname, ', ' ORDER BY k.ord)
               FROM unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
               JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS columnas
       FROM pg_constraint c
      WHERE c.contype = 'f'
        AND NOT EXISTS (
          SELECT 1 FROM pg_index i
           WHERE i.indrelid = c.conrelid
             AND (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey)
      ORDER BY 1, 2`,
    { type: QueryTypes.SELECT }
  );
  assert.deepEqual(sinIndice, [], `llaves foráneas sin índice: ${sinIndice.map((f) => `${f.tabla}(${f.columnas})`).join(", ")}`);
});

test("la migración de índices es reversible: el esquema recupera los índices al volver a aplicarla", async () => {
  const total = async () => (await sequelize.query("SELECT count(*)::int AS n FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx\\_%'", { type: QueryTypes.SELECT }))[0].n;
  const migracion = require("../migrations/20270201000000-indices-llaves-foraneas");
  const qi = sequelize.getQueryInterface();
  const antes = await total();
  assert.ok(antes >= 17, "deben existir los 17 índices de la migración");

  await migracion.down(qi);
  assert.equal(await total(), antes - 17, "down elimina exactamente los 17 índices que creó");
  await migracion.up(qi);
  assert.equal(await total(), antes, "up los vuelve a crear");
  await migracion.up(qi); // repetirla no falla ni duplica
  assert.equal(await total(), antes);
});
