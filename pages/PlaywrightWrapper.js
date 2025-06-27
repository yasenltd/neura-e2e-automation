export default class PlaywrightWrapper {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
    }

    // ------------- reusable goodies -----------------

    /**
     * Helper method to determine if a selector is a CSS selector.
     * @param {string} selector - The selector to check.
     * @returns {boolean} - True if the selector is a CSS selector, false otherwise.
     */
    isCssSelector(selector) {
        // Check if the selector starts with '.', '#', '[', or ':'
        // OR if it contains ':has-text(' anywhere in the string.
        const cssSelectorPattern = /^(?:[.#\[:]|.*:has\(|.*:has-text\()/;
        return cssSelectorPattern.test(selector);
    }

    /**
     * Helper method to get the selector based on the type.
     * @param selector
     * @returns {*|string}
     */
    getSelector(selector) {
        if (this.isCssSelector(selector)) {
            return selector;
        } else {
            return `[data-testid="${selector}"]`;
        }
    }

    /**
     * Unified method to get an element based on the selector type.
     * @param {string} selector - The selector to find the element.
     * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
     * @returns Locator - The element locator.
     * @throws {Error} - If the selector is invalid.
     */
    getElement(selector, index = null) {
        if (typeof selector !== 'string') {
            throw new Error(`Invalid selector: ${selector}`);
        }

        selector = this.getSelector(selector);
        let element = this.page.locator(selector);

        // Apply .nth(index) only if index is not null
        if (index !== null && index !== undefined) {
            element = element.nth(index);
        }

        return element;
    }

    /**
     * Locates a nested element within a parent element by their testIds or actual locators.
     * @param parentSelector The locator for the parent element.
     * @param childSelector The locator for the child element.
     * @param parentIndex The nth instance of the parent element.
     * @param childIndex The nth instance of the child element.
     * @returns Locator - The locator for the child element.
     */
    getNestedElement(parentSelector, childSelector, parentIndex = 0, childIndex = 0) {
        parentSelector = this.getSelector(parentSelector);
        childSelector = this.getSelector(childSelector);

        console.log(`Locating child element with locator: ${childSelector}`);
        return this.page
            .locator(parentSelector)
            .nth(parentIndex)
            .locator(childSelector)
            .nth(childIndex);
    }

    // --------------------------
    // Element Interaction Methods
    // --------------------------

    /**
     * Clicks on an element specified by the selector.
     * @param {string} selector - The selector of the element to click.
     * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
     * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be visible.
     * @returns {Promise<void>}
     */
    async click(selector, index = null, timeout = this.DEFAULT_TIMEOUT) {
        console.log(`Clicking on element with selector: ${selector}`);
        const element = this.getElement(selector, index);
        try {
            await element.waitFor({ state: 'visible', timeout });
            await element.click();
        } catch (error) {
            console.log(`Element with selector: ${selector} is not visible`);
        }
    }
}
