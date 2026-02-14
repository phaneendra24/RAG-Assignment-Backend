import { IngestInput, QueryInput } from './data.schema';
import * as textService from '../services/text.service';
import * as scrapeService from '../services/scrape.service';
import { createDocument } from '../db/queries';

export const ingest = async (
  payload: IngestInput,
): Promise<{ success: boolean; message: string }> => {
  console.log('Ingest Payload : ', payload);
  try {
    if (payload.type === 'NOTE' && typeof payload.content === 'string') {
      const cleanedText = textService.processAndCleanTextInput(payload.content);
      console.log('Cleaned Text', cleanedText);

      if (cleanedText.length <= 0) {
        return { success: false, message: 'Failed to ingest data' };
      }

      const id = await createDocument(
        'NOTE',
        cleanedText.substring(0, 50),
        null,
        cleanedText,
      );

      console.log('Data added to DB : ', id);
    } else if (payload.type === 'URL' && Array.isArray(payload.content)) {
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
