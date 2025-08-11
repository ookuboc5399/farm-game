
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

interface WeeklyRank {
  name: string;
  count: number;
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
      ranges: ['D2:D', 'N2:N'], // Only need Name and Date columns
    });

    const valueRanges = response.data.valueRanges;
    if (!valueRanges || valueRanges.length < 2) {
      return NextResponse.json({ error: 'Could not find enough data in the sheet.' }, { status: 500 });
    }

    const names = valueRanges[0].values ? valueRanges[0].values.flat() : [];
    const dates = valueRanges[1].values ? valueRanges[1].values.flat() : [];
    const startOfWeek = getStartOfWeek();

    const weeklyCounts: { [name: string]: number } = {};

    for (let i = 0; i < dates.length; i++) {
      const entryDate = new Date(dates[i]);
      const entryName = names[i];

      if (entryName && !isNaN(entryDate.getTime()) && entryDate >= startOfWeek) {
        weeklyCounts[entryName] = (weeklyCounts[entryName] || 0) + 1;
      }
    }

    const rankedData: WeeklyRank[] = Object.entries(weeklyCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ data: rankedData });

  } catch (error) {
    console.error('Error fetching ranking data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch ranking data', details: errorMessage }, { status: 500 });
  }
}
