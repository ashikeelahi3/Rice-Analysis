import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';

const webR = new WebR({ interactive: false });
let processedData = null;

async function initializeWebR() {
  const statusElem = document.getElementById('status');
  try {
    console.log("Initializing WebR...");
    statusElem.textContent = 'Initializing WebR...';
    await webR.init();

    console.log("Installing required R packages...");
    statusElem.textContent = 'Installing required packages...';
    await webR.installPackages(['tidyverse', 'stringi'], true);

    console.log("WebR ready!");
    statusElem.textContent = 'Ready to process file...';
    document.getElementById('analyzeButton').disabled = false;
  } catch (error) {
    console.error('WebR Initialization Error:', error);
    statusElem.textContent = 'Error initializing WebR. Try refreshing.';
  }
}

async function processFile(file) {
  const statusElem = document.getElementById('status');
  try {
    console.log("File selected:", file.name);
    statusElem.textContent = 'Reading file...';

    let fileData;
    let isExcel = file.name.toLowerCase().endsWith('.xlsx');

    if (isExcel) {
      console.log("Processing as Excel file...");
      fileData = await file.arrayBuffer();
      const workbook = XLSX.read(fileData, { type: "array" });

      // Convert first sheet to CSV
      const firstSheet = workbook.SheetNames[0];
      console.log("Converting Excel sheet:", firstSheet);
      const csvData = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);

      console.log("Excel file converted to CSV. Writing to WebR...");
      await webR.FS.writeFile('input.csv', new TextEncoder().encode(csvData));
    } else {
      console.log("Processing as CSV file...");
      fileData = await file.arrayBuffer();
      await webR.FS.writeFile('input.csv', new Uint8Array(fileData));
    }

    console.log("File successfully written to WebR.");

    statusElem.textContent = 'Processing data...';
    console.log("Executing R script...");

    const rCode = `
      library(tidyverse)
      library(stringi)

      print("Reading input file...")
      data <- read.csv("input.csv", stringsAsFactors = FALSE, check.names = FALSE)
      print("File read successfully. First few rows:")
      print(head(data))

      print("Filtering for Rice Prices...")

      dfRice <- data %>%
        filter(
          !is.na(\`Items to Choose\`),
          nchar(\`Items to Choose\`) > 0,
          nchar(\`Submission ID\`) > 0,
          nchar(\`Submission time\`) > 0,
          nchar(DistrictName) > 0,
          nchar(UpazilaName) > 0
        ) %>%
        select(
          \`Submission ID\`, UserId, \`Submission time\`, DistrictName, UpazilaName, \`Items to Choose\`, \`Value - Rice\`
        ) %>%
        separate_rows(\`Items to Choose\`, sep = ",") %>%
        mutate(\`Items to Choose\` = str_trim(\`Items to Choose\`, side = "both")) %>%
        distinct(
          \`Submission ID\`, UserId, \`Submission time\`, DistrictName, UpazilaName, \`Items to Choose\`, \`Value - Rice\`
        ) %>%
        mutate(hasRice = ifelse(\`Items to Choose\` == "Rice", 1, 0)) %>%
        pivot_wider(
          names_from = \`Items to Choose\`,
          values_from = hasRice, 
          values_fill = list(hasRice = 0)
        ) %>%
        select(\`Submission ID\`, UserId, \`Submission time\`, DistrictName, UpazilaName, \`Rice\`, \`Value - Rice\`) %>%
        filter(Rice != 0) %>%
        select(\`Submission ID\`, UserId, \`Submission time\`, DistrictName, UpazilaName, \`Rice\`, \`Value - Rice\`)

      print("Filtered Rice Prices:")
      print(head(dfRice))

      write.csv(dfRice, "output.csv", row.names = FALSE)
      "Processing complete"
    `;

    const result = await webR.evalRString(rCode);
    console.log("R processing result:", result);

    console.log("Reading processed output file from WebR FS...");
    const processedBuffer = await webR.FS.readFile('output.csv');
    processedData = new TextDecoder().decode(processedBuffer);
    console.log("Processed Data Sample:\n", processedData.substring(0, 500));

    statusElem.textContent = 'Processing complete. Ready to download.';
    document.getElementById('downloadSection').style.display = 'block';

    console.log("Processing complete. Download option enabled.");
  } catch (error) {
    console.error('Processing Error:', error);
    statusElem.textContent = 'Error processing file.';
  }
}

function downloadProcessedData() {
  if (!processedData) {
    alert("No processed data available.");
    console.log("Download attempt failed: No processed data.");
    return;
  }

  console.log("Creating CSV download file...");
  const blob = new Blob([processedData], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'processed_rice_prices.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  console.log("Download started.");
}

initializeWebR();

document.getElementById('csvFile').addEventListener('change', (event) => {
  const file = event.target.files[0];
  const fileNameDisplay = document.getElementById('fileName');
  const analyzeButton = document.getElementById('analyzeButton');

  if (file) {
      console.log("File chosen:", file.name);
      
      // Show only first 25 characters if the file name is too long
      fileNameDisplay.textContent = file.name.length > 25 ? file.name.substring(0, 25) + "..." : file.name;
      
      analyzeButton.disabled = false; // Enable the button
  } else {
      console.log("No file selected.");
      fileNameDisplay.textContent = "No file selected";
      analyzeButton.disabled = true; // Keep button disabled
  }
});


document.getElementById('analyzeButton').addEventListener('click', async () => {
  const file = document.getElementById('csvFile').files[0];
  if (file) {
    console.log("Analyze button clicked. Processing file...");
    document.getElementById('analyzeButton').disabled = true;
    await processFile(file);
    document.getElementById('analyzeButton').disabled = false;
  } else {
    console.log("Analyze button clicked, but no file selected.");
  }
});

document.getElementById('downloadButton').addEventListener('click', downloadProcessedData);
