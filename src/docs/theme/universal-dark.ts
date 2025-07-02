// src/docs/swagger-dark-universal-theme.ts
export const dark = `
/* Dark Universal Theme for Swagger UI */
:root {
    /* primary colors */
    --swagger-color: #62a03f;
    --link-color: #4e9fff;
    --accept-header-color: #61cc6a;
    /* methods colors */
    --post-method-color: rgb(73, 204, 95);
    --post-method-background-color: rgba(73, 204, 95, .1);
    --get-method-color: rgb(97, 175, 254);
    --get-method-background-color: rgba(97, 175, 254, .1);
    --head-method-color: rgb(144, 18, 254);
    --head-method-background-color: rgba(144, 18, 254, .1);
    --put-method-color: rgb(252, 161, 48);
    --put-method-background-color: rgba(252, 161, 48, .1);
    --delete-method-color: rgb(249, 62, 62);
    --delete-method-background-color: rgba(249, 62, 62, .1);
    --options-method-color: rgb(25, 123, 220);
    --options-method-background-color: rgba(25, 123, 220, 0.1);
    --patch-method-color: rgb(80, 227, 194);
    --patch-method-background-color: rgba(80, 227, 194, .1);
    /* background */
    --all-bg-color: #121212;
    --secondary-bg-color: #181818;
    --header-bg-color: #202020;
    --block-bg-color: #202020;
    --selecter-bg-color: #202020;
    /* text */
    --primary-text-color: rgba(255, 255, 255, 1.00);
    --secondary-text-color: rgba(255, 255, 255, 0.40);
    /* border */
    --block-border-color: rgba(255, 255, 255, 0.06);
    --block-border-radius: 8px;
    --innner-block-border-radius: 4px;
    /* icons */
    --primary-icon-color: #ffffff;
    --icons-opacity: .32;
    --secondary-icon-opacity: .6;
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

.swagger-ui .opblock.opblock-head {
    border-color: var(--head-method-color);
    background: var(--head-method-background-color);
}

.swagger-ui .opblock.opblock-head .opblock-summary-method {
    background: var(--head-method-color);
}

.swagger-ui .opblock.opblock-options {
    border-color: var(--options-method-color);
    background: var(--options-method-background-color);
}

.swagger-ui .opblock.opblock-options .opblock-summary-method {
    background: var(--options-method-color);
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
    background: var(--secondary-bg-color);
    border-color: var(--primary-text-color);
    opacity: 0.8;
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
    color: var(--secondary-text-color) !important;
}

/* Authorization button */
.swagger-ui .authorization__btn {
    background: var(--selecter-bg-color);
    border-color: var(--block-border-color);
}

/* Response controls */
.swagger-ui .responses-inner {
    background: var(--secondary-bg-color);
    border-radius: var(--innner-block-border-radius);
    padding: 1rem;
    margin-top: 0.5rem;
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
.swagger-ui .markdown h5,
.swagger-ui .markdown code {
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
    background: var(--secondary-bg-color);
    border-radius: var(--innner-block-border-radius);
}

/* Loading animation */
.swagger-ui .loading-container {
    background: var(--all-bg-color);
}

/* Operation block body */
.swagger-ui .opblock-body {
    background: var(--secondary-bg-color);
}

/* Response status codes */
.swagger-ui .response-code {
    color: var(--primary-text-color) !important;
}

/* JSON/XML syntax highlighting */
.swagger-ui .highlight-code pre {
    background: var(--block-bg-color) !important;
    color: var(--primary-text-color) !important;
}

/* Info section */
.swagger-ui .info {
    margin-bottom: 2rem;
}

.swagger-ui .info .description {
    color: var(--secondary-text-color);
}

/* Server selector */
.swagger-ui .servers > label {
    color: var(--primary-text-color);
}

/* Authorize modal */
.swagger-ui .dialog-ux .modal-ux {
    background: var(--all-bg-color);
    border: 1px solid var(--block-border-color);
    border-radius: var(--block-border-radius);
}

.swagger-ui .dialog-ux .modal-ux-header {
    background: var(--header-bg-color);
    color: var(--primary-text-color);
    border-bottom: 1px solid var(--block-border-color);
}

.swagger-ui .dialog-ux .modal-ux-content {
    background: var(--all-bg-color);
    color: var(--primary-text-color);
}
`;