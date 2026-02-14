import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { processAndCleanTextInput } from './text.service';

const fetchHTML = async (url: string, timeout = 8000) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Invalid URL format');
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
      throw new Error(
        `Request failed with status ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      throw new Error('Response is not HTML');
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

const CleanUpAndExtractData = (html: string, url: string) => {
  const dom = new JSDOM(html, {
    url,
  });
  const document = dom.window.document;

  const reader = new Readability(document);
  const article = reader.parse();
  if (!article) {
    throw new Error('Failed to extract the article');
  }
  if (
    !article.textContent ||
    article.textContent.trim().length === 0 ||
    !article.content
  ) {
    throw new Error('Failed to extract the readable content');
  }

  const cleanedDom = new JSDOM(article.content);
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
    title: article.title,
    excerpt: article.excerpt,
    cleanedText: cleanedText.trim(),
  };
};

export const ScrapeAndCleanDataFromUrls = async (urls: string[]) => {
  try {
    const data = await Promise.all(
      urls.map(async (url) => {
        const response = await fetchHTML(url);
        return CleanUpAndExtractData(response, url);
      }),
    );
    return data;
  } catch (error) {
    console.log('ScrapeAndCleanDataFromUrls Error : ', error);
    throw error;
  }
};
