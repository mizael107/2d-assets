// Playwright controlando o Chromium em modo headless.
import { chromium } from 'playwright';
import { CHROMIUM_PATH, CHROMIUM_ARGS } from './config.mjs';

export async function launchBrowser(options = {}) {
  return chromium.launch({ executablePath: CHROMIUM_PATH, headless: true, args: CHROMIUM_ARGS, ...options });
}
