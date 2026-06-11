import { ParseExcelFile, RenderLotInfo } from "./parse";

const dropArea = document.getElementById("drop-zone") as HTMLElement;
const lotInfo = document.getElementById("lot-info") as HTMLElement;

const showColumnsCheckbox = document.getElementById("show-columns-checkbox") as HTMLInputElement;

const lotNumber = document.getElementById("lot-col") as HTMLInputElement;
const bbNumber = document.getElementById("bb-col") as HTMLInputElement;
const kgNumber = document.getElementById("kg-col") as HTMLInputElement;

const startRowInput = document.getElementById("start-row") as HTMLInputElement;

function toggleColumnInputs() {
    const colInputs = document.querySelector(".col-inputs") as HTMLElement;
    if (showColumnsCheckbox.checked) {
        colInputs.classList.remove("hidden");
    } else {
        colInputs.classList.add("hidden");
    }
}

showColumnsCheckbox.addEventListener("change", toggleColumnInputs);
// User enters 1-based Excel column numbers; subtract 1 for 0-based array indices
function parseColumnInputs(): { lotCol: number; bbCol: number; kgCol: number; startRow: number } {
    const lotCol = parseInt(lotNumber.value, 10) - 1;
    const bbCol = parseInt(bbNumber.value, 10) - 1;
    const kgCol = parseInt(kgNumber.value, 10) - 1;
    const startRow = parseInt(startRowInput.value, 10) - 1;


    if (isNaN(lotCol) || isNaN(bbCol) || isNaN(kgCol) || isNaN(startRow)) {
        throw new Error("Kolonneverdier må være gyldige tall.");
    }

    return { lotCol, bbCol, kgCol, startRow };
}

async function handleFile(file: File) {
    try {
        const cols = parseColumnInputs();
        const lotMap = await ParseExcelFile(file, cols);
        lotInfo.innerHTML = RenderLotInfo(lotMap);
    } catch (error) {
        const p = document.createElement("p");
        p.className = "warning";
        p.textContent = (error as Error).message;
        lotInfo.replaceChildren(p);
    }
}


dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropArea.classList.remove("dragover");
    const file = event.dataTransfer?.files?.[0];
    if (file) await handleFile(file);
});

let currentFile: File | null = null;

const fileInput = document.getElementById("file-input") as HTMLInputElement;
fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (file) {
        currentFile = file;
        await handleFile(file);
    }
});

async function handleFileReparse() {
    if (currentFile) await handleFile(currentFile);
}

lotNumber.addEventListener("change", handleFileReparse);
bbNumber.addEventListener("change", handleFileReparse);
kgNumber.addEventListener("change", handleFileReparse);
startRowInput.addEventListener("change", handleFileReparse);