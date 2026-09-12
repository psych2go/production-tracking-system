const ExcelJS = require("exceljs");
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("/mnt/c/Users/aaron/OneDrive/Desktop/高可靠/高可靠加工交付周期8.24-9.6.xlsx");
  wb.eachSheet((ws) => {
    console.log(`=== Sheet: "${ws.name}" rows=${ws.rowCount} cols=${ws.columnCount} ===`);
    const merges = ws.model.merges || [];
    if (merges.length) console.log("合并:", merges.join(", "));
    for (let r = 1; r <= Math.min(ws.rowCount, 30); r++) {
      const row = ws.getRow(r);
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        let v = cell.value;
        if (v && typeof v === "object" && v.text) v = v.text;
        else if (v && typeof v === "object" && v.result !== undefined) v = v.result;
        else if (v instanceof Date) v = v.toISOString().slice(0, 10);
        cells.push(`[${col}]${v === null || v === undefined ? "" : String(v).replace(/\n/g, "|").slice(0, 16)}`);
      });
      console.log(`R${r}: ${cells.join(" | ")}`);
    }
    if (ws.rowCount > 30) console.log(`...(共 ${ws.rowCount} 行)`);
  });
})();
