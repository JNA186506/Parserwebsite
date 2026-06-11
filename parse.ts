import * as XLSX from "xlsx";

export interface Crate {
    lot: number;
    bestBefore: Date;
    kg: number;
}

// Row 12 in Excel (1-based) = index 11 in the 0-based array from sheet_to_json
const START_ROW = 10;

export async function ParseExcelFile(
    file: File,
    { lotCol, bbCol, kgCol, startRow }: { lotCol: number; bbCol: number; kgCol: number; startRow: number }
): Promise<Map<number, Crate[]>> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("Excel-filen må inneholde minst ett ark.");

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error("Excel-filen må inneholde minst ett ark.");

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    const lotMap = new Map<number, Crate[]>();

    for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row) break;

        const lotRaw = (row as unknown[])[lotCol];
        if (lotRaw == null) break;

        const bestBeforeRaw = (row as unknown[])[bbCol];
        const kgRaw = (row as unknown[])[kgCol];

        const lot = typeof lotRaw === "number" ? Math.round(lotRaw) : Number(lotRaw);
        const kg = typeof kgRaw === "number" ? kgRaw : Number(kgRaw ?? 0);

        let bestBefore: Date;
        if (bestBeforeRaw instanceof Date) {
            bestBefore = bestBeforeRaw;
        } else if (typeof bestBeforeRaw === "number") {
            const parsed = XLSX.SSF.parse_date_code(bestBeforeRaw);
            bestBefore = new Date(parsed.y, parsed.m - 1, parsed.d);
        } else {
            throw new Error(`Ugyldig best-before dato på rad ${i + 1}.`);
        }

        const crate: Crate = { lot, bestBefore, kg };

        const existing = lotMap.get(lot);
        if (existing) {
            existing.push(crate);
        } else {
            lotMap.set(lot, [crate]);
        }
    }

    return lotMap;
}

export function RenderLotInfo(lotMap: Map<number, Crate[]>): string {
    let html = `<table>
        <tr>
            <th>Lot</th>
            <th>Best Before</th>
            <th>KG</th>
            <th>Kasser</th>
        </tr>`;

    let totalKgAll = 0;
    let totalBoxesAll = 0;

    for (const [lot, crates] of lotMap) {
        if (crates.length === 0) continue;

        const totalKg = crates.reduce((sum, c) => sum + c.kg, 0);
        totalKgAll += totalKg;
        totalBoxesAll += crates.length;

        const firstCrate = crates[0]!;
        const sameBestBefore = crates.every(
            c => c.bestBefore.getTime() === firstCrate.bestBefore.getTime()
        );

        if (!sameBestBefore) {
            html += `<tr class="warning">
                <td>${lot}</td>
                <td>Best Before er ikke lik, sjekk filen</td>
                <td>${totalKg.toFixed(2)}</td>
                <td>${crates.length}</td>
            </tr>`;
            continue;
        }

        html += `<tr>
            <td>${lot}</td>
            <td>${firstCrate.bestBefore.toLocaleDateString()}</td>
            <td>${totalKg.toFixed(2)}</td>
            <td>${crates.length}</td>
        </tr>`;
    }

    html += `<tr class="total-row">
        <td><strong>Totalt</strong></td>
        <td></td>
        <td><strong>${totalKgAll.toFixed(2)}</strong></td>
        <td><strong>${totalBoxesAll}</strong></td>
    </tr>`;

    html += `</table>`;
    return html;
}
