// src/docs/swagger-dark-theme.ts
export const dracula = `
/* https://github.com/oqo0/swagger-themes */
:root {
    /* primary colors */
    --swagger-color: #62a03f;
    --link-color: #2e82e5;
    --accept-header-color: #47b750;
    /* methods colors */
    --post-method-color: rgb(141, 199, 111);
    --post-method-background-color: rgba(141, 199, 111, .08);
    --get-method-color: rgb(74, 176, 244);
    --get-method-background-color: rgba(74, 176, 244, .08);
    --head-method-color: rgb(217, 115, 234);
    --head-method-background-color: rgba(217, 115, 234, .08);
    --put-method-color: rgb(189, 135, 86);
    --put-method-background-color: rgba(189, 135, 86, .08);
    --delete-method-color: rgb(237, 99, 113);
    --delete-method-background-color: rgba(237, 99, 113, .08);
    --options-method-color: rgb(210, 175, 60);
    --options-method-background-color: rgba(210, 175, 60, .08);
    --patch-method-color: rgb(113, 128, 147);
    --patch-method-background-color: rgba(113, 128, 147, .08);
    /* background */
    --all-bg-color: #272C35;
    --secondary-bg-color: #272C35;
    --header-bg-color: #313845;
    --block-bg-color: #20252C;
    --selecter-bg-color: #313845;
    /* text */
    --primary-text-color: rgb(179, 187, 201);
    --secondary-text-color: rgba(177, 203, 255, 0.3);
    /* border */
    --block-border-color: rgba(220, 220, 255, 0.1);
    --block-border-radius: 6px;
    --innner-block-border-radius: 2px;
    /* icons */
    --primary-icon-color: rgb(179, 187, 201);
    --icons-opacity: .28;
    --secondary-icon-opacity: .5;
    --black-icons-filter: invert(1);
}

/* Hide top bar */
.swagger-ui .topbar {
    display: none;
}

/* Background colors */
body,
.swagger-ui,
.swagger-ui .wrapper {
    background: var(--all-bg-color) !important;
}

.swagger-ui .info .title,
.swagger-ui .scheme-container {
    background: var(--header-bg-color);
    padding: 1rem;
    border-radius: var(--block-border-radius);
}

/* Operation blocks */
.swagger-ui .opblock.opblock-post {
    border-color: var(--post-method-color);
    background: var(--post-method-background-color);
}

.swagger-ui .opblock.opblock-post .opblock-summary-method {
    background: var(--post-method-color);
}

.swagger-ui .opblock.opblock-get {
    border-color: var(--get-method-color);
    background: var(--get-method-background-color);
}

.swagger-ui .opblock.opblock-get .opblock-summary-method {
    background: var(--get-method-color);
}

.swagger-ui .opblock.opblock-put {
    border-color: var(--put-method-color);
    background: var(--put-method-background-color);
}

.swagger-ui .opblock.opblock-put .opblock-summary-method {
    background: var(--put-method-color);
}

.swagger-ui .opblock.opblock-delete {
    border-color: var(--delete-method-color);
    background: var(--delete-method-background-color);
}

.swagger-ui .opblock.opblock-delete .opblock-summary-method {
    background: var(--delete-method-color);
}

.swagger-ui .opblock.opblock-patch {
    border-color: var(--patch-method-color);
    background: var(--patch-method-background-color);
}

.swagger-ui .opblock.opblock-patch .opblock-summary-method {
    background: var(--patch-method-color);
}

/* Text colors */
.swagger-ui .opblock .opblock-summary-description,
.swagger-ui .opblock .opblock-summary-path,
.swagger-ui .info .title,
.swagger-ui .info p,
.swagger-ui .info li,
.swagger-ui .info table,
.swagger-ui label,
.swagger-ui select,
.swagger-ui .response-col_status,
.swagger-ui .response-col_description,
.swagger-ui .parameter__name,
.swagger-ui .parameter__type,
.swagger-ui .model-title,
.swagger-ui .model,
.swagger-ui .models-control,
.swagger-ui .opblock-description-wrapper p,
.swagger-ui .opblock-tag,
.swagger-ui table thead tr td,
.swagger-ui table thead tr th,
.swagger-ui .parameter__in,
.swagger-ui .responses-inner h4,
.swagger-ui .responses-inner h5,
.swagger-ui .opblock-section-header h4 {
    color: var(--primary-text-color) !important;
}

/* Links */
.swagger-ui .info a,
.swagger-ui a {
    color: var(--link-color);
}

/* Input fields and selects */
.swagger-ui input[type=text],
.swagger-ui input[type=password],
.swagger-ui input[type=search],
.swagger-ui input[type=email],
.swagger-ui input[type=file],
.swagger-ui textarea,
.swagger-ui select {
    background: var(--block-bg-color);
    color: var(--primary-text-color);
    border: 1px solid var(--block-border-color);
    border-radius: var(--innner-block-border-radius);
}

/* Response body and code blocks */
.swagger-ui .highlight-code,
.swagger-ui .renderedMarkdown code,
.swagger-ui .model-box,
.swagger-ui .response-body,
.swagger-ui .response-col_description__inner div.markdown,
.swagger-ui .response-col_description__inner div.renderedMarkdown {
    background: var(--block-bg-color) !important;
    color: var(--primary-text-color) !important;
    border-radius: var(--innner-block-border-radius);
}

/* Model/Schema section */
.swagger-ui .model-box {
    background: var(--block-bg-color);
    border: 1px solid var(--block-border-color);
    border-radius: var(--block-border-radius);
}

/* Buttons */
.swagger-ui .btn {
    background: var(--selecter-bg-color);
    color: var(--primary-text-color);
    border: 1px solid var(--block-border-color);
    border-radius: var(--innner-block-border-radius);
}

.swagger-ui .btn:hover {
    background: var(--header-bg-color);
}

.swagger-ui .btn.authorize {
    background: var(--swagger-color);
    color: white;
    border-color: var(--swagger-color);
}

.swagger-ui .btn.execute {
    background: var(--link-color);
    color: white;
    border-color: var(--link-color);
}

/* Tables */
.swagger-ui table tbody tr td {
    border-color: var(--block-border-color) !important;
    color: var(--primary-text-color) !important;
}

/* Expand/Collapse arrows and icons */
.swagger-ui .arrow,
.swagger-ui .expand-operation svg,
.swagger-ui .model-toggle::after {
    filter: var(--black-icons-filter);
    opacity: var(--icons-opacity);
}

/* Copy button */
.swagger-ui .copy-to-clipboard {
    background: var(--selecter-bg-color);
    border-radius: var(--innner-block-border-radius);
}

.swagger-ui .copy-to-clipboard button {
    background: transparent;
    color: var(--primary-text-color);
}

/* Parameter sections */
.swagger-ui .parameters-col_description {
    color: var(--primary-text-color) !important;
}

/* Authorization button */
.swagger-ui .authorization__btn {
    background: var(--selecter-bg-color);
    border-color: var(--block-border-color);
}

/* Response controls */
.swagger-ui .responses-inner {
    background: var(--block-bg-color);
    border-radius: var(--innner-block-border-radius);
    padding: 1rem;
}

/* Tab headers */
.swagger-ui .tab li {
    color: var(--secondary-text-color);
}

.swagger-ui .tab li.active {
    color: var(--primary-text-color);
    border-bottom: 2px solid var(--swagger-color);
}

/* Model expand buttons */
.swagger-ui .model-toggle {
    background: var(--selecter-bg-color);
    border-radius: var(--innner-block-border-radius);
}

/* Markdown content */
.swagger-ui .markdown p,
.swagger-ui .markdown h1,
.swagger-ui .markdown h2,
.swagger-ui .markdown h3,
.swagger-ui .markdown h4,
.swagger-ui .markdown h5 {
    color: var(--primary-text-color) !important;
}

/* Response examples */
.swagger-ui .example,
.swagger-ui .responses-inner h4,
.swagger-ui .responses-inner h5 {
    background: var(--block-bg-color);
    color: var(--primary-text-color) !important;
}

/* Try it out section */
.swagger-ui .try-out {
    background: var(--block-bg-color);
    border-radius: var(--innner-block-border-radius);
}

/* Loading animation */
.swagger-ui .loading-container {
    background: var(--all-bg-color);
}
`;