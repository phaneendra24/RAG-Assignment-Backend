import { IngestInput, QueryInput } from './data.schema';
import * as textService from '../services/text.service';
import * as scrapeService from '../services/scrape.service';

export const ingest = async (
  payload: IngestInput,
): Promise<{ success: boolean; message: string }> => {
  console.log('Ingest Payload : ', payload);
  try {
    if (payload.type === 'text' && typeof payload.content === 'string') {
      const cleanedText = textService.processAndCleanTextInput(payload.content);
      console.log('Cleaned Text', cleanedText);
    } else if (payload.type === 'url' && Array.isArray(payload.content)) {
      console.log('Scrapping data started');
      const data = await scrapeService.ScrapeAndCleanDataFromUrls(
        payload.content,
      );
    }

    return { success: true, message: 'Data ingested successfully' };
  } catch (error) {
    console.log('Ingest Error : ', error);
    return { success: false, message: 'Failed to ingest data' };
  }
};

export const getItems = async () => {
  return { success: true };
};

export const query = async (payload: QueryInput) => {
  return;
};
