import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Define the structure of our farm data
interface FarmEntry {
  name: string;
  client: string;
  date: string;
  content: string;
  lastConfirmedDate?: string;
}

// Helper function to find the latest date among multiple date strings
const getLatestDate = (...dateStrings: string[]): string => {
  let latestDate: Date | null = null;
  let latestDateString: string = '';

  dateStrings.forEach(dateString => {
    if (dateString) {
      // Assuming dateString is in a format Date can parse, e.g., YYYY-MM-DD
      const currentDate = new Date(dateString);
      if (!isNaN(currentDate.getTime())) { // Check for valid date
        if (!latestDate || currentDate > latestDate) {
          latestDate = currentDate;
          latestDateString = dateString;
        }
      }
    }
  });
  return latestDateString;
};

export async function GET(request: Request, context: { params: Promise<{ employeeName: string }> }) {
  try {
    const { employeeName } = await context.params;
    const decodedEmployeeName = decodeURIComponent(employeeName);

    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = '1Cznqn7ZRnwWm3J8uE0Y06MsGcDCHdxCr6n6Nw3e9lcE'; // Same as sheets API

    if (!apiKey) {
      throw new Error("Google Sheets API key is not configured.");
    }

    const sheets = google.sheets({
      version: 'v4',
      auth: apiKey,
    });

    // Fetch data from multiple ranges - same as sheets API
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ['D2:D', 'E2:E', 'I2:I', 'J2:J', 'K2:K', 'N2:N', 'O2:O'], // Start from row 2 to skip header
    });

    const valueRanges = response.data.valueRanges;
    if (!valueRanges || valueRanges.length < 7) { // Updated length check
      return NextResponse.json({ error: 'Could not find enough data in the sheet.' }, { status: 500 });
    }

    const allValues = [
      valueRanges[0].values || [], // D: names
      valueRanges[1].values || [], // E: clients
      valueRanges[2].values || [], // I: datesI
      valueRanges[3].values || [], // J: datesJ
      valueRanges[4].values || [], // K: datesK
      valueRanges[5].values || [], // N: datesN
      valueRanges[6].values || [], // O: contents
    ];

    // Determine the maximum number of rows across all fetched ranges
    const maxRows = Math.max(...allValues.map(range => range.length));

    const allData: FarmEntry[] = [];
    for (let i = 0; i < maxRows; i++) {
      const name = allValues[0][i] ? allValues[0][i][0] : '';
      const client = allValues[1][i] ? allValues[1][i][0] : '不明な作物';
      const dateI = allValues[2][i] ? allValues[2][i][0] : '';
      const dateJ = allValues[3][i] ? allValues[3][i][0] : '';
      const dateK = allValues[4][i] ? allValues[4][i][0] : '';
      const dateN = allValues[5][i] ? allValues[5][i][0] : '';
      const content = allValues[6][i] ? allValues[6][i][0] : '';

      const latestContactDate = getLatestDate(dateI, dateJ, dateK);

      // We only care about entries where there is a name, content, and at least one valid contact date
      if (name && content && latestContactDate) {
        const newEntry = {
          name,
          client,
          date: latestContactDate,
          content,
          lastConfirmedDate: dateN, // Assign dateN directly
        };
        allData.push(newEntry);
      } else {
      }
    }

    // Filter data by employeeName
    const filteredData = allData.filter(entry => entry.name === decodedEmployeeName);

    return NextResponse.json({ data: filteredData });

  } catch (error) {
    console.error('Error fetching employee data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch employee data', details: errorMessage }, { status: 500 });
  }
}