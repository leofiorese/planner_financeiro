/**
 * File operations utilities for download and upload functionality
 */

import { ExportFormat, generateExportFilename } from "./dataExport";

/**
 * Download options interface
 */
export interface DownloadOptions {
  filename?: string;
  mimeType?: string;
}

/**
 * Upload options interface
 */
export interface UploadOptions {
  accept?: string;
  maxSize?: number; // in bytes
}

/**
 * Default upload options
 */
export const DEFAULT_UPLOAD_OPTIONS: UploadOptions = {
  accept: ".json,.csv",
  maxSize: 10 * 1024 * 1024, // 10MB
};

/**
 * Download data as a file
 */
export function downloadFile(
  data: string,
  format: ExportFormat,
  options: DownloadOptions = {}
): void {
  const mimeTypes = {
    json: "application/json",
    csv: "text/csv",
  };

  const filename = options.filename || generateExportFilename(format);
  const mimeType = options.mimeType || mimeTypes[format];

  // Create blob with the data
  const blob = new Blob([data], { type: mimeType });

  // Create download URL
  const url = URL.createObjectURL(blob);

  // Create temporary download link
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  // Add to DOM, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Upload file and return content as Promise
 */
export function uploadFile(
  options: UploadOptions = DEFAULT_UPLOAD_OPTIONS
): Promise<{
  content: string;
  filename: string;
  size: number;
  type: string;
}> {
  return new Promise((resolve, reject) => {
    // Create file input element
    const input = document.createElement("input");
    input.type = "file";
    input.accept = options.accept || DEFAULT_UPLOAD_OPTIONS.accept!;
    input.style.display = "none";

    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      // Check file size
      const maxSize = options.maxSize || DEFAULT_UPLOAD_OPTIONS.maxSize!;
      if (file.size > maxSize) {
        reject(
          new Error(
            `File size (${formatFileSize(
              file.size
            )}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
          )
        );
        return;
      }

      // Read file content
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve({
          content,
          filename: file.name,
          size: file.size,
          type: file.type,
        });
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    };

    input.oncancel = () => {
      reject(new Error("File selection cancelled"));
    };

    // Add to DOM and trigger click
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Validate file type based on extension
 */
export function validateFileType(
  filename: string,
  allowedTypes: string[]
): boolean {
  const extension = filename.toLowerCase().split(".").pop();
  return allowedTypes.includes(`.${extension}`);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.toLowerCase().split(".").pop() || "";
}

/**
 * Check if browser supports file operations
 */
export function isBrowserCompatible(): {
  download: boolean;
  upload: boolean;
  fileReader: boolean;
  blob: boolean;
} {
  return {
    download:
      typeof URL !== "undefined" && typeof URL.createObjectURL === "function",
    upload: typeof FileReader !== "undefined",
    fileReader: typeof FileReader !== "undefined",
    blob: typeof Blob !== "undefined",
  };
}

/**
 * Download JSON data as file
 */
export function downloadJSON(data: string, filename?: string): void {
  downloadFile(data, "json", { filename });
}

/**
 * Download CSV data as file
 */
export function downloadCSV(data: string, filename?: string): void {
  downloadFile(data, "csv", { filename });
}

/**
 * Upload and read JSON file
 */
export function uploadJSON(): Promise<{
  content: string;
  filename: string;
  size: number;
  type: string;
}> {
  return uploadFile({
    accept: ".json",
    maxSize: 10 * 1024 * 1024, // 10MB
  });
}

/**
 * Upload and read CSV file
 */
export function uploadCSV(): Promise<{
  content: string;
  filename: string;
  size: number;
  type: string;
}> {
  return uploadFile({
    accept: ".csv",
    maxSize: 10 * 1024 * 1024, // 10MB
  });
}

/**
 * Upload any supported financial data file
 */
export function uploadFinancialData(): Promise<{
  content: string;
  filename: string;
  size: number;
  type: string;
}> {
  return uploadFile({
    accept: ".json,.csv",
    maxSize: 10 * 1024 * 1024, // 10MB
  });
}
