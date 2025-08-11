
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

interface WeeklyRank {
  name: string;
  count: number;
  clients: string[];
}

// Helper function to get the start of the current week (Monday)
const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay(); // Sunday = 0, Monday = 1, ...
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
};

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = '1Cznqn7ZRnwWm3J8uE0Y06MsGcDCHdxCr6n6Nw3e9lcE';

    if (!apiKey) {
      throw new Error("Google Sheets API key is not configured.");
    }

    const sheets = google.sheets({ version: 'v4', auth: apiKey });

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: ['D2:D', 'E2:E', 'N2:N'], // Name, Client, Confirmed Date
    });

    const valueRanges = response.data.valueRanges;
    if (!valueRanges || valueRanges.length < 3) {
      return NextResponse.json({ error: 'Could not find enough data in the sheet.' }, { status: 500 });
    }

    const allValues = [
      valueRanges[0].values || [], // D: names
      valueRanges[1].values || [], // E: clients
      valueRanges[2].values || [], // N: confirmed dates
    ];

    const maxRows = Math.max(...allValues.map(range => range.length));
    const startOfWeek = getStartOfWeek();

    const weekly: { [name: string]: { count: number; clients: Set<string> } } = {};

    for (let i = 0; i < maxRows; i++) {
      const name = allValues[0][i]?.[0] || '';
      const client = allValues[1][i]?.[0] || '';
      const dateN = allValues[2][i]?.[0] || '';

      if (!name || !dateN) continue;

      const entryDate = new Date((dateN as string).replace(/\//g, '-'));
      if (!isNaN(entryDate.getTime()) && entryDate >= startOfWeek) {
        if (!weekly[name]) {
          weekly[name] = { count: 0, clients: new Set<string>() };
        }
        weekly[name].count += 1;
        if (client) weekly[name].clients.add(client);
      }
    }

    const rankedData: WeeklyRank[] = Object.entries(weekly)
      .map(([name, info]) => ({ name, count: info.count, clients: Array.from(info.clients) }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ data: rankedData });

  } catch (error) {
    console.error('Error fetching ranking data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch ranking data', details: errorMessage }, { status: 500 });
  }
}
