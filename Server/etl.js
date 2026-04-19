import sql from "mssql";

const remoteConfig = {
  user: "sa",
  password: "alsson.net2013",
  server: "EA-FINANCE",
  database: "PAYMENTS",
  options: { trustServerCertificate: true, encrypt: false }
};

const localConfig = {
  user: "sa",
  password: "Finance@2025",
  server: "EA-FEESWEB",
  database: "feeswebtmp",
  options: { trustServerCertificate: true, encrypt: false }
};

async function syncTable({
  tableName,
  remoteTable,
  keyColumn,
  whereClause,
  batchSize = 50000
}) {
  const remote = await sql.connect(remoteConfig);
  const local = await sql.connect(localConfig);

  const state = await local.request()
    .input("table", sql.NVarChar, tableName)
    .query(`SELECT LastValue FROM ETL_SyncState WHERE TableName = @table`);

  let lastValue = state.recordset[0]?.LastValue || 0;
  console.log(`[${tableName}] Starting from ${lastValue}`);
  let hasMore = true;

  while (hasMore) {
    const result = await remote.request().query(`
      SELECT TOP (${batchSize}) *
      FROM ${remoteTable}
      WHERE ${keyColumn} > ${lastValue}
        ${whereClause ? "AND " + whereClause : ""}
      ORDER BY ${keyColumn}
    `);

    const rows = result.recordset;

    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    const table = new sql.Table(tableName);
    table.create = false;

    Object.keys(rows[0]).forEach(col => {
      table.columns.add(col, sql.NVarChar(sql.MAX), { nullable: true });
    });

    rows.forEach(r => table.rows.add(...Object.values(r)));

    try {
      await local.request().bulk(table);

      const newLast = rows[rows.length - 1][keyColumn];

      await local.request()
        .input("table", sql.NVarChar, tableName)
        .input("val", sql.BigInt, newLast)
        .query(`
          UPDATE ETL_SyncState
          SET LastValue = @val, LastSync = GETDATE(), Status='success'
          WHERE TableName = @table
        `);

      await local.request()
        .input("table", sql.NVarChar, tableName)
        .input("start", sql.BigInt, lastValue)
        .input("end", sql.BigInt, newLast)
        .input("rows", sql.Int, rows.length)
        .query(`
          INSERT INTO ETL_Log(TableName, BatchStart, BatchEnd, RowsInserted, Status)
          VALUES (@table, @start, @end, @rows, 'success')
        `);

      console.log(`[${tableName}] Inserted ${rows.length}`);

      lastValue = newLast;

    } catch (err) {
      console.error(`[${tableName}] ERROR`, err.message);

      await local.request()
        .input("table", sql.NVarChar, tableName)
        .input("err", sql.NVarChar, err.message)
        .query(`
          UPDATE ETL_SyncState
          SET Status='error', ErrorMsg=@err
          WHERE TableName = @table
        `);

      throw err;
    }
  }

  console.log(`[${tableName}] DONE`);
}