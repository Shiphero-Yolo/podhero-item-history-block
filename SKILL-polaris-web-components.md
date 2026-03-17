# SKILL: Shopify Polaris Web Components for Checkout UI Extensions

> Reference: https://shopify.dev/docs/api/checkout-ui-extensions/latest/polaris-web-components
> All components use the `s-` prefix (e.g., `<s-button>`, `<s-stack>`).

---

## Quick Decision Guide

| I need to...                              | Use this component        |
|-------------------------------------------|---------------------------|
| Trigger an action                         | `s-button`                |
| Navigate to a URL                         | `s-link`                  |
| Make custom-styled content clickable      | `s-clickable`             |
| Toggle on/off state                       | `s-press-button`          |
| Show interactive tags/filters             | `s-clickable-chip`        |
| Copy text to clipboard                    | `s-clipboard-item`        |
| Show critical/important messages          | `s-banner`                |
| Show non-disruptive announcements         | `s-announcement`          |
| Display status labels                     | `s-badge`                 |
| Show loading progress (known %)           | `s-progress`              |
| Show loading spinner (unknown duration)   | `s-spinner`               |
| Collect single-line text                  | `s-text-field`            |
| Collect multi-line text                   | `s-text-area`             |
| Collect email                             | `s-email-field`           |
| Collect phone number                      | `s-phone-field`           |
| Collect password                          | `s-password-field`        |
| Collect URL                               | `s-url-field`             |
| Collect number                            | `s-number-field`          |
| Collect money/currency                    | `s-money-field`           |
| Collect date (text input)                 | `s-date-field`            |
| Collect date (calendar picker)            | `s-date-picker`           |
| Binary yes/no with submit                 | `s-checkbox`              |
| Immediate on/off toggle                   | `s-switch`                |
| Single/multi select from visible options  | `s-choice-list`           |
| Dropdown select (4+ options)              | `s-select`                |
| SMS marketing consent                     | `s-consent-checkbox`      |
| SMS marketing phone consent               | `s-consent-phone-field`   |
| File upload                               | `s-drop-zone`             |
| Wrap form fields for Enter-submit         | `s-form`                  |
| Vertical/horizontal layout                | `s-stack`                 |
| Complex grid layout                       | `s-grid`                  |
| Generic styled container                  | `s-box`                   |
| Visual separator                          | `s-divider`               |
| Themed content group with heading         | `s-section`               |
| Scrollable container                      | `s-scroll-box`            |
| Container-query responsive design         | `s-query-container`       |
| Display images                            | `s-image`                 |
| Display product thumbnails                | `s-product-thumbnail`     |
| Display icons                             | `s-icon`                  |
| Display payment method icons              | `s-payment-icon`          |
| Display a map                             | `s-map`                   |
| Display a QR code                         | `s-qr-code`              |
| Focused overlay dialog                    | `s-modal`                 |
| Lightweight contextual overlay            | `s-popover`               |
| Bottom sheet (consent/privacy)            | `s-sheet`                 |
| Hover/focus info tooltip                  | `s-tooltip`               |
| Section/page title                        | `s-heading`               |
| Block text content                        | `s-paragraph`             |
| Inline styled text                        | `s-text`                  |
| Abbreviation with tooltip                 | `s-abbreviation`          |
| Static label/tag                          | `s-chip`                  |
| Expandable/collapsible content            | `s-details`               |
| Numbered list                             | `s-ordered-list`          |
| Bulleted list                             | `s-unordered-list`        |
| Machine-readable date/time                | `s-time`                  |
| Loading placeholder for text              | `s-skeleton-paragraph`    |

---

## Component Reference

### ACTIONS

#### `<s-button>`
Triggers actions like submitting forms, opening dialogs, or performing operations.

**Key props:** `variant` (primary/secondary/auto), `tone` (neutral/critical/auto), `disabled`, `loading`, `href`, `type` (submit/button/reset), `inlineSize` (auto/fill/fit-content), `commandFor`/`command`, `accessibilityLabel`

**When to use:** Primary and secondary CTAs, form submissions, triggering actions.
**When NOT to use:** Navigation to other pages (use `s-link` instead).

```html
<s-button variant="primary">Save</s-button>
<s-button variant="secondary">Cancel</s-button>
<s-button loading>Processing...</s-button>
<s-button command="--show" commandFor="my-modal">Open Modal</s-button>
```

---

#### `<s-clickable>`
Makes content interactive with full styling control (backgrounds, padding, borders).

**Key props:** `href`, `type`, `disabled`, `loading`, `background` (base/subdued/transparent), `padding`, `border`, `borderRadius`, `blockSize`, `inlineSize`, `commandFor`/`command`, `accessibilityLabel`

**When to use:** You need more styling flexibility than `s-button` or `s-link` provide.
**When NOT to use:** A standard `s-button` or `s-link` suffices.

```html
<s-clickable padding="large" background="subdued" border="base">
  <s-product-thumbnail src="https://cdn.shopify.com/image.jpg"></s-product-thumbnail>
</s-clickable>
```

---

#### `<s-clickable-chip>`
Interactive chip for filter tags, selected options, or removable labels.

**Key props:** `removable`, `disabled`, `hidden`, `href`, `accessibilityLabel`
**Slots:** `graphic` (accepts `s-icon`)
**Events:** `click`, `remove`, `afterhide`

**When to use:** Interactive filter tags, removable selections, merchant-created labels that need click/remove.
**When NOT to use:** Static, non-interactive labels (use `s-chip`).

```html
<s-clickable-chip removable>Shipping insurance</s-clickable-chip>
```

---

#### `<s-clipboard-item>`
Invisible component that copies text to clipboard. Pair with a button via `commandFor`.

**Key props:** `id`, `text`
**Events:** `copy`, `copyerror`

**When to use:** Copying discount codes, referral links, or other plain text.

```html
<s-button commandFor="discount-code">Copy discount code</s-button>
<s-clipboard-item id="discount-code" text="SAVE25"></s-clipboard-item>
```

---

#### `<s-link>`
Interactive text for navigation. Renders semantic link markup.

**Key props:** `href`, `target` (auto/_blank), `tone` (auto/neutral), `commandFor`/`command`, `accessibilityLabel`, `interestFor`

**When to use:** Navigation between pages, external references.
**When NOT to use:** Prominent actions or form submissions (use `s-button`).

```html
<s-link href="https://example.com/privacy">Privacy policy</s-link>
```

---

#### `<s-press-button>`
Toggle button for persistent on/off states.

**Key props:** `pressed`, `defaultPressed`, `disabled`, `loading`, `inlineSize`, `accessibilityLabel`

**When to use:** Binary toggles with visual feedback (e.g., "Add gift wrapping").
**When NOT to use:** One-time actions (use `s-button`), multiple selections (use checkboxes).

```html
<s-press-button>Add gift wrapping</s-press-button>
```

---

### FEEDBACK AND STATUS INDICATORS

#### `<s-announcement>`
Non-disruptive notification bar. Less intrusive than auto-open modals.

**Events:** `aftertoggle`, `dismiss`, `toggle`
**Methods:** `dismiss()`

**When to use:** Brief offers, short announcements that fit without scrolling.
**When NOT to use:** Content requiring scrolling, surveys (use `s-modal`), primary CTA.

```html
<s-announcement>
  <s-stack direction="inline" gap="base">
    <s-text>Check our latest offers</s-text>
    <s-link commandFor="modal" command="--show">Learn more</s-link>
  </s-stack>
</s-announcement>
```

---

#### `<s-badge>`
Compact status indicator for system-generated statuses.

**Key props:** `tone` (auto/neutral/critical), `color` (base/subdued), `size` (small/base), `icon`, `iconPosition` (start/end)

**When to use:** Order statuses, system-generated conditions, completion states.
**When NOT to use:** User-created labels or categories (use `s-chip`).

```html
<s-badge>Default</s-badge>
<s-badge tone="critical">Expired</s-badge>
<s-badge color="subdued">Free</s-badge>
```

---

#### `<s-banner>`
Prominent message for important info or required actions.

**Key props:** `heading`, `tone` (success/info/warning/critical/auto), `dismissible`, `hidden`, `collapsible`

**When to use:** Critical information, status updates, customer guidance. Use sparingly.
**When NOT to use:** Item-level info (use `s-badge`), non-urgent content.

**Best practice:** `critical` tone triggers immediate screen reader announcement.

```html
<s-banner heading="Free shipping on all orders." tone="info"></s-banner>
<s-banner heading="Payment failed" tone="critical" dismissible></s-banner>
```

---

#### `<s-progress>`
Completion indicator (determinate or indeterminate).

**Key props:** `value` (0 to max; omit for indeterminate), `max` (default: 1), `tone` (auto/critical), `accessibilityLabel`

**When to use:** Loading states, customer goal visualization (rewards, free shipping thresholds).
**When NOT to use:** Standalone without context text.

```html
<s-progress value={0.7}></s-progress>        <!-- 70% complete -->
<s-progress></s-progress>                     <!-- indeterminate -->
```

---

#### `<s-spinner>`
Animated loading indicator.

**Key props:** `size` (small/base/large/small-100/large-100), `accessibilityLabel`

**When to use:** Page/section-level loading states.
**When NOT to use:** Button loading states (use `s-button loading` prop instead).

```html
<s-spinner accessibilityLabel="Loading order details"></s-spinner>
```

---

### FORMS

#### `<s-form>`
Groups form fields and enables Enter-key submission.

**Key props:** `id`
**Events:** `submit`

**When to use:** Grouping related inputs with programmatic submit handling.
**When NOT to use:** Automatic HTTP form submission (not supported).

```html
<s-form>
  <s-text-field label="Email address"></s-text-field>
  <s-button type="submit" variant="primary">Submit</s-button>
</s-form>
```

---

#### `<s-text-field>`
Single-line text input.

**Key props:** `label`, `value`, `defaultValue`, `disabled`, `required`, `error`, `maxLength`, `minLength`, `icon`, `prefix`, `suffix`, `autocomplete`, `readOnly`

**When to use:** Names, titles, short identifiers.
**When NOT to use:** Multi-line (use `s-text-area`), emails/URLs/passwords/phones (use specialized fields).

**Best practice:** Mark optional fields with "(optional)" in the label.

```html
<s-text-field label="First name (optional)" defaultValue="Taylor"></s-text-field>
```

---

#### `<s-text-area>`
Multi-line text input.

**Key props:** `label`, `value`, `rows` (default: 2), `maxLength`, `minLength`, `disabled`, `required`, `error`, `readOnly`

**When to use:** Longer responses, feedback, gift messages, descriptions.
**When NOT to use:** Single-line input (use `s-text-field`).

```html
<s-text-area label="Gift message" rows={3}></s-text-area>
```

---

#### `<s-email-field>`
Email address input. Does NOT auto-validate -- implement your own validation.

**Key props:** `label`, `value`, `defaultValue`, `error`, `disabled`, `required`, `maxLength`, `minLength`, `autocomplete`, `readOnly`

```html
<s-email-field label="Email" defaultValue="user@example.com"></s-email-field>
```

---

#### `<s-phone-field>`
Phone number input.

**Key props:** `label`, `value`, `defaultValue`, `type` (mobile/''), `error`, `disabled`, `required`, `autocomplete`, `readOnly`

**When to use:** Collecting customer contact numbers at checkout.
**When NOT to use:** Non-phone numeric data, SMS marketing consent (use `s-consent-phone-field`).

```html
<s-phone-field label="Phone number" defaultValue="888-746-7439"></s-phone-field>
```

---

#### `<s-password-field>`
Masked password input.

**Key props:** `label`, `value`, `defaultValue`, `disabled`, `required`, `error`, `maxLength`, `minLength`, `autocomplete`, `readOnly`

```html
<s-password-field label="Password"></s-password-field>
```

---

#### `<s-url-field>`
URL input with URL-specific keyboard and validation.

**Key props:** `label`, `value`, `defaultValue`, `error`, `required`, `disabled`, `minLength`, `maxLength`, `autocomplete`, `readOnly`

```html
<s-url-field label="Website" defaultValue="https://shopify.com"></s-url-field>
```

---

#### `<s-number-field>`
Numeric input with optional stepper controls.

**Key props:** `label`, `controls` (auto/stepper/none), `min`, `max`, `step` (default: 1), `value`, `error`, `prefix`, `suffix`, `inputMode` (decimal/numeric), `disabled`, `required`

**When to use:** Quantities, measurements, whole or decimal numbers.
**When NOT to use:** Money values (use `s-money-field`).

```html
<s-number-field label="Quantity" controls="stepper" min={0} max={100} step={1} defaultValue="1"></s-number-field>
```

---

#### `<s-money-field>`
Currency input with built-in formatting and validation.

**Key props:** `label`, `value`, `defaultValue`, `min`, `max`, `step`, `currency`, `disabled`, `required`, `error`, `readOnly`

**When to use:** Prices, transaction amounts, financial values.
**When NOT to use:** Non-currency numbers (use `s-number-field`).

```html
<s-money-field label="Price" defaultValue="9.99"></s-money-field>
```

---

#### `<s-date-field>`
Date text input with validation.

**Key props:** `label`, `defaultValue` (YYYY-MM-DD), `allow`/`disallow` (date ranges), `allowDays`/`disallowDays` (weekday names), `defaultView` (YYYY-MM), `disabled`, `required`, `error`, `readOnly`

**When to use:** Direct date text entry.
**When NOT to use:** Visual calendar selection needed (use `s-date-picker`).

```html
<s-date-field label="Pickup date" defaultValue="2025-10-01"></s-date-field>
```

---

#### `<s-date-picker>`
Visual calendar for date selection.

**Key props:** `type` (single/multiple/range), `allow`/`disallow`, `allowDays`/`disallowDays`, `value`, `defaultValue`, `view`, `disabled`

**When to use:** Users benefit from seeing full month context, weekday info matters, selecting dates relative to today.
**When NOT to use:** Simple date text entry preferred (use `s-date-field`).

```html
<s-date-picker defaultView="2025-10" defaultValue="2025-10-03"></s-date-picker>
<s-date-picker type="range" defaultValue="2025-10-03,2025-10-07"></s-date-picker>
```

---

#### `<s-checkbox>`
Binary on/off control for form submissions.

**Key props:** `checked`, `defaultChecked`, `label`, `disabled`, `error`, `value`, `required`, `name`, `commandFor`/`command`

**When to use:** Multi-select options, agreements, yes/no form controls.
**When NOT to use:** Immediate effect needed (use `s-switch`), mutually exclusive choices (use radio/choice-list).

```html
<s-checkbox defaultChecked label="Email me with news and offers"></s-checkbox>
```

---

#### `<s-switch>`
Immediate on/off toggle (no form submit required).

**Key props:** `checked`, `defaultChecked`, `disabled`, `label`, `value`, `name`, `commandFor`/`command`

**When to use:** Feature toggles, settings that apply instantly.
**When NOT to use:** Selections requiring explicit form submission (use `s-checkbox`).

```html
<s-switch label="Shipping insurance"></s-switch>
```

---

#### `<s-choice-list>`
Single or multi-select from visible options (radio/checkbox group).

**Key props on list:** `multiple`, `values`, `label`, `error`, `disabled`, `variant` (auto/list/inline/block/grid)
**Key props on choice:** `value`, `selected`, `defaultSelected`, `disabled`

**When to use:** 2-10 visible options, per-option help text needed.
**When NOT to use:** 4+ simple options in tight space (use `s-select`).

```html
<s-choice-list label="Pickup location">
  <s-choice defaultSelected value="loc-1">Yonge-Dundas Square</s-choice>
  <s-choice value="loc-2">Distillery District</s-choice>
  <s-choice value="loc-3">Yorkville</s-choice>
</s-choice-list>
```

---

#### `<s-select>`
Dropdown for selecting one option from many.

**Key props:** `label`, `value`, `placeholder`, `disabled`, `required`, `error`, `name`
**Children:** `<s-option value="" defaultSelected>Label</s-option>`

**When to use:** 4+ options, space is limited.
**When NOT to use:** Fewer than 4 options (use choice-list/radio), need visual layouts (use `s-choice-list`).

```html
<s-select label="Country/region">
  <s-option defaultSelected value="CA">Canada</s-option>
  <s-option value="US">United States</s-option>
  <s-option value="UK">United Kingdom</s-option>
</s-select>
```

---

#### `<s-consent-checkbox>`
SMS marketing consent checkbox. Requires `sms_marketing` capability.

**Key props:** `label`, `policy` ("sms-marketing"), `checked`, `defaultChecked`, `disabled`, `error`, `name`, `value`

```html
<s-consent-checkbox label="Text me with news and offers" policy="sms-marketing"></s-consent-checkbox>
```

---

#### `<s-consent-phone-field>`
Phone input for SMS marketing consent. Auto-saves during checkout.

**Key props:** `label`, `policy` ("sms-marketing"), `defaultValue`, `type` (mobile/''), `disabled`, `required`, `error`, `readOnly`

```html
<s-consent-phone-field label="Phone" policy="sms-marketing" defaultValue="587-746-7439"></s-consent-phone-field>
```

---

#### `<s-drop-zone>`
Drag-and-drop file upload area.

**Key props:** `accept` (comma-separated MIME/extensions), `multiple`, `disabled`, `error`, `required`, `label`, `name`
**Events:** `change`, `drop`, `reject`

**When to use:** Image/document/CSV uploads.
**Limitations:** Minimum 100x100px. Drag-drop ineffective on mobile -- provide alternative.

```html
<s-drop-zone accept="image/*" label="Upload photo"></s-drop-zone>
```

---

### LAYOUT AND STRUCTURE

#### `<s-stack>`
Arranges elements vertically or horizontally. The primary layout component.

**Key props:** `direction` (block/inline), `gap`, `alignItems`, `alignContent`, `justifyContent`, `padding`, `background`, `border`, `borderRadius`, `display`

**When to use:** Simple row/column layouts, grouping with consistent spacing.
**When NOT to use:** Complex multi-column grids (use `s-grid`).

```html
<!-- Vertical stack (default) -->
<s-stack gap="base">
  <s-text-field label="First name"></s-text-field>
  <s-text-field label="Last name"></s-text-field>
</s-stack>

<!-- Horizontal stack -->
<s-stack direction="inline" gap="base" alignItems="center">
  <s-icon type="store"></s-icon>
  <s-text>Store pickup</s-text>
</s-stack>
```

---

#### `<s-grid>`
CSS Grid layout for complex multi-column designs.

**Key props on grid:** `gridTemplateColumns`, `gridTemplateRows`, `gap`/`columnGap`/`rowGap`, `justifyContent`, `alignItems`, `padding`, `background`, `border`
**Key props on grid-item:** `gridColumn`, `gridRow`

**When to use:** Multi-column layouts, items spanning multiple rows/columns.
**When NOT to use:** Simple linear layouts (use `s-stack`).

```html
<s-grid gridTemplateColumns="1fr auto" gap="base">
  <s-grid-item gridColumn="span 2">Header spanning both columns</s-grid-item>
  <s-grid-item>Left</s-grid-item>
  <s-grid-item>Right</s-grid-item>
</s-grid>
```

---

#### `<s-box>`
Generic flexible container for custom styling.

**Key props:** `background` (base/subdued/transparent), `padding`, `border`, `borderRadius`, `blockSize`, `inlineSize`, `overflow`, `display`, `accessibilityRole`, `accessibilityLabel`

**When to use:** Custom styled containers, grouping with specific backgrounds/borders.
**When NOT to use:** Structured layouts (use `s-stack` or `s-grid`).

```html
<s-box background="subdued" borderRadius="base" borderWidth="base" padding="base">
  <s-paragraph>Custom styled container content.</s-paragraph>
</s-box>
```

---

#### `<s-divider>`
Visual separator between content groups.

**Key props:** `direction` (inline/block)

**When to use:** Simple visual separation between groups.
**When NOT to use:** Structured grouping with headings needed (use `s-section`).

```html
<s-divider></s-divider>
```

---

#### `<s-section>`
Themed content group with heading and auto-managed heading levels.

**Key props:** `heading`, `accessibilityLabel`

**When to use:** Logical content groupings with headings, automatic heading hierarchy.
**When NOT to use:** Visual-only separation (use `s-divider`).

```html
<s-section heading="Rewards">
  <s-paragraph>Earn 10 points for every $1 spent.</s-paragraph>
</s-section>
```

---

#### `<s-scroll-box>`
Scrollable container for overflowing content.

**Key props:** `maxBlockSize`, `maxInlineSize`, `overflow` (auto/hidden), `padding`, `background`, `border`, `accessibilityLabel`, `accessibilityRole`

**When to use:** Long lists or summaries in constrained spaces.
**When NOT to use:** Content fits naturally, or you need full-page scroll.

```html
<s-scroll-box maxBlockSize="200px">
  <!-- long content here -->
</s-scroll-box>
```

---

#### `<s-query-container>`
Establishes a container query context for responsive design.

**Key props:** `containerName`

**When to use:** Responsive layouts based on container size instead of viewport.
**When NOT to use:** Simple viewport-based responsive design is sufficient.

```html
<s-query-container>
  <s-box padding="@container (inline-size > 500px) large-500, none" background="subdued">
    Responsive padding based on container width.
  </s-box>
</s-query-container>
```

---

### MEDIA AND VISUALS

#### `<s-icon>`
Renders graphic symbols from a built-in icon set (100+ icons).

**Key props:** `type` (icon name), `size` (small/base/large), `tone` (success/info/warning/critical/neutral/auto)

**Common icons:** cart, settings, search, alert-circle, bag, calendar, check, chevron-down, clock, credit-card, delete, delivery, discount, edit, email, gift-card, info, lock, menu, minus, order, plus, profile, star, store, upload, x

```html
<s-icon type="store" size="large"></s-icon>
<s-icon type="check" tone="success"></s-icon>
```

---

#### `<s-image>`
Embeds images with responsive sizing and loading control.

**Key props:** `src`, `alt`, `inlineSize` (fill/auto), `aspectRatio` (e.g., "1/1"), `loading` (eager/lazy), `objectFit` (contain/cover), `borderRadius`, `accessibilityRole`

**When to use:** Product images, visual content.
**When NOT to use:** Small preview images (use `s-product-thumbnail`).

```html
<s-image src="https://cdn.shopify.com/image.jpg" alt="Product photo" aspectRatio="1/1"></s-image>
```

---

#### `<s-product-thumbnail>`
Product image with optional quantity badge.

**Key props:** `src`, `alt`, `size` (small/base), `srcSet`, `sizes`, `totalItems`

**When to use:** Product images in checkout lists with quantity badges.

```html
<s-product-thumbnail src="https://cdn.shopify.com/image.jpg" alt="Blue t-shirt" totalItems="2"></s-product-thumbnail>
```

---

#### `<s-payment-icon>`
Payment method icons (500+ supported: Visa, Mastercard, PayPal, Apple Pay, Shop Pay, etc.).

**Key props:** `type` (payment method name), `accessibilityLabel`

```html
<s-payment-icon type="visa"></s-payment-icon>
<s-payment-icon type="apple-pay"></s-payment-icon>
<s-payment-icon type="shop-pay"></s-payment-icon>
```

---

#### `<s-map>`
Interactive map with markers.

**Key props:** `apiKey` (required), `latitude`, `longitude`, `zoom` (0-18), `blockSize`, `inlineSize`, `minZoom`, `maxZoom`
**Children:** `<s-map-marker latitude="" longitude="" commandFor="">`

**When to use:** Showing store/pickup locations.
**When NOT to use:** No API key available, static coordinates only.

```html
<s-map apiKey="YOUR_KEY" latitude="37.7749" longitude="-122.4194" blockSize="400px" inlineSize="400px">
  <s-map-marker latitude="37.7749" longitude="-122.4194" commandFor="popover-loc"></s-map-marker>
  <s-popover id="popover-loc">San Francisco</s-popover>
</s-map>
```

---

#### `<s-qr-code>`
Generates a scannable QR code.

**Key props:** `content` (URL/text to encode), `logo` (branding image URL), `size` (base/fill), `border` (base/none), `accessibilityLabel`

**Best practice:** Always provide an alternative access method (link) alongside the QR code.

```html
<s-qr-code content="https://shopify.com"></s-qr-code>
<s-paragraph>Scan or visit <s-link href="https://shopify.com">shopify.com</s-link></s-paragraph>
```

---

### OVERLAYS

#### `<s-modal>`
Focused overlay dialog. Triggered via `commandFor` from a button.

**Key props:** `heading`, `id`, `padding` (base/none), `size` (small/base/large/max), `accessibilityLabel`
**Slots:** `primary-action`, `secondary-actions`

**When to use:** Confirmation dialogs, settings panels, forms needing focus.
**When NOT to use:** Non-essential content, user needs background context.

```html
<s-button command="--show" commandFor="my-modal">Open</s-button>
<s-modal id="my-modal" heading="Return Policy">
  <s-paragraph>30-day return policy details...</s-paragraph>
  <s-button variant="primary" command="--hide" commandFor="my-modal" slot="primary-action">Close</s-button>
</s-modal>
```

---

#### `<s-popover>`
Lightweight contextual overlay. Triggered via `commandFor`.

**Key props:** `id`, `blockSize`, `inlineSize`, `maxBlockSize`, `maxInlineSize`
**Events:** `show`, `hide`

**When to use:** Secondary actions, supplementary info, small inline interactions.
**When NOT to use:** Complex forms or confirmations (use `s-modal`).

```html
<s-button commandFor="my-popover">More info</s-button>
<s-popover id="my-popover">
  <s-stack gap="base" padding="base">
    <s-text>Additional details here.</s-text>
  </s-stack>
</s-popover>
```

---

#### `<s-sheet>`
Bottom sheet overlay. Requires Customer Privacy API.

**Key props:** `heading`, `id`, `accessibilityLabel`, `defaultOpen`
**Slots:** `primary-action`, `secondary-actions`
**Events:** `aftershow`, `afterhide`, `show`, `hide`

**When to use:** Custom privacy consent requirements, vital brief information.
**When NOT to use:** Non-vital info, content requiring extensive scrolling.

```html
<s-button commandFor="consent-sheet">Review Privacy</s-button>
<s-sheet id="consent-sheet" heading="Privacy Preferences">
  <s-text>Your privacy matters to us.</s-text>
</s-sheet>
```

---

#### `<s-tooltip>`
Small info overlay on hover/focus.

**Key props:** `id`
**Trigger:** Use `interestFor` on the trigger element (not `commandFor`).

**When to use:** Supplementary explanations for icons, abbreviations, terms.
**When NOT to use:** Critical task-completion info, lengthy content, mobile-only experiences.

```html
<s-clickable interestFor="my-tooltip">
  <s-icon type="info-filled"></s-icon>
</s-clickable>
<s-tooltip id="my-tooltip">Curbside pickup is at the back.</s-tooltip>
```

---

### TYPOGRAPHY AND CONTENT

#### `<s-heading>`
Section title with auto-managed heading levels based on nesting depth.

**Key props:** `accessibilityRole` (heading/none/presentation)

```html
<s-heading>Contact</s-heading>
```

---

#### `<s-paragraph>`
Block-level text. Supports inline elements (links, buttons, emphasized text).

**Key props:** `color` (base/subdued), `tone` (success/info/warning/critical/neutral/auto), `type` (paragraph/small), `dir`, `lang`, `accessibilityVisibility`

**When to use:** Readable text blocks, descriptions, explanations.
**When NOT to use:** Inline text styling only (use `s-text`).

```html
<s-paragraph>Ships in 1-2 business days.</s-paragraph>
<s-paragraph color="subdued" type="small">Terms and conditions apply.</s-paragraph>
```

---

#### `<s-text>`
Inline text with customizable styling.

**Key props:** `color` (base/subdued), `tone` (success/info/warning/critical/neutral), `type` (small/strong/emphasis/mark/address/generic/redundant/offset), `display`, `dir`, `lang`

**When to use:** Emphasizing words within paragraphs, inline labels, status text.
**When NOT to use:** Block-level text (use `s-paragraph`).

```html
<s-text type="strong">Important:</s-text>
<s-text type="small" color="subdued">All transactions are secure.</s-text>
<s-text tone="critical">Payment failed.</s-text>
```

---

#### `<s-abbreviation>`
Shows abbreviated text with full meaning on hover/focus.

**Key props:** `title` (the expanded text)

```html
<s-abbreviation title="United States Dollar">USD</s-abbreviation>
```

---

#### `<s-chip>`
Static, non-interactive label for categories, tags, or attributes.

**Key props:** `accessibilityLabel`
**Slots:** `graphic` (accepts `s-icon`)

**When to use:** Product tags, category labels, static metadata.
**When NOT to use:** System statuses (use `s-badge`), interactive tags (use `s-clickable-chip`).

```html
<s-chip>50% OFF</s-chip>
```

---

#### `<s-details>` + `<s-summary>`
Expandable/collapsible content disclosure.

**Key props:** `defaultOpen`, `open`, `toggleTransition` (none/auto)

**When to use:** Optional info, progressive disclosure (pickup instructions, shipping notes).
**When NOT to use:** Critical info that must always be visible.

```html
<s-details>
  <s-summary>Pickup instructions</s-summary>
  <s-text>Park in a stall and follow the signs.</s-text>
</s-details>
```

---

#### `<s-ordered-list>` / `<s-unordered-list>`
Numbered or bulleted lists.

**Children:** `<s-list-item>` (must be direct children)

**Ordered** -- when sequence matters (steps, rankings).
**Unordered** -- when order doesn't matter (features, benefits).

```html
<s-ordered-list>
  <s-list-item>Add items to cart</s-list-item>
  <s-list-item>Review order</s-list-item>
  <s-list-item>Complete purchase</s-list-item>
</s-ordered-list>

<s-unordered-list>
  <s-list-item>Free shipping over $50</s-list-item>
  <s-list-item>30-day returns</s-list-item>
</s-unordered-list>
```

---

#### `<s-time>`
Semantic time element with machine-readable datetime.

**Key props:** `dateTime` (valid HTML5 date string)

```html
<s-time dateTime="2025-10-15">October 15, 2025</s-time>
```

---

#### `<s-skeleton-paragraph>`
Loading placeholder for text content.

**Key props:** `content` (hidden base text for sizing)

**When to use:** Async text loading, improving perceived performance.

```html
<s-skeleton-paragraph></s-skeleton-paragraph>
```

---

## Common Patterns

### Opening overlays with `commandFor`/`command`

All overlays (`s-modal`, `s-popover`, `s-sheet`) are opened by setting `commandFor` on a trigger element pointing to the overlay's `id`:

```html
<s-button command="--show" commandFor="overlay-id">Open</s-button>
<s-button command="--hide" commandFor="overlay-id">Close</s-button>
<s-button command="--toggle" commandFor="overlay-id">Toggle</s-button>
```

### Tooltips use `interestFor` (not `commandFor`)

```html
<s-clickable interestFor="tooltip-id"><s-icon type="info-filled"></s-icon></s-clickable>
<s-tooltip id="tooltip-id">Helpful text</s-tooltip>
```

### Responsive props

Many layout props support responsive values via `MaybeResponsive` type:
```html
<s-stack gap="@container (inline-size > 600px) large, base">
```

### Form pattern

```html
<s-form>
  <s-stack gap="base">
    <s-text-field label="Name" required></s-text-field>
    <s-email-field label="Email" required></s-email-field>
    <s-text-area label="Message" rows={4}></s-text-area>
    <s-button type="submit" variant="primary">Submit</s-button>
  </s-stack>
</s-form>
```

### Choosing between similar components

| Decision                         | Choose this              | Not this           |
|----------------------------------|--------------------------|--------------------|
| Static label                     | `s-chip`                 | `s-badge`          |
| System status                    | `s-badge`                | `s-chip`           |
| Interactive/removable tag        | `s-clickable-chip`       | `s-chip`           |
| Immediate toggle                 | `s-switch`               | `s-checkbox`       |
| Toggle with form submit          | `s-checkbox`             | `s-switch`         |
| 2-3 visible options              | `s-choice-list`          | `s-select`         |
| 4+ options, limited space        | `s-select`               | `s-choice-list`    |
| Simple linear layout             | `s-stack`                | `s-grid`           |
| Complex multi-column             | `s-grid`                 | `s-stack`          |
| Visual separation only           | `s-divider`              | `s-section`        |
| Grouped content with heading     | `s-section`              | `s-divider`        |
| Block text                       | `s-paragraph`            | `s-text`           |
| Inline styled text               | `s-text`                 | `s-paragraph`      |
| Focused task overlay             | `s-modal`                | `s-popover`        |
| Lightweight contextual overlay   | `s-popover`              | `s-modal`          |
| Currency input                   | `s-money-field`          | `s-number-field`   |
| Numeric input                    | `s-number-field`         | `s-money-field`    |
| Date text entry                  | `s-date-field`           | `s-date-picker`    |
| Calendar date selection          | `s-date-picker`          | `s-date-field`     |
| Product image in list            | `s-product-thumbnail`    | `s-image`          |
| General image display            | `s-image`                | `s-product-thumbnail` |
| Navigation                       | `s-link`                 | `s-button`         |
| Action trigger                   | `s-button`               | `s-link`           |
