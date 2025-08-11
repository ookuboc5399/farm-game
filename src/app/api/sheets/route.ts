
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Define the structure of our farm data
interface FarmEntry {
  name: string;
  client: string;
  date: string;
  content: string;
}

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = '1Cznqn7ZRnwWm3J8uE0Y06MsGcDCHdxCr6n6Nw3e9lcE';

    if (!apiKey) {
      throw new Error("Google Sheets API key is not configured.");
    }

    const sheets = google.sheets({
      version: 'v4',
      auth: apiKey,
    });

    // Fetch data from multiple ranges
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ['D2:D', 'E2:E', 'N2:N', 'O2:O'], // Start from row 2 to skip header
    });

    const valueRanges = response.data.valueRanges;
    if (!valueRanges || valueRanges.length < 4) {
      return NextResponse.json({ error: 'Could not find enough data in the sheet.' }, { status: 500 });
    }
    
    const names = valueRanges[0].values ? valueRanges[0].values.flat() : [];
    const clients = valueRanges[1].values ? valueRanges[1].values.flat() : [];
    const dates = valueRanges[2].values ? valueRanges[2].values.flat() : [];
    const contents = valueRanges[3].values ? valueRanges[3].values.flat() : [];

    // Find the maximum length among all columns to avoid index out of bounds
    const maxRows = Math.max(names.length, clients.length, dates.length, contents.length);

    const data: FarmEntry[] = [];
    for (let i = 0; i < maxRows; i++) {
      // We only care about entries where there is a date and content
      if (dates[i] && contents[i] && names[i]) {
        data.push({
          name: names[i] || '',
          client: clients[i] || '不明な作物', // Provide a default if client is missing
          date: dates[i],
          content: contents[i],
        });
      }
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Error fetching sheet data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch sheet data', details: errorMessage }, { status: 500 });
  }
}
