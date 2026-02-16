import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import puppeteer from 'puppeteer';
import { processAndCleanTextInput } from './text.service';

const SCRAPING_FALLBACK_THRESHOLD = parseInt(
  process.env.SCRAPING_FALLBACK_THRESHOLD || '500',
);
const PUPPETEER_TIMEOUT = parseInt(process.env.PUPPETEER_TIMEOUT || '30000');

export interface ScrapedData {
  url: string;
  title: string;
  excerpt?: string;
  cleanedText: string;
  success: boolean;
  error?: string;
}

const fetchHTML = async (url: string, timeout = 8000): Promise<string> => {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL format: ${url}`);
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(parsedUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Connection: 'keep-alive',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unknown error occurred');
  } finally {
    clearTimeout(id);
  }
};

const CleanUpAndExtractData = (html: string, url: string): ScrapedData => {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  const reader = new Readability(document);
  const article = reader.parse();

  if (!article) {
    throw new Error('Could not extract readable content from page');
  }

  if (!article.textContent || article.textContent.trim().length === 0) {
    throw new Error('Page contains no readable text content');
  }

  const cleanedDom = new JSDOM(article.content as string);
  const cleanedDocument = cleanedDom.window.document;

  cleanedDocument
    .querySelectorAll('script, style, noscript, iframe, form')
    .forEach((el) => el.remove());

  let cleanedText = cleanedDocument.body.textContent || '';
  cleanedText = processAndCleanTextInput(cleanedText);
  cleanedText = cleanedText
    .split('\n')
    .filter((line) => !/^\s*\d+\s*$/.test(line))
    .map((line) => line.trim())
    .join('\n\n');

  return {
    url,
    title: article.title?.trim() || 'Untitled',
    excerpt: article.excerpt?.trim() || '',
    cleanedText: cleanedText.trim(),
    success: true,
  };
};

const isContentInsufficient = (data: ScrapedData): boolean => {
  if (
    !data.cleanedText ||
    data.cleanedText.length < SCRAPING_FALLBACK_THRESHOLD
  ) {
    return true;
  }
  if (!data.title || data.title.length < 3) {
    return true;
  }
  const errorIndicators = [
    '404',
    'not found',
    'error',
    'forbidden',
    'access denied',
    '403',
    '401',
    '500',
    '502',
    '503',
  ];
  const lowerTitle = data.title.toLowerCase();
  if (errorIndicators.some((indicator) => lowerTitle.includes(indicator))) {
    return true;
  }
  return false;
};

const fetchWithPuppeteer = async (url: string): Promise<string> => {
  console.log(`Using Puppeteer for SPA scraping: ${url}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    await page.setViewport({ width: 1920, height: 1080 });

    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: PUPPETEER_TIMEOUT,
    });

    if (!response) {
      throw new Error('Failed to get response from page');
    }

    if (response.status() >= 400) {
      throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      await page.waitForSelector(
        'main, #root, #app, [role="main"], article, .content',
        { timeout: 5000 },
      );
    } catch {
      console.log('No main content selector found, proceeding with full page');
    }

    return await page.content();
  } finally {
    await browser.close();
  }
};

const scrapeUrlWithFallback = async (url: string): Promise<ScrapedData> => {
  console.log(`Scraping URL: ${url}`);

  let staticError: Error | null = null;

  try {
    const staticHtml = await fetchHTML(url);
    const staticResult = CleanUpAndExtractData(staticHtml, url);

    if (!isContentInsufficient(staticResult)) {
      console.log(`Static scraping successful for: ${url}`);
      return staticResult;
    }

    console.log(
      `Static content insufficient (${staticResult.cleanedText.length} chars), trying Puppeteer...`,
    );
  } catch (error) {
    staticError =
      error instanceof Error ? error : new Error('Static scraping failed');
    console.log(
      `Static scraping failed: ${staticError.message}, trying Puppeteer...`,
    );
  }

  try {
    const spaHtml = await fetchWithPuppeteer(url);
    const spaResult = CleanUpAndExtractData(spaHtml, url);

    if (isContentInsufficient(spaResult)) {
      console.warn(`Puppeteer returned insufficient content for: ${url}`);
    } else {
      console.log(`Puppeteer scraping successful for: ${url}`);
    }

    return spaResult;
  } catch (puppeteerError) {
    const puppeteerErr =
      puppeteerError instanceof Error
        ? puppeteerError
        : new Error('Puppeteer scraping failed');
    console.error(
      `Failed to scrape ${url} with both methods:`,
      puppeteerErr.message,
    );
    throw puppeteerErr;
  }
};

export const ScrapeAndCleanDataFromUrl = async (
  url: string,
): Promise<ScrapedData> => {
  try {
    const data = await scrapeUrlWithFallback(url);
    return data;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return {
      url,
      title: 'Failed to scrape',
      cleanedText: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
