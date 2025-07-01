import PlaywrightWrapper from './PlaywrightWrapper.js';

export default class PlaywrightFactory {
    /** private, page-keyed cache */
    static #cache = new WeakMap();

    /**
     * Return the cached wrapper for a Playwright `page`,
     * or create / cache / return a fresh one the first time.
     *
     * @param {import('@playwright/test').Page} page
     * @returns {PlaywrightWrapper}
     */
    static getWrapper(page) {
        if (!this.#cache.has(page)) {
            this.#cache.set(page, new PlaywrightWrapper(page));
        }
        return this.#cache.get(page);
    }

    /** (optional) drop the wrapper for a page – useful in unit tests */
    static clear(page) {
        this.#cache.delete(page);
    }
}
