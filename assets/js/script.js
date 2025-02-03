import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';

// Initialize WebR
const webR = new WebR({ interactive: false });
let processedData = null;

// Theme initialization
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
}

// Initialize WebR
async function initializeWebR() {
    const analyzeBtn = document.getElementById('analyzeButton');
    const btnText = analyzeBtn.querySelector('.btn-text');
    
    try {
        analyzeBtn.classList.add('initializing');
        btnText.textContent = 'Initializing WebR...';
        await webR.init();
        
        btnText.textContent = 'Installing Required Packages...';
        await webR.installPackages(['tidyverse', 'stringi'], true);
        
        analyzeBtn.classList.remove('initializing');
        analyzeBtn.classList.add('ready');
        btnText.textContent = 'Upload File for Analysis';
        analyzeBtn.disabled = true;
        
    } catch (error) {
        console.error('WebR Initialization Error:', error);
        btnText.textContent = 'Initialization Failed';
        analyzeBtn.classList.remove('initializing');
        analyzeBtn.classList.remove('ready');
        analyzeBtn.disabled = true;
    }
}

// File processing
async function processFile(file) {
    const analyzeBtn = document.getElementById('analyzeButton');
    const btnText = analyzeBtn.querySelector('.btn-text');
    const timeElapsed = analyzeBtn.querySelector('.time-elapsed');
    const downloadSection = document.getElementById('downloadSection');
    
    let startTime = Date.now();
    let timerInterval;

    try {
        // Start analyzing state
        analyzeBtn.classList.remove('can-analyze');
        analyzeBtn.classList.add('analyzing');
        btnText.textContent = 'Analyzing Data';
        timeElapsed.classList.remove('hidden');
        
        // Start timer
        timerInterval = setInterval(() => {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            timeElapsed.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);

        let fileData;
        let isExcel = file.name.toLowerCase().endsWith('.xlsx');

        if (isExcel) {
            fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData, { type: "array" });
            const firstSheet = workbook.SheetNames[0];
            const csvData = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
            await webR.FS.writeFile('input.csv', new TextEncoder().encode(csvData));
        } else {
            fileData = await file.arrayBuffer();
            await webR.FS.writeFile('input.csv', new Uint8Array(fileData));
        }

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
        
        const processedBuffer = await webR.FS.readFile('output.csv');
        processedData = new TextDecoder().decode(processedBuffer);

        // After processing complete
        clearInterval(timerInterval);
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        
        btnText.textContent = 'Analysis Complete!';
        timeElapsed.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        downloadSection.classList.remove('hidden');

        // Reset button after 2 seconds
        setTimeout(() => {
            analyzeBtn.classList.remove('analyzing');
            analyzeBtn.classList.add('ready');
            btnText.textContent = 'Upload File for Analysis';
            timeElapsed.classList.add('hidden');
        }, 2000);

    } catch (error) {
        clearInterval(timerInterval);
        console.error('Processing Error:', error);
        
        analyzeBtn.classList.remove('analyzing');
        analyzeBtn.classList.add('ready');
        btnText.textContent = 'Upload File for Analysis';
        timeElapsed.classList.add('hidden');
    }
}

// Download handler
function downloadProcessedData() {
    if (!processedData) {
        alert("No processed data available.");
        return;
    }

    const blob = new Blob([processedData], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'processed_data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initializeWebR();
});

// File input handler
document.getElementById('csvFile').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const fileNameDisplay = document.getElementById('fileName');
    const analyzeButton = document.getElementById('analyzeButton');
    const btnText = analyzeButton.querySelector('.btn-text');

    if (file) {
        const validExtensions = ['.csv', '.xlsx'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        
        if (validExtensions.includes(fileExtension)) {
            fileNameDisplay.textContent = file.name.length > 25 ? 
                file.name.substring(0, 25) + "..." : file.name;
            analyzeButton.disabled = false;
            analyzeButton.classList.remove('ready');
            analyzeButton.classList.add('can-analyze');
            btnText.textContent = 'Analyze Data';
            
            // Show analysis icon
            analyzeButton.querySelector('.upload-icon').classList.add('hidden');
            analyzeButton.querySelector('.analyze-icon').classList.remove('hidden');
        } else {
            fileNameDisplay.textContent = "Invalid file type. Please select a CSV or Excel file.";
            analyzeButton.disabled = true;
            analyzeButton.classList.add('ready');
            analyzeButton.classList.remove('can-analyze');
            btnText.textContent = 'Upload File for Analysis';
            
            // Show upload icon
            analyzeButton.querySelector('.upload-icon').classList.remove('hidden');
            analyzeButton.querySelector('.analyze-icon').classList.add('hidden');
        }
    } else {
        fileNameDisplay.textContent = "No file selected";
        analyzeButton.disabled = true;
        analyzeButton.classList.add('ready');
        analyzeButton.classList.remove('can-analyze');
        btnText.textContent = 'Upload File for Analysis';
        
        // Show upload icon
        analyzeButton.querySelector('.upload-icon').classList.remove('hidden');
        analyzeButton.querySelector('.analyze-icon').classList.add('hidden');
    }
});

document.getElementById('analyzeButton').addEventListener('click', async () => {
    const file = document.getElementById('csvFile').files[0];
    if (file) {
        document.getElementById('analyzeButton').disabled = true;
        await processFile(file);
        document.getElementById('analyzeButton').disabled = false;
    }
});

document.getElementById('downloadButton').addEventListener('click', downloadProcessedData); 