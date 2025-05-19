class BasePage {
  DEFAULT_TIMEOUT = 1000;
  LONG_TIMEOUT = 5500;

  constructor(window) {
    this.window = window;
  }

  // --------------------------
  // Helper Methods
  // --------------------------

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
    let element = this.window.locator(selector);

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
    return this.window
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

  /**
   * Fills an input field with the provided value.
   * @param {string} selector - The selector of the input element.
   * @param {string} value - The value to fill in.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @returns {Promise<void>}
   */
  async fill(selector, value, index = null) {
    console.log(`Filling element with selector: ${selector} with value: ${value}`);
    const element = this.getElement(selector, index);
    await element.fill(value);
  }

  /**
   * Selects an option from a <select> element by its value.
   * @param {string} selector - The selector of the <select> element.
   * @param {string} value - The value of the option to select.
   * @param {number|null} [index=null] - Optional index to select a specific <select> element when multiple are present.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be visible.
   * @returns {Promise<void>}
   */
  async selectOptionByValue(selector, value, index = null, timeout = this.DEFAULT_TIMEOUT) {
    console.log(`Selecting option with value: ${value} in <select> with selector: ${selector}`);
    const selectElement = this.getElement(selector, index);
    await selectElement.waitFor({ state: 'visible', timeout });
    await selectElement.selectOption({ value });
  }

  /**
   * Toggles a checkbox styled as a switch by targeting the specific input element.
   * @param {string} selector - The selector of the switch element.
   * @param {number|null} [index=null] - Optional index to select a specific switch when multiple are present.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be actionable.
   * @returns {Promise<void>}
   */
  async toggleSwitch(selector, index = null, timeout = this.DEFAULT_TIMEOUT) {
    console.log(`Toggling switch with selector: ${selector}`);
    const element = this.getElement(selector, index);
    const inputElement = element.locator('input[type="checkbox"]');
    try {
      await inputElement.waitFor({ state: 'attached', timeout });
      await inputElement.click({ force: true });
      console.log(`Clicked on switch using force option.`);
    } catch (error) {
      console.error(`Failed to click on the switch. Error: ${error.message}`);
      // Attempt clicking via JavaScript as a fallback
      await this.window.evaluate(el => el.click(), inputElement);
      console.log(`Clicked on switch using JavaScript.`);
    }
  }

  /**
   * Scrolls the element into view.
   * @param {string} selector - The selector of the element to scroll into view.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @returns {Promise<void>}
   */
  async scrollIntoView(selector, index = null) {
    console.log(`Scrolling element with selector: ${selector} into view`);
    const element = this.getElement(selector, index);
    await element.scrollIntoViewIfNeeded();
  }

  /**
   * Force scrolls to the target element
   * @param selector - The selector of the element to scroll to
   * @param index - index of the element. Default is 0 so that
   * if there are multiple elements, we will scroll to the first.
   */
  async forceScrollToElement(selector, index = 0) {
    const elementHandle = this.getElement(selector, index);
    if (elementHandle) {
      await elementHandle.evaluate(element =>
        element.scrollIntoView({
          behavior: 'instant',
          block: 'start',
          inline: 'end',
        }),
      );
    } else {
      throw new Error(`Element with selector: ${selector} can not be scrolled to`);
    }
  }

  /**
   * Waits for an element to disappear from the DOM.
   * @param {{text: string}} selector - The selector of the element to wait for.
   * @param {{timeout: number, longTimeout: number}} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to appear.
   * @param {number} [longTimeout=this.LONG_TIMEOUT] - Optional timeout to wait for the element to disappear.
   * @returns {Promise<void>}
   */
  async waitForElementToDisappear(
    selector,
    timeout = this.DEFAULT_TIMEOUT,
    longTimeout = this.LONG_TIMEOUT,
  ) {
    console.log(`Waiting for element with selector: ${selector} to disappear`);
    try {
      await this.window.waitForSelector(selector, { state: 'attached', timeout: timeout });
      await this.window.waitForSelector(selector, { state: 'detached', timeout: longTimeout });
    } catch (error) {
      console.error(`Element with selector ${selector} did not disappear.`);
    }
  }

  /**
   * Waits for an element with a specified selector to become visible within the DOM.
   * @param {string} selector - The selector of the element to wait for.
   * @param {number} [timeout=this.LONG_TIMEOUT] - Optional timeout to wait for the element to be visible.
   * @returns {Promise<void>}
   */
  async waitForElementToBeVisible(selector, timeout = this.LONG_TIMEOUT) {
    selector = this.getSelector(selector);
    console.log(`Waiting for element with selector: ${selector} to become visible`);
    try {
      await this.window.waitForSelector(selector, { state: 'visible', timeout });
      console.log(`Element with selector ${selector} is now visible.`);
    } catch (error) {
      console.error(
        `Element with selector ${selector} did not become visible within the timeout: ${timeout}`,
        error,
      );
    }
  }

  /**
   * Waits for an element to be present in the DOM.
   * @param {string} selector - The selector of the element to wait for.
   * @param {number} [timeout=this.LONG_TIMEOUT] - Optional timeout to wait for the element to be present.
   * @returns {Promise<void>}
   */
  async waitForElementPresentInDOM(selector, timeout = this.LONG_TIMEOUT) {
    selector = this.getSelector(selector);
    try {
      await this.window.waitForSelector(selector, {
        state: 'attached',
        timeout: timeout,
      });
      console.log(`Element with selector "${selector}" is present in the DOM.`);
    } catch (error) {
      console.error(
        `Element with selector "${selector}" did not appear in the DOM within ${timeout} ms.`,
      );
    }
  }

  /**
   * Uploads a file via a file input or file chooser dialog.
   * @param {string} selector - The selector of the element to trigger the file upload.
   * @param {string|string[]} filePaths - The path(listenDeposits.js) to the file(listenDeposits.js) to upload.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @returns {Promise<void>}
   */
  async uploadFile(selector, filePaths, index = null) {
    console.log(`Uploading file(s) ${filePaths} via element with selector: ${selector}`);

    const element = this.getElement(selector, index);

    // Determine if the element is an input of type file
    const isInputFile = await element.evaluate(el => el.tagName === 'INPUT' && el.type === 'file');

    if (isInputFile) {
      // If the element is an input[type="file"], set files directly
      await element.setInputFiles(filePaths);
    } else {
      // Otherwise, wait for the file chooser event
      const fileChooserPromise = this.window.waitForEvent('filechooser');
      await element.click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePaths);
    }
  }

  // --------------------------
  // Element State Methods
  // --------------------------

  /**
   * Checks if an element has the 'active' class.
   * @param {string} selector - The selector of the element to check.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @param classAttribute - The string in class attribute to check for.
   * @returns {Promise<boolean>} - True if the element has 'active' or any custom class, false otherwise.
   */
  async isElementActive(selector, index = null, classAttribute) {
    const element = this.getElement(selector, index);
    const classList = await element.getAttribute('class');
    return classList && classList.includes(classAttribute);
  }

  /**
   * Checks if an element is visible.
   * @param {string} selector - The selector of the element to check.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be visible.
   * @returns {Promise<boolean>} - True if the element is visible, false otherwise.
   */
  async isElementVisible(selector, index = null, timeout = this.DEFAULT_TIMEOUT) {
    console.log(`Checking if element with selector: ${selector} is visible`);
    try {
      const element = this.getElement(selector, index);
      await element.waitFor({ state: 'visible', timeout });
      return await element.isVisible();
    } catch (error) {
      return false;
    }
  }

  /**
   * Checks if an element is editable.
   * @param {string} selector - The selector of the element to check.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be visible.
   * @returns {Promise<boolean>} - True if the element is editable, false otherwise.
   */
  async isElementEditable(selector, index = null, timeout = this.DEFAULT_TIMEOUT) {
    console.log(`Checking if element with selector: ${selector} is editable`);
    const element = this.getElement(selector, index);
    await element.waitFor({ state: 'visible', timeout });
    return await element.isEditable();
  }

  /**
   * Checks if an element is disabled.
   * @param {string} selector - The selector of the element to check.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be visible.
   * @returns {Promise<boolean>} - True if the element is disabled, false otherwise.
   */
  async isDisabled(selector, index = null, timeout = this.DEFAULT_TIMEOUT) {
    console.log(`Checking if element with selector: ${selector} is disabled`);
    const element = this.getElement(selector, index);
    await element.waitFor({ state: 'visible', timeout });
    return await element.isDisabled();
  }

  /**
   * Checks if a button is enabled based on its selector.
   * @param {string} selector - The selector for the button to check.
   * @returns {Promise<boolean>} - True if the button is enabled, false otherwise.
   */
  async isButtonEnabled(selector) {
    selector = this.getSelector(selector);
    const button = await this.window.waitForSelector(selector, {
      state: 'attached',
    });
    return await button.isEnabled();
  }

  /**
   * Checks whether the switch with the specified testId is toggled on or off.
   * @param {string} testId - The data-testid of the switch.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be actionable.
   * @returns {Promise<boolean>} - Returns true if the switch is toggled on, false otherwise.
   */
  async isSwitchToggledOn(testId, timeout = this.DEFAULT_TIMEOUT) {
    console.log(`Checking if switch with testId: ${testId} is toggled on`);
    const selector = `input[type='checkbox'][data-testid="${testId}"]`;
    try {
      const element = await this.window.waitForSelector(selector, {
        state: 'attached',
        timeout: timeout,
      });
      const isChecked = await element.isChecked();
      console.log(`Switch with testId: ${testId} is toggled ${isChecked ? 'on' : 'off'}`);
      return isChecked;
    } catch (error) {
      console.error(
        `Failed to determine the state of the switch with testId: ${testId}. Error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Checks if the ::before pseudo-element exists and is visible for an element with the specified selector.
   * This method evaluates the computed styles of the ::before pseudo-element to determine its presence.
   * @param {string} selector - The selector attribute of the element to check.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be visible.
   * @returns {Promise<boolean>} - Returns true if the ::before pseudo-element exists and is visible, false otherwise.
   */
  async hasBeforePseudoElement(selector, index = null, timeout = this.DEFAULT_TIMEOUT) {
    console.log(
      `Checking if ::before pseudo-element exists for element with selector: ${selector}`,
    );
    const element = this.getElement(selector, index);
    await element.waitFor({ state: 'visible', timeout: timeout });

    const pseudoStyles = await element.evaluate(el => {
      const styles = window.getComputedStyle(el, '::before');
      return {
        display: styles.getPropertyValue('display'),
        width: styles.getPropertyValue('width'),
        height: styles.getPropertyValue('height'),
        opacity: styles.getPropertyValue('opacity'),
        visibility: styles.getPropertyValue('visibility'),
      };
    });

    return (
      pseudoStyles.display !== 'none' &&
      pseudoStyles.visibility !== 'hidden' &&
      parseFloat(pseudoStyles.opacity) !== 0 &&
      parseFloat(pseudoStyles.width) > 0 &&
      parseFloat(pseudoStyles.height) > 0
    );
  }

  /**
   * Checks if an input field is filled.
   * @param selector - The selector of the input field.
   * @returns {Promise<boolean>}
   */
  async isInputFieldFilled(selector) {
    const element = this.getElement(selector);
    const value = await element.inputValue();
    return value.trim().length > 0; // Returns true if the input is filled
  }

  // --------------------------
  // Element Content Methods
  // --------------------------

  /**
   * Gets text content of elements.
   * @param {string} selector - The selector of the element(listenDeposits.js) to get text from.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be visible.
   * @returns {Promise<string|string[]>} - Text content of the element(listenDeposits.js).
   */
  async getText(selector, index = null, timeout = this.DEFAULT_TIMEOUT) {
    if (index !== null) {
      console.log(`Getting text for element with selector: ${selector} at index ${index}`);
      const element = this.getElement(selector, index);

      try {
        await element.waitFor({ state: 'visible', timeout });
      } catch (error) {
        console.log(
          `Element at index ${index} with selector: ${selector} did not become visible within ${timeout}ms`,
        );
      }

      return await element.textContent();
    } else {
      console.log(`Getting text for elements with selector: ${selector}`);
      const elements = this.getElement(selector);

      try {
        await elements.first().waitFor({ state: 'visible', timeout });
      } catch (error) {
        console.log(`No elements became visible with selector: ${selector} within ${timeout}ms`);
      }

      const count = await elements.count();

      const texts = [];
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        texts.push(await element.textContent());
      }

      return count === 1 ? texts[0] : texts;
    }
  }

  /**
   * Gets text from an element, with retry logic.
   * @param {string} selector - The selector of the element to get text from.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be visible.
   * @param {number} [retries=5] - Number of retries.
   * @param {number} [retryDelay=1000] - Delay between retries in milliseconds.
   * @returns {Promise<string>} - Text content of the element.
   * @throws {Error} - If text cannot be retrieved after retries.
   */
  async getTextWithRetry(
    selector,
    index = null,
    timeout = this.DEFAULT_TIMEOUT,
    retries = 5,
    retryDelay = 1000,
  ) {
    console.log(`Getting text for element with selector: ${selector}`);
    let attempt = 0;
    let textContent = '';

    while (attempt < retries) {
      const element = this.getElement(selector, index);
      await element.waitFor({ state: 'visible', timeout });

      textContent = await element.textContent();
      console.log(
        `Attempt ${attempt + 1}: Retrieved text content: "${textContent}" for element with selector: ${selector}`,
      );

      if (textContent && textContent.trim() !== '') {
        return textContent;
      }

      // Increment the attempt counter and delay before retrying
      attempt++;
      if (attempt < retries) {
        console.log(`Text content is empty or invalid, retrying after ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error(
      `Failed to retrieve text from element with selector: ${selector} after ${retries} attempts`,
    );
  }

  /**
   * Gets text from an input field.
   * @param {string} selector - The selector of the input element.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be visible.
   * @returns {Promise<string>} - The value of the input field.
   */
  async getTextFromInputField(selector, index = null, timeout = this.DEFAULT_TIMEOUT) {
    console.log(`Getting text from input field with selector: ${selector}`);
    const element = this.getElement(selector, index);
    await element.waitFor({ state: 'visible', timeout });
    return element.inputValue();
  }

  /**
   * Gets text from an input field with retry logic.
   * @param {string} selector - The selector of the input element.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @param {number} [timeout=this.DEFAULT_TIMEOUT] - Optional timeout to wait for the element to be visible.
   * @returns {Promise<string>} - The value of the input field.
   * @throws {Error} - If a non-empty value cannot be retrieved after retries.
   */
  async getTextFromInputFieldWithRetry(selector, index = null, timeout = this.DEFAULT_TIMEOUT) {
    console.log(`Getting text from input field with selector: ${selector}`);
    const element = this.getElement(selector, index);
    await element.waitFor({ state: 'visible', timeout });

    const maxAttempts = 10;
    const interval = 500;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const value = await element.inputValue();
      if (value.trim() !== '') {
        return value;
      }

      attempts++;
      console.log(`Attempt ${attempts}: Input field is still empty, waiting...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(
      `Failed to retrieve non-empty text from element with selector: ${selector} after multiple attempts`,
    );
  }

  /**
   * Gets the inner text or HTML of an element by its selector.
   * @param {string} selector - The selector of the element.
   * @param {number|null} [index=null] - Optional index to select a specific element when multiple are present.
   * @param {number} [timeout=this.LONG_TIMEOUT] - The timeout to wait for the element to be visible.
   * @returns {Promise<string>} - The inner text or HTML of the element.
   */
  async getInnerContent(selector, index = null, timeout = this.LONG_TIMEOUT) {
    console.log(`Getting inner content for element with selector: ${selector}`);
    const element = this.getElement(selector, index);
    await element.waitFor({ state: 'visible', timeout });
    return element.innerHTML();
  }

  /**
   * Waits for an input field to be filled.
   * @param {string} selector - The selector of the input field.
   * @param {number|null} [index=null] - Optional index to select a specific input field when multiple are present.
   * @param {number} [timeout=this.LONG_TIMEOUT] - Optional timeout to wait for the input field to be filled.
   * @returns {Promise<string>} - The value of the input field once it is filled.
   * @throws {Error} - If the input field is not filled within the timeout period.
   */
  async waitForInputFieldToBeFilled(selector, index = null, timeout = this.LONG_TIMEOUT) {
    console.log(`Waiting for input field with selector: ${selector} to be filled`);
    const element = this.getElement(selector, index);

    const maxAttempts = timeout / 500; // Check every 500ms until the timeout
    let attempts = 0;

    while (attempts < maxAttempts) {
      const tagName = await element.evaluate(node => node.tagName.toLowerCase());
      if (['input', 'textarea', 'select'].includes(tagName)) {
        const value = await element.inputValue();
        if (value.trim() !== '') {
          console.log(`Input field with selector: ${selector} is filled with value: ${value}`);
          return value;
        }
      } else {
        throw new Error(
          `Element with selector: ${selector} is not an input, textarea, or select element`,
        );
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 500 milliseconds before retrying
    }

    throw new Error(
      `Input field with selector: ${selector} was not filled within the timeout period`,
    );
  }

  // --------------------------
  // Utility Methods
  // --------------------------

  /**
   * Counts the number of elements that match a selector prefix.
   * @param {string} selector - The prefix of the selector.
   * @returns {Promise<number>} - The count of matching elements.
   */
  async countElements(selector) {
    console.log(`Looking for elements with prefix: ${selector}`);
    const elements = this.getElement(selector);
    const count = await elements.count();
    console.log(`Found ${count} elements with prefix: ${selector}`);
    return count;
  }

  /* -----------------------  Locator builders  ----------------------- */

  /**
   * Build a Playwright locator from a “descriptor”:
   *  - string  ➜  data-test-id
   *  - {role,name?} ➜ getByRole
   *  - {label|placeholder|alt|title|text|testId|css} ➜ matching helper
   */
  #buildLocator(descriptor) {
    if (typeof descriptor === 'string') {
      return this.window.getByTestId(descriptor);          // "[data-testid=...]"
    }
    if (descriptor.role) {
      return this.window.getByRole(descriptor.role, {
        name: descriptor.name,
        ...descriptor.options      // e.g. exact, includeHidden
      });
    }
    if (descriptor.label)       return this.window.getByLabel(descriptor.label);
    if (descriptor.placeholder) return this.window.getByPlaceholder(descriptor.placeholder);
    if (descriptor.alt)         return this.window.getByAltText(descriptor.alt);
    if (descriptor.title)       return this.window.getByTitle(descriptor.title);
    if (descriptor.text)        return this.window.getByText(descriptor.text, descriptor.options);
    if (descriptor.testId)      return this.window.getByTestId(descriptor.testId);
    if (descriptor.css)         return this.window.locator(descriptor.css); // last resort
    throw new Error(`Unrecognised locator descriptor: ${JSON.stringify(descriptor)}`);
  }

  /* -----------------------  Public helpers  ------------------------- */

  getElementTest(descriptor, nth = null) {
    const loc = this.#buildLocator(descriptor);
    return (nth === null || nth === undefined)   // ◀─ add the guard
      ? loc
      : loc.nth(nth);
  }

  getNestedElementTest(parentDesc, childDesc, pNth = 0, cNth = 0) {
    return this.getElement(parentDesc, pNth)
      .locator(this.#buildLocator(childDesc))
      .nth(cNth);
  }

  async clickTest(descriptor, nth = 0, timeout = this.DEFAULT_TIMEOUT) {
    const el = this.getElementTest(descriptor, nth);
    await el.waitFor({ state: 'visible', timeout });
    await el.click();
  }

  async fillTest(descriptor, value, nth = 0, timeout = this.DEFAULT_TIMEOUT) {
    const el = this.getElementTest(descriptor, nth);
    await el.waitFor({ state: 'visible', timeout });
    await el.fill(value);
  }

  /** Return the textContent of one element, waiting for it to appear first. */
  async getTextTest(desc, nth = null, timeout = this.DEFAULT_TIMEOUT) {
    const el = await this.waitForElement(desc, nth, 'visible', timeout);
    return el.textContent();
  }

  /**
   * Return an array of textContent values for *all* matches, after waiting
   * until at least one of them reaches the desired state.
   *
   * @param {object|string} desc         – descriptor (or test-id string)
   * @param {'visible'|'attached'|'hidden'|'detached'} [state='visible']
   * @param {number}        [timeout=this.DEFAULT_TIMEOUT]
   * @returns {Promise<string[]>}
   */
  async getAllTextsInit(desc, state = 'visible', timeout = this.DEFAULT_TIMEOUT) {
    const list = this.#buildLocator(desc);
    await list.first().waitFor({ state, timeout });
    return list.allTextContents();
  }

  /**
   * Read the text of every direct-child “cell” inside every “row”.
   *
   * @param {object|string} rowsDesc  – descriptor (or test-id string) that points
   *                                    to the collection of rows.
   * @param {string} [cellCss=':scope > span'] – CSS selector that matches the
   *                                    cells *within* each row (evaluated from
   *                                    the row element).  Defaults to all direct
   *                                    <span> children.
   * @returns {Promise<string[][]>}    – e.g. [['BSC Testnet'],
   *                                        ['tBNB','0'],
   *                                        ['ANKR','0']]
   */
  async getAllRowTexts(rowsDesc, cellCss = ':scope > span') {
    const rows = this.getElementTest(rowsDesc);           // Locator – all rows
    const rowCount = await rows.count();
    const all = [];

    for (let i = 0; i < rowCount; i++) {
      const cells = rows.nth(i).locator(cellCss);      // only that row’listenDeposits.js cells
      all.push(await cells.allTextContents());
    }
    return all;
  }

  /**
   * Resolve a descriptor → Locator and wait until it reaches the desired state.
   *
   * @param {object|string} desc   – descriptor (or test-id string)
   * @param {number|null}    nth   – optional zero-based index
   * @param {'visible'|'attached'|'detached'|'hidden'} state
   * @param {number}         timeout
   * @returns Promise<Locator>
   */
  async waitForElement(
    desc,
    nth      = null,
    state    = 'visible',
    timeout  = this.DEFAULT_TIMEOUT,
  ) {
    const target = this.getElementTest(desc, nth);   // re-use your builder
    await target.waitFor({ state, timeout });
    return target;
  }

  /**
   * Return true ⇢ element is disabled, false ⇢ it isn’t.
   *
   * @param {object|string} desc  – the same descriptor / test-id you pass to
   *                                clickTest(), getTextTest(), etc.
   * @param {number|null}   nth   – which match to test (default = first)
   * @param {number}         timeout
   * @returns Promise<boolean>
   */
  async isDisabledTest(desc, nth = 0, timeout = this.DEFAULT_TIMEOUT) {
    const element = this.getElementTest(desc, nth);
    await element.waitFor({ state: 'visible', timeout });
    return element.isDisabled();
  }

  /**
   * Check whether an element identified by its ARIA role (and optional
   * accessible name) is visible on the page.
   *
   * @param {string}                role       – ARIA role, e.g. 'button', 'link', 'dialog'
   * @param {string|RegExp|null}    [name=null]– Accessible name; pass a RegExp for fuzzy match
   * @param {object}                [opts={}]  – getByRole options (exact, includeHidden, pressed, …)
   * @param {number|null}           [index=null] – nth match to use when multiple elements share the role/name
   * @param {number}                [timeout=this.DEFAULT_TIMEOUT]
   *
   * @returns {Promise<boolean>}    true if the target element becomes visible within `timeout`
   */
  async isRoleVisible(
    role,
    name   = null,
    opts   = {},
    index  = null,
    timeout = this.DEFAULT_TIMEOUT,
  ) {
    console.log(`Checking visibility of role=${role} name=${name ?? '∅'}`);

    const descriptor = {
      role,
      ...(name !== null ? { name } : {}),
      options: opts,
    };

    try {
      const element = this.getElementTest(descriptor, index);
      await element.waitFor({ state: 'visible', timeout });
      return await element.isVisible();
    } catch {
      return false;
    }
  }

  async waitForElementToDisappearTest(descriptor, options = {}) {
    const timeout = options.timeout ?? this.DEFAULT_TIMEOUT;
    const longTimeout = options.longTimeout ?? this.LONG_TIMEOUT;

    console.log(`🔍 Waiting for element [${JSON.stringify(descriptor)}] to disappear...`);

    const locator = this.getElementTest(descriptor, options.nth);

    try {
      await locator.waitFor({ state: 'attached', timeout });
      await locator.waitFor({ state: 'detached', timeout: longTimeout });
      console.log(`✅ Element disappeared: ${JSON.stringify(descriptor)}`);
    } catch (error) {
      console.error(`❌ Element did not disappear: ${JSON.stringify(descriptor)}`);
      throw error;
    }
  }
}

module.exports = BasePage;
