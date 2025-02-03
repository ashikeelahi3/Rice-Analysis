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

      print("Processing data...")

      Veg_Full_Data = data %>% 
      select(
        \`Submission ID\`, UserId, \`Submission time\`, DistrictName, UpazilaName, 
        \`Items to Choose\`, \`Value - Rice\`, \`Value - Flour\`, \`Value - Lentil\`, 
        \`Value - Soybean Oil\`, \`Value - Salt\`, \`Value - Sugar\`, \`Value - Eggs\`, 
        \`Value - Chicken\`, \`Value - Potato\`, \`Value - Eggplant\`, \`Value - Onion\`, 
        \`Value - Green Chilli\`, \`Rice Purchase Options\`, \`Flour Purchase Options\`,
        \`Lentils Purchase Options\`, \`Soybean Oil Purchase Options\`, \`Salt Purchase Options\`,
        \`Sugar Purchase Options\`, \`Eggs Purchase Options\`, \`Chicken Purchase Options\`,
        \`Potato Purchase Options\`, \`Type of Shop for Rice\`, \`Type of Shop for Flour\`, 
        \`Type of Shop for Lentils\`, \`Type of Shop for Soybean Oil\`, \`Type of Shop for Salt\`, 
        \`Type of Shop for Sugar\`, \`Type of Shop for Chicken\`, 
        \`Type of Shop for Potato\`, \`Type of Shop for Eggplant\`, \`Type of Shop for Onion\`, 
        \`Type of Shop for Green Chilli\`
      ) %>% 
      separate_rows(
        \`Items to Choose\`, sep = ","
      ) %>% 


      mutate(
        \`Items to Choose\` = str_trim(\`Items to Choose\`, side = "both")
      ) %>% 
      mutate(hasProduct = case_when(
        \`Items to Choose\` == "Rice" ~ 1,
        \`Items to Choose\` == "Flour" ~ 2,
        \`Items to Choose\` == "Lentil" ~ 3,
        \`Items to Choose\` == "Soybean Oil" ~ 4,
        \`Items to Choose\` == "Salt" ~ 5,
        \`Items to Choose\` == "Sugar" ~ 6,
        \`Items to Choose\` == "Eggs" ~ 7,
        \`Items to Choose\` == "Chicken" ~ 8,
        \`Items to Choose\` == "Potato" ~ 9,
        \`Items to Choose\` == "Eggplant" ~ 10,
        \`Items to Choose\` == "Onion" ~ 11,
        \`Items to Choose\` == "Green Chilli" ~ 12,
        TRUE ~ 0
      )) %>%
      mutate(
        Price = case_when(
          hasProduct == 1 ~ \`Value - Rice\`,
          hasProduct == 2 ~ \`Value - Flour\`,
          hasProduct == 3 ~ \`Value - Lentil\`,
          hasProduct == 4 ~ \`Value - Soybean Oil\`,
          hasProduct == 5 ~ \`Value - Salt\`,
          hasProduct == 6 ~ \`Value - Sugar\`,
          hasProduct == 7 ~ \`Value - Eggs\`,
          hasProduct == 8 ~ \`Value - Chicken\`,
          hasProduct == 9 ~ \`Value - Potato\`,
          hasProduct == 10 ~ \`Value - Eggplant\`,
          hasProduct == 11 ~ \`Value - Onion\`,
          hasProduct == 12 ~ \`Value - Green Chilli\`,
          TRUE ~ NA_real_
        )
      ) %>%
      mutate(
        \`Purchase Options\` = case_when(
          hasProduct == 1 ~ \`Rice Purchase Options\`,
          hasProduct == 2 ~ \`Flour Purchase Options\`,
          hasProduct == 3 ~ \`Lentils Purchase Options\`,
          hasProduct == 4 ~ \`Soybean Oil Purchase Options\`,
          hasProduct == 5 ~ \`Salt Purchase Options\`,
          hasProduct == 6 ~ \`Sugar Purchase Options\`,
          hasProduct == 7 ~ \`Eggs Purchase Options\`,
          hasProduct == 8 ~ \`Chicken Purchase Options\`,
          hasProduct == 9 ~ \`Potato Purchase Options\`,
          TRUE ~ NA_character_

        )
      )  %>%
      mutate(
        ShopType = case_when(
          hasProduct == 1 ~ \`Type of Shop for Rice\`,
          hasProduct == 2 ~ \`Type of Shop for Flour\`,
          hasProduct == 3 ~ \`Type of Shop for Lentils\`,
          hasProduct == 4 ~ \`Type of Shop for Soybean Oil\`,
          hasProduct == 5 ~ \`Type of Shop for Salt\`,
          hasProduct == 6 ~ \`Type of Shop for Sugar\`,
          hasProduct == 8 ~ \`Type of Shop for Chicken\`,
          hasProduct == 9 ~ \`Type of Shop for Potato\`,
          hasProduct == 10 ~ \`Type of Shop for Eggplant\`,
          hasProduct == 11 ~ \`Type of Shop for Onion\`,
          hasProduct == 12 ~ \`Type of Shop for Green Chilli\`,
          TRUE ~ NA_character_
        )
      ) %>%
      select(
        \`Submission ID\`, UserId, \`Submission time\`, DistrictName, UpazilaName,
        \`Items to Choose\`, hasProduct, Price, \`Purchase Options\`, ShopType
      ) %>%
      arrange(\`Submission ID\`, hasProduct) %>% 
      filter(Price != "NA")

      write.csv(Veg_Full_Data, "output.csv", row.names = FALSE)
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
