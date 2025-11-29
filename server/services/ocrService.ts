import { ImageAnnotatorClient } from '@google-cloud/vision';

// Type for extracted receipt data
interface ExtractedReceiptData {
    merchantName: string;
    date: string;
    totalAmount: number;
    lineItems: any[];
    confidence: {
        merchantName: number;
        date: number;
        totalAmount: number;
    };
    receiptImageUrl: string;
}

// Initialize Google Vision client
let visionClient: ImageAnnotatorClient | null = null;

/**
 * Initialize the Vision API client with credentials
 */
function initializeVisionClient() {
    if (visionClient) {
        return visionClient;
    }

    try {
        // Check if credentials are provided via environment variable
        if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
            // Parse credentials from environment variable (JSON string)
            const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
            visionClient = new ImageAnnotatorClient({
                credentials
            });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            // Use credentials file path
            visionClient = new ImageAnnotatorClient();
        } else {
            console.warn('Google Vision API credentials not configured. OCR will not be available.');
            return null;
        }

        console.log('Google Vision API client initialized successfully');
        return visionClient;
    } catch (error) {
        console.error('Error initializing Google Vision API client:', error);
        return null;
    }
}

/**
 * Extract text from receipt image using Google Vision API
 */
async function extractTextFromImage(imageUrl: string): Promise<string> {
    const client = initializeVisionClient();

    if (!client) {
        throw new Error('OCR service not configured. Please set up Google Vision API credentials.');
    }

    try {
        // Perform text detection on the image
        const [result] = await client.textDetection(imageUrl);
        const detections = result.textAnnotations;

        if (!detections || detections.length === 0) {
            return '';
        }

        // The first annotation contains all detected text
        return detections[0].description || '';
    } catch (error) {
        console.error('Error extracting text from image:', error);
        throw new Error('Failed to extract text from receipt image');
    }
}

/**
 * Parse merchant name from extracted text
 */
function parseMerchantName(text: string): { value: string; confidence: number } {
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    if (lines.length === 0) {
        return { value: '', confidence: 0 };
    }

    // Typically, merchant name is in the first few lines
    // Look for the first line that's not a date or number
    for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].trim();

        // Skip lines that look like dates or pure numbers
        if (!/^\d+[\/\-\.]\d+/.test(line) && !/^\d+$/.test(line)) {
            // Merchant name found
            return {
                value: line,
                confidence: i === 0 ? 0.9 : 0.7
            };
        }
    }

    // Fallback to first line
    return { value: lines[0].trim(), confidence: 0.5 };
}

/**
 * Parse date from extracted text
 */
function parseDate(text: string): { value: string; confidence: number } {
    // Common date patterns
    const datePatterns = [
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,  // MM/DD/YYYY or DD/MM/YYYY
        /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,    // YYYY/MM/DD
        /(\w{3,9}\s+\d{1,2},?\s+\d{4})/i,           // Month DD, YYYY
        /(\d{1,2}\s+\w{3,9}\s+\d{4})/i              // DD Month YYYY
    ];

    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            const dateStr = match[1];
            const parsedDate = new Date(dateStr);

            // Validate the date
            if (!isNaN(parsedDate.getTime())) {
                return {
                    value: parsedDate.toISOString().split('T')[0],
                    confidence: 0.85
                };
            }
        }
    }

    // Fallback to current date with low confidence
    return {
        value: new Date().toISOString().split('T')[0],
        confidence: 0.3
    };
}

/**
 * Parse total amount from extracted text
 */
function parseTotalAmount(text: string): { value: number; confidence: number } {
    // Look for common total indicators
    const totalPatterns = [
        /total[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})/i,
        /amount[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})/i,
        /balance[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})/i,
        /grand\s+total[:\s]*\$?\s*(\d+[,.]?\d*\.?\d{2})/i
    ];

    for (const pattern of totalPatterns) {
        const match = text.match(pattern);
        if (match) {
            const amountStr = match[1].replace(/,/g, '');
            const amount = parseFloat(amountStr);

            if (!isNaN(amount) && amount > 0) {
                return { value: amount, confidence: 0.9 };
            }
        }
    }

    // Look for any currency amounts and pick the largest
    const amountPattern = /\$?\s*(\d+[,.]?\d*\.?\d{2})/g;
    const amounts: number[] = [];
    let match;

    while ((match = amountPattern.exec(text)) !== null) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
            amounts.push(amount);
        }
    }

    if (amounts.length > 0) {
        // Return the largest amount (likely the total)
        const maxAmount = Math.max(...amounts);
        return { value: maxAmount, confidence: 0.6 };
    }

    return { value: 0, confidence: 0 };
}

/**
 * Parse line items from extracted text
 */
function parseLineItems(text: string): any[] {
    const lineItems: any[] = [];
    const lines = text.split('\n');

    // Pattern to match line items: description followed by price
    const lineItemPattern = /^(.+?)\s+\$?\s*(\d+[,.]?\d*\.?\d{2})$/;

    for (const line of lines) {
        const trimmedLine = line.trim();
        const match = trimmedLine.match(lineItemPattern);

        if (match) {
            const description = match[1].trim();
            const priceStr = match[2].replace(/,/g, '');
            const price = parseFloat(priceStr);

            // Skip if description looks like a total line
            if (!/total|subtotal|tax|amount/i.test(description) && !isNaN(price) && price > 0) {
                lineItems.push({
                    description,
                    quantity: 1,
                    unitPrice: price,
                    totalPrice: price
                });
            }
        }
    }

    return lineItems;
}

/**
 * Process receipt image and extract structured data
 */
export async function processReceiptOCR(imageUrl: string): Promise<ExtractedReceiptData> {
    try {
        // Extract text from image
        const extractedText = await extractTextFromImage(imageUrl);

        if (!extractedText) {
            throw new Error('No text could be extracted from the receipt image');
        }

        // Parse structured data from text
        const merchantData = parseMerchantName(extractedText);
        const dateData = parseDate(extractedText);
        const amountData = parseTotalAmount(extractedText);
        const lineItems = parseLineItems(extractedText);

        return {
            merchantName: merchantData.value,
            date: dateData.value,
            totalAmount: amountData.value,
            lineItems,
            confidence: {
                merchantName: merchantData.confidence,
                date: dateData.confidence,
                totalAmount: amountData.confidence
            },
            receiptImageUrl: imageUrl
        };
    } catch (error) {
        console.error('Error processing receipt OCR:', error);
        throw error;
    }
}

/**
 * Check if OCR service is available
 */
export function isOCRAvailable(): boolean {
    return !!process.env.GOOGLE_CLOUD_CREDENTIALS || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
}
