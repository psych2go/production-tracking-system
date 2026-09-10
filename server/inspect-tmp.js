const ExcelJS = require("exceljs");
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile("/mnt/c/Users/aaron/OneDrive/Desktop/高可靠/高可靠项目良率统计2026八月.xlsx");
  wb.eachSheet((ws) => {
    console.log(`=== Sheet: "${ws.name}" rows=${ws.rowCount} cols=${ws.columnCount} ===`);
    // 合并单元格
    const merges = ws.model.merges || [];
    if (merges.length) console.log("合并单元格:", merges.join(", "));
    for (let r = 1; r <= Math.min(ws.rowCount, 40); r++) {
      const row = ws.getRow(r);
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        let v = cell.value;
        if (v && typeof v === "object" && v.text) v = v.text;
        else if (v && typeof v === "object" && v.result !== undefined) v = v.result;
        else if (v instanceof Date) v = v.toISOString().slice(0, 10);
        cells.push(`[${col}]${v === null || v === undefined ? "" : String(v).replace(/\n/g, "|").slice(0, 18)}`);
      });
      console.log(`R${r}: ${cells.join(" | ")}`);
    }
    if (ws.rowCount > 40) console.log(`...(共 ${ws.rowCount} 行)`);
  });
})();
