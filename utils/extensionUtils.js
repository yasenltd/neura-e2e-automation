import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import axios from 'axios';
import JSZip from 'jszip';
import extensionConstants from '../constants/extensionConstants.js';

/**
 * Extracts a CRX file (Chrome extension package) to a specified directory.
 *
 * @param {string} crxFilePath - Path to the CRX file.
 * @param {string} outputDir - Directory to extract the CRX file.
 */
async function extractCRX(crxFilePath, outputDir) {
  const buf = await fsPromises.readFile(crxFilePath);

  // Check for magic number 'Cr24'
  if (buf[0] !== 67 || buf[1] !== 114 || buf[2] !== 50 || buf[3] !== 52) {
    throw new Error('Invalid header: Does not start with Cr24');
  }

  // Read version (4 bytes) to ensure compatibility with CRX version 3
  const version = buf.readUInt32LE(4);
  if (version !== 3) {
    throw new Error('Unsupported CRX version: ' + version);
  }

  // Read header length (4 bytes)
  const headerLength = buf.readUInt32LE(8);

  // Extract ZIP buffer starting after the header
  const zipStartOffset = 12 + headerLength;
  const zipBuffer = buf.slice(zipStartOffset);

  // Load ZIP buffer with JSZip and extract each file
  const zip = await JSZip.loadAsync(zipBuffer);
  await Promise.all(
    Object.keys(zip.files).map(async filename => {
      const file = zip.files[filename];
      const destPath = path.join(outputDir, filename);
      if (file.dir) {
        await fsPromises.mkdir(destPath, { recursive: true });
      } else {
        const content = await file.async('nodebuffer');
        await fsPromises.mkdir(path.dirname(destPath), { recursive: true });
        await fsPromises.writeFile(destPath, content);
      }
    }),
  );

  console.log('Extraction complete.');
}

/**
 * Downloads and extracts a wallet extension based on the wallet name.
 *
 * @param {string} walletName - The wallet key (e.g., 'leap', 'metamask').
 * @returns {string} The path to the extracted extension.
 */
async function downloadAndExtractWallet(walletName) {
  const wallet = extensionConstants[walletName];
  if (!wallet) {
    throw new Error(`Unknown wallet: ${walletName}`);
  }
  const { downloadUrl, extractPath, id } = wallet;

  // If already extracted, skip download and extraction
  if (fs.existsSync(extractPath) && fs.readdirSync(extractPath).length > 0) {
    console.log(`${walletName} extension already downloaded and extracted.`);
    return extractPath;
  }

  // Ensure the extensions directory exists
  fs.mkdirSync(path.dirname(extractPath), { recursive: true });

  // Download the CRX file using axios
  console.log(`Downloading ${walletName} extension from ${downloadUrl} ...`);
  const response = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'Chrome' },
    maxRedirects: 5,
    validateStatus: status => status >= 200 && status < 400,
  });

  const tempCrxPath = path.join(path.dirname(extractPath), `${id}.crx`);
  fs.writeFileSync(tempCrxPath, response.data);
  console.log('Download complete.');

  // Verify that the CRX file is not empty
  const crxFileSize = fs.statSync(tempCrxPath).size;
  if (crxFileSize === 0) {
    throw new Error('Downloaded CRX file is empty.');
  }

  // Extract the CRX file using our extraction logic
  console.log('Extracting extension...');
  await extractCRX(tempCrxPath, extractPath);

  // Cleanup: delete the CRX file
  fs.unlinkSync(tempCrxPath);
  console.log('Cleanup complete.');

  validateExtractedExtension(extractPath);
  const extensionPath = path.join(__dirname, '..', 'extensions', walletName);
  await modifyManifestFile(extensionPath, walletName);

  return extractPath;
}

/**
 * Downloads and extracts a wallet extension using the GitHub zip file.
 * This allows to work with a specific version (e.g., MetaMask v12.13.1).
 *
 * @param {string} walletName - The wallet key (e.g., 'metamask').
 * @returns {string} The path to the extracted extension.
 */
async function downloadAndExtractWalletVersioned(walletName) {
  const wallet = extensionConstants[walletName];
  if (!wallet) {
    throw new Error(`Unknown wallet: ${walletName}`);
  }
  const { githubUrl, extractPath, id, version } = wallet;
  if (!githubUrl) {
    throw new Error(`No GitHub URL provided for wallet: ${walletName}`);
  }

  // If already extracted, skip download and extraction
  if (fs.existsSync(extractPath) && fs.readdirSync(extractPath).length > 0) {
    console.log(`${walletName} extension version ${version} already downloaded and extracted.`);
    return extractPath;
  }

  // Ensure the extensions directory exists
  fs.mkdirSync(path.dirname(extractPath), { recursive: true });

  // Download the zip file from GitHub
  console.log(`Downloading ${walletName} extension version ${version} from ${githubUrl} ...`);
  const response = await axios.get(githubUrl, {
    responseType: 'arraybuffer',
    maxRedirects: 5,
    validateStatus: status => status >= 200 && status < 400,
  });

  const tempZipPath = path.join(path.dirname(extractPath), `${id}_${version}.zip`);
  fs.writeFileSync(tempZipPath, response.data);
  console.log('Download complete.');

  // Verify that the zip file is not empty
  const zipFileSize = fs.statSync(tempZipPath).size;
  if (zipFileSize === 0) {
    throw new Error('Downloaded zip file is empty.');
  }

  // Extract the zip file using JSZip
  console.log('Extracting extension from zip...');
  const zipData = fs.readFileSync(tempZipPath);
  const zip = await JSZip.loadAsync(zipData);

  // Find root directory if it exists (common in GitHub releases)
  const zipEntries = Object.keys(zip.files);
  const rootDirs = zipEntries
    .filter(name => name.endsWith('/') && name.split('/').length === 2)
    .map(name => name.split('/')[0]);

  // Check if we have a single root directory containing all files
  const rootDir = rootDirs.length === 1 ? `${rootDirs[0]}/` : '';
  const rootDirLength = rootDir.length;

  // Create extraction directory if it doesn't exist
  fs.mkdirSync(extractPath, { recursive: true });

  // Extract files, removing the root directory from paths if needed
  await Promise.all(
    Object.keys(zip.files).map(async filename => {
      // Skip the root directory itself
      if (filename === rootDir) return;

      // Remove root directory prefix if it exists
      const destFilename =
        rootDirLength > 0 && filename.startsWith(rootDir)
          ? filename.substring(rootDirLength)
          : filename;

      // Skip if the resulting filename is empty
      if (!destFilename) return;

      const file = zip.files[filename];
      const destPath = path.join(extractPath, destFilename);

      if (file.dir) {
        await fsPromises.mkdir(destPath, { recursive: true });
      } else {
        const content = await file.async('nodebuffer');
        await fsPromises.mkdir(path.dirname(destPath), { recursive: true });
        await fsPromises.writeFile(destPath, content);
      }
    }),
  );

  console.log('Extraction complete.');
  // Cleanup: delete the zip file
  fs.unlinkSync(tempZipPath);
  console.log('Cleanup complete.');

  validateExtractedExtension(extractPath);
  return extractPath;
}

async function downloadAndExtractWalletAuto(walletName) {
  const wallet = extensionConstants[walletName];
  if (!wallet) {
    throw new Error(`Unknown wallet: ${walletName}`);
  }
  // If a GitHub URL is provided, use the versioned download method.
  if (wallet.githubUrl) {
    return await downloadAndExtractWalletVersioned(walletName);
  } else {
    return await downloadAndExtractWallet(walletName);
  }
}

/**
 * Validates that an extracted extension directory contains a valid manifest.json file.
 *
 * @param {string} extractPath - Path to the extracted extension directory
 * @returns {boolean} - True if the extension is valid
 * @throws {Error} - If the extension is invalid
 */
function validateExtractedExtension(extractPath) {
  const manifestPath = path.join(extractPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Extracted extension is invalid: manifest.json not found');
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(
      `Validated extension: ${manifest.name || 'Unknown'} v${manifest.version || 'Unknown'}`,
    );
    return true;
  } catch (error) {
    throw new Error(`Invalid manifest.json: ${error.message}`);
  }
}

async function modifyManifestFile(extensionPath, walletName) {
  if (walletName !== 'phantom') return; // Only modify for Phantom wallet

  const manifestPath = path.join(extensionPath, 'manifest.json');

  // Check if manifest file exists
  if (!fs.existsSync(manifestPath)) {
    console.warn(`Manifest file not found at ${manifestPath}`);
    return;
  }

  try {
    // Read the manifest file
    const rawData = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(rawData);

    // Remove the side_panel entry if it exists
    if (manifest.side_panel) {
      console.log('Removing side_panel entry from Phantom manifest.json');
      delete manifest.side_panel;

      // Write the modified manifest back to file
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }
  } catch (error) {
    console.error(`Error modifying manifest file: ${error.message}`);
  }
}

export { downloadAndExtractWalletAuto };
